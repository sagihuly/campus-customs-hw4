"""Campus Customs product and account API."""

from contextlib import closing
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import time
from urllib.parse import quote

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator

try:
    from .models import (
        ChatConversationHistory,
        ChatConversationSummary,
        ChatHistoryMessage,
        ChatMessage,
        ChatPageContext,
        ChatProduct,
        ChatRequest,
        ChatResponse,
    )
except ImportError:  # Support running main.py directly from the backend folder.
    from models import (
        ChatConversationHistory,
        ChatConversationSummary,
        ChatHistoryMessage,
        ChatMessage,
        ChatPageContext,
        ChatProduct,
        ChatRequest,
        ChatResponse,
    )

PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_DIR / "data"
DB_PATH = DATA_DIR / "campus_customs.db"
DIST_DIR = PROJECT_DIR / "frontend" / "dist"

app = FastAPI(title="Campus Customs Storefront")

PASSWORD_HASH_ITERATIONS = 600_000
LEGACY_PASSWORD_HASH_ITERATIONS = 120_000
_DUMMY_PASSWORD_HASH = "pbkdf2_sha256$100000$campus-customs-dummy-salt$" + hashlib.pbkdf2_hmac(
    "sha256", b"dummy-password", b"campus-customs-dummy-salt", LEGACY_PASSWORD_HASH_ITERATIONS
).hex()
SESSION_COOKIE = "campus_customs_session"
SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
_configured_session_secret = os.environ.get("CAMPUS_CUSTOMS_SESSION_SECRET")
SESSION_SECRET = _configured_session_secret.encode("utf-8") if _configured_session_secret else secrets.token_bytes(32)
SESSION_COOKIE_SECURE = os.environ.get("CAMPUS_CUSTOMS_COOKIE_SECURE", "").lower() in {"1", "true", "yes"}


class RegisterPayload(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=256)

    @field_validator("first_name", "last_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required.")
        return value

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid email address.")
        return value


class LoginPayload(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid email address.")
        return value


class PublicUser(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    created_at: str


def public_user(row: sqlite3.Row) -> dict:
    name_parts = (row["name"] or "").split(maxsplit=1)
    first_name = row["first_name"] or (name_parts[0] if name_parts else "")
    last_name = row["last_name"] or (name_parts[1] if len(name_parts) > 1 else "")
    return {
        "id": row["id"],
        "first_name": first_name,
        "last_name": last_name,
        "email": row["email"],
        "created_at": row["created_at"],
    }


def writable_database() -> sqlite3.Connection:
    if not DB_PATH.is_file():
        raise HTTPException(status_code=503, detail="The account database is unavailable.")
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), PASSWORD_HASH_ITERATIONS
    ).hex()
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt}${digest}"


def verify_password(password: str, encoded: str) -> tuple[bool, bool]:
    """Return (matches, needs_upgrade); accept the original three-part HW4 hashes."""
    try:
        parts = encoded.split("$")
        if len(parts) == 4 and parts[0] == "pbkdf2_sha256":
            iterations, salt, expected = int(parts[1]), parts[2], parts[3]
            needs_upgrade = False
        elif len(parts) == 3 and parts[0] == "pbkdf2_sha256":
            salt, expected = parts[1], parts[2]
            iterations, needs_upgrade = LEGACY_PASSWORD_HASH_ITERATIONS, True
        else:
            return False, False
        if iterations < 1 or iterations > 2_000_000 or not re.fullmatch(r"[0-9a-f]{64}", expected):
            return False, False
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations
        ).hex()
        return hmac.compare_digest(actual, expected), needs_upgrade
    except (ValueError, TypeError):
        return False, False


def create_session_token(user_id: int) -> str:
    expires_at = int(time.time()) + SESSION_TTL_SECONDS
    payload = f"{user_id}.{expires_at}".encode("ascii")
    body = base64.urlsafe_b64encode(payload).rstrip(b"=")
    signature = hmac.new(SESSION_SECRET, body, hashlib.sha256).digest()
    return f"{body.decode('ascii')}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode('ascii')}"


