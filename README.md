# Pixel Perfect Screenshot / Scam Protection

An accessible Scam Safety Assistant for older adults. The existing React, Tailwind, and TanStack Start interface is kept in `frontend/`; the separate Express API and MongoDB models live in `backend/`.

## Project structure

```text
project-root/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── backend/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── README.md
├── .gitignore
└── README.md
```

There is no project-root `src/`. TanStack Start supplies the HTML shell, so the frontend does not use a standalone `index.html` entry point.

Static guides, alerts, quiz questions, organizations, and demo charts remain in `frontend/src/data/content.ts`. User accounts, trusted contacts, and scam-check history are handled by the backend.

## Requirements

- Node.js 20 or newer
- npm
- A MongoDB Atlas database and database user

## Configure the backend

Create the local env file if one does not exist:

```sh
cp backend/.env.example backend/.env
```

Edit `backend/.env` locally. Replace the MongoDB URI password placeholder with your Atlas database user's password, and set `JWT_SECRET` to a long random value (for example, generate one with `openssl rand -hex 32`). Never commit or share `backend/.env`.

In MongoDB Atlas, allow the development machine's IP address in Network Access and ensure the database user has read/write access to `pixelPerfectDB`. The application creates its collections and indexes through Mongoose.

## Run the applications

Terminal 1:

```sh
cd backend
npm install
npm run dev
```

Backend: `http://localhost:5001`  
Health check: `http://localhost:5001/api/health`

Terminal 2:

```sh
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend: `http://localhost:5174`

The frontend API URL is `VITE_API_BASE_URL`, defaulting to `http://localhost:5001/api`. `CLIENT_URL` in the backend must match the frontend origin. For production, configure HTTPS, an exact frontend origin, a strong private JWT secret, and secure cookie settings for the hosting domains.

## Authentication and privacy

Passwords are hashed with bcryptjs. A signed JWT is kept in an HTTP-only cookie; it is never written to browser storage. Authenticated requests derive the user ID from the verified cookie. Contact and scam-history database queries are scoped to that user. Logout clears the cookie and frontend account state.

Scam analysis uses deterministic, configurable rules. Its `Risk Score` is not a scientifically calibrated probability. Common OTPs, passwords, PINs, card numbers, Aadhaar numbers, and account numbers are redacted before check history is saved. The original static analysis examples and educational content are retained, but live checks are sent to the backend.

## API overview

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Create an account and session |
| POST | `/api/auth/login` | No | Sign in and set session cookie |
| GET | `/api/auth/me` | Yes | Restore current session |
| POST | `/api/auth/logout` | No | Clear session cookie |
| GET, POST | `/api/contacts` | Yes | List or add trusted contacts |
| PUT, DELETE | `/api/contacts/:id` | Yes | Update or remove an owned contact |
| POST | `/api/scam/analyze` | Yes | Analyze and save a check |
| GET | `/api/scam/history` | Yes | List the signed-in user's checks |
| DELETE | `/api/scam/history` | Yes | Clear the signed-in user's checks |
| DELETE | `/api/scam/history/:id` | Yes | Remove one owned check |

Automated backend checks run with `cd backend && npm test`. Frontend production build runs with `cd frontend && npm run build`.