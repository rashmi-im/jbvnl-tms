# ⚡ Jharkhand Bijli Vitran Nigam Limited (JBVNL)
## Transformer Failure & Replacement Management System (TFMS)

A clean, modular, and developer-friendly full-stack application built with **Python FastAPI**, **React + Vite**, and **PostgreSQL**.

---

## 🎯 Developer Principles & Architecture

This project was built to be **simple, readable, and maintainable** by any developer:

1. **No Over-Engineering**:
   - **Backend**: Uses standard FastAPI path operations, standard Pydantic models, and simple SQL statements.
   - **Frontend**: Standard React functional components with plain hooks (`useState`, `useEffect`, `useContext`).
2. **Clean Separation of Concerns**:
   - Each API domain has its own file inside `backend/app/routers/` (`auth`, `failure`, `dashboard`, `report`, `master`, `notification`).
   - Every UI screen has a single dedicated file inside `frontend/src/pages/`.
3. **Dual Database Engine**:
   - Primary: **PostgreSQL** (`tms_db`).
   - Fallback: **SQLite** (`tms.db`) for lightweight local offline work.

---

## 📁 Codebase Directory Structure

```text
tms/
├── backend/                        # 🐍 Python FastAPI Backend
│   ├── app/
│   │   ├── config.py               # Constants, environment variables & paths
│   │   ├── database.py             # PostgreSQL / SQLite DB adapter & schemas
│   │   ├── security.py             # Security headers, rate limiting & sanitization
│   │   ├── models.py               # Pydantic request & data schemas
│   │   ├── auth.py                 # User authentication & role permissions (RBAC)
│   │   ├── audit.py                # Immutable audit log & notifications
│   │   ├── scheduler.py            # Automated 24h/48h escalation & daily snapshot job
│   │   └── routers/                # Modular API Route Handlers
│   │       ├── auth_router.py      # /api/login, /api/logout, /api/me
│   │       ├── failure_router.py   # /api/failures (CRUD, approvals, replacement)
│   │       ├── dashboard_router.py # /api/dashboard (KPIs & officer directory)
│   │       ├── report_router.py    # /api/report/daily (JSON & CSV export)
│   │       ├── master_router.py    # /api/master & /api/admin/*
│   │       └── notification_router.py # /api/notifications
│   ├── uploads/                    # Photo storage directory
│   ├── Procfile                    # Cloud service deployment configuration
│   ├── Dockerfile                  # Backend container configuration
│   ├── requirements.txt            # Python dependencies (fastapi, psycopg2, etc.)
│   ├── migrate_to_postgres.py      # SQLite -> PostgreSQL migration tool
│   └── main.py                     # App entry point (`python main.py`)
│
├── frontend/                       # ⚛️ React + Vite Frontend
│   ├── public/
│   │   ├── jbvnl_logo.png          # Official JBVNL logo asset
│   │   ├── security.txt            # Security disclosure policy (RFC 9116)
│   │   └── robots.txt              # Search engine crawler policies
│   ├── src/
│   │   ├── components/             # Reusable UI components (Navbar, StatusBadge, PhotoModal)
│   │   ├── context/                # AuthContext (user session state)
│   │   ├── pages/                  # Main UI Screens (Dashboard, Failures, Admin, etc.)
│   │   ├── services/               # API fetch helper (`api.js`)
│   │   ├── App.jsx                 # Navigation router & page layout
│   │   └── index.css               # Clean JBVNL design system
│   ├── Dockerfile                  # Frontend container configuration
│   ├── nginx.conf                  # Nginx proxy configuration
│   ├── package.json                # Frontend dependencies (react, lucide-react)
│   └── vite.config.js              # Vite dev server configuration with API proxy
│
├── docker-compose.yml              # Local/VPS Docker deployment configuration
├── render.yaml                     # Render.com 1-click cloud deployment blueprint
└── README.md                       # Developer guide
```

---

## 💻 How to Run & Develop

### 1. Backend Server
```bash
cd backend
./venv/bin/python main.py
```
*Backend runs on `http://localhost:8000`*

### 2. Frontend Dev Server
```bash
cd frontend
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 🔑 Default User Accounts (Password: `ChangeMe@123`)

| Role | Username (`emp_id`) | Permission Scope |
| :--- | :--- | :--- |
| **System Admin** | `admin` | Full system access & master data management |
| **Assistant Engineer** | `ae1` | Approves failures & replacement entries |
| **Junior Engineer** | `je1` | Reports failures & submits replacement details |
| **Circle Officer** | `circle1` | Circle-wide reporting & metrics |
| **Division Officer** | `div1` | Division-wide reporting & metrics |

---

## 🛠️ How to Extend the Code (Developer Cheat Sheet)

### Adding a New API Endpoint:
1. Open the relevant file in `backend/app/routers/` (e.g. `failure_router.py`).
2. Add your FastAPI endpoint function:
   ```python
   @router.get("/custom-endpoint")
   def my_custom_endpoint(user: dict = Depends(get_current_user)):
       with get_db() as c:
           rows = c.execute("SELECT * FROM my_table WHERE user_id=?", (user["id"],)).fetchall()
           return rows
   ```

### Adding a New UI Component / Page:
1. Create a JSX file in `frontend/src/pages/MyNewPage.jsx`.
2. Import and call `apiCall('custom-endpoint')` from `../services/api`.
3. Register the route in `frontend/src/App.jsx`.

---

## 🌐 Cloud Deployment

- **Render.com**: Connect your GitHub repository and select **New Blueprint** (uses `render.yaml`).
- **Docker Compose**: Run `docker compose up -d --build` on any Linux VPS.
