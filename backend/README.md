# ScamShield Backend

Express API for account authentication, trusted contacts, rule-based scam analysis, multilingual assistant responses, and private scam-check history. MongoDB Atlas is accessed through Mongoose. The backend is independent of the frontend source tree.

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
| `AI_API_KEY` | Private API key for the configured OpenAI-compatible AI service |
| `AI_API_URL` | Private chat-completions endpoint used by scam analysis and the assistant |
| `AI_MODEL` | Model name accepted by that endpoint |
| `WHISPER_MODEL` | Local multilingual `faster-whisper` model; defaults to `tiny` |
| `WHISPER_DEVICE` | Inference device; defaults to `cpu` for Apple Silicon compatibility |
| `WHISPER_COMPUTE_TYPE` | Inference precision; defaults to `int8` to reduce memory use |
| `WHISPER_PYTHON` | Optional path to the Python executable used for local Whisper |
| `WHISPER_DOWNLOAD_ROOT` | Optional local directory for the downloaded model cache |
| `WHISPER_MODEL_INIT_TIMEOUT_MS` | Maximum lazy download/model startup time; defaults to 2700000 ms (45 minutes), maximum 3600000 ms |
| `WHISPER_DOWNLOAD_ATTEMPTS` | Attempts per model before trying a smaller fallback; defaults to 5 |
| `HF_HUB_DOWNLOAD_TIMEOUT` | Hugging Face HTTP read timeout in seconds; defaults to 120 |

Only `.env.example` is committed. `.env` is ignored by both backend and root Git rules.
The assistant requires all three AI settings. Keep the key only in the backend environment; it is never sent to the browser. It sends only the user's current question and selected language, not chat history or account data.

## Authentication

Registration validates name/email/password and stores a bcrypt hash, never a plain password. Login issues a seven-day JWT in the HTTP-only `scamshield_session` cookie. The cookie is `Secure` in production and uses `SameSite=Lax` in development. `GET /api/auth/me` verifies the cookie; `POST /api/auth/logout` clears it. Protected routes take the user ID only from the verified token.

## Trusted contacts

All contact endpoints require a session. Every list, update, and delete query includes the authenticated `userId`; clients cannot choose an owner. Contact relationships are restricted to Son, Daughter, Brother, Sister, Friend, Doctor, and Other. A contact ID that is not owned by the current user cannot be modified or deleted.

## Scam analysis

`POST /api/scam/analyze` accepts `type` (`message`, `link`, or `phone`) and `content`. The deterministic rule engine returns `riskScore`, `riskLevel`, `reasons`, `recommendedActions`, and `matchedSignals`. Thresholds and weights are centralized in `src/services/scamDetectionService.js`. A single suspicious URL keyword does not mark a link suspicious. Scores are explainable rule scores, not calibrated probabilities.

Before saving check history, common OTP, password, PIN, CVV, card, Aadhaar, and bank-account number patterns are redacted. `GET /api/scam/history`, `DELETE /api/scam/history`, and `DELETE /api/scam/history/:id` are scoped to the signed-in account.

## Voice assistant

`POST /api/assistant/respond` requires a valid session and accepts a question (up to 1,200 characters) and `language` (`en`, `hi`, or `bn`). It answers greetings and common ScamShield questions in the selected language without an external service; other questions use the configured AI service. Common OTP, password, PIN, CVV, Aadhaar, bank-account, and card-number patterns are redacted before forwarding. Requests are limited to 12 per minute per client. Do not include secrets in a question.

The frontend records up to 60 seconds of microphone audio with `MediaRecorder`. After the user stops recording, it uploads the audio and selected language (`en`, `hi`, or `bn`) to the authenticated `POST /api/assistant/transcribe` route. A persistent local `faster-whisper` worker uses the multilingual `tiny` model on CPU with `int8` by default; it initializes only for the first transcription request and reuses the loaded model for subsequent requests. `tiny` is smaller and quicker to fetch than `base`, while still supporting English, Hindi, and Bengali; recognition quality can be lower, especially for noisy audio and less common words. Set `WHISPER_MODEL=base` for a larger, potentially more accurate option. Files are cached under `~/.cache/scamshield/whisper` by default. Audio is processed locally and is not sent to OpenAI or another transcription provider. No transcription API key is needed. The route accepts audio up to 10 MB and serializes inference through one loaded model instance. WebM/Opus and MP4/M4A recordings are supported; the worker probes and decodes the actual container rather than trusting the filename extension. Transcription never submits the question automatically: the recognized words are placed in the editable input for the user to review and send.

For microphone troubleshooting, browser logs report recording MIME type, non-empty chunk count, byte size, duration, and non-identifying audio-track settings. Backend logs report received bytes/MIME, detected container, decoded duration, RMS/peak signal levels, and transcript character count; they never log audio bytes or transcript text. Digital silence is reported separately from non-empty audio that Whisper cannot understand. If silence is reported, check the selected/default microphone, OS input level, browser microphone permission, and that the browser is not using a muted or virtual input.

