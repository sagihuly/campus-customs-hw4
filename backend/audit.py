"""Append-only, privacy-filtered audit records for the shopping Agent."""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import uuid

if os.name == "nt":
    import msvcrt
else:
    import fcntl

PROJECT_DIR = Path(__file__).resolve().parents[1]
AUDIT_TRAIL_PATH = PROJECT_DIR / "output" / "audit_trail.json"
logger = logging.getLogger(__name__)


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


@contextmanager
def _exclusive_lock(stream):
    """Lock the audit file across processes on Unix and Windows."""
    if os.name == "nt":
        # msvcrt locks from the current position; byte zero may be past EOF.
        stream.seek(0)
        msvcrt.locking(stream.fileno(), msvcrt.LK_LOCK, 1)
    else:
        fcntl.flock(stream.fileno(), fcntl.LOCK_EX)
    try:
        yield
    finally:
        if os.name == "nt":
            stream.seek(0)
            msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
        else:
            fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def _append_event(event: dict) -> None:
    """Append one object to a valid JSON array without replacing prior records."""
    descriptor = None
    try:
        AUDIT_TRAIL_PATH.parent.mkdir(parents=True, exist_ok=True)
        descriptor = os.open(AUDIT_TRAIL_PATH, os.O_CREAT | os.O_RDWR | getattr(os, "O_BINARY", 0), 0o600)
        if hasattr(os, "fchmod"):
            os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "r+b") as stream:
            descriptor = None
            with _exclusive_lock(stream):
                original = stream.read()
                if not original.strip():
                    original = b"[]\n"
                    stream.seek(0)
                    stream.write(original)
                    stream.flush()

                entries = json.loads(original.decode("utf-8"))
                if not isinstance(entries, list):
                    raise ValueError("audit trail must be a JSON array")
                closing_bracket = original.rfind(b"]")
                if closing_bracket < 0 or original[closing_bracket + 1 :].strip():
                    raise ValueError("audit trail JSON array is incomplete")

                encoded = json.dumps(
                    {"timestamp": _timestamp(), **event},
                    ensure_ascii=False,
                    separators=(",", ":"),
                ).encode("utf-8")
                # Keep the prior records byte-for-byte; replace only the final array delimiter.
                stream.seek(closing_bracket)
                stream.truncate(closing_bracket)
                stream.write((b",\n" if entries else b"\n") + encoded + b"]\n")
                stream.flush()
                os.fsync(stream.fileno())
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError):
        # Audit failure must not expose details or break shopping; malformed files are preserved.
        logger.warning("Could not append to the Agent audit trail.")
    finally:
        if descriptor is not None:
            os.close(descriptor)


def start_agent_run() -> str:
    run_id = uuid.uuid4().hex
    _append_event({"run_id": run_id, "event_type": "agent_started"})
    return run_id


def record_catalogue_search(
    run_id: str,
    *,
    query: str,
    max_price: float | None,
    size: str | None,
    available_only: bool,
    matched_products: int | None = None,
    in_stock_matches: int | None = None,
    error_type: str | None = None,
) -> None:
    """Record a safe argument summary and aggregate result; never persist raw search text."""
    arguments = {
        "free_text_query_provided": bool(query.strip()),
        "query_word_count": min(len(query.split()), 20),
        "price_limit_provided": max_price is not None,
        "size_filter_provided": bool(size and size.strip()),
        "available_only": bool(available_only),
    }
    event = {
        "run_id": run_id,
        "event_type": "tool_failed" if error_type else "tool_completed",
        "tool": "search_catalogue",
        "arguments": arguments,
        "result": (
            {"status": "error", "error_type": error_type}
            if error_type
            else {
                "matched_products": max(0, int(matched_products or 0)),
                "in_stock_matches": max(0, int(in_stock_matches or 0)),
            }
        ),
    }
    _append_event(event)


def record_product_lookup(
    run_id: str,
    *,
    product_id: str,
    found: bool | None = None,
    total_stock: int | None = None,
    size_rows: int | None = None,
    error_type: str | None = None,
) -> None:
    """Record lookup presence and aggregate result without the supplied identifier."""
    event = {
        "run_id": run_id,
        "event_type": "tool_failed" if error_type else "tool_completed",
        "tool": "get_product_details",
        "arguments": {"product_identifier_provided": bool(product_id.strip())},
        "result": (
            {"status": "error", "error_type": error_type}
            if error_type
            else {
                "product_found": bool(found),
                "total_stock": max(0, int(total_stock or 0)) if found else None,
                "inventory_size_rows": max(0, int(size_rows or 0)) if found else 0,
            }
        ),
    }
    _append_event(event)


def stop_agent_run(
    run_id: str,
    reason: str,
    *,
    tool_calls: int,
    status_code: int | None = None,
    error_type: str | None = None,
) -> None:
    event = {
        "run_id": run_id,
        "event_type": "agent_stopped",
        "stop_reason": reason,
        "tool_calls": max(0, int(tool_calls)),
    }
    if status_code is not None:
        event["status_code"] = int(status_code)
    if error_type:
        event["error_type"] = error_type
    _append_event(event)
