"""Read-only catalogue and inventory lookups for the shopping agent."""

from __future__ import annotations

from contextlib import closing
import json
from pathlib import Path
import re
import sqlite3
from urllib.parse import quote

try:
    from .models import ChatProduct, InventoryStock
except ImportError:  # Support `uvicorn main:app --app-dir backend` too.
    from models import ChatProduct, InventoryStock

PROJECT_DIR = Path(__file__).resolve().parents[1]
DB_PATH = PROJECT_DIR / "data" / "campus_customs.db"
SIZE_ORDER = {size: index for index, size in enumerate(("XS", "S", "M", "L", "XL", "XXL"))}
SEARCH_STOP_WORDS = {
    "a", "am", "an", "and", "are", "available", "below", "can", "carry",
    "do", "for", "have", "i", "in", "is", "kind", "kinds", "less", "looking",
    "me", "of", "offer", "options", "please", "products", "sell", "selling",
    "show", "some", "style", "styles", "the", "there", "than", "to", "type",
    "types", "under", "what", "which", "with", "we", "you", "your",
}
SEARCH_SYNONYMS = {
    "hood": {"hood", "hooded", "hoodie"},
    "hooded": {"hood", "hooded", "hoodie"},
    "hoodie": {"hood", "hooded", "hoodie"},
    "hoodies": {"hood", "hooded", "hoodie"},
    # A sweatshirt query can include hoodies; a hoodie query stays specific.
    "sweatshirt": {"sweatshirt", "sweatshirts", "hood", "hooded", "hoodie", "hoodies"},
    "sweatshirts": {"sweatshirt", "sweatshirts", "hood", "hooded", "hoodie", "hoodies"},
}


def _search_terms(query: str) -> list[set[str]]:
    # Treat common two-word spellings as the same catalogue term.
    normalized = re.sub(r"\bsweat[\s-]+shirts?\b", "sweatshirt", query.casefold())
    terms = re.findall(r"[\w]+", normalized, flags=re.UNICODE)
    useful_terms = [term for term in terms if term not in SEARCH_STOP_WORDS and not term.isdigit()]
    hood_terms = {"hood", "hooded", "hoodie", "hoodies"}
    sweatshirt_terms = {"sweatshirt", "sweatshirts"}
    if any(term in hood_terms for term in useful_terms) and any(term in sweatshirt_terms for term in useful_terms):
        useful_terms = [term for term in useful_terms if term not in hood_terms | sweatshirt_terms]
        useful_terms.append("hoodies")
    variants = []
    for term in useful_terms:
        if term in SEARCH_SYNONYMS:
            variants.append(SEARCH_SYNONYMS[term])
        elif len(term) > 4 and term.endswith("ies"):
            variants.append({term, term[:-3] + "y"})
        elif len(term) > 3 and term.endswith("s"):
            variants.append({term, term[:-1]})
        else:
            variants.append({term})
    return variants


def _one_edit_apart(left: str, right: str) -> bool:
    """Match one insertion, deletion, substitution, or adjacent transposition."""
    if left == right or min(len(left), len(right)) < 5 or abs(len(left) - len(right)) > 1:
        return False
    if len(left) == len(right):
        differences = [index for index, (a, b) in enumerate(zip(left, right)) if a != b]
        if len(differences) == 1:
            return True
        if len(differences) == 2:
            first, second = differences
            return second == first + 1 and left[first] == right[second] and left[second] == right[first]
        return False

    shorter, longer = (left, right) if len(left) < len(right) else (right, left)
    short_index = long_index = edits = 0
    while short_index < len(shorter) and long_index < len(longer):
        if shorter[short_index] == longer[long_index]:
            short_index += 1
            long_index += 1
        else:
            edits += 1
            long_index += 1
            if edits > 1:
                return False
    return True


def _term_match_score(variants: set[str], tokens: set[str]) -> int:
    if any(variant in tokens for variant in variants):
        return 2
    if any(_one_edit_apart(variant, token) for variant in variants for token in tokens):
        return 1
    return 0


