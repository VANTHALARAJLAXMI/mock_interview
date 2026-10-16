# AI-Powered Mock Interview Assistant

A web app for practising technical and HR interviews. It follows the project documentation:
**React + Vite** frontend, **Node.js + Express** backend, **Ollama Cloud API** as the AI provider,
browser **Web Speech API** (speech-to-text) and **SpeechSynthesis API** (read-aloud), and
**optional MongoDB** history.

> It is a practice aid. AI feedback and scores are estimates, not predictions of real interview results.

## Quick startuu

Requires **Node.js 18.18 or newer**.

```bash
npm install                # installs client + server (npm workspaces)
cp server/.env.example server/.env
npm run dev                # API on :5000, app on http://localhost:5173
```

With no API key the app starts in **demo mode** (built-in sample questions and rule-based feedback),
so you can try the whole interface straight away. A banner makes this obvious.

### Turn on the real AI

1. Create an API key at <https://ollama.com/settings/keys>.
2. Put it in `server/.env`:
   ```
   OLLAMA_API_KEY=your_key_here
   OLLAMA_MODEL=gpt-oss:120b
   ```
3. Restart `npm run dev`. The server log should say `Ollama Cloud enabled`.

The server calls `POST https://ollama.com/api/chat` with `Authorization: Bearer <key>`.
As the documentation advises, **confirm the endpoint, auth format and model names against the current
Ollama docs** (<https://docs.ollama.com/cloud>). Cloud models are occasionally retired; list what your
key can use with `curl -H "Authorization: Bearer $OLLAMA_API_KEY" https://ollama.com/api/tags`.
All provider-specific code lives in `server/src/ollama.js`.

## Features (mapped to the documentation)

| Documentation module | Where |
|---|---|
| Interview configuration (role, type, difficulty, topic) | `client/src/components/SetupForm.jsx`, validated in `server/src/validation.js` |
| AI question generation | `server/src/interviewAi.js` → `POST /api/interview/question` |
| Text answers + speech-to-text with consent note, listening indicator, editable transcript | `AnswerEditor.jsx`, `hooks/useSpeechRecognition.js` |
| Text-to-speech with play/stop and optional auto-read | `QuestionCard.jsx`, `hooks/useSpeechSynthesis.js` |
| Answer evaluation (strengths, improvements, suggested structure, advisory score) | `interviewAi.js` → `POST /api/interview/evaluate` |
| Performance report (+ download as Markdown, print) | `Report.jsx`, `utils/report.js` |
| Optional history: MongoDB or browser storage, with delete | `History.jsx`, `server/src/routes/history.js`, `client/src/services/history.js` |

## Configuration (`server/.env`)

| Variable | Purpose | Default |
|---|---|---|
| `OLLAMA_API_KEY` | Server-side credential. Empty = demo mode | empty |
| `OLLAMA_BASE_URL` | Ollama API host | `https://ollama.com` |
| `OLLAMA_MODEL` | Model used for questions and feedback | `gpt-oss:120b` |
| `OLLAMA_TIMEOUT_MS` | Request timeout | `60000` |
| `MOCK_AI` | Force demo mode `true`/`false` | on when no key |
| `PORT` | API port | `5000` |
| `CLIENT_ORIGIN` | Allowed browser origin(s), comma-separated (CORS) | `http://localhost:5173` |
| `RATE_LIMIT_PER_MINUTE` | Per-IP limit on AI endpoints | `20` |
| `TRUST_PROXY` | Reverse-proxy hops in front of the server | `0` |
| `MONGODB_URI` | Enables database history | empty |

## API

| Method and route | Purpose |
|---|---|
| `GET /api/config` | Role/type/difficulty lists, limits, demo and database flags |
| `POST /api/interview/question` | `{ role, interviewType, difficulty, topic?, previousQuestions? }` → `{ question }` |
| `POST /api/interview/evaluate` | `{ role, interviewType, difficulty, topic?, question, answer }` → `{ feedback }` |
| `POST /api/interviews` | Save a finished session (database mode) |
| `GET /api/interviews` | List this browser's sessions (`?page=&limit=`) |
| `GET /api/interviews/:id` | One session |
| `DELETE /api/interviews/:id` | Delete a session |

Feedback shape (validated and normalised by `server/src/feedback.js`):

```json
{
  "summary": "The answer addresses the main idea but needs a concrete example.",
  "strengths": ["Relevant concept", "Clear opening"],
  "improvements": ["Add an example", "Explain the trade-off"],
  "suggestedApproach": "Define the concept, explain how it works, and give an example.",
  "scoreEstimate": 7
}
```

## History storage

- **Default:** sessions are saved in this browser's `localStorage` (up to 50). Nothing leaves the device
  except the question and answer text sent to the AI through your backend.
- **MongoDB:** set `MONGODB_URI` and restart. The `Interviews` and `Answers` collections from the
  documentation are created automatically.

> **Important:** database history is scoped by a random anonymous ID stored in each browser, not by a
> login. That is fine for local use and demos. The documentation's optional **Users** collection and
> authentication are intentionally not included; add real accounts (and authorization checks) before
> hosting this publicly or storing anything sensitive.

## Security and privacy built in

- The AI key lives only in `server/.env`; the browser never sees it (no `VITE_*` secrets).
- Requests are validated server-side: allow-listed roles/types/difficulties, size limits, control-character stripping.
- Rate limiting on AI endpoints, CORS restricted to `CLIENT_ORIGIN`, JSON body size cap.
- Model output is parsed and normalised; malformed responses are retried once, then a safe error is shown.
- The candidate's answer is passed to the model as delimited data, with an instruction not to follow text inside it.
- Clients get generic error messages; details go to the server log only.
- Raw audio is never stored by this app. Browser speech services (for example Chrome/Edge) may process audio on their servers, and the microphone prompt says so.
- Users choose whether each session is saved and can delete saved sessions.

For production, also serve over HTTPS, review Ollama's data-handling terms, and set a retention policy.

## Production build

```bash
npm run build      # builds client/dist
npm start          # Express serves the API and the built app on PORT
```

The browser calls `/api/...` on the same host. That works locally through the Vite proxy and in
production because Express serves `client/dist` and the API together. Do not point those calls at
`localhost` after you deploy.

If the API is on another origin, set `VITE_API_BASE_URL` (for example `https://your-api.onrender.com`)
in `client/.env` before `npm run build`, and set `CLIENT_ORIGIN` to the frontend origin.

## Deploy on Render

This repo includes `render.yaml`. One free web service builds the client and starts Express. Render
sets `PORT`; the server listens on `0.0.0.0` and trusts the Render proxy so rate limiting still works.

1. Push this project to GitHub (do not commit `server/.env` or any API key).
2. In [Render](https://dashboard.render.com), choose **New → Blueprint** and select the repo.
3. When prompted, set `OLLAMA_API_KEY` (leave it blank for demo mode). `MONGODB_URI` and
   `CLIENT_ORIGIN` are optional.
4. Deploy. Open the service URL. `GET /api/health` should return `{ "ok": true }`, and the app
   should load on that same URL.

Speech recognition needs HTTPS. Render provides that. History stays in the browser unless you set
`MONGODB_URI`.

## Project structure

```
├── client/                    React + Vite app
│   └── src/
│       ├── components/        Setup, Interview, Question, Answer, Feedback, Report, History
│       ├── hooks/             useSpeechRecognition, useSpeechSynthesis, usePersistentState
│       ├── services/          api.js (fetch wrapper), history.js (database or browser store)
│       └── utils/             report helpers, storage helpers
└── server/                    Express API
    └── src/
        ├── ollama.js          the only file that talks to Ollama Cloud
        ├── interviewAi.js     prompts + response parsing
        ├── validation.js      request validation and allow-lists
        ├── feedback.js        feedback normalisation
        ├── demo.js            offline demo mode
        ├── db.js              optional MongoDB models
        └── routes/            interview.js, history.js
```

## Browser support

Typing, read-aloud and all other features work in current Chrome, Edge, Safari and Firefox where the
underlying API exists. **Speech recognition** is available in Chrome and Edge (and Safari to varying
degrees); Firefox does not support it, and the app falls back to typing with a clear message.

## Manual test checklist

These mirror the test plan in the documentation. They have **not** been run for you. Tick each one
after you test it, and record real results in your report.

- [ ] TC-01 Open the app: setup screen loads without errors
- [ ] TC-02 Choose role and difficulty: selections are used for the interview
- [ ] TC-03 Generate a question: a relevant question appears, or a clear error with Try again
- [ ] TC-04 Submit a typed answer: feedback appears
- [ ] TC-05 Allow microphone: speech is transcribed into the answer box
- [ ] TC-06 Deny microphone: a message explains it and typing still works
- [ ] TC-07 Read aloud: the question is spoken; Stop cancels it
- [ ] TC-08 Provider failure (wrong key or stop the network): a safe retry message, typed answer kept
- [ ] TC-09 Invalid or oversized input (`curl` the API with a bad role or a 10,000-character answer): rejected with 400
- [ ] TC-10 Search `client/dist` and the repository for your API key: not present
- [ ] TC-11 History (with MongoDB): another browser profile cannot see your sessions
- [ ] TC-12 Report: counts, averages and feedback match what you answered

## Troubleshooting

- **"Can't reach the server"**: start the API (`npm run dev`) and check `PORT` matches the Vite proxy in `client/vite.config.js`.
- **"The AI service rejected the server credentials"**: check `OLLAMA_API_KEY`; see the server log for the HTTP status.
- **"The configured AI model was not found"**: pick a model from `https://ollama.com/api/tags`.
- **Mic button missing or silent**: use Chrome or Edge, allow the microphone, and use `localhost` or HTTPS.
- **No read-aloud voice**: install a system text-to-speech voice for your language.
- **Database not used**: the server log says whether MongoDB connected; the History page names where sessions are stored.

## Known limitations

Matches the documentation: AI feedback can be wrong or inconsistent, speech recognition quality varies,
scores are advisory, and provider endpoints, models and limits can change. Questions are generated in
English. Future ideas from the documentation (resume analysis, voice conversation, video, multilingual,
charts, coding questions) are not implemented.
