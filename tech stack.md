# LifeSync AI — Tech Stack

## Frontend

| Category | Technology | Version | Purpose |
|---|---|---|---|
| Framework | **Next.js** | 16.2.12 | React-based full-stack web framework with App Router |
| UI Library | **React** | 19.2.4 | Component-based UI rendering |
| Language | **TypeScript** | ^5 | Static typing for JavaScript |
| Styling | **Tailwind CSS** | ^4 | Utility-first CSS framework |
| Component Library | **shadcn/ui** | ^4.15.0 | Pre-built accessible UI components |
| Base UI | **@base-ui/react** | ^1.6.0 | Headless accessible primitives |
| Icons | **Lucide React** | ^1.27.0 | Icon set used throughout the UI |
| Class Utilities | **clsx** | ^2.1.1 | Conditional className merging |
| Class Utilities | **class-variance-authority** | ^0.7.1 | Component variant management |
| Class Utilities | **tailwind-merge** | ^3.6.0 | Merging Tailwind classes without conflicts |
| Animations | **tw-animate-css** | ^1.4.0 | CSS animation utilities for Tailwind |
| Linting | **ESLint** | ^9 | Code quality enforcement |

---

## Backend

| Category | Technology | Version | Purpose |
|---|---|---|---|
| Framework | **FastAPI** | 0.111.0 | High-performance async Python REST API |
| Server | **Uvicorn** | 0.30.1 | ASGI server for running FastAPI |
| ORM | **SQLAlchemy** | 2.0.31 | Database ORM for model definitions and queries |
| Migrations | **Alembic** | 1.13.1 | Database schema migration management |
| Validation | **Pydantic** | 2.8.2 | Data validation and serialisation |
| Settings | **pydantic-settings** | 2.3.4 | Environment-based configuration management |
| Auth — Passwords | **passlib[bcrypt]** | 1.7.4 | Secure password hashing with bcrypt |
| Auth — JWT | **python-jose[cryptography]** | 3.3.0 | JWT access & refresh token generation/verification |
| File Upload | **python-multipart** | 0.0.9 | Multipart/form-data parsing for file uploads |
| AI / LLM | **LangChain** | >=0.3.0 | AI chain orchestration for RAG assistant |
| AI / LLM | **langchain-openai** | >=0.2.0 | OpenAI LLM integration via LangChain |
| OCR | **pytesseract** | >=0.3.10 | Optical character recognition for uploaded documents |
| Image Processing | **Pillow** | 10.4.0 | Image manipulation and preprocessing for OCR |
| Env Management | **python-dotenv** | 1.0.1 | Loading environment variables from `.env` files |
| Testing | **pytest** | 8.2.2 | Backend unit and integration testing |
| HTTP Testing | **httpx** | 0.27.0 | Async HTTP client used for API tests |
| Database Driver | **psycopg2-binary** | >=2.9.0 | PostgreSQL adapter for SQLAlchemy |

---

## Database

| Technology | Purpose |
|---|---|
| **SQLite** | Local development database (auto-created, no setup needed) |
| **PostgreSQL** | Production database (via Docker) |
| **pgvector** (`ankane/pgvector`) | PostgreSQL extension for AI vector embeddings |

---

## Infrastructure & DevOps

| Technology | Purpose |
|---|---|
| **Docker** | Containerisation of backend and frontend services |
| **Docker Compose** | Multi-service orchestration (db + backend + frontend) |

---

## Key Features & Patterns Used

| Feature | Implementation |
|---|---|
| Authentication | JWT access tokens + refresh tokens stored in `localStorage` |
| Role-based access | `role` field on `User` model (`user` / `admin`) |
| File storage | Local filesystem (`/backend/storage/`) with `FileResponse` serving |
| Document classification | Rule-based folder classifier + AI metadata extraction |
| Cross-domain risk engine | Python service that correlates docs across folders to surface risks |
| AI RAG Assistant | LangChain + OpenAI GPT querying user document content |
| OCR | pytesseract + Pillow for extracting text from uploaded images/PDFs |
| Email verification | Token-based email verification flow |
| Password reset | Secure token-based password reset flow |
