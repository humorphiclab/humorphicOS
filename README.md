# HumorphicOS

AI-powered operating system for robotics clubs and organizations.

## Quick Start

```bash
# Copy env
cp .env.example .env

# Backend (local)
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
set DATABASE_URL=sqlite:///db.sqlite3
python manage.py migrate
python manage.py seed_roles
python manage.py seed_demo
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

**Demo login:** `president@humorphic.club` / `Demo@12345`

## All Modules (Complete)

### Phase 1 — MVP
- Authentication (JWT + Google OAuth)
- RBAC (8 roles, granular permissions)
- Dashboard, Members, Departments, Teams
- Projects, Tasks (Kanban), Daily Updates
- Meetings, Announcements, Notifications
- Reports + Email Automation (Celery Beat)

### Phase 2
- Attendance (Manual, QR, Face stub)
- Robotics Inventory (Components, Equipment, Lab Booking)
- Knowledge Base, Certificates, Events
- Internal Chat (Channels + DMs)
- Gamification (XP, Badges, Leaderboard)
- Analytics Dashboard, Global Search

### Phase 3
- AI Assistant + Summaries (OpenAI optional)
- Multi-Organization support
- Public Portal (`/portal`)
- WhatsApp integration stub (env vars ready)
- Face attendance stub (image upload endpoint)

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Public Portal | http://localhost:3000/portal |
| API | http://localhost:8000/api/v1/ |
| API Docs | http://localhost:8000/api/docs/ |

## Docker

```bash
# Update .env DATABASE_URL for Docker:
# DATABASE_URL=postgres://humorphic:humorphic@db:5432/humorphic
docker compose up --build
```

## API Endpoints

```
/api/v1/auth/          — Login, Register, Google OAuth, Dashboard
/api/v1/departments/   — Departments CRUD
/api/v1/teams/         — Teams CRUD
/api/v1/projects/      — Projects + Milestones
/api/v1/tasks/         — Tasks, Kanban, Comments
/api/v1/daily-updates/ — Daily work updates + compliance
/api/v1/meetings/      — Meetings + attendance
/api/v1/attendance/    — Records, QR, Face, Leaves, Holidays
/api/v1/announcements/ — Announcements
/api/v1/notifications/ — In-app notifications
/api/v1/reports/       — Report generation
/api/v1/inventory/     — Components, Equipment, Lab bookings
/api/v1/knowledge/     — Knowledge base articles
/api/v1/certificates/  — Certificate generation + verification
/api/v1/events/        — Events + registrations
/api/v1/chat/          — Team channels + direct messages
/api/v1/gamification/  — XP, badges, leaderboard
/api/v1/ai/            — AI chat, summarize, insights
/api/v1/calendar/      — Unified calendar view
/api/v1/search/        — Global search
/api/v1/analytics/     — Leadership analytics
/api/v1/organizations/ — Multi-org support
```

## Environment Variables

See `.env.example` for all options including `GOOGLE_CLIENT_ID`, `OPENAI_API_KEY`, `WHATSAPP_API_URL`.

## Tech Stack

Next.js · TypeScript · Tailwind · Django · DRF · PostgreSQL · Redis · Celery · MinIO