The downloader uses the documented `huggingface_hub.snapshot_download` cache, disables the optional Xet transfer path, retries transient network resets/timeouts up to five times with bounded backoff, and keeps Hugging Face partial files in the same cache so interrupted downloads can resume. A configured `base` model falls back to the smaller multilingual `tiny` checkpoint if it cannot be fetched. The default 45-minute initialization window accounts for slow transfer speeds; configure `WHISPER_MODEL_INIT_TIMEOUT_MS` (30 seconds to 60 minutes) to suit the network. The active/requested model and readiness state are reported by `GET /api/health` under `speechToText`. A backend can therefore be healthy while speech transcription is still `not_started`, `initializing`, or `unavailable`; status checks do not trigger a model download. Failed model initialization is isolated in the worker process and does not terminate the Express server.

### Install and start local Whisper on macOS

Use Python 3.10–3.13 and Node.js 20+. On Apple Silicon, the `tiny` model with CPU `int8` is the default to minimize initial download and memory use. It is multilingual (including English, Hindi, and Bengali), but can be less accurate than `base`, especially on noisy audio and less common words. The larger `base` model can be selected with `WHISPER_MODEL=base`; larger values such as `small` require more download and memory. PyAV, included by `faster-whisper`, decodes browser WebM/Opus recordings; a separately installed FFmpeg command is not required.

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-speech.txt
npm install
```

To download and initialize the configured model before starting the app (optional; this uses the same retry, resume, and fallback path as the server):

```sh
python src/services/localWhisperWorker.py --download-only
```

Then start the backend:

```sh
npm run dev
```

In a second terminal, start the frontend:

```sh
cd frontend
npm install
npm run dev
```

The backend automatically uses `backend/.venv/bin/python3` when present. The first transcription downloads and caches the model if you skipped preloading; keep the backend running so subsequent requests reuse the loaded model. Set `WHISPER_DOWNLOAD_ROOT` to change the cache directory. `WHISPER_MODEL` can be set to a multilingual `faster-whisper` size such as `tiny`, `base`, or `small`. The server does not need to expose any Whisper/Hugging Face token for these public model repositories.

The frontend uses browser speech synthesis for spoken answers where a voice for the selected language is installed. Voice input asks for microphone permission and displays the transcript for review before it is sent. The preferred transcription path is local Whisper. If model download or initialization fails, supported browsers offer an explicit browser-recognition fallback. This fallback is not local: the browser may send speech to its vendor's recognition service, typically needs an internet connection, and support and language accuracy vary by browser and operating system. The UI explains this before the user opts in. Audio is not uploaded to the ScamShield backend until the user stops recording.

To test the actual microphone flow, start both servers, sign in, choose one of the supported languages, click the microphone, speak, and click **Stop**. Wait for the text to appear in the input, edit it if needed, then press **Send** manually. The first request may take longer while the model loads. `GET http://localhost:5001/api/health` reports speech-model readiness without initiating a download. Run `npm test` and `.venv/bin/python test/localWhisperWorker.test.py` from `backend` to check route validation, retry, fallback, failure, invalid audio, and model reuse behavior. These automated unit tests do not substitute for testing with a real microphone and downloaded model.

#### Download troubleshooting and limits

- A connection reset, timeout, or Xet/CAS error is a network transfer failure, not a missing speech package. Xet is disabled for this worker because the model is public and the Hub's normal HTTP downloader supports cached partial-file resume. A reset even with Xet disabled means the connection to the Hub/CDN is also unstable; the worker retries, retains partial cache data, and tries the smaller `tiny` model after exhausting retries for the configured model.
- If `huggingface.co` is blocked or unreachable from the machine, neither model can be fetched. There is no safe way to produce real local transcripts without the weights; the API reports `unavailable` and the assistant keeps text input usable. Do not delete the cache to recover from an interrupted transfer.
- Increase `HF_HUB_DOWNLOAD_TIMEOUT` for a very slow but functioning connection, or increase `WHISPER_MODEL_INIT_TIMEOUT_MS` (up to 60 minutes) if downloading a larger model. Model initialization occurs inside a child process and is bounded by this timeout.
- `tiny` uses less disk/RAM and can recover from a smaller transfer budget, but recognition quality may be lower. The model is not guaranteed to understand every accent or recording condition. Hindi and Bengali are multilingual-model capabilities, not separately certified accuracy guarantees.

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
| POST | `/api/assistant/respond` | Session required and rate limited |
| POST | `/api/assistant/transcribe` | Session required, rate limited, and processed by local Whisper |

Run automated non-Atlas checks with `npm test`. Full account persistence and two-user isolation checks require valid local Atlas credentials.