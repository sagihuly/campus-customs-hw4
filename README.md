# Campus Customs — HW4

A React/Vite/TypeScript storefront with a FastAPI product and account API and a PydanticAI shopping agent routed through Portkey. Product facts and images are loaded from the course data pack. The data pack, its SQLite database, product images, local environment files, and API secrets are intentionally excluded from GitHub.

## Requirements and data pack

Install Python 3.10 or newer, Node.js 20.19+ or 22.12+ (or a newer supported version), and npm. Obtain the instructor-provided `data.zip` separately and place it in the project root (`hw4/data.zip`). The archive already contains a top-level `data/` directory. From the `hw4` root, extract it with:

```bash
unzip -o data.zip -d .
```

On Windows PowerShell, extract it with:

```powershell
Expand-Archive -Path .\data.zip -DestinationPath . -Force
```

The required local paths are then `data/campus_customs.db` and `data/products/`. The application cannot serve real products or images without this pack. Keep both `data/` and `data.zip` local; the repository `.gitignore` excludes them.

## Install

From the project root:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cd frontend
npm ci
```

On Windows PowerShell, from the project root:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Set-Location frontend
npm ci
```

The committed `frontend/package-lock.json` lets `npm ci` install the recorded frontend dependencies. Run the backend and frontend in separate terminals after installation.

## Configure the backend environment

Get a Portkey API key with access to the OpenAI provider. Set `PORTKEY_API_KEY` only in the backend process environment. Set `CAMPUS_CUSTOMS_SESSION_SECRET` to a long random value for stable signed sessions. `.env` is ignored by Git. The Python app does not load `.env` automatically, so on macOS/Linux you can copy `.env.example` to `.env`, replace its placeholders, and export its settings into the backend shell before starting the server:

```bash
cp .env.example .env
# Edit .env and replace the placeholder values.
set -a
. ./.env
set +a
```

On Windows PowerShell, set the values in the backend terminal; PowerShell does not automatically load `.env`:

```powershell
$env:PORTKEY_API_KEY = "your-real-portkey-key"
$env:CAMPUS_CUSTOMS_SESSION_SECRET = "your-long-random-session-secret"
# Optional: $env:PORTKEY_MODEL = "gpt-6-luna"
```

The default model is `gpt-6-luna`. Its Chat Completions tool calls use `reasoning_effort=none`. If the grader's Portkey account does not have access to that model, set `PORTKEY_MODEL` to a model that account can use. Optional routing settings are `PORTKEY_MODEL`, `PORTKEY_PROVIDER` (default `openai`), and `PORTKEY_BASE_URL`. Set `CAMPUS_CUSTOMS_COOKIE_SECURE=true` when serving over HTTPS. Never put a real key or session secret in Git.

## Run the backend

In the backend terminal, after activating/configuring the environment above:

```bash
cd backend
../.venv/bin/python -m uvicorn main:app --reload --port 8000
```

On Windows PowerShell, from the project root after setting the backend environment variables:

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

When the virtual environment is active and Uvicorn is on `PATH`, the equivalent command from `backend/` is:

```bash
uvicorn main:app --reload --port 8000
```

Uvicorn needs the ASGI target in `module:attribute` form. The shorthand `uvicorn main --reload --port 8000` omits the `:app` target and does not start this FastAPI application.

## Run the frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`). Vite forwards `/api` requests to FastAPI at `http://127.0.0.1:8000`.

For a single-process production-style run, build the frontend with `cd frontend && npm run build`, then run `.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000` from the project root (on Windows, use `.\.venv\Scripts\python.exe` instead). FastAPI serves the built `frontend/dist` files.

## Accounts and data handling

Create account and Log in use `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, and `/api/auth/logout`. New passwords are stored as salted PBKDF2-HMAC-SHA256 hashes and are never returned to the frontend. Sessions use a signed, HttpOnly, SameSite=Lax cookie with a seven-day lifetime.

Catalogue and image routes read SQLite without modifying it. Account registration and the legacy password-hash upgrade write only to the `users` table. The database has no currency column; the storefront displays USD based on the store context.