def _read_products() -> list[ChatProduct]:
    """Load current catalogue and per-size stock without opening the DB for writes."""
    if not DB_PATH.is_file():
        raise FileNotFoundError("The product database is unavailable.")

    connection = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True, timeout=5)
    connection.row_factory = sqlite3.Row
    with closing(connection) as db:
        db.execute("PRAGMA query_only = ON")
        rows = db.execute(
            """
            SELECT c.product_id, c.name, c.garment_type, c.description,
                   c.colors, c.search_tags, c.price,
                   COALESCE(SUM(i.quantity), 0) AS total_stock
            FROM catalogue AS c
            LEFT JOIN inventory AS i ON i.product_id = c.product_id
            GROUP BY c.product_id
            ORDER BY c.name COLLATE NOCASE
            """
        ).fetchall()
        inventory_rows = db.execute(
            "SELECT product_id, size, quantity FROM inventory ORDER BY product_id"
        ).fetchall()

    inventory_by_product: dict[str, list[InventoryStock]] = {}
    for item in inventory_rows:
        inventory_by_product.setdefault(item["product_id"], []).append(
            InventoryStock(size=item["size"], quantity=item["quantity"])
        )
    for stock in inventory_by_product.values():
        stock.sort(key=lambda item: SIZE_ORDER.get(item.size, len(SIZE_ORDER)))

    products: list[ChatProduct] = []
    for row in rows:
        products.append(
            ChatProduct(
                product_id=row["product_id"],
                name=row["name"],
                garment_type=row["garment_type"],
                description=row["description"],
                colors=json.loads(row["colors"]),
                search_tags=json.loads(row["search_tags"]),
                price=row["price"],
                image_url=f"/api/products/{quote(row['product_id'], safe='')}/image",
                total_stock=row["total_stock"],
                inventory=inventory_by_product.get(row["product_id"], []),
            )
        )
    return products


def search_catalogue(
    query: str = "",
    max_price: float | None = None,
    size: str | None = None,
    available_only: bool = False,
    limit: int = 102,
) -> list[ChatProduct]:
    """Search live public product fields and return current price and stock.

    A size filter retains zero-quantity matches unless available_only is true.
    """
    terms = _search_terms(query)
    desired_size = size.strip().upper() if size and size.strip() else None
    if max_price is not None and max_price < 0:
        return []

    exact_matches: list[tuple[int, ChatProduct]] = []
    typo_matches: list[tuple[int, ChatProduct]] = []
    for product in _read_products():
        if max_price is not None and product.price > max_price:
            continue
        size_stock = next(
            (stock for stock in product.inventory if stock.size.upper() == desired_size),
            None,
        ) if desired_size else None
        # Keep zero-quantity rows when only filtering by size so the agent can
        # explain that the requested size is out of stock instead of hiding it.
        if desired_size and size_stock is None:
            continue
        if available_only:
            if desired_size:
                if size_stock is None or size_stock.quantity <= 0:
                    continue
            elif product.total_stock <= 0:
                continue
        searchable = " ".join(
            [product.name, product.garment_type, product.description, *product.colors, *product.search_tags]
        ).casefold()
        searchable_tokens = set(re.findall(r"[\w]+", searchable, flags=re.UNICODE))
        # Keep the existing substring-based all-terms search as the first pass.
        exact_scores = [2 if any(term in searchable for term in variants) else 0 for variants in terms]
        if not terms or all(exact_scores):
            exact_matches.append((sum(exact_scores), product))
            continue
        fuzzy_scores = [_term_match_score(variants, searchable_tokens) for variants in terms]
        if all(fuzzy_scores):
            typo_matches.append((sum(fuzzy_scores), product))

    # Preserve established exact-query results and matching semantics. Typo
    # tolerance is a fallback only when no exact result satisfies the query.
    ranked = exact_matches or typo_matches
    ranked.sort(key=lambda item: (-item[0], item[1].name.casefold()))
    safe_limit = max(1, min(limit, 102))
    return [product for _, product in ranked[:safe_limit]]


def get_product_details(product_id: str) -> ChatProduct | None:
    """Get one exact catalogue item and its current inventory, by product ID."""
    product_id = product_id.strip()
    if not product_id:
        return None
    for product in _read_products():
        if product.product_id == product_id:
            return product
    return None