def session_user_id(token: str | None) -> int | None:
    if not token or "." not in token:
        return None
    body_text, signature_text = token.rsplit(".", 1)
    try:
        body = body_text.encode("ascii")
        provided_signature = base64.urlsafe_b64decode(signature_text + "=" * (-len(signature_text) % 4))
        expected_signature = hmac.new(SESSION_SECRET, body, hashlib.sha256).digest()
        if not hmac.compare_digest(provided_signature, expected_signature):
            return None
        payload = base64.urlsafe_b64decode(body_text + "=" * (-len(body_text) % 4)).decode("ascii")
        user_id_text, expires_text = payload.split(".", 1)
        user_id, expires_at = int(user_id_text), int(expires_text)
        if expires_at <= int(time.time()) or user_id < 1:
            return None
        return user_id
    except (ValueError, UnicodeDecodeError):
        return None


def set_session_cookie(response: Response, user_id: int) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        create_session_token(user_id),
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def set_response_user(response: Response, row: sqlite3.Row) -> dict:
    set_session_cookie(response, row["id"])
    return public_user(row)


def migrate_chat_schema(connection: sqlite3.Connection) -> None:
    """Add private conversation grouping while preserving legacy chat messages."""
    connection.execute("BEGIN IMMEDIATE")
    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                products_json TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )
        columns = {row[1] for row in connection.execute("PRAGMA table_info(chat_messages)")}
        if "conversation_id" not in columns:
            connection.execute(
                "ALTER TABLE chat_messages ADD COLUMN conversation_id INTEGER REFERENCES chat_conversations(id)"
            )
        if "search_performed" not in columns:
            connection.execute(
                "ALTER TABLE chat_messages ADD COLUMN search_performed INTEGER NOT NULL DEFAULT 0"
            )

        legacy_users = connection.execute(
            "SELECT DISTINCT user_id FROM chat_messages WHERE conversation_id IS NULL ORDER BY user_id"
        ).fetchall()
        for (user_id,) in legacy_users:
            bounds = connection.execute(
                "SELECT MIN(created_at), MAX(created_at) FROM chat_messages WHERE user_id = ? AND conversation_id IS NULL",
                (user_id,),
            ).fetchone()
            cursor = connection.execute(
                """
                INSERT INTO chat_conversations (user_id, title, created_at, updated_at)
                VALUES (?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
                """,
                (user_id, "Earlier chat history", bounds[0], bounds[1]),
            )
            legacy_conversation_id = cursor.lastrowid
            legacy_messages = connection.execute(
                "SELECT id FROM chat_messages WHERE user_id = ? AND conversation_id IS NULL",
                (user_id,),
            ).fetchall()
            connection.executemany(
                "UPDATE chat_messages SET conversation_id = ? WHERE id = ?",
                ((legacy_conversation_id, row["id"]) for row in legacy_messages),
            )

        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_updated "
            "ON chat_conversations(user_id, updated_at DESC, id DESC)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation "
            "ON chat_messages(conversation_id, id)"
        )
        connection.commit()
    except Exception:
        connection.rollback()
        raise


def database() -> sqlite3.Connection:
    if not DB_PATH.is_file():
        raise HTTPException(status_code=503, detail="The product database is unavailable.")
    connection = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only = ON")
    return connection


def product_payload(row: sqlite3.Row) -> dict:
    product_id = row["product_id"]
    return {
        "product_id": product_id,
        "name": row["name"],
        "garment_type": row["garment_type"],
        "description": row["description"],
        "colors": json.loads(row["colors"]),
        "search_tags": json.loads(row["search_tags"]),
        "price": row["price"],
        "image_url": f"/api/products/{quote(product_id, safe='')}/image",
        "total_stock": row["total_stock"],
        "available_sizes": [size for size in (row["available_sizes"] or "").split(",") if size],
    }


@app.get("/api/health")
def health() -> dict:
    with closing(database()) as connection:
        count = connection.execute("SELECT COUNT(*) FROM catalogue").fetchone()[0]
    return {"status": "ok", "products": count}


@app.get("/api/products")
def products() -> list[dict]:
    with closing(database()) as connection:
        rows = connection.execute(
            """
            SELECT
                c.*,
                COALESCE(SUM(i.quantity), 0) AS total_stock,
                COALESCE(GROUP_CONCAT(CASE WHEN i.quantity > 0 THEN i.size END), '') AS available_sizes
            FROM catalogue AS c
            LEFT JOIN inventory AS i ON i.product_id = c.product_id
            GROUP BY c.product_id
            ORDER BY c.name COLLATE NOCASE
            """
        ).fetchall()
    return [product_payload(row) for row in rows]


@app.get("/api/products/{product_id}")
def product(product_id: str) -> dict:
    with closing(database()) as connection:
        row = connection.execute(
            """
            SELECT
                c.*,
                COALESCE(SUM(i.quantity), 0) AS total_stock,
                COALESCE(GROUP_CONCAT(CASE WHEN i.quantity > 0 THEN i.size END), '') AS available_sizes
            FROM catalogue AS c
            LEFT JOIN inventory AS i ON i.product_id = c.product_id
            WHERE c.product_id = ?
            GROUP BY c.product_id
            """,
            (product_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Product not found.")
        inventory = connection.execute(
            "SELECT size, quantity FROM inventory WHERE product_id = ?",
            (product_id,),
        ).fetchall()
    result = product_payload(row)
    order = {size: index for index, size in enumerate(("XS", "S", "M", "L", "XL", "XXL"))}
    result["inventory"] = sorted(
        (dict(item) for item in inventory),
        key=lambda item: order.get(item["size"], 100),
    )
    return result


@app.get("/api/products/{product_id}/image")
def product_image(product_id: str) -> FileResponse:
    with closing(database()) as connection:
        row = connection.execute(
            "SELECT image_file_path FROM catalogue WHERE product_id = ?", (product_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    image_path = (DATA_DIR / row["image_file_path"]).resolve()
    if DATA_DIR.resolve() not in image_path.parents or not image_path.is_file():
        raise HTTPException(status_code=404, detail="Image not found.")
    return FileResponse(image_path)


@app.post("/api/auth/register", response_model=PublicUser, status_code=201)
def register(payload: RegisterPayload, response: Response) -> dict:
    email = payload.email
    with closing(writable_database()) as connection:
        try:
            connection.execute("BEGIN IMMEDIATE")
            existing = connection.execute(
                "SELECT 1 FROM users WHERE lower(email) = ?", (email,)
            ).fetchone()
            if existing:
                raise HTTPException(status_code=409, detail="An account with this email already exists.")
            cursor = connection.execute(
                """
                INSERT INTO users (name, email, password_hash, first_name, last_name)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    f"{payload.first_name} {payload.last_name}",
                    email,
                    hash_password(payload.password),
                    payload.first_name,
                    payload.last_name,
                ),
            )
            connection.commit()
            row = connection.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
        except sqlite3.IntegrityError as error:
            connection.rollback()
            raise HTTPException(status_code=409, detail="An account with this email already exists.") from error
        except Exception:
            connection.rollback()
            raise
    return set_response_user(response, row)


@app.post("/api/auth/login", response_model=PublicUser)
def login(payload: LoginPayload, response: Response) -> dict:
    with closing(database()) as connection:
        row = connection.execute("SELECT * FROM users WHERE lower(email) = ?", (payload.email,)).fetchone()
    encoded_hash = row["password_hash"] if row else _DUMMY_PASSWORD_HASH
    valid, needs_upgrade = verify_password(payload.password, encoded_hash)
    if row is None or not valid:
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    if needs_upgrade:
        upgraded_hash = hash_password(payload.password)
        with closing(writable_database()) as connection:
            connection.execute("UPDATE users SET password_hash = ? WHERE id = ?", (upgraded_hash, row["id"]))
            connection.commit()
            row = connection.execute("SELECT * FROM users WHERE id = ?", (row["id"],)).fetchone()
    return set_response_user(response, row)


@app.get("/api/auth/me")
def current_session(request: Request) -> dict:
    user_id = session_user_id(request.cookies.get(SESSION_COOKIE))
    if user_id is None:
        return {"user": None}
    with closing(database()) as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return {"user": public_user(row) if row else None}


@app.post("/api/auth/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(
        SESSION_COOKIE,
        path="/",
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
    )
    return {"ok": True}


def require_session_user_id(request: Request) -> int:
    user_id = session_user_id(request.cookies.get(SESSION_COOKIE))
    if user_id is None:
        raise HTTPException(status_code=401, detail="Please log in to view saved conversations.")
    with closing(database()) as connection:
        exists = connection.execute("SELECT 1 FROM users WHERE id = ?", (user_id,)).fetchone()
    if exists is None:
        raise HTTPException(status_code=401, detail="Please log in to view saved conversations.")
    return user_id


def ensure_chat_schema() -> None:
    with closing(writable_database()) as connection:
        migrate_chat_schema(connection)


def _stored_chat_products(value: str | None) -> list[ChatProduct]:
    if not value:
        return []
    try:
        decoded = json.loads(value)
        if not isinstance(decoded, list):
            return []
        products = []
        for item in decoded:
            try:
                products.append(ChatProduct.model_validate(item))
            except Exception:
                continue
        return products
    except (json.JSONDecodeError, TypeError):
        return []


@app.get("/api/chat/conversations", response_model=list[ChatConversationSummary])
def list_chat_conversations(request: Request) -> list[ChatConversationSummary]:
    user_id = require_session_user_id(request)
    ensure_chat_schema()
    with closing(database()) as connection:
        rows = connection.execute(
            """
            SELECT c.id, c.title, c.created_at, c.updated_at, COUNT(m.id) AS message_count
            FROM chat_conversations AS c
            LEFT JOIN chat_messages AS m
              ON m.conversation_id = c.id AND m.user_id = c.user_id
            WHERE c.user_id = ?
            GROUP BY c.id
            ORDER BY c.updated_at DESC, c.id DESC
            """,
            (user_id,),
        ).fetchall()
    return [ChatConversationSummary.model_validate(dict(row)) for row in rows]


@app.get("/api/chat/conversations/{conversation_id}", response_model=ChatConversationHistory)
def get_chat_conversation(conversation_id: int, request: Request) -> ChatConversationHistory:
    user_id = require_session_user_id(request)
    ensure_chat_schema()
    with closing(database()) as connection:
        conversation = connection.execute(
            """
            SELECT c.id, c.title, c.created_at, c.updated_at, COUNT(m.id) AS message_count
            FROM chat_conversations AS c
            LEFT JOIN chat_messages AS m
              ON m.conversation_id = c.id AND m.user_id = c.user_id
            WHERE c.id = ? AND c.user_id = ?
            GROUP BY c.id
            """,
            (conversation_id, user_id),
        ).fetchone()
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        rows = connection.execute(
            """
            SELECT id, role, content, products_json, search_performed, created_at
            FROM chat_messages
            WHERE conversation_id = ? AND user_id = ?
            ORDER BY id
            """,
            (conversation_id, user_id),
        ).fetchall()

    messages = [
        ChatHistoryMessage(
            id=row["id"],
            role=row["role"],
            content=row["content"],
            products=_stored_chat_products(row["products_json"]),
            search_performed=bool(row["search_performed"]),
            created_at=row["created_at"],
        )
        for row in rows
        if row["role"] in {"user", "assistant"}
    ]
    return ChatConversationHistory(
        **dict(conversation),
        messages=messages,
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    """Run the shopping agent and persist the exchange for signed-in customers."""
    user_id = session_user_id(request.cookies.get(SESSION_COOKIE))
    if user_id is not None:
        user_id = require_session_user_id(request)
    elif payload.conversation_id is not None:
        raise HTTPException(status_code=401, detail="Please log in to continue a saved conversation.")

    latest_user_message = payload.messages[-1]
    conversation_id = payload.conversation_id
    if user_id is not None:
        ensure_chat_schema()
        with closing(database()) as connection:
            if conversation_id is not None:
                owned = connection.execute(
                    "SELECT 1 FROM chat_conversations WHERE id = ? AND user_id = ?",
                    (conversation_id, user_id),
                ).fetchone()
                if owned is None:
                    raise HTTPException(status_code=404, detail="Conversation not found.")
                previous_rows = connection.execute(
                    """
                    SELECT role, content FROM chat_messages
                    WHERE conversation_id = ? AND user_id = ?
                    ORDER BY id DESC LIMIT 23
                    """,
                    (conversation_id, user_id),
                ).fetchall()
                previous_rows.reverse()
                if previous_rows and previous_rows[0]["role"] == "assistant":
                    previous_rows = previous_rows[1:]
                agent_messages = [ChatMessage.model_validate(dict(row)) for row in previous_rows]
                agent_messages.append(latest_user_message)
            else:
                # Do not accept caller-supplied transcript as saved account history.
                agent_messages = [latest_user_message]
    else:
        # Guest history remains in the current browser session only.
        agent_messages = payload.messages

    customer_context = None
    if user_id is not None:
        with closing(database()) as connection:
            account = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if account is None:
            raise HTTPException(status_code=401, detail="Please log in again to use the shopping assistant.")
        account_details = public_user(account)
        customer_context = {
            "first_name": account_details["first_name"],
            "last_name": account_details["last_name"],
            "email": account_details["email"],
        }

    page_context = {"page_type": payload.page_context.page_type, "current_product": None}
    if payload.page_context.product_id:
        try:
            if __package__:
                from .tools import get_product_details
            else:
                from tools import get_product_details
            page_context["current_product"] = get_product_details(payload.page_context.product_id)
        except (FileNotFoundError, sqlite3.Error):
            # A missing catalogue must not prevent the assistant from handling a non-product question.
            page_context["current_product"] = None

    try:
        if __package__:
            from .agent import AgentCustomerContext, AgentPageContext, ChatAgentConfigurationError, run_chat
        else:
            from agent import AgentCustomerContext, AgentPageContext, ChatAgentConfigurationError, run_chat
        response = await run_chat(
            agent_messages,
            customer_context=AgentCustomerContext(**customer_context) if customer_context else None,
            page_context=AgentPageContext(**page_context),
        )
    except ImportError as error:
        raise HTTPException(
            status_code=503,
            detail="The chat dependencies are unavailable. Install requirements.txt.",
        ) from error
    except ChatAgentConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        # Do not return provider diagnostics, prompts, or credentials to the browser.
        raise HTTPException(
            status_code=502,
            detail="The shopping assistant is temporarily unavailable. Please try again.",
        ) from error

    if user_id is None:
        return response.model_copy(update={"conversation_id": None})

    title = re.sub(r"\s+", " ", latest_user_message.content).strip()[:80] or "New conversation"
    products_json = json.dumps(
        [product.model_dump(mode="json") for product in response.products],
        ensure_ascii=False,
    ) if response.products else None
    with closing(writable_database()) as connection:
        try:
            connection.execute("BEGIN IMMEDIATE")
            if conversation_id is None:
                cursor = connection.execute(
                    "INSERT INTO chat_conversations (user_id, title) VALUES (?, ?)",
                    (user_id, title),
                )
                conversation_id = cursor.lastrowid
            else:
                owned = connection.execute(
                    "SELECT 1 FROM chat_conversations WHERE id = ? AND user_id = ?",
                    (conversation_id, user_id),
                ).fetchone()
                if owned is None:
                    raise HTTPException(status_code=404, detail="Conversation not found.")

            connection.execute(
                """
                INSERT INTO chat_messages (user_id, role, content, conversation_id, search_performed)
                VALUES (?, 'user', ?, ?, 0)
                """,
                (user_id, latest_user_message.content, conversation_id),
            )
            connection.execute(
                """
                INSERT INTO chat_messages (
                    user_id, role, content, products_json, conversation_id, search_performed
                ) VALUES (?, 'assistant', ?, ?, ?, ?)
                """,
                (
                    user_id,
                    response.reply,
                    products_json,
                    conversation_id,
                    int(response.search_performed),
                ),
            )
            connection.execute(
                "UPDATE chat_conversations SET updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE id = ? AND user_id = ?",
                (conversation_id, user_id),
            )
            connection.commit()
        except Exception:
            connection.rollback()
            raise
    return response.model_copy(update={"conversation_id": conversation_id})


@app.get("/{path:path}", include_in_schema=False)
def storefront(path: str) -> FileResponse:
    """Serve the built React app when running Uvicorn without Vite."""
    if not DIST_DIR.is_dir():
        raise HTTPException(status_code=404, detail="Build the frontend to serve it here.")
    requested = (DIST_DIR / path).resolve()
    if requested.is_file() and DIST_DIR.resolve() in requested.parents:
        return FileResponse(requested)
    return FileResponse(DIST_DIR / "index.html")
