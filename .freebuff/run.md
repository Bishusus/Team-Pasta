# Run doc — Team-Pasta Academic Intelligence Platform

## How to reproduce the artifacts

No build artifacts are required for development. A fresh checkout needs:

1. **Frontend deps** (from the repo root):
   ```
   cd frontend && npm install
   ```
2. **Backend deps**: use the project venv at `.venv\` (FastAPI, uvicorn, SQLAlchemy, psycopg, pandas). If missing, recreate from `backend/requirements.txt` if present, else `pip install fastapi "uvicorn[standard]" sqlalchemy psycopg pandas python-dotenv`.
3. **Environment**: copy `.env` from the main checkout into the worktree root (contains `DATABASE_URL` for the Supabase PostgreSQL). Never commit it.

## How to run the servers

**Backend** (detached, Windows PowerShell):
```
powershell -NoProfile -Command "(Start-Process -FilePath '.venv\Scripts\python.exe' -ArgumentList '-m','uvicorn','backend.main:app','--host','127.0.0.1','--port','8000' -WorkingDirectory '<worktree-root>' -RedirectStandardOutput '<worktree-root>\.freebuff\preview-backend.log' -RedirectStandardError '<worktree-root>\.freebuff\preview-backend.log.err' -WindowStyle Hidden -PassThru).Id"
```
- Port 8000 is fixed: the Vite dev proxy targets `http://localhost:8000`.
- stdout and stderr go to DIFFERENT files (`preview-backend.log` / `preview-backend.log.err`) — PowerShell requires this.
- Health check: `curl http://127.0.0.1:8000/health` → `{"status":"ok","database":"connected"}`.
- Startup seeds the DB from `data/*.csv` and generates exam schedules. If startup hangs or dies, check `preview-backend.log.err` — a foreign-key violation there means stale seat assignments reference removed students (fixed in `backend/csv_loader.py` by clearing `generated_exam_seat_assignments`/`seat_assignments` before deleting stale students).

**Frontend** (detached, Windows PowerShell):
```
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--port','5173','--strictPort' -WorkingDirectory '<worktree-root>\frontend' -RedirectStandardOutput '<worktree-root>\.freebuff\preview-frontend.log' -RedirectStandardError '<worktree-root>\.freebuff\preview-frontend.log.err' -WindowStyle Hidden -PassThru).Id"
```
- If 5173 is taken (another thread/user server), use `--port 5174` (current live instance) and register that URL.
- Confirm the pid survives (`Get-Process -Id <pid>`) and the URL answers before registering the preview.

**Login (demo auth)**: frontend-only, no database. Students `student123`, teachers `teacher123`, admin username `admin` / password `admin123`.
