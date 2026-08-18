# Room Planner MVP

A full-stack room and interior layout planner.

## Current stack

- Frontend: Next.js + React + TypeScript + Tailwind CSS
- Backend: FastAPI + Python
- Database: MongoDB Atlas (connection prepared, not required for the first run)
- AI: Not used yet
- Layout engine: will be added in the next development stage

## Project structure

```text
room-planner-mvp/
├── frontend/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   └── api.ts
│   ├── .env.local.example
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── room.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       └── rooms.py
│   ├── .env.example
│   └── requirements.txt
│
└── .gitignore
```

## 1. Backend setup

Open a terminal in `backend/`.

### Windows

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend:
`http://127.0.0.1:8000`

API documentation:
`http://127.0.0.1:8000/docs`

## 2. Frontend setup

Open a second terminal in `frontend/`.

```powershell
npm install
npm run dev
```

Frontend:
`http://localhost:3000`

The frontend already calls the FastAPI health endpoint.

## 3. MongoDB

MongoDB is prepared through environment variables but is not required for the current milestone.

Copy:

```text
backend/.env.example -> backend/.env
```

and add your MongoDB Atlas connection string when we reach the persistence stage.

For GitHub, never commit `.env`.

## 4. Git

From the project root:

```powershell
git init
git add .
git commit -m "Initial full-stack MVP setup"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

## Development plan

1. Project setup and frontend/backend connection
2. Room dimensions
3. Doors and windows
4. Furniture
5. Interactive 2D editor
6. Geometry and collision detection
7. Layout generation
8. Layout scoring
9. MongoDB persistence
10. AI features
