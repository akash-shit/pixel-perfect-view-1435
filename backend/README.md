# ScamShield Backend

Express API for account authentication, trusted contacts, rule-based scam analysis, and private scam-check history. MongoDB Atlas is accessed through Mongoose. The backend is independent of the frontend source tree.

## Install and run

Use Node.js 20 or newer.

```sh
cd backend
npm install
cp .env.example .env
npm run dev
```

Update `.env` locally before starting. Replace the Atlas password placeholder and use a long random `JWT_SECRET`. The server intentionally refuses to start while either value is still a setup placeholder. The connection string and password are never logged.

The default server is `http://localhost:5001`; `GET http://localhost:5001/api/health` returns `{ "success": true, "message": "Backend is running" }`.

## MongoDB Atlas

Create a database user with read/write access, allow the backend host in Atlas Network Access, and use a database URI ending in `/pixelPerfectDB`. Mongoose creates these collections:

- `users`
- `trustedcontacts`
- `scamchecks`

User email has a unique, lowercase index. Contact and check documents include timestamps and an indexed `userId` reference.

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port, default `5001` |
| `MONGODB_URI` | Private Atlas connection string |
| `JWT_SECRET` | Private signing key for session tokens |
| `CLIENT_URL` | Exact allowed frontend origin; comma-separated origins are supported |
| `NODE_ENV` | Set to `production` when deployed |
| `COOKIE_SAME_SITE` | Optional cookie policy; defaults to `lax` in development and `none` in production |

Only `.env.example` is committed. `.env` is ignored by both backend and root Git rules.

## Authentication

Registration validates name/email/password and stores a bcrypt hash, never a plain password. Login issues a seven-day JWT in the HTTP-only `scamshield_session` cookie. The cookie is `Secure` in production and uses `SameSite=Lax` in development. `GET /api/auth/me` verifies the cookie; `POST /api/auth/logout` clears it. Protected routes take the user ID only from the verified token.

## Trusted contacts

All contact endpoints require a session. Every list, update, and delete query includes the authenticated `userId`; clients cannot choose an owner. Contact relationships are restricted to Son, Daughter, Brother, Sister, Friend, Doctor, and Other. A contact ID that is not owned by the current user cannot be modified or deleted.

## Scam analysis

`POST /api/scam/analyze` accepts `type` (`message`, `link`, or `phone`) and `content`. The deterministic rule engine returns `riskScore`, `riskLevel`, `reasons`, `recommendedActions`, and `matchedSignals`. Thresholds and weights are centralized in `src/services/scamDetectionService.js`. A single suspicious URL keyword does not mark a link suspicious. Scores are explainable rule scores, not calibrated probabilities.

Before saving check history, common OTP, password, PIN, CVV, card, Aadhaar, and bank-account number patterns are redacted. `GET /api/scam/history`, `DELETE /api/scam/history`, and `DELETE /api/scam/history/:id` are scoped to the signed-in account.

## API endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/health` | Public |
| POST | `/api/auth/register` | Public, rate limited |
| POST | `/api/auth/login` | Public, rate limited |
| GET | `/api/auth/me` | Session required |
| POST | `/api/auth/logout` | Clears session cookie |
| GET | `/api/contacts` | Session required |
| POST | `/api/contacts` | Session required |
| PUT | `/api/contacts/:id` | Session and ownership required |
| DELETE | `/api/contacts/:id` | Session and ownership required |
| POST | `/api/scam/analyze` | Session required, rate limited |
| GET | `/api/scam/history` | Session required |
| DELETE | `/api/scam/history` | Session required |
| DELETE | `/api/scam/history/:id` | Session and ownership required |

Run automated non-Atlas checks with `npm test`. Full account persistence and two-user isolation checks require valid local Atlas credentials.