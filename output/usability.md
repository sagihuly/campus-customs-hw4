# Campus Customs usability improvements

This document describes the four implemented improvements and why they help customers or the store. The checks below were run on the local website against the current Campus Customs catalogue and inventory.

## 1. Product filters and price sorting

The Products page builds category choices from the catalogue's `garment_type`, filters products by minimum and maximum catalogue price, and offers size choices derived from sizes whose inventory quantity is greater than zero. Customers can sort the filtered collection by price from low to high or high to low; the existing name sort remains available.

These controls help shoppers narrow a 102-item collection to products that match the style, budget, and size they are looking for. Showing only sizes with positive stock reduces the chance that a customer spends time on an unavailable fit.

**Checked on the website:** selecting `pullover hoodie` showed 18 products. Setting the price range to $60–$70 and selecting size S reduced the results to 16. A $60 maximum showed 58 products across the catalogue. Price sorting showed $98 items first in descending order and $32 items first in ascending order.

## 2. Mobile navigation, product cards, and chat

At small widths, the main navigation collapses behind a menu button. Catalogue filters stack vertically, size choices remain touch-friendly and horizontally scrollable, and cards use a two-column grid that becomes one column on very narrow screens. The chat panel uses the dynamic viewport height, safe-area spacing, and a full-width mobile layout so the conversation and composer fit on screen.

This makes it easier to browse from a phone, keeps controls legible and tappable, and gives customers a usable way to ask for product help without the chat covering the entire page.

**Checked on the website:** at the available narrow mobile viewport, the menu opened to show all five navigation links; filter controls stacked and product cards remained in two columns. The chat opened with a visible message field and product cards that fit the panel and could be scrolled. No horizontal clipping was visible in the checked views.

## 3. Database-backed alternatives for unavailable items or sizes

When a product is confirmed out of stock, or a requested size has zero quantity or no inventory row, the Agent instructions ask it to clearly report that status and run a second catalogue search for similar products. It reuses `search_catalogue` with verified type or style terms, the requested size when present, `available_only=true`, and any stated maximum price. The tool reads current SQLite rows, so an alternative is offered only when its total stock or requested-size quantity is positive. The existing API collects records returned by both calls and displays them as catalogue cards.

This gives a shopper another path to a suitable purchase when the exact item or fit is unavailable. It can reduce dead ends and help Campus Customs retain a sale while keeping product and inventory claims grounded in the database.

**Checked on the website:** the chat confirmed `Baseball Left Chest Crewneck` has 0 units in XS, then returned a structured results shelf with 19 alternatives that each had positive XS stock. The response listed the real prices and size quantities. The requested product also remains in the shelf because it has stock in other sizes; the text explicitly distinguishes its unavailable XS from the alternatives. No product in the current database has zero total stock, so only the sold-out-size case could be verified with a real row.

## 4. Flexible text search in the chat Agent

The Agent's catalogue tool retains its existing substring search as the first pass. It also recognizes a small set of related terms: a `sweatshirt` query can include hoodies, a `hoodie` query remains specific, and `sweat shirt` or `sweat-shirt` is normalized to `sweatshirt`. If the existing search finds no complete match, a lightweight fallback checks catalogue text tokens for one insertion, deletion, substitution, or adjacent transposition in words of at least five characters. Exact searches keep precedence. This is lexical matching; it does not use embeddings or a vector database.

Customers can phrase requests with common alternate apparel terms or recover from a simple typo without needing to guess the exact catalogue wording. Keeping the prior search as the first pass limits changes to existing results.

**Checked on the website:** “What sweatshirts do you have?” returned 66 catalogue-backed cards through the chat. “Do you have pullover hoddie styles?” returned 25 matching pullover-hoodie cards despite the misspelling. A separate local tool check compared seven exact queries with the prior substring behavior and found identical product ID sets.

## Test boundary

The browser checks used the running local Frontend and FastAPI/Agent. Catalogue filtering, sorting, mobile layout, synonym search, typo search, and the sold-out-size alternative flow were exercised. The database contains no product with zero stock across every size, so that specific branch was not testable with a real catalogue record.
