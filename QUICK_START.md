# Quick Start

1. Install Node.js 18+ and PostgreSQL 14+.
2. Create database `chatter`.
3. `cd backend`
4. `npm install`
5. Copy `.env.example` to `.env`
6. Configure PostgreSQL and JWT_SECRET.
7. `npm run migrate`
8. `npm run dev`
9. In another terminal: `cd frontend`
10. `python -m http.server 5500`
11. Open `http://localhost:5500`

The frontend expects the API at `http://localhost:3000/api`.
