# eSiri × e-Mrejesho — Code Map

This document describes what is built in this repository today. Every claim points to a file and a function or component. Where something is uncertain or not verified, it says so. The real snapshot and model trace in sections 9 and 10 were captured from the running app on 2026-10-05 with the project's `.env` key and model `gpt-4.1-mini`, with exactly the code and prompt in this repository.

Paths are relative to the project root. `frontend/src/…` is the browser app, `backend/app/…` is the Python server. The agent core (loop, driver, cursor, snapshot, speech, audit, backend) was copied from the earlier eSiri × e-Mikutano PoC and adapted; this project has no runtime or build-time dependency on it.

---

## Contents

1. [Summary](#1-summary)
2. [How to run it, and environment variables](#2-how-to-run-it-and-environment-variables)
3. [Directory tree](#3-directory-tree)
4. [Tech stack](#4-tech-stack)
5. [Architecture](#5-architecture)
6. [End-to-end trace: "Umeme umekatika… bila kujulikana"](#6-end-to-end-trace-umeme-umekatika-bila-kujulikana)
7. [The agent loop in detail](#7-the-agent-loop-in-detail)
8. [How the agent knows what it can do](#8-how-the-agent-knows-what-it-can-do)
9. [Real example snapshot (wizard step 3)](#9-real-example-snapshot-wizard-step-3)
10. [Real captured trace of one run](#10-real-captured-trace-of-one-run)
11. [The ghost cursor and action execution](#11-the-ghost-cursor-and-action-execution)
12. [Safety: confirmation gate, password gate, decline, cancellation](#12-safety-confirmation-gate-password-gate-decline-cancellation)
13. [Speech](#13-speech)
14. [Bilingual support](#14-bilingual-support)
15. [State and persistence](#15-state-and-persistence)
16. [Data flow and privacy](#16-data-flow-and-privacy)
17. [Testing](#17-testing)
18. [Decisions, deviations, and bugs fixed during the build](#18-decisions-deviations-and-bugs-fixed-during-the-build)
19. [Known limitations and weaknesses](#19-known-limitations-and-weaknesses)
20. [Extension guide](#20-extension-guide)
21. [Glossary](#21-glossary)

---

## 1. Summary

**eSiri** is an AI agent for government web systems, built as a proof of concept for e-Government Authority (e-GA) Tanzania. A citizen speaks or types a request in Swahili (the default) or English. eSiri then completes the task *inside the existing web interface* by visibly moving its own cursor, clicking, typing and choosing dropdown options the way a person would. Before consequential actions it asks for confirmation, and the app blocks those clicks in code until the user says yes. Every task is written to an audit log.

The "existing government system" here is a **front-end mockup of e-Mrejesho**, Tanzania's system for sending, receiving and tracking citizen feedback — complaints (*malalamiko*), suggestions (*mapendekezo*), inquiries (*maulizo*) and compliments (*pongezi*) — to government institutions (*taasisi*) grouped by sector (*sekta*). It has 17 sectors, 52 real institutions with 2–5 services each, institution pages with FAQs, the submission-mode modal, the 3-step wizard with four submission modes, success, tracking, *Mrejesho Wangu*, login, registration, help pages and the eSiri audit log (`frontend/src/pages/*`, data in `frontend/src/store/data.ts`). There is no server-side data: everything lives in the browser's localStorage.

What distinguishes eSiri from e-Mrejesho's existing chatbot is the headline flow: the citizen describes a problem in everyday words ("Umeme umekatika mtaani kwetu Sinza…"), and eSiri **routes it to the right institution, infers the feedback type, writes a clear description, fills the whole wizard, reads it back, submits only after "yes", and reads out the reference number**. The sample citizen is the fictional **Rahma Mbuyu** (`store/data.ts` `SAMPLE_ACCOUNT`).

---

## 2. How to run it, and environment variables

### Run

```bash
cp .env.example .env      # put OPENAI_API_KEY=sk-... in .env
./start.sh                # first run installs everything; then starts backend :8000 and frontend :5173
```

Open `http://localhost:5173` in **Google Chrome** (not Chromium; Chromium's speech recognition fails with a `network` error on Linux).

What `start.sh` does, in order:
1. `set -e`, `cd "$(dirname "$0")"`; every path is quoted, so it works in folders with spaces.
2. Checks `python3` and `npm` exist; otherwise exits with an error.
3. Warns (does not exit) if `.env` is missing, or if `OPENAI_API_KEY` is missing or still the `sk-...` placeholder.
4. Creates `backend/.venv` and runs `pip install -r backend/requirements.txt` if `backend/.venv/bin/uvicorn` does not exist.
5. Runs `npm install` in `frontend/` if `frontend/node_modules` does not exist.
6. Starts `uvicorn app.main:app --host 127.0.0.1 --port 8000` in the background (cwd `backend/`).
7. Installs a `trap cleanup EXIT INT TERM` that kills the backend when the script ends (Ctrl+C).
8. Prints `Open http://localhost:5173 in Google Chrome (not Chromium).` and runs `npm run dev` (Vite, port 5173, `--strictPort`) in the foreground.

Verified during the build (2026-10-05): `git clone` of the committed repository into a scratch path containing spaces (`…/clone test dir/eSiri eMrejesho`), `.env` copied in, `./start.sh` → it created the venv, installed the Python and npm dependencies, started both servers; `/api/health` returned `{"ok":true,"has_key":true,…}` and the page title was `e-Mrejesho · eSiri`; a Ctrl+C (SIGINT to the process group) printed `-- Stopping eSiri...` and left nothing listening on 8000/5173.

### Environment variables (read from `.env` in the project root)

`backend/app/main.py` calls `load_dotenv(PROJECT_ROOT / ".env")` at import time. All variables are read by the backend only; the frontend learns `english_tts` through `GET /api/health`.

| Variable | Default | Read in | What it controls |
|---|---|---|---|
| `OPENAI_API_KEY` | none | `main.py` `api_key()` | Required for `/api/agent/step` and `/api/tts`. Without it both return HTTP 400 `{"code":"no_key"}` and `/api/health` returns `has_key:false`, which makes the panel show a banner (`Panel.tsx`, `data-testid="esiri-nokey"`). A wrong key gives 401 `{"code":"auth"}`. |
| `OPENAI_MODEL` | `gpt-4.1-mini` | `main.py` `model_name()` | Chat Completions model for the agent. If the key cannot use it, the backend returns `{"code":"model_not_found"}`. |
| `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` | `tts.py` `synthesize()` | Text-to-speech model. On any error, `synthesize()` retries once with `tts-1`. |
| `OPENAI_TTS_VOICE` | `coral` | `tts.py` `synthesize()` | OpenAI voice (`nova` for the `tts-1` fallback if the voice is not a tts-1 voice). |
| `ESIRI_ENGLISH_TTS` | `browser` | `main.py` `english_tts()` | `browser` = English is spoken with Chrome's `speechSynthesis`; `openai` = English also uses `/api/tts`. Swahili always prefers a browser `sw*` voice and falls back to OpenAI. |

### URL parameters (frontend)

| Parameter | Where | Effect |
|---|---|---|
| `?mute=1` | `esiri/tts.ts` (module top level) | Stored in `sessionStorage['esiri-mute']`. `speak()` returns immediately and `listenForCommand()` skips the microphone and focuses the text input. Used by all automated tests. `?mute=0` clears it. |
| `?lang=en` / `?lang=sw` | `store/appStore.ts` `initialLanguage()` | Initial language when there is no persisted state yet. |
| `?ref=EMR-…` on `/fuatilia` | `pages/Track.tsx` | Pre-fills and searches. |
| `?mode=…` on `/wasilisha/{id}` | `pages/Wizard.tsx` | Submission mode; missing → the mode modal opens; `account` while logged out → redirect to `/ingia?next=…`. |
| `?next=/path` on `/ingia`, `/jisajili` | `pages/Auth.tsx` `safeNext()` | Where to go after login/registration (same-site paths only). |

---

## 3. Directory tree

(`node_modules/`, `.venv/`, build output and test artifacts omitted.)

```
eSIRI-eMrejesho/
├── start.sh                    one-command install + run (section 2)
├── .env.example                template for .env (the real .env is git-ignored)
├── .gitignore                  ignores .env, .venv, node_modules, dist, audit_log.jsonl, test artifacts, reference/, the build prompt
├── README.md                   setup, sample account, usage, 5-minute demo script, troubleshooting, privacy
├── CLAUDE.md                   short briefing for future Claude Code sessions
├── docs/CODEMAP.md             this document
├── reference/                  original screenshots and orb inspiration (local only, git-ignored)
├── backend/
│   ├── requirements.txt        Python dependencies
│   ├── audit_log.jsonl         created at runtime; one JSON line per eSiri task (git-ignored)
│   └── app/
│       ├── __init__.py         empty; makes `app` a package
│       ├── main.py             FastAPI app: /api/health, /api/agent/step, /api/agent/reset, /api/tts, /api/audit; session memory; OpenAI call
│       ├── agent.py            SYSTEM_PROMPT, build_system_prompt(), TOOLS schemas, memory helpers (repair, trim, render/prune)
│       ├── app_map.md          the agent's knowledge base about the mockup (pages, ids, wizard rules, cause→effect, flows, aliases)
│       └── tts.py              synthesize(): OpenAI TTS with tts-1 fallback and in-memory cache
└── frontend/
    ├── package.json            npm scripts and dependencies
    ├── vite.config.ts          dev server :5173, proxy /api → http://localhost:8000
    ├── playwright.config.ts    e2e config; webServer starts backend (venv uvicorn) + frontend
    ├── tsconfig*.json          strict TypeScript (app + node/e2e)
    ├── index.html              HTML shell (lang="sw"); loads Quicksand from Google Fonts
    ├── public/assets/tanzania-coat-of-arms.svg
    ├── e2e/
    │   ├── helpers.ts          store(), start(), loginByHand(), submitByHand(), openPanel(), askEsiri(), newSubmissions()
    │   ├── ui.spec.ts          23 tests without the LLM (mockup by hand, language, gates, snapshot, select_option, backend)
    │   ├── agent.spec.ts       11 required eSiri scenarios (@llm)
    │   ├── demo.spec.ts        the README demo script as one conversation (@llm)
    │   ├── screenshots.spec.ts 4 visual tests (SW/EN × 1366/1920) with overflow checks
    │   └── screenshots/        76 PNGs produced by screenshots.spec.ts
    └── src/
        ├── main.tsx            React root; installs window.__esiriTest hook for tests
        ├── App.tsx             router (14 routes), RequireLogin, Keyed remounts, Shell (panel-open margin), NavBridge, ScrollTop, EsiriRoot
        ├── index.css           global variables (palette, Quicksand), header, footer, page head, buttons, inputs, modal, toasts, badges
        ├── i18n/
        │   ├── sw.ts           362 Swahili strings — the primary dictionary; exports I18nKey and Dict
        │   ├── en.ts           362 English strings typed as Dict (compiler enforces identical keys)
        │   └── index.ts        tr(), t(), useT(), useLang(), pick() for bilingual data texts
        ├── store/
        │   ├── appStore.ts     zustand `useApp` (persisted): language, session, accounts, currentUser, submissions, audit; draft (wizard), toasts; validateStep(), normalizePhone()
        │   └── data.ts         SECTORS, INSTITUTIONS (+services, FAQs), FEATURED_SERVICES, REGIONS, DISTRICTS, HELP_FAQS, SAMPLE_ACCOUNT, hashPassword(), seedSubmissions()
        ├── components/
        │   ├── esiriProps.ts   ez(): builds data-esiri-id / -label / -sensitive / -state / -role attributes
        │   ├── Layout.tsx      FlagStripe, SiteHeader (nav, Msaada dropdown, language, user menu), SiteFooter, PageFrame, PageHead, InstitutionLogo
        │   ├── ModeModal.tsx   "Chagua namna ya kuwasilisha mrejesho wako" (4 modes; account → login if logged out)
        │   └── Common.tsx      Toasts, Modal (data-esiri-modal, × close), Toggle, copyText()
        ├── pages/
        │   ├── Landing.tsx     hero (typewriter, buttons, campaign, 3 searches, SVG phone illustration), USSD strip, services, sector carousel, award, kitochi
        │   ├── Institutions.tsx /sekta/:id and /taasisi: search, cards, pagination (12/page)
        │   ├── InstitutionPage.tsx header card, contacts, SVG map, services, FAQ accordion (FaqList), documents, video
        │   ├── Wizard.tsx      Stepper, Step1 (service, type, editor, attachment), Step2 (region, district, location, date, mode fields), Step3 (summary, checkbox, submit)
        │   ├── Success.tsx     reference number, copy, track, home
        │   ├── Track.tsx       tracking form; SubmissionDetails (meta, description, status timeline, response)
        │   ├── MyFeedback.tsx  the user's submissions; withdraw modal
        │   ├── Auth.tsx        Login, Register
        │   ├── Help.tsx        HelpGuide, HelpFaq, HelpVideo
        │   └── Audit.tsx       audit table, filters, expandable rows, CSV export, clear modal
        └── esiri/
            ├── controller.ts   THE AGENT LOOP: activate, listenForCommand, submit, runLoop, execute, askConfirmation, answerConfirmation, finishTask, failTask, cancel, newConversation; login-completes-task hook
            ├── driver.ts       the "hands": click(), typeText(), selectOption(), navigate(), elementPresent(); sensitive-click gate; password gate; wizard-step hints
            ├── given.ts        extractGiven(): regions, districts, mode and phone already stated by the user (rejects needless ask_user)
            ├── cursor.ts       ghost cursor DOM: showCursor, hideCursor, glideTo, highlight, ripple, press
            ├── snapshot.ts     buildSnapshot(), visibleElements(), describeElement() (select options, password masking), selectOptions()
            ├── api.ts          fetch wrappers: fetchHealth, agentStep, postAudit, fetchTTS, resetSession (unused); ApiError
            ├── tts.ts          speak() routing browser/OpenAI, spokenForm() (reference numbers), stopSpeaking(), isMuted()
            ├── stt.ts          listenOnce(), stopListening(), startWake()/stopWake(), WAKE_RE
            ├── audioLevel.ts   level bus for the orb; mic level (getUserMedia + AnalyserNode); simulated levels
            ├── util.ts         sleep(), nextFrames(), CancelledError, isAbort(), isStopUtterance(), parseYesNo()
            ├── nav.ts          setNavigator()/goTo(); PageName, PAGES, pageFromPath(), idFromPath()
            ├── esiriStore.ts   zustand `useEsiri` (not persisted): panel, status, messages, interim, health
            ├── esiri.css       orb, stage orb, floating stack, side panel, ghost cursor
            └── ui/
                ├── EsiriRoot.tsx   floating stack (orb on top + 3 decorative buttons), stage orb, panel; Alt+S / Esc; health fetch; wake mode
                ├── Panel.tsx       side panel: header, wake toggle, banners, messages, 5 suggestion chips, input/mic/stop/send
                ├── Orb.tsx         deep-blue glass sphere with canvas plasma (shared rAF ticker), state-specific parameters
                └── orbState.ts     orbStateFor(): maps status to orb visual state
```

---

## 4. Tech stack

### Frontend (`frontend/package.json`; installed versions from `npm ls`)

| Library | Installed | What it does here | Why |
|---|---|---|---|
| React / react-dom | 18.3.1 | All UI (mockup and eSiri overlay). Controlled inputs are why the native-setter technique (section 11) is needed. | Specified. |
| react-router-dom | 6.30.6 | 14 routes in `App.tsx`; `useNavigate` exposed to the agent through `esiri/nav.ts`. Real URLs let the snapshot report `page`/`route`. | Specified. |
| zustand (+ persist) | 4.5.7 | `useApp` (persisted app data + audit) and `useEsiri` (panel/runtime). `getState()` lets the controller, driver and snapshot read/write state outside React. | Specified. |
| lucide-react | 0.460.0 | Icons (sector icons, header, stack, panel). | Specified; no brand logos. |
| Vite + @vitejs/plugin-react | 5.4.21 / 4.7.0 | Dev server (port 5173, `/api` proxy) and production build. | Specified. |
| TypeScript | 5.6.3 | Strict checking (`noUnusedLocals`, `noUnusedParameters`); enforces identical i18n keys (`Dict`). | Specified. |
| @playwright/test | 1.63.0 | End-to-end, LLM and visual tests. | Specified. |
| Plain CSS + variables, Google Fonts Quicksand | — | Styling; Quicksand with a system fallback (`--font-body`). | Specified. |
| Web Speech API, Web Audio API, Canvas 2D | Chrome | Speech recognition (`sw-TZ`/`en-US`), English speech, orb audio level, orb plasma. | Specified / needed for the orb. |

### Backend (`backend/requirements.txt`; installed versions from `pip list`, Python 3.12.3)

| Library | Declared | Installed | Use |
|---|---|---|---|
| FastAPI | >=0.110 | 0.142.2 | Endpoints in `main.py`; pydantic request models. |
| uvicorn[standard] | >=0.29 | 0.54.0 | ASGI server. |
| openai | >=1.40 | 3.24.0 | `AsyncOpenAI`: `chat.completions.create` (agent) and `audio.speech.create` (TTS). |
| python-dotenv | >=1.0 | 1.2.4 | Loads `.env` from the project root. |
| pydantic | >=2.5 | 2.13.5 | `StepRequest`, `ToolResult`, `ResetRequest`, `TTSRequest`. |

### External services

| Service | Used for | Called from |
|---|---|---|
| OpenAI Chat Completions (`gpt-4.1-mini`) with tool calling | The agent's reasoning | `main.py` `step()` |
| OpenAI Audio Speech (`gpt-4o-mini-tts`, fallback `tts-1`) | Swahili speech (and English if configured) | `tts.py` `synthesize()` |
| Google speech service (inside Chrome) | Speech recognition | `stt.ts` |
| Google Fonts | Quicksand | `index.html` |

---

## 5. Architecture

```
┌──────────────────────────────── Chrome tab (http://localhost:5173) ──────────────────────────────┐
│  e-Mrejesho MOCKUP (pages/*, components/*)                eSiri OVERLAY (esiri/ui/*)              │
│  every actionable element tagged with                     floating stack (orb on top), stage orb, │
│  data-esiri-id / -label / -sensitive / -state             side panel, Alt+S / Esc                 │
│        ▲  state in zustand useApp (localStorage)                 │ user text / voice              │
│        │                                                          ▼                               │
│        │ el.click(), native value setters                CONTROLLER (esiri/controller.ts)         │
│        │                                                 submit → runLoop → execute               │
│  DRIVER + GHOST CURSOR  ◀──── tool calls ──────────────  credits, guards, already-given check,    │
│  (driver.ts, cursor.ts)  confirmation + password gates   audit                                    │
│                                                                   │ snapshot   ▲ tool_calls       │
│  SNAPSHOT BUILDER (snapshot.ts) ── JSON of page + catalogue ────▶ │            │                  │
│  SPEECH LAYER: stt.ts (Web Speech), tts.ts (speechSynthesis / <audio>), audioLevel.ts             │
└───────────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                  /api/* (Vite proxy)                          Chrome speech → Google
                                            ▼
┌────────────────────── FastAPI backend (http://127.0.0.1:8000) ─────────────────────┐
│ /api/agent/step  main.step(): session memory (SESSIONS), prune/trim (agent.py),     │
│                  system prompt + app_map.md + TOOLS  ──────────▶ OpenAI Chat        │
│ /api/tts         tts.synthesize() (cache) ─────────────────────▶ OpenAI TTS         │
│ /api/audit       append line → backend/audit_log.jsonl                              │
│ /api/health      has_key, model, english_tts                                        │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

| Component | Files | Responsibility |
|---|---|---|
| Mockup app | `pages/*`, `components/*`, `store/*` | A human-usable imitation of e-Mrejesho. Each actionable element carries `data-esiri-*` attributes from `ez()`. It knows nothing about eSiri except the tags (and the floating stack, which hosts eSiri's orb). |
| eSiri overlay | `esiri/ui/*`, `esiri.css` | Orb, floating stack, side panel, keyboard shortcuts, wake mode. |
| Controller | `esiri/controller.ts` | Owns the task: loop, confirmations and credits, guards, deterministic checks, cancellation, audit record. |
| Snapshot builder | `esiri/snapshot.ts` | Turns the screen + store into compact JSON for the model. |
| Driver + ghost cursor | `esiri/driver.ts`, `esiri/cursor.ts` | Performs click / type / select / navigate visibly; enforces the sensitive-click and password gates. |
| Speech | `esiri/stt.ts`, `esiri/tts.ts`, `esiri/audioLevel.ts` | Listening, speaking, wake word, orb level. |
| Agent backend | `backend/app/main.py`, `agent.py`, `app_map.md` | Conversation per `session_id`, prompt, OpenAI call, returns tool calls. |
| Audit | `controller.ts` `finalizeTask()`, `appStore.ts` `addAudit`, `pages/Audit.tsx`, `main.py` `audit()` | One record per task, in the browser and in `backend/audit_log.jsonl`. |

**The model never touches the DOM or the store.** It only returns tool calls; all execution, validation and safety enforcement happens in browser code.

---

## 6. End-to-end trace: "Umeme umekatika… bila kujulikana"

This follows the headline request from the key press to the audit record, in call order. The captured run's timeline (section 10) was: thinking 0.4 s → … → awaiting_confirmation 34.7 s → (Yes) → idle 39.0 s.

### Step 1 — Alt+S opens eSiri and starts listening

1. `esiri/ui/EsiriRoot.tsx` registers a capture-phase `keydown` handler: `Alt+S` → `activate()`; clicking the top orb of the floating stack (`data-testid="esiri-orb"`) does the same.
2. `controller.ts` `activate()`: not busy → `useEsiri.setPanelOpen(true)` → `listenForCommand()`. The panel opening adds `panel-open` to the app shell; on screens ≥1000 px `index.css` `.app-shell.panel-open { margin-right: 380px }` shrinks the page so the panel never covers it, and the floating stack hides (`.float-stack.hidden`).
3. `listenForCommand()` → `listen('listening')` → `startMicLevel()` (orb follows the mic) → `stt.ts` `listenOnce('sw', …)` with `rec.lang = 'sw-TZ'`, interim results shown in the stage caption and panel. On the final result → `submit(text, 'voice')`. (Typed path: `Panel.tsx` `send()` → `submit(v, 'text')`.)

### Step 2 — Starting the task

4. `submit()`: no pending confirmation, not busy, not a stop word → adds the user bubble → `newTask()` (`credits: 0`, `askRejected: false`, `abort: new AbortController()`) → `runLoop(task, { user_message, input_mode })`.
5. `runLoop()`: `setStatus('thinking')` → `buildSnapshot()` (landing page: catalogue + ~50 elements, 8,287 chars) → `agentStep()` → `POST /api/agent/step` (Vite proxy → :8000).

### Step 3 — Model calls and batches

6. `main.py` `step()`: per-session lock; `repair_dangling_tool_calls()`; user content `"[language=sw] [input=text] User request: …"`; snapshot attached as `_snapshot`; `trim_history()`; `build_system_prompt('sw')` (25,820 chars) + `render_messages()` (only the newest snapshot in full) → `chat.completions.create(model, messages, tools=TOOLS, temperature=0.2, parallel_tool_calls=True)`.
7. In the captured run the model first guessed `institution-card.tanesco.open` (an id from the list page, not on the landing page). `driver.ts` `click()` → `find()` waited 150 ms → `notFound()` → `{ok:false, code:'not_found'}`; the batch stopped (the second call got `{"skipped":true}`).
8. Next batch: `click(landing.service.tanesco-outage)` (the "Kukatika kwa umeme – TANESCO" service card → `/taasisi/tanesco`) and `click(institution.submit)`. After the route change, `runLoop()`'s stale-prediction check found `institution.submit` on the new page within 1.5 s, so it ran → the mode modal opened.
9. `click(mode.anonymous)` → `ModeModal.choose()` → `startDraft('tanesco','anonymous')` → `/wasilisha/tanesco?mode=anonymous` (step 1).
10. Step 1 batch: `select_option(wizard.service, tanesco-outage)` and `select_option(wizard.type, lalamiko)` (`driver.ts` `selectOption()`: matches by value, sets `HTMLSelectElement.prototype.value` + `change` event → React `onChange` → `updateDraft`), `type_text(wizard.description, …)` (the model's own two-sentence description, 130 characters, typed visibly two characters per step), `click(wizard.next)` → `validateStep(d, 1)` passes → step 2.
11. Step 2 batch: `select_option(wizard.region, Dar es Salaam)` (the district field turns into a dropdown), `select_option(wizard.district, Ubungo)`, `type_text(wizard.location, Sinza)`, `click(wizard.next)` → step 3 (summary).
12. `click(wizard.confirm-checkbox)` → result `{ok:true, state:'on'}` (the driver reports the element's new `data-esiri-state`). `wizard.submit` is `disabled` until this is on.

### Step 4 — Confirmation and the sensitive click

13. `ask_confirmation({summary})` → `execute()` → `askConfirmation()`: a card with Ndiyo/Hapana, `status = awaiting_confirmation`, the summary is spoken (Swahili → `/api/tts`), then (if voice is available) listened for. "Ndiyo" (or the button) → `answerConfirmation(true)` → `task.credits += 1` → result `{confirmed:true, note:"Approved for 1 sensitive click(s)…"}`.
14. `click(wizard.submit)`: `data-esiri-sensitive="true"` → `ctx.hasCredit()` true → animation → `useCredit()` → `el.click()` → `Wizard.submit()` → `validateStep(d,3)` → `useApp.submitDraft()` (new `EMR-2026-NNNNN`, status `imepokelewa`, no name/phone for anonymous) → `navigate('/imepokelewa/EMR-2026-80395')`. `execute()` sees the success path and adds `reference` + a note to the result.

### Step 5 — Finish, speech and audit

15. `finish({message})` → `finishTask()` → `finalizeTask(task,'Completed',…)` builds the `AuditRecord` (user "Mgeni" because nobody is logged in) → `useApp.addAudit()` + `postAudit()` → `backend/audit_log.jsonl`; assistant bubble; `speak(message,'sw')` → `tts.ts` `spokenForm()` turns `EMR-2026-80395` into "E M R, 2026, 8 0 3 9 5," → OpenAI TTS (no local `sw` voice) → idle.

---

## 7. The agent loop in detail

### `/api/agent/step` request shapes (`main.py` `StepRequest`)

A new user message:
```json
{
  "session_id": "4f0b…",
  "language": "sw",
  "user_message": "Umeme umekatika mtaani kwetu Sinza, Ubungo, Dar es Salaam tangu jana usiku. Nataka kulalamika bila kujulikana.",
  "input_mode": "text",
  "snapshot": { "...": "see section 9" }
}
```
Results of the previous tool calls:
```json
{
  "session_id": "4f0b…",
  "language": "sw",
  "tool_results": [
    { "tool_call_id": "call_…", "result": { "ok": true, "selected": { "value": "tanesco-outage", "label": "Kukatika kwa umeme" } } }
  ],
  "snapshot": { "...": "fresh snapshot after the actions" }
}
```
`session_id` 1–200 chars; `language` `"sw"|"en"` (default `"sw"`); `input_mode` `"voice"|"text"`. Neither `user_message` nor `tool_results` → HTTP 422 `bad_request`. The `session_id` is generated by the frontend (`appStore.ts` `newSessionId()`), persisted, and replaced by "New conversation" (↺) and "Rejesha data ya mfano".

### Response shape and errors

`{"tool_calls":[{"id","name","arguments"}], "text": ""}` — `arguments` already parsed (invalid JSON → `{}`). Empty `tool_calls` → the frontend treats `text` as the final message.

| HTTP | code | When |
|---|---|---|
| 400 | `no_key` | `OPENAI_API_KEY` empty |
| 401 | `auth` | key rejected |
| 409 | `session_expired` | `tool_results` but no pending assistant tool calls (e.g. backend restarted) |
| 422 | `bad_request` | neither `user_message` nor `tool_results` |
| 429 | `rate_limit` | rate limit / quota |
| 502 | `model_not_found` / `bad_request` / `api_error` | model unavailable / rejected request (session deleted) / other API error |
| 504 | `network` | connection error / timeout to OpenAI |

`runLoop()`'s `catch` shows the raw message as an error notice, flashes the orb red, and ends the task with a localized spoken message (`esiri.errorNetwork|errorModel|errorNoKey|errorGeneric`) → outcome **Failed**.

### How a batch is executed (`controller.ts` `runLoop()`)

The model may return several tool calls per response; the frontend runs them **sequentially**:
1. After a failure, decline or end, remaining ids get `{"skipped": true}`.
2. **Stale-prediction skip:** if the route changed during the batch and the next `click`/`type_text`/`select_option` target is not present within 1500 ms, it is skipped with a note and the batch stops.
3. **Execution cap:** `MAX_TOOL_EXECUTIONS = 30` → Failed.
4. `execute()`; failures stop the batch; three consecutive failures of the same `name:element_id` (`MAX_SAME_FAILURES = 3`) → Failed.
5. `ask_confirmation` pauses; a decline stops the batch. `finish` ends the task; `ask_user` ends the turn with status `awaiting_answer` (the answer arrives as the next user message, appended to `task.request` as ` → <answer>`).
6. Otherwise `{tool_results}` + fresh snapshot → next model call.

### What each tool returns

| Tool | Result |
|---|---|
| `click` | `{ok:true}`, plus `state` if the element has `data-esiri-state` (checkbox `on/off`, FAQ `open/closed`…), plus `reference` after `wizard.submit`; or `{ok:false, code}` with `not_found` (with a wizard-step hint for wizard fields), `disabled`, `confirmation_required`, `invalid` (a `<select>` → use select_option) |
| `type_text` | `{ok:true}`; `{ok:false, code:'password_field'}` for any password input (never typed); on a `<select>` it selects the matching option instead (with a note) |
| `select_option` | `{ok:true, selected:{value,label}}`; `{ok:false, code:'invalid', error:"No option matches … Options: …"}` or "Several options match"; on a text field it types instead (with a note) |
| `navigate` | `{ok:true}` or `{ok:false, code:'invalid'|'login_required'}` |
| `ask_confirmation` | `{ok:true, confirmed, note}`; if already declined in this task, ends the task |
| `ask_user` | ends the turn; **or** `{ok:false, code:'already_given', error}` when the question asks for facts the user already gave (once per task, section 12) |
| `set_language` | `{ok:true, language}` |
| `finish` | ends the task (result never sent) |

### Session memory, pruning, guards

Unchanged from the core: `SESSIONS` (last 12 user turns, `trim_history()`), per-session `asyncio.Lock`, `repair_dangling_tool_calls()` before each user message (`ask_user` → "answer is in the next message", others → "skipped"), only the newest snapshot rendered in full (`render_messages()`), OpenAI client timeout 60 s / 1 retry, `speak()` timeouts, 20 s recognition safety net. `/api/agent/reset` exists but is unused. Prompt size per call in the captured run: 9.4–10.4 k tokens (the 25.8 k-character system prompt is most of it).

---

## 8. How the agent knows what it can do

Four inputs: the **system prompt** (rules), the **app map** (embedded in the system prompt), the **tool definitions**, and at each step the **snapshot**.

### 8.1 System prompt (verbatim from `backend/app/agent.py` `SYSTEM_PROMPT`)

`build_system_prompt(language)` replaces `{app_map}` with `app_map.md` and appends `CURRENT LANGUAGE: Swahili (sw). Reply, confirm and ask in this language.` (or English). The complete system message is 25,820 characters.

```text
You are eSiri, an AI agent built by e-Government Authority (e-GA) Tanzania. You help citizens use e-Mrejesho, the government system for sending, receiving and tracking feedback to public institutions (complaints, suggestions, inquiries and compliments), by operating its user interface for them with a visible cursor.

YOUR MAIN JOB
A citizen describes a problem in everyday words. You find the right institution, choose the feedback type, write a clear description, fill the whole submission form visibly, read it back, and submit only after the citizen says yes.

HOW YOU WORK
- You act ONLY through the tools. You see the screen as a JSON snapshot: page, state, and a list of elements with stable ids.
- Use ONLY element ids that appear in the latest snapshot, or that you can predict with certainty from the APP MAP for an element that will appear after your previous action in the same batch (e.g. after clicking institution.submit, the modal's mode.anonymous will exist; after wizard.next on step 1, the step 2 fields will exist).
- Dropdowns (role "select") are set with select_option(element_id, value) using the option's value or its visible label. Text fields and textareas use type_text. Checkboxes use click, and only when their state must change (read "state": on/off first).
- Prefer visible clicks so the user can follow. Use navigate to jump to a page when there is no quicker visible way (for example to open an institution page by its id from the catalogue).
- You may return several tool calls at once for predictable sequences. A click that opens another page (an institution, the mode choice, a search result, track.submit, wizard.submit) must be the LAST call of its batch; continue after you see the new snapshot.
- After tools run you receive a fresh snapshot. Check the result before continuing (for example wizard.errors after wizard.next). If a step failed, read the error and the snapshot and try a different way; do not repeat the same failing call.
- Only do what the user asked. Do not open extra pages, change unrelated fields or close notifications (toasts); toasts never block anything.

ROUTING A DESCRIBED PROBLEM
- When the user describes a problem in everyday words, pick the most fitting institution from state.catalogue (every institution with id, short name and sector) using the APP MAP aliases: power outage or electricity → TANESCO; water in Dar es Salaam → DAWASA, water in rural areas or other regions → RUWASA; national ID → NIDA; tax, TIN, EFD → TRA; damaged roads → TANROADS; student loans → HESLB; and so on.
- If two institutions are equally plausible and the user's words do not decide it, ask ONE short question with ask_user.
- Choose the service (wizard.service) from the institution's services that best matches the problem.

FEEDBACK TYPE
- Infer it from the wording: a problem or grievance → lalamiko (complaint); an idea or request for improvement → pendekezo (suggestion); a question → ulizo (inquiry); praise or thanks → pongezi (compliment). Ask only if truly unclear.

WRITING THE DESCRIPTION
- Write a clear, polite, well-structured description of 2–3 sentences in the CURRENT LANGUAGE, based only on what the user said. Never invent facts: no names, dates, places, amounts or numbers the user did not give. Light expansion for clarity is fine (for example "Umeme umekatika" → "Umeme umekatika katika mtaa wetu wa ... tangu ... . Tunaomba TANESCO irekebishe tatizo hili haraka.").
- The description must have at least 5 words.

REQUIRED INFORMATION AND SUBMISSION MODE
- Required before you can submit: the problem itself, region (mkoa), district (wilaya), place/street (mahali/mtaa), and the submission mode. Personal mode also needs full name and phone number; civil-servant mode needs the check number, full name and phone number. Account mode needs the user to be logged in (state.logged_in).
- Submission modes: "kwa jina langu" / "in my name" / personal details → personal; "bila kujulikana" / "anonymously" → anonymous; "kupitia akaunti yangu" / "through my account" → account; "kama mtumishi wa umma" / "as a public servant" / retiree → civil-servant.
- Place names often come as a short list in any order, e.g. "Ubungo, Dar es Salaam, Kimara" or "Kinondoni, Dar es Salaam, Mwananyamala": match each name against the 31 regions and the district lists in the APP MAP; the region name is the region, a district name is the district, and the remaining name is the place/street. Such a list is complete: do not ask to confirm it.
- Before you start filling the form, check what the user already gave. If anything required is missing, ask for ALL of it in ONE ask_user question (include the mode question if the mode is unknown, e.g. "Ungependa kuwasilisha kwa jina lako, bila kujulikana, kupitia akaunti yako, au kama mtumishi wa umma?"). Never guess missing details and never ask twice for something the user already said.
- Only account mode needs login. Personal, anonymous and civil-servant modes NEVER need login: when the user said "kama mtumishi wa umma" use civil-servant mode directly and do not ask about logging in or accounts.
- If the user chose account mode but is not logged in, tell them with ask_user that they need to log in first (offer to help) or choose another mode.

GOING THROUGH THE WIZARD
- Open the institution page, click institution.submit and the chosen mode (mode.<mode>) — that opens the wizard on step 1.
- Do each wizard step as ONE batch that ends with click wizard.next (the next step's fields only exist after it).
- Step 1: select_option wizard.service and wizard.type, type_text wizard.description, click wizard.next.
- Step 2: select_option wizard.region, then wizard.district (a dropdown for Dar es Salaam, Dodoma, Arusha, Mwanza, Mbeya and Morogoro; a text field elsewhere), type_text wizard.location, then the mode's personal fields, then click wizard.next. wizard.date is optional: fill it only if the user gave an exact date.
- Step 3 (summary): click wizard.confirm-checkbox (only if its state is off), then call ask_confirmation with a short spoken summary: institution, type, a one-line gist, location and mode. Only after a yes, click wizard.submit.
- After submitting, the result of the click and the snapshot (state.success.reference) give the reference number. Finish by telling the user the reference number (write it as EMR-2026-NNNNN; the app reads it aloud letter by letter) and that they can track it with it.

TRACKING, MY FEEDBACK, FAQS AND HELP
- "Fuatilia EMR-2026-48213" / "track ...": open the tracking page (landing.fuatilia or navigate page=track), type the reference into track.reference-input and click track.submit, then report the status from state.tracking (and the institution's response if it is answered). Always type the reference the user gave (success.track only tracks the reference just submitted). Before answering, check that state.tracking.searched is exactly the user's reference; if it is another one, search again. Say "not found" only when state.tracking.result is "not_found" for the user's reference.
- "my complaint about electricity" / "mrejesho wangu": if logged in, open Mrejesho Wangu (header.user-menu → header.menu.my-feedback, or navigate page=my_feedback) and report from state.my_feedback; if not logged in, ask for the reference number or offer to help them log in.
- "How do I…" questions: open the relevant institution page (or the Msaada pages for questions about using e-Mrejesho), click the matching FAQ question to open it, and answer from the answer shown in the snapshot. Never answer from general knowledge as if it were official; if no FAQ covers it, say so and offer to send an inquiry (ulizo).

PASSWORDS AND PERSONAL DATA
- You never type passwords (the app refuses anyway). To help someone log in: open the login page, type their phone number or username into login.identifier, then call ask_user asking them to type the password themselves and press Ingia (e.g. "Tafadhali andika nenosiri lako kisha ubonyeze Ingia."). The same for registration passwords.
- Use only personal data the user gives you. Do not repeat phone numbers aloud unnecessarily.

SAFETY AND CONSENT
- Sensitive actions: wizard.submit (submitting feedback), register.submit (creating an account), withdraw.confirm (withdrawing feedback) and audit.clear-confirm (clearing the audit log). Before each you MUST call ask_confirmation with a short, specific summary.
- Do NOT ask for confirmation for anything else: filling fields, choosing a mode, searching, opening pages, logging in (the user presses Ingia themselves) and switching language are not sensitive.
- Call ask_confirmation BEFORE the sensitive click. It may be followed by the sensitive click in the same batch: the app pauses at the confirmation, and if the user declines, the remaining calls are skipped automatically.
- If the user declines ({"confirmed": false}), do not perform that action and never ask again: your very next call must be finish with a short acknowledgement (e.g. "Sawa, sijawasilisha mrejesho.").
- A decline applies only to the task in which it happened. Every new user request is a new task: act on it normally with the tools.
- Never claim in finish that you did something (opened, filled, submitted) unless your tool calls in this task actually did it and the snapshot shows it.
- The app enforces confirmations: a sensitive click without an approved confirmation returns confirmation_required. Then ask for confirmation and retry.
- Destructive actions only on an explicit request: "fungua" / "onyesha" / "open" / "show" means OPEN a page, never clear or delete anything. Clear the audit log only when the user explicitly says "futa kumbukumbu" / "clear the audit log"; withdraw only when they say "ondoa mrejesho" / "withdraw".
- Withdrawing is only possible while the status is imepokelewa (state.my_feedback[].can_withdraw).
- Stay within e-Mrejesho. For unrelated requests, briefly say what you can help with using finish.

LANGUAGE AND STYLE
- The current language is given with every request: reply in it (sw = natural Tanzanian Swahili, en = English). User data (names, places, descriptions they dictate) stays as they said it, never translated.
- Confirmation summaries, questions and final messages are spoken aloud: one or two short sentences, no markdown, no lists, no element ids, no technical words.
- If the user asks to switch language (e.g. "speak English", "ongea Kiswahili"), call set_language, then continue in the new language.
- Questions about the current state can be answered directly from the snapshot with finish.
- Always end a task with finish, summarising what you did in one or two sentences.

APP MAP
{app_map}
```

### 8.2 `backend/app/app_map.md` (structure)

Loaded once at import; restart the backend after changing it. Sections: **1. Reading the snapshot** (every `state` key, element roles, `options`, `filled`, `sensitive`); **2. Pages and element ids** — header/footer, landing, institution lists, institution page, mode modal, wizard steps 1–3 (with the district lists of the six regions that have dropdowns), success, tracking, Mrejesho Wangu + withdraw modal, login, register, Msaada pages, audit; ⚠ marks the four sensitive ids; **3. Cause and effect** (mode → fields, account needs login, reference format, status order, withdraw only while *imepokelewa*, validation, language never changes ids, wizard always opens at step 1); **4. Typical flows** (describe-problem submission, tracking, login help, FAQ lookup, my feedback, withdraw); **5. Natural-language aliases** (umeme → TANESCO, maji → DAWASA/RUWASA, kitambulisho → NIDA, kodi → TRA, barabara → TANROADS, mkopo wa elimu → HESLB, …; bila kujulikana → `mode.anonymous`, …; fungua = open, futa = delete).

### 8.3 Tool definitions (verbatim, `agent.py` `TOOLS`)

```json
[
  {
    "type": "function",
    "function": {
      "name": "click",
      "description": "Click an element on the screen with the visible cursor (buttons, links, cards, checkboxes, FAQ questions).",
      "parameters": {
        "type": "object",
        "properties": {
          "element_id": {
            "type": "string",
            "description": "data-esiri-id of the element"
          },
          "reason": {
            "type": "string",
            "description": "Short reason, for the log"
          }
        },
        "required": [
          "element_id",
          "reason"
        ],
        "additionalProperties": false
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "type_text",
      "description": "Click a text field or textarea, clear it and type the given text. Never for passwords (refused).",
      "parameters": {
        "type": "object",
        "properties": {
          "element_id": {
            "type": "string"
          },
          "text": {
            "type": "string",
            "description": "Exact text to type"
          },
          "reason": {
            "type": "string"
          }
        },
        "required": [
          "element_id",
          "text",
          "reason"
        ],
        "additionalProperties": false
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "select_option",
      "description": "Choose an option of a dropdown (role select) by its value or visible label (case- and accent-insensitive).",
      "parameters": {
        "type": "object",
        "properties": {
          "element_id": {
            "type": "string"
          },
          "value": {
            "type": "string",
            "description": "Option value or visible label, e.g. 'tanesco-outage', 'lalamiko', 'Dar es Salaam'"
          },
          "reason": {
            "type": "string"
          }
        },
        "required": [
          "element_id",
          "value",
          "reason"
        ],
        "additionalProperties": false
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "navigate",
      "description": "Go directly to a page. institution needs institution_id; wizard needs institution_id and mode (always opens step 1); institutions takes an optional sector_id; track takes an optional ref. my_feedback and account mode need login.",
      "parameters": {
        "type": "object",
        "properties": {
          "page": {
            "type": "string",
            "enum": [
              "landing",
              "institutions",
              "institution",
              "wizard",
              "track",
              "my_feedback",
              "login",
              "register",
              "help_guide",
              "help_faq",
              "help_video",
              "audit"
            ]
          },
          "institution_id": {
            "type": "string",
            "description": "Institution id from state.catalogue"
          },
          "sector_id": {
            "type": "string",
            "description": "Sector id from state.catalogue"
          },
          "mode": {
            "type": "string",
            "enum": [
              "personal",
              "anonymous",
              "account",
              "civil-servant"
            ]
          },
          "ref": {
            "type": "string",
            "description": "Reference number EMR-2026-NNNNN"
          }
        },
        "required": [
          "page"
        ],
        "additionalProperties": false
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "ask_confirmation",
      "description": "Ask the user to approve a sensitive action. Returns {confirmed: true|false}. covers = how many sensitive clicks this approval allows (normally 1).",
      "parameters": {
        "type": "object",
        "properties": {
          "summary": {
            "type": "string",
            "description": "Short spoken question in the current language"
          },
          "covers": {
            "type": "integer",
            "minimum": 1,
            "default": 1
          }
        },
        "required": [
          "summary"
        ],
        "additionalProperties": false
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "ask_user",
      "description": "Ask the user ONE short question when required information is missing (list everything missing in that one question), or ask them to type their password themselves. Ends this turn; the answer arrives as the next user message.",
      "parameters": {
        "type": "object",
        "properties": {
          "question": {
            "type": "string"
          },
          "missing": {
            "type": "array",
            "description": "What you are asking for",
            "items": {
              "type": "string",
              "enum": [
                "institution",
                "problem",
                "feedback_type",
                "region",
                "district",
                "location",
                "mode",
                "full_name",
                "phone",
                "check_number",
                "password",
                "login",
                "reference",
                "other"
              ]
            }
          }
        },
        "required": [
          "question",
          "missing"
        ],
        "additionalProperties": false
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "set_language",
      "description": "Switch the whole interface, speech and your replies to Swahili or English.",
      "parameters": {
        "type": "object",
        "properties": {
          "language": {
            "type": "string",
            "enum": [
              "sw",
              "en"
            ]
          }
        },
        "required": [
          "language"
        ],
        "additionalProperties": false
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "finish",
      "description": "Speak the final short reply and end the task.",
      "parameters": {
        "type": "object",
        "properties": {
          "message": {
            "type": "string"
          }
        },
        "required": [
          "message"
        ],
        "additionalProperties": false
      }
    }
  }
]
```

`covers` is clamped to 1..10 in `execute()`. `ask_user.missing` is what the deterministic already-given check (section 12) compares with the user's words.

### 8.4 The `data-esiri-*` tagging system

| Attribute | Meaning | Set by |
|---|---|---|
| `data-esiri-id` | Stable, semantic, language-independent id | `ez(id, …)` |
| `data-esiri-label` | Visible label in the current language | `ez(…, label)` |
| `data-esiri-sensitive="true"` | Clicking needs an approved confirmation | `ez(…, {sensitive:true})` |
| `data-esiri-state` | `on`/`off` (checkboxes), `open`/`closed` (FAQ items, Msaada menu, user menu), `shown`/`hidden` (contacts) | `ez(…, {state})` |
| `data-esiri-modal="<name>"` | An open dialog: `submission-mode`, `withdraw`, `clear-audit` | `Common.tsx` `Modal` |

**Id convention:** `<area>.<thing>[.<action>]`; dynamic ids embed real data ids: `landing.search-result.{institutionId}`, `landing.search-result.service.{serviceId}`, `landing.search-result.sector.{sectorId}`, `landing.service.{serviceId}`, `landing.sector.{sectorId}`, `institution-card.{institutionId}.open|submit|track`, `institution.faq.{faqId}`, `help.faq.{faqId}`, `my-feedback.item.{ref}.open|withdraw`, `audit.filter.{outcome}`.

**Sensitive elements (exact list, grep of `sensitive: true`):** `wizard.submit`, `register.submit`, `withdraw.confirm`, `audit.clear-confirm`. Nothing else, and no `navigate` target, is sensitive; `navigate('wizard')` cannot skip to step 3, and `navigate('success')` is refused.

**How tags become the element list** (`snapshot.ts` `visibleElements()`): scope = topmost `[data-esiri-modal]` or the document; skip `.esiri-panel` and `toast.close`; keep visible elements; de-duplicate by id; `describeElement()` → `{id, role, label, state?, value?, filled?, selected?, options?, disabled?, sensitive?}`. Roles: `select`, `checkbox`, `password`, `date`, `file`, `textbox`, `textarea`, `link`, `button` (or ARIA role). Text values up to 160 chars; **password inputs only report `filled`**; `<select>` reports `value`, `selected` label and up to 40 `options` (longer lists add `options_count` and a `search` hint; the driver matches by label).

---

## 9. Real example snapshot (wizard step 3)

Captured with `window.__esiriTest.buildSnapshot()` in the run of section 10, at the moment the confirmation card appeared (1366×768, Swahili). This is what the model received with call 8 (minified to one line, 6,169 characters). **Only the catalogue is abbreviated here** (it is the same in every snapshot: all 17 sectors `{id, name}` and all 52 institutions `{id, short, sector}`); everything else is verbatim.

```json
{
  "page": "wizard",
  "route": "/wasilisha/tanesco?mode=anonymous",
  "language": "sw",
  "open_modal": null,
  "toasts": [],
  "state": {
    "logged_in": false,
    "user": null,
    "catalogue": {
      "sectors": [
        {
          "id": "nishati",
          "name": "Nishati"
        },
        {
          "id": "maji",
          "name": "Maji"
        },
        {
          "id": "fedha-na-kodi",
          "name": "Fedha na Kodi"
        },
        "… 14 more {id, name}"
      ],
      "institutions": [
        {
          "id": "tanesco",
          "short": "TANESCO",
          "sector": "nishati"
        },
        {
          "id": "rea",
          "short": "REA",
          "sector": "nishati"
        },
        {
          "id": "ewura",
          "short": "EWURA",
          "sector": "nishati"
        },
        {
          "id": "dawasa",
          "short": "DAWASA",
          "sector": "maji"
        },
        "… 48 more {id, short, sector}"
      ]
    },
    "current_institution": {
      "id": "tanesco",
      "short": "TANESCO",
      "full": "Shirika la Umeme Tanzania",
      "sector": "nishati",
      "services": [
        {
          "id": "tanesco-outage",
          "name": "Kukatika kwa umeme"
        },
        {
          "id": "tanesco-luku",
          "name": "Huduma za LUKU"
        },
        {
          "id": "tanesco-connection",
          "name": "Maunganisho mapya ya umeme"
        },
        {
          "id": "tanesco-billing",
          "name": "Bili na malipo"
        },
        {
          "id": "tanesco-safety",
          "name": "Usalama wa miundombinu ya umeme"
        }
      ]
    },
    "wizard": {
      "step": 3,
      "mode": "anonymous",
      "fields": {
        "service": "tanesco-outage (Kukatika kwa umeme)",
        "type": "lalamiko",
        "description": "Umeme umekatika katika mtaa wetu wa Sinza, Ubungo, Dar es Salaam tangu jana usiku. Tunaomba TANESCO irekebishe tatizo hili haraka.",
        "word_count": 20,
        "attachment": null,
        "region": "Dar es Salaam",
        "district": "Ubungo",
        "location": "Sinza",
        "incident_date": "",
        "confirmed": true
      },
      "errors": {}
    }
  },
  "elements": [
    {
      "id": "header.home",
      "role": "button",
      "label": "eMrejesho - Nyumbani"
    },
    {
      "id": "header.nav.home",
      "role": "button",
      "label": "Nyumbani"
    },
    {
      "id": "header.nav.msaada",
      "role": "button",
      "label": "Msaada",
      "state": "closed"
    },
    {
      "id": "header.nav.apps",
      "role": "button",
      "label": "eMrejesho Apps"
    },
    {
      "id": "header.lang.en",
      "role": "button",
      "label": "English"
    },
    {
      "id": "header.login",
      "role": "button",
      "label": "Ingia"
    },
    {
      "id": "header.register",
      "role": "button",
      "label": "Tengeneza Akaunti"
    },
    {
      "id": "page.back",
      "role": "button",
      "label": "Rudi"
    },
    {
      "id": "wizard.confirm-checkbox",
      "role": "checkbox",
      "label": "Nathibitisha kuwa taarifa hizi ni sahihi",
      "state": "on"
    },
    {
      "id": "wizard.back",
      "role": "button",
      "label": "Rudi"
    },
    {
      "id": "wizard.submit",
      "role": "button",
      "label": "Wasilisha",
      "sensitive": true
    },
    {
      "id": "footer.link.gisp",
      "role": "link",
      "label": "Government ICT Services Portal"
    },
    {
      "id": "footer.link.ega",
      "role": "link",
      "label": "e-Government Authority"
    },
    {
      "id": "footer.link.emikutano",
      "role": "link",
      "label": "eMikutano"
    },
    {
      "id": "footer.audit",
      "role": "button",
      "label": "Kumbukumbu za eSiri"
    }
  ]
}
```

Things to notice:
- `state.catalogue` is always present, so the model can route a problem to any institution from any page.
- `state.wizard.fields` gives every value and `errors` (empty here); `confirmed: true` matches the checkbox's `state: "on"`.
- On step 3 only the summary's controls are elements: the checkbox, Rudi and the sensitive `wizard.submit`.
- No personal fields appear because the mode is anonymous.

---

## 10. Real captured trace of one run

Request (typed): **"Umeme umekatika mtaani kwetu Sinza, Ubungo, Dar es Salaam tangu jana usiku. Nataka kulalamika bila kujulikana."**, fresh browser storage, logged out, starting on `/`, `?mute=1`, Ndiyo clicked on the confirmation card.

How it was captured (scratch tooling, not in the repo): the unmodified backend was started through a wrapper that replaced the client's `chat.completions.create` with a logging pass-through; the browser side was driven by a Playwright script that recorded `/api/agent/step` traffic, `esiri-status` changes, the panel text and the audit record. No application code changed for the capture.

Measured: **9 model calls, 39.0 s from Send to idle** (34.7 s until the confirmation card); prompt 9,420–10,361 tokens and completion 25–166 tokens per call; model latency 1.0–6.0 s per call (the first call took 6.0 s).

### 10.1 Status timeline (`data-testid="esiri-status"`, ms after Send)

```json
[
 {
  "ms": 400,
  "status": "thinking"
 },
 {
  "ms": 6454,
  "status": "acting"
 },
 {
  "ms": 6657,
  "status": "thinking"
 },
 {
  "ms": 8057,
  "status": "acting"
 },
 {
  "ms": 11354,
  "status": "thinking"
 },
 {
  "ms": 12349,
  "status": "acting"
 },
 {
  "ms": 13904,
  "status": "thinking"
 },
 {
  "ms": 16032,
  "status": "acting"
 },
 {
  "ms": 22935,
  "status": "thinking"
 },
 {
  "ms": 25257,
  "status": "acting"
 },
 {
  "ms": 30268,
  "status": "thinking"
 },
 {
  "ms": 31557,
  "status": "acting"
 },
 {
  "ms": 33401,
  "status": "thinking"
 },
 {
  "ms": 34689,
  "status": "awaiting_confirmation"
 },
 {
  "ms": 34809,
  "event": "clicked Yes"
 },
 {
  "ms": 34843,
  "status": "thinking"
 },
 {
  "ms": 36094,
  "status": "acting"
 },
 {
  "ms": 37635,
  "status": "thinking"
 },
 {
  "ms": 38997,
  "status": "speaking"
 },
 {
  "ms": 39000,
  "status": "idle"
 }
]
```

### 10.2 What the model received and returned (backend ⇄ OpenAI)

Every call carried `tools` (section 8.3), `temperature: 0.2`, `parallel_tool_calls: true`, model `gpt-4.1-mini`. Full snapshots are shown as `<N chars>`; for calls 2–9 only the messages that are new since the previous call are listed.

```text
── CALL 1 ─ prompt_tokens=9776 completion_tokens=76 latency=6009 ms
  [system]    <25820 chars: SYSTEM_PROMPT + app_map.md + 'CURRENT LANGUAGE: Swahili (sw)…'>
  [user]      [language=sw] [input=text] User request: Umeme umekatika mtaani kwetu Sinza, Ubungo, Dar es Salaam tangu jana usiku. Nataka kulalamika bila kujulikana.
              CURRENT SCREEN SNAPSHOT: <8287 chars of snapshot JSON>
  ⇒ MODEL RETURNED:
      click({"element_id": "institution-card.tanesco.open", "reason": "Open TANESCO institution page for electricity outage complaint"})
      click({"element_id": "landing.service.tanesco-outage", "reason": "Select TANESCO electricity outage service"})

── CALL 2 ─ prompt_tokens=10157 completion_tokens=73 latency=1391 ms
  [system + 2 earlier messages, all snapshots in them replaced by '[old snapshot omitted]']
  [tool …uwjQUa] {"ok":false,"code":"not_found","error":"Element \"institution-card.tanesco.open\" is not on the screen. Use an id from the latest snapshot."}
  [tool …QXPJFH] {"skipped":true}
              SNAPSHOT: <8287 chars of snapshot JSON>
  ⇒ MODEL RETURNED:
      click({"element_id": "landing.service.tanesco-outage", "reason": "Open TANESCO electricity outage service to submit complaint"})
      click({"element_id": "institution.submit", "reason": "Click to submit feedback to TANESCO"})

── CALL 3 ─ prompt_tokens=9420 completion_tokens=25 latency=985 ms
  [system + 5 earlier messages, all snapshots in them replaced by '[old snapshot omitted]']
  [tool …XzqFUf] {"ok":true}
  [tool …2k7TNZ] {"ok":true}
              SNAPSHOT: <5454 chars of snapshot JSON>
  ⇒ MODEL RETURNED:
      click({"element_id":"mode.anonymous","reason":"Choose anonymous mode for complaint submission"})

── CALL 4 ─ prompt_tokens=9572 completion_tokens=166 latency=2120 ms
  [system + 8 earlier messages, all snapshots in them replaced by '[old snapshot omitted]']
  [tool …Q7XLd2] {"ok":true}
              SNAPSHOT: <6552 chars of snapshot JSON>
  ⇒ MODEL RETURNED:
      select_option({"element_id": "wizard.service", "value": "tanesco-outage", "reason": "Select service for electricity outage"})
      select_option({"element_id": "wizard.type", "value": "lalamiko", "reason": "Select feedback type as complaint"})
      type_text({"element_id": "wizard.description", "text": "Umeme umekatika katika mtaa wetu wa Sinza, Ubungo, Dar es Salaam tangu jana usiku. Tunaomba TANESCO irekebishe tatizo hili haraka.", "reason": "Describe the electricity outage complaint"})
      click({"element_id": "wizard.next", "reason": "Proceed to next step in wizard"})

── CALL 5 ─ prompt_tokens=10361 completion_tokens=137 latency=2309 ms
  [system + 10 earlier messages, all snapshots in them replaced by '[old snapshot omitted]']
  [tool …usIY1g] {"ok":true,"selected":{"value":"tanesco-outage","label":"Kukatika kwa umeme"}}
  [tool …zL2Z1p] {"ok":true,"selected":{"value":"lalamiko","label":"Lalamiko"}}
  [tool …n8ERyn] {"ok":true}
  [tool …G2ywtQ] {"ok":true}
              SNAPSHOT: <7506 chars of snapshot JSON>
  ⇒ MODEL RETURNED:
      select_option({"element_id": "wizard.region", "value": "Dar es Salaam", "reason": "Select region Dar es Salaam for the complaint"})
      select_option({"element_id": "wizard.district", "value": "Ubungo", "reason": "Select district Ubungo for the complaint"})
      type_text({"element_id": "wizard.location", "text": "Sinza", "reason": "Type location Sinza for the complaint"})
      click({"element_id": "wizard.next", "reason": "Proceed to next step in wizard"})

── CALL 6 ─ prompt_tokens=10120 completion_tokens=26 latency=1280 ms
  [system + 15 earlier messages, all snapshots in them replaced by '[old snapshot omitted]']
  [tool …R2kvIf] {"ok":true,"selected":{"value":"Dar es Salaam","label":"Dar es Salaam"}}
  [tool …7ZTuv6] {"ok":true,"selected":{"value":"Ubungo","label":"Ubungo"}}
  [tool …2A7ocn] {"ok":true}
  [tool …6CP5PB] {"ok":true}
              SNAPSHOT: <6187 chars of snapshot JSON>
  ⇒ MODEL RETURNED:
      click({"element_id":"wizard.confirm-checkbox","reason":"Confirm the accuracy of the complaint information"})

── CALL 7 ─ prompt_tokens=9982 completion_tokens=44 latency=1279 ms
  [system + 20 earlier messages, all snapshots in them replaced by '[old snapshot omitted]']
  [tool …U2xYcf] {"ok":true,"state":"on"}
              SNAPSHOT: <6169 chars of snapshot JSON>
  ⇒ MODEL RETURNED:
      ask_confirmation({"summary":"Niwasilishe lalamiko kwa TANESCO kuhusu kukatika kwa umeme Sinza, Ubungo, Dar es Salaam, bila kujulikana?"})

── CALL 8 ─ prompt_tokens=10070 completion_tokens=27 latency=1240 ms
  [system + 22 earlier messages, all snapshots in them replaced by '[old snapshot omitted]']
  [tool …71vSbw] {"ok":true,"confirmed":true,"note":"Approved for 1 sensitive click(s). Continue with the approved action now."}
              SNAPSHOT: <6169 chars of snapshot JSON>
  ⇒ MODEL RETURNED:
      click({"element_id":"wizard.submit","reason":"Submit the electricity outage complaint anonymously to TANESCO"})

── CALL 9 ─ prompt_tokens=9919 completion_tokens=74 latency=1352 ms
  [system + 24 earlier messages, all snapshots in them replaced by '[old snapshot omitted]']
  [tool …WGPiH1] {"ok":true,"reference":"EMR-2026-80395","note":"Submitted. Tell the user this reference number and that it can be tracked."}
              SNAPSHOT: <5355 chars of snapshot JSON>
  ⇒ MODEL RETURNED:
      finish({"message":"Nimewasilisha lalamiko lako kwa TANESCO kuhusu kukatika kwa umeme Sinza, Ubungo, Dar es Salaam, bila kujulikana. Nambari ya kumbukumbu ni EMR-2026-80395. Unaweza kufuatilia kwa kutumia nambari hii."})
```

Observations from this real run:
- Call 1 guessed an id from another page (`institution-card.tanesco.open`); the driver returned `not_found` and the model recovered with the visible service card.
- Each wizard step was one batch ending with `wizard.next`, as the prompt asks. (In an earlier capture during the build, before that sentence and the wizard-step hint existed, the model forgot `wizard.next` on step 1 and spent 4 extra calls; see section 18.)
- The reference number reached the model twice: in the click result (`reference`) and in the success-page snapshot.

### 10.3 Panel content after the run

```text
Umeme umekatika mtaani kwetu Sinza, Ubungo, Dar es Salaam tangu jana usiku. Nataka kulalamika bila kujulikana.
→ Nimebofya 'institution-card.tanesco.open'
→ Nimebofya 'Kukatika kwa umeme – TANESCO'
→ Nimebofya 'Wasilisha Mrejesho'
→ Nimebofya 'Bila Kujulikana'
→ Nimechagua 'Kukatika kwa umeme'
→ Nimechagua 'Lalamiko'
→ Nimeandika 'Umeme umekatika katika mtaa wetu wa Sinza, Ubungo, Dar es Salaam tangu jana usiku. Tunaomba TANESCO irekebishe tatizo hili haraka.'
→ Nimebofya 'Endelea'
→ Nimechagua 'Dar es Salaam'
→ Nimechagua 'Ubungo'
→ Nimeandika 'Sinza'
→ Nimebofya 'Endelea'
→ Nimeweka alama 'Nathibitisha kuwa taarifa hizi ni sahihi'
Niwasilishe lalamiko kwa TANESCO kuhusu kukatika kwa umeme Sinza, Ubungo, Dar es Salaam, bila kujulikana?
Imeidhinishwa
→ Nimebofya 'Wasilisha'
Nimewasilisha lalamiko lako kwa TANESCO kuhusu kukatika kwa umeme Sinza, Ubungo, Dar es Salaam, bila kujulikana. Nambari ya kumbukumbu ni EMR-2026-80395. Unaweza kufuatilia kwa kutumia nambari hii.
```

(Step lines are shown with ✓/✗ icons in the UI; the first line failed with ✗. The confirmation card shows "Imeidhinishwa" after the approval.)

### 10.4 The audit record produced (localStorage; the same JSON was POSTed to `/api/audit`)

```json
{
  "id": "task-1791195079044-kzkd",
  "timestamp": "2026-10-05T10:11:19.044Z",
  "user": "Mgeni",
  "language": "sw",
  "inputMode": "text",
  "request": "Umeme umekatika mtaani kwetu Sinza, Ubungo, Dar es Salaam tangu jana usiku. Nataka kulalamika bila kujulikana.",
  "steps": [
    {
      "time": "2026-10-05T10:11:25.300Z",
      "tool": "click",
      "target": "institution-card.tanesco.open",
      "ok": false,
      "error": "Element \"institution-card.tanesco.open\" is not on the screen. Use an id from the latest snapshot."
    },
    {
      "time": "2026-10-05T10:11:28.730Z",
      "tool": "click",
      "target": "Kukatika kwa umeme – TANESCO",
      "ok": true
    },
    {
      "time": "2026-10-05T10:11:29.997Z",
      "tool": "click",
      "target": "Wasilisha Mrejesho",
      "ok": true
    },
    {
      "time": "2026-10-05T10:11:32.546Z",
      "tool": "click",
      "target": "Bila Kujulikana",
      "ok": true
    },
    {
      "time": "2026-10-05T10:11:35.812Z",
      "tool": "select_option",
      "target": "Mrejesho",
      "text": "Kukatika kwa umeme",
      "ok": true
    },
    {
      "time": "2026-10-05T10:11:36.963Z",
      "tool": "select_option",
      "target": "Aina ya Mrejesho",
      "text": "Lalamiko",
      "ok": true
    },
    {
      "time": "2026-10-05T10:11:40.245Z",
      "tool": "type_text",
      "target": "Maelezo ya mrejesho",
      "text": "Umeme umekatika katika mtaa wetu wa Sinza, Ubungo, Dar es Salaam tangu jana usiku. Tunaomba TANESCO irekebishe tatizo hili haraka.",
      "ok": true
    },
    {
      "time": "2026-10-05T10:11:41.578Z",
      "tool": "click",
      "target": "Endelea",
      "ok": true
    },
    {
      "time": "2026-10-05T10:11:45.129Z",
      "tool": "select_option",
      "target": "Mkoa",
      "text": "Dar es Salaam",
      "ok": true
    },
    {
      "time": "2026-10-05T10:11:46.278Z",
      "tool": "select_option",
      "target": "Wilaya",
      "text": "Ubungo",
      "ok": true
    },
    {
      "time": "2026-10-05T10:11:47.578Z",
      "tool": "type_text",
      "target": "Mahali/Mtaa",
      "text": "Sinza",
      "ok": true
    },
    {
      "time": "2026-10-05T10:11:48.911Z",
      "tool": "click",
      "target": "Endelea",
      "ok": true
    },
    {
      "time": "2026-10-05T10:11:52.045Z",
      "tool": "click",
      "target": "Nathibitisha kuwa taarifa hizi ni sahihi",
      "ok": true
    },
    {
      "time": "2026-10-05T10:11:56.278Z",
      "tool": "click",
      "target": "Wasilisha",
      "ok": true
    }
  ],
  "confirmations": [
    {
      "summary": "Niwasilishe lalamiko kwa TANESCO kuhusu kukatika kwa umeme Sinza, Ubungo, Dar es Salaam, bila kujulikana?",
      "result": "approved"
    }
  ],
  "outcome": "Completed",
  "finalMessage": "Nimewasilisha lalamiko lako kwa TANESCO kuhusu kukatika kwa umeme Sinza, Ubungo, Dar es Salaam, bila kujulikana. Nambari ya kumbukumbu ni EMR-2026-80395. Unaweza kufuatilia kwa kutumia nambari hii.",
  "durationMs": 38596
}
```

`ask_confirmation` is not a step; confirmations are recorded separately. The audit `user` is the logged-in account's name, or **"Mgeni"** (guest) when logged out.

---

## 11. The ghost cursor and action execution

### The cursor (`esiri/cursor.ts`)

A fixed full-screen layer (`z-index: 2147483000`, `pointer-events: none`) with a highlight ring and an SVG pointer (blue gradient) labelled **"eSiri"**. `glideTo()` animates with cubic ease-in-out over 500–700 ms; `highlight()`, `ripple()`, `press()`; hidden on ask_confirmation, ask_user, finish, fail and cancel.

### Click (`driver.ts` `click()`)

`find()` → reachable (not behind a modal) / disabled / `<select>` checks → **sensitive gate** → `approach()` (scroll into view if within 60 px of an edge, including horizontally inside the sector carousel; glide; highlight) → 140 ms → re-check → ripple + press → use a credit if sensitive → **`el.click()`** → `settle()` (350 ms + 2 frames; +250 ms if path or query changed) → `{ok:true, state?}`. `el.click()` dispatches a real click, so React `onClick`, checkbox `onChange` and form submits behave exactly as for a human.

### Typing (`typeText()`) and the native-setter technique

Inputs are React controlled components; a plain `el.value = x` is undone by React's value tracker. The driver calls the **prototype's** setter (`HTMLInputElement/HTMLTextAreaElement/HTMLSelectElement.prototype` `value` setter) and dispatches `input` (and `change` for selects), so React's `onChange` runs. Text is typed visibly: one character every 30 ms (2 per step above 80 characters, 4 above 160, so long descriptions don't take a minute); date inputs get their full value at once. Never sends key events (no Enter). After settling it verifies `el.value === text`. **Password inputs are refused before any animation** (section 12).

### Choosing options (`selectOption()`)

Matching order: exact value → value ignoring case/accents → exact label (normalised: NFD, accents removed, lower case, punctuation collapsed) → unique label prefix → unique substring. Ambiguous or no match → `{ok:false, code:'invalid'}` listing up to 40 option labels. Then cursor approach, native setter + `change`, verify `el.value`. If the target is a text field it types instead (the district field switches between a dropdown and a text field by region).

### Navigate (`navigate()`)

Validates the page against `PAGES`; builds the path from `institution_id` / `sector_id` / `mode` / `ref`; refuses `success`, `my_feedback` and account-mode `wizard` while logged out (`login_required`); for `wizard` it starts or reuses the draft **at step 1**; `goTo(path)` (React Router via `nav.ts`); settles. No cursor animation for navigate.

---

## 12. Safety: confirmation gate, password gate, decline, cancellation

### The confirmation gate (in code)

```ts
// driver.ts click()
const sensitive = el.getAttribute('data-esiri-sensitive') === 'true';
if (sensitive && !ctx.hasCredit()) return { ok: false, code: 'confirmation_required', error: '…' };
… animation …
if (sensitive) ctx.useCredit();
el.click();
```

`ctx` is built per task by `controller.ts` `driverCtx(task)`. Credits are added in exactly one place: `execute()` case `ask_confirmation`, after a **yes**, `task.credits += covers` (1..10), scoped to the task. Covered by `ui.spec.ts` "sensitive clicks are refused without a confirmation credit" (zero credits → `confirmation_required` and no submission; one credit → submitted, 0 left). Additionally `wizard.submit` is disabled until the confirmation checkbox is ticked, so a credit is never wasted on an incomplete summary.

### The password gate (in code)

- `driver.ts` `typeText()`: if the element is `input[type=password]` it returns `{ok:false, code:'password_field', error:'eSiri never types passwords. Ask the user to type it themselves.'}` before touching it. `selectOption()` on a password field falls through to the same refusal.
- `snapshot.ts` `describeElement()`: password inputs report only `filled: true|false`, never a value.
- `controller.ts`: the panel step reads "Sikuandika nenosiri — unaandika mwenyewe", the audit step text is `••••`, and the refusal stops the batch without counting as a repeated failure.
- Tests: `ui.spec.ts` "password gate" (the field stays empty) and "snapshot never contains the password value"; `agent.spec.ts` scenario 7 (login help leaves the password empty).
- Registration passwords are typed only by the user; account passwords are stored as a `hashPassword()` hash (cyrb53, non-cryptographic — PoC).

### Deterministic checks added because prompt rules were not reliable

| Check | Where | Why |
|---|---|---|
| **Already-given** | `controller.ts` `ask_user` + `given.ts` `extractGiven()` | The model sometimes asked for region/district/mode the user had just given (seen 1 in 3 runs of scenario 1). `ask_user` must declare `missing`; if any item is a region, district, mode or phone the user's words (`task.request`) already contain, the question is not shown: the model gets `{ok:false, code:'already_given'}` with the recognised values and continues. At most once per task, so a genuine follow-up can still be asked. |
| Wizard-step hint | `driver.ts` `notFound()` | A step-2 field targeted on step 1 returns "It is on wizard step 2; you are on step 1. Click wizard.next first." |
| Field-type tolerance | `typeText()` / `selectOption()` | `wizard.district` is a dropdown or a text field depending on the region. |
| Reference hand-off | `execute()` case `click` | After `wizard.submit`, the result carries `reference`. |
| Spoken reference | `tts.ts` `spokenForm()` | Reference numbers are always pronounced letter by letter and in digit groups, whatever the model wrote. |
| Login completes the task | `controller.ts` `useApp.subscribe` | After login help ends with "type your password", a successful login closes the waiting task (Completed, "Karibu, …!") instead of leaving eSiri waiting. |

### Decline and cancellation

Unchanged from the core. **Decline** (button, typed or spoken no, or two unclear voice attempts): records `declined`, `task.declined = true`, result tells the model to finish; a second `ask_confirmation` in the same task ends it with "Sawa, sijafanya hivyo."; outcome **Declined** (scenario 8 asserts exactly one confirmation). **Cancel** (Esc in capture phase — modals don't close while eSiri is busy —, ■ Stop, orb click while busy, "simama"/"stop"/"eSiri, stop" as the whole utterance): stops listening and speech, hides the cursor, resolves a pending confirmation as declined, aborts the fetch and every driver wait, writes **Cancelled**, says "Nimesimama." (scenario 9).

---

## 13. Speech

Unchanged core behaviour, with eSiri naming and Swahili first:
- **Recognition** (`stt.ts`): `webkitSpeechRecognition`, `sw-TZ` by default (`en-US` in English), interim results, 20 s safety timer, error mapping to notices (blocked microphone, Chromium/network, unexpected stop).
- **Speech output** (`tts.ts` `speak()`): markdown stripped, reference numbers spoken letter by letter (`spokenForm()`), English via Chrome's best Google voice (or OpenAI if `ESIRI_ENGLISH_TTS=openai`), **Swahili via a local `sw` voice if one exists, otherwise OpenAI** (`/api/tts`, instructions for a warm Tanzanian accent). Always resolves (estimate + 3 s, +6 s for OpenAI).
- **Yes/no** (`util.ts` `parseYesNo()`): ndiyo, ndio, sawa, endelea, haya, thibitisha, yes, ok… / hapana, acha, usifanye, ghairi, sitisha, no, cancel…
- **Wake word** (`stt.ts` `WAKE_RE = /\b(e[\s-]?siri|hey siri|hi siri|a siri|easy ri|siri)\b/i`), only while idle; text after the wake word is used as the command.
- **Echo avoidance:** eSiri never listens while speaking or acting.
- Tests run muted; `/api/tts` Swahili is tested (HTTP 200, `audio/mpeg`, >1000 bytes). Real microphone/speaker paths need a manual check in Chrome.

---

## 14. Bilingual support

- `i18n/sw.ts` (362 keys, `as const`, exports `I18nKey` and `Dict`) is primary; `en.ts` is typed `Dict`, so a missing or extra key fails the build. Placeholders `{name}` are filled by `tr()`.
- Data texts (sector names, services, FAQs, help FAQs) are bilingual `{sw, en}` objects in `data.ts`, rendered with `pick(text, lang)`. Institution names, user data (descriptions, names, places) and institution responses are not translated. `#IambieSerikali` is the same in both languages.
- One setting: `useApp.language` (persisted, default **sw**; `?lang=` for a fresh store), changed by the header link (`header.lang.en` while Swahili is active / `header.lang.sw` while English is active), the panel's SW/EN chip, or the `set_language` tool. `setLanguage()` also sets `<html lang>`.
- Propagation: every component uses `useT()`, so labels (and `data-esiri-label`s) re-render; ids never change. Recognition language, TTS routing and the backend prompt (`[language=xx]` + `CURRENT LANGUAGE`) follow the setting. Dates use `sw-TZ` / `en-GB`.
- Model-facing notes, errors and `app_map.md` are English regardless of the language.

---

## 15. State and persistence

### `useApp` — `store/appStore.ts` (zustand + persist, localStorage key `emrejesho-store`, version 1)

| Persisted field | Content |
|---|---|
| `language` | `'sw' \| 'en'` |
| `sessionId` | backend `session_id` |
| `wakeMode` | boolean |
| `accounts` | `Account[]` (username, fullName, phone 0XXXXXXXXX, email, region, passwordHash) — seed: Rahma Mbuyu |
| `currentUser` | username or null |
| `submissions` | `Submission[]` (ref, institutionId, serviceId, type, description, attachment {name,size}, region, district, location, incidentDate, mode, fullName/phone/email/checkNumber per mode, owner, status, history, response, createdAt) — seed: 4 |
| `audit` | `AuditRecord[]`, newest first, max 500 |

Not persisted: `toasts` (max 3, 5 s) and `draft` (the wizard form: step, values, errors). Actions: `setLanguage, setWakeMode, newSession, resetDemo, login, logout, register, startDraft, updateDraft, submitDraft, withdraw, toast, dismissToast, addAudit, clearAudit`; helpers `validateStep, normalizePhone, formatPhone, wordCount, isEmail, formatDate, emptyDraft`.

`resetDemo()` ("Rejesha data ya mfano") restores the seed accounts and submissions, clears the audit and draft, starts a new session, and keeps Rahma logged in if she was.

### `useEsiri` (not persisted), controller module state, backend memory

As in the core: panel, status (mirrored into `data-testid="esiri-status"`), messages, interim text, health, wake flags; `current`, `awaitingAnswer`, `pendingConfirm`; backend `SESSIONS`, `LOCKS`, TTS cache — all in memory. `backend/audit_log.jsonl` is append-only and git-ignored.

---

## 16. Data flow and privacy

| Data | Destination | When | Code |
|---|---|---|---|
| System prompt + app map + conversation (requests, tool calls, tool results) + **the latest snapshot** | **OpenAI** Chat Completions | every agent step (7–10 for a submission) | `main.py` `step()` |
| → snapshot: page, route, toasts, institution catalogue, current institution services and open FAQ answers | | | `snapshot.ts` |
| → **wizard values: description, region, district, place, date, full name, phone, email, check number**; account name and phone when logged in | | | `state.wizard`, `state.user`, `elements[].value` |
| → tracking result / My Feedback list (descriptions, places, responses) | | | `state.tracking`, `state.my_feedback` |
| → visible text field values (searches, login identifier) | | | `elements[].value` |
| Text to be spoken (Swahili always unless a local `sw` voice exists) | **OpenAI** Audio Speech | each spoken reply/question/confirmation | `tts.py` |
| **Microphone audio** while listening (and continuously in wake mode) | **Google** via Chrome speech recognition | while listening | `stt.ts` |
| Font requests | Google Fonts | page load | `index.html` |

**Never sent:** password values (masked in snapshots, never typed), password hashes, the audit log, attachment contents (only name and size are stored, and only the name is in the snapshot), other users' data. All app data stays in the browser; the audit is also appended to `backend/audit_log.jsonl`. The API key stays in `.env` and backend memory (`/api/health` exposes only `has_key`). The backend binds to `127.0.0.1`; CORS allows only `localhost:5173`. No authentication on endpoints.

---

## 17. Testing

All tests are Playwright end-to-end tests in `frontend/e2e/`; there are no unit tests. **Total: 39 tests** — `ui.spec.ts` 23, `agent.spec.ts` 11, `demo.spec.ts` 1, `screenshots.spec.ts` 4.

Final run while writing this document (2026-10-05, `npm run build` clean, then `npx playwright test`, servers started by Playwright, `retries: 1` configured): **39 passed, 0 failed, 0 flaky** (no test needed its retry), 8.9 minutes. Per suite: `ui.spec.ts` 23/23, `screenshots.spec.ts` 4/4, `agent.spec.ts` 11/11 (8.6–50.1 s each), `demo.spec.ts` 1/1 (2.1 min). Earlier during the build the headline scenario failed about 1 in 3 runs until the already-given check was added (section 18); after it, 5 consecutive isolated runs of scenario 1 passed, plus this full run.

### Configuration (`playwright.config.ts`)

Chromium (Playwright's build), 1366×768, `timeout: 200_000`, `expect` 15 s, `retries: 1`, `workers: 1`, traces/screenshots on failure in `e2e/test-results/`, HTML report in `e2e/report/`. `webServer` starts the backend (`".venv/bin/uvicorn" app.main:app --port 8000`, cwd `backend/`) and `npm run dev`, both `reuseExistingServer: true`. Every test gets a fresh browser context (fresh localStorage) and opens the app with `?mute=1`.

### Helpers (`e2e/helpers.ts`)

`store()`, `newSubmissions()` (non-seed submissions), `start()`, `loginByHand()`, `openPanel()`, `submitByHand({mode})`, and `askEsiri(page, text, {confirm, answer, expectQuestion})`: types into the panel, answers confirmation cards, and on `awaiting_answer` either returns the question (`expectQuestion`), answers it once (`answer`, returning `question`) or fails.

### `ui.spec.ts` — 23 tests, no LLM

Landing (branding, Swahili default, no NURU/Jolama, all three searches, service card, sector card, buttons); institution lists (sector title, 12 per page, pagination, search); institution page (contacts, FAQ toggle state and answer, FAQ search, empty state); wizard validation (required fields, min 5 words, word count, district select vs text field, phone format, summary, submit disabled until confirmed, back keeps values); **submissions end to end in all four modes** (account mode via the login redirect) and tracking them; login success/failure/logout; registration (validation, mismatch, hashed password, logged in); tracking found/answered/not found/`?ref`; Mrejesho Wangu (login required, withdraw only for Imepokelewa, cancel + confirm, open); Msaada pages; language switch both ways; user menu (audit, reset demo data, footer audit link); floating stack (4 buttons, orb on top with a canvas, decorative toast, opens the panel, hides, Alt+S); **sensitive gate without credits**; **password gate**; **snapshot without password**; **select_option by value and by label** (+ options in the snapshot, 31 regions); navigate rules (no step 3, account needs login); already-given checker; backend (health without the key, Swahili TTS returns MP3, audit endpoint).

### `agent.spec.ts` — 11 tests `@llm` (skipped without a key)

| # | Request | Asserts (final state only) |
|---|---|---|
| 1 | "Umeme umekatika mtaani kwetu Sinza, Ubungo, Dar es Salaam tangu jana usiku. Nataka kulalamika bila kujulikana." | 1 new submission: TANESCO, lalamiko, anonymous (no name), Dar es Salaam/Ubungo, ≥5-word description, reference shown, audit Completed with ≥1 approved confirmation, user Mgeni |
| 2 | English, personal mode DAWASA suggestion | DAWASA, pendekezo, personal, name and phone stored, Ubungo, Kimara |
| 3 | Logged in: "Wasilisha pongezi kwa NIDA kupitia akaunti yangu…" | NIDA, pongezi, account, owner rahma.mbuyu, Dodoma/Dodoma Jiji |
| 4 | Civil servant NSSF complaint with check number 11223344 | NSSF, civil-servant, check number, name, Ilala |
| 5 | "Fuatilia mrejesho EMR-2026-48213" | tracking page shows it; reply mentions *inashughulikiwa* |
| 6 | "Nataka kulalamika kuhusu maji" → answer "Bila kujulikana, Kinondoni, Dar es Salaam, Mwananyamala, hakuna maji tangu wiki iliyopita" | a question was asked; DAWASA, anonymous, Kinondoni, lalamiko |
| 7 | "Nisaidie kuingia, jina langu la mtumiaji ni rahma.mbuyu" | on /ingia, identifier filled, password empty, eSiri asked for the password, still logged out |
| 8 | Logged in, submission created by hand, "Ondoa mrejesho EMR-…", click No | still exists, audit Declined, exactly one confirmation |
| 9 | Submission request, Esc while `acting` | idle within 5 s, audit Cancelled, no submission after 3 s |
| 10 | "Nawezaje kupata namba ya NIDA?" | NIDA page, `institution.faq.nida-faq-1` open, reply based on the FAQ |
| 11 | "Speak English" | language en, header "Home", English reply |

### `demo.spec.ts` — the README demo as one conversation `@llm`

All seven README steps in one session (complaint, tracking, login help + manual password, FAQ, Mrejesho Wangu, account submission + declined withdrawal, opening the audit log): asserts each final state, ≥7 audit records, a Declined one, no Failed, and that opening the audit page needed no confirmation.

### `screenshots.spec.ts` — 4 tests (SW/EN × 1366×768/1920×1080)

19 screens each with the panel open and a sample conversation: landing, sectors, Msaada menu, sector list, all institutions, institution (FAQ open), mode modal, wizard steps 1–3, success, tracking, Mrejesho Wangu, the three help pages, audit, login, register. At each it asserts no horizontal page scroll and no element in `<main>` overflowing the content area, then saves `e2e/screenshots/{lang}-{width}-{nn-name}.png` (76 files, committed). They were inspected by eye during the build and compared with `reference/`.

What the tests do **not** cover: real microphone input, real speaker output, wake-word mode, voice confirmations, `ESIRI_ENGLISH_TTS=openai`, other models than `gpt-4.1-mini`, phone-size layouts.

---

## 18. Decisions, deviations, and bugs fixed during the build

### Decisions not specified by the build prompt

| Decision | Where | Why |
|---|---|---|
| Landing search results use `landing.search-result.{institutionId}`, `.service.{serviceId}`, `.sector.{sectorId}` | `Landing.tsx` | The required id covers institutions; services and sectors needed their own ids. |
| SEMA NA KIONGOZI → all institutions; TOA TAARIFA and the campaign button → scroll to the sector cards | `Landing.tsx` | "open the institution search / sector list". |
| One language link in the header, id `header.lang.en` while Swahili is active and `header.lang.sw` while English is active | `Layout.tsx` | The reference shows a single "English" link; both required ids exist. |
| Sector carousel is a horizontally scrolling 2-row grid (arrows scroll a page) | `Landing.tsx/.css` | All 17 sector cards stay in the snapshot and the driver can scroll to them. |
| FAQ answers appear in the snapshot only when opened | `snapshot.ts` `faqState()` | Forces the visible step "open the matching question" and makes "answer from what is shown" literally true. |
| Withdraw deletes the submission | `appStore.ts` `withdraw()` | The status order has no "withdrawn" state; deleting keeps the timeline simple. |
| Wizard draft in the store, not persisted; navigating to the wizard always starts at step 1 | `appStore.ts`, `driver.ts` | Snapshot needs the values; step 3 must not be reachable directly. |
| `wizard.submit` disabled until the checkbox is ticked | `Wizard.tsx` | A confirmed credit is never spent on an incomplete form. |
| My Feedback = submissions with `owner` = the logged-in user (account mode, or personal/civil-servant while logged in) | `appStore.ts` `submitDraft()` | As specified; anonymous never gets an owner. |
| Phone numbers normalised to `0XXXXXXXXX` (accepts spaces, `+255`, `255`) | `normalizePhone()` | "Tanzanian format". |
| Check number = 6–12 digits | `validateStep()` | No official format was given. |
| Text typed in larger chunks above 80/160 characters | `typeText()` | Descriptions would otherwise take ~10 s to type visibly. |
| Decorative stack buttons and footer policy links show "Kipengele hiki hakipo katika mfano huu" | `EsiriRoot.tsx`, `Layout.tsx` | As specified for the stack. |
| Map is an approximate hand-drawn SVG outline with city labels and a pin (Dar es Salaam, or Dodoma/Arusha/Mwanza/Mbeya for some bodies) | `InstitutionPage.tsx` | "decorative static map panel"; not geographically exact. |
| Award section shows a CSS certificate instead of photos | `Landing.tsx` | "text only, no photos". |
| Tests and helpers set prerequisites through the UI per test | `e2e/` | Fresh storage per test. |
| Extra `demo.spec.ts` | `e2e/` | Verifies the README demo as one conversation. |

### Bugs and agent-behaviour problems found and fixed

| Symptom | Cause | Fix |
|---|---|---|
| Every agent call failed with "The OpenAI API key was rejected" | The `.env` line had the placeholder text `sk-your-key-here…` pasted in front of the real key | Removed the placeholder prefix (the real key, verified with a 200 from `/v1/models`, was kept unchanged); README troubleshooting mentions it. |
| Civil-servant request: the model asked whether to log in first | Prompt didn't say which modes need login | Prompt: only account mode needs login. |
| ~1 in 3 runs of the headline request: "Tafadhali nitaje mkoa, wilaya, na mahali…" although all were given | Model variance; prompt rules alone didn't fix it | Deterministic **already-given** check (`given.ts` + `ask_user.missing`, section 12). After the fix: 5/5 consecutive passes, and the full suite passed. |
| "Ubungo, Dar es Salaam, Kimara" → the model asked which district | Unordered place lists | Prompt rule on matching names against regions/districts; the remaining name is the place. |
| "Fungua kumbukumbu za eSiri" (open) → the model **cleared** the audit log (after asking; the test clicked Yes) | Misread intent | Prompt + app map: fungua/onyesha = open only; clear only on an explicit "futa"; the demo test now answers No there and asserts no confirmation. |
| After a declined withdrawal, the next request was answered "Nimefungua…" without any action | The decline note ("call finish now") carried over to the next task | Prompt: a decline applies only to its own task; never claim an action not performed. |
| From the success page, "Fuatilia EMR-2026-48213" was answered "not found" | The model clicked `success.track` (tracks the new reference) and misread | Prompt + app map: always type the user's reference; check `state.tracking.searched`. |
| The model sometimes forgot `wizard.next` on step 1 and retried step-2 fields | — | Wizard-step hint in `notFound()`; prompt: each step is one batch ending with `wizard.next`. |
| Login help left eSiri "waiting for your answer" after the user logged in by hand | `ask_user` ends the turn | Login during `awaiting_answer` completes the task (`controller.ts`). |
| Modals were centred under the open panel | Fixed full-viewport backdrop | `.panel-open .modal-backdrop { right: 380px }` (found by the overflow check). |
| Hero squeezed with the panel open at 1366 px (search placeholders cut off) | Media queries use the viewport, not the content width | `.panel-open` layout rules below 1530 px (single-column hero, fewer grid columns). |
| `TypeError: destroy is not a function` on every route change | `useEffect(() => window.scrollTo(...))` returned a value | Effect body in braces. |
| Phone not recognised in "phone 0712 345 678" by the checker | `\b` before the digits after removing spaces | Look-behind/ahead for digits. |

---

## 19. Known limitations and weaknesses

**Approach**
- **The mockup was built for the agent.** Every element has a stable `data-esiri-id`, label, sensitivity flag and state. The real e-Mrejesho has none of these; pointing eSiri at it needs an equivalent layer (selectors/accessibility tree + a curated map, or APIs).
- **Front-end only.** No real institutions receive anything; statuses never advance by themselves (seeded submissions show the later states). All data is in one browser's localStorage; accounts are not real authentication (the password hash is non-cryptographic).
- Seed data (institutions, services, phone numbers, FAQ answers) is realistic but **not official**; some contacts are generated.

**Safety**
- The gates live in the browser: strong against the model, not against someone with devtools. No server-side check.
- Credits are not bound to the element or summary approved; within one task an approval allows any one sensitive click.
- Gate correctness depends on correct tagging (`data-esiri-sensitive`) and on password inputs being `type=password`.
- `window.__esiriTest` is exposed in all builds.
- The already-given check recognises only regions, the six district lists, mode phrases and phone numbers; it can't tell whether a free-text place or name was given. It also cannot stop a question about a fact it doesn't recognise, and it rejects at most once per task.
- `/api/audit` accepts any JSON; the audit is not tamper-evident.

**Model behaviour** (`gpt-4.1-mini`, temperature 0.2)
- LLM output varies; tests assert final state with `retries: 1`. Several behaviours needed code fixes (section 18). Other models were not tested.
- Occasional wrong first guesses (ids from another page) cost an extra call; the driver errors let it recover.
- Descriptions are written by the model: the prompt forbids invented facts, but this is not verified in code (the tests only check length and routing).
- Routing relies on the aliases in the app map; an ambiguous problem (e.g. water outside Dar es Salaam) may need a question.
- Model-facing notes and the app map are English even in Swahili sessions.

**Performance and cost**
- A full submission takes **~35–45 s and 7–10 model calls** (captured: 39 s, 9 calls), ~10 k prompt tokens per call (the 25.8 k-character system prompt dominates; no explicit prompt caching configured — OpenAI's automatic caching was not verified).
- Backend sessions are never evicted; `/api/agent/reset` is unused.

**Dependencies and testing gaps**
- Needs internet: OpenAI, Google speech, Google Fonts. Voice input needs Google Chrome. Swahili recognition quality (`sw-TZ`) was not measured.
- The wake-word regex includes bare "siri", so false activations are possible.
- No unit tests; voice paths, wake mode and voice confirmations are untested automatically. Layout was checked at 1366 and 1920 px only.

**Code hygiene (left as-is)**
- Unused: `api.ts` `resetSession()`, `controller.ts` `hasPendingTask()`, `stt.ts` `isWakeActive()`, `Common.tsx` `Toggle`, `ez()`'s `role` option.

---

## 20. Extension guide

### Add a new screen

1. `frontend/src/pages/MyPage.tsx` (+ CSS) inside `PageFrame`; every string via `useT()` with keys in **both** `sw.ts` and `en.ts`.
2. Tag every actionable element with `ez('mypage.thing', t('…'), { sensitive?, state? })`; dialogs with `Modal` (`name`, `closeId`).
3. Route in `App.tsx` (`RequireLogin` if needed).
4. `esiri/nav.ts` `pageFromPath()` + `PAGES`; data the model must read → `snapshot.ts` `buildSnapshot()` `state`; direct jumps → `driver.ts` `navigate()` and the `navigate` enum in `agent.py` `TOOLS`.
5. Document it in `app_map.md` (route, ids, ⚠, cause→effect, a flow, aliases). Restart the backend.
6. Tests: a human flow in `ui.spec.ts`, an `@llm` scenario in `agent.spec.ts`, the page in `screenshots.spec.ts`.

### Add an institution, service or FAQ

Edit `store/data.ts` (`inst(id, short, full, sector, [S(id, sw, en)…], {faqs: [F(id, qsw, asw, qen, aen)]})`). Ids must be unique; service ids are globally unique. Add natural-language aliases to `app_map.md` §5 if people describe its problems in everyday words. "Rejesha data ya mfano" is not needed (catalogue data is not persisted).

### Add a sensitive action

Tag the button `{ sensitive: true }` — this alone makes the driver require a confirmation — then add it to the SAFETY list in `SYSTEM_PROMPT` and mark it ⚠ in `app_map.md`, and add an `@llm` test (including a decline).

### Add a deterministic check

When a prompt rule proves unreliable, check it in `controller.ts` `execute()` (inspect the tool call and/or the state, return `{ok:false, code, error}` explaining what to do instead) — as done for `already_given`, wizard-step hints and the reference hand-off.

### Point the pattern at another system

The reusable part is **snapshot → model with tools → validated actions → confirmation and password gates → audit**. System-specific: the tags, `app_map.md`, the snapshot `state`, the sensitive list and the deterministic checks. For a UI you cannot change, run the "hands" server-side (Playwright) with ids from stable selectors and a curated map that also marks sensitive actions; for a system with an API, make the tools API calls and keep confirmation credits in the executor.

---

## 21. Glossary

| Term | Meaning in this codebase |
|---|---|
| **eSiri** | The AI agent (overlay + controller + backend). |
| **e-Mrejesho** | Tanzania's citizen feedback system; here, the mockup being driven. |
| **Mrejesho** | Feedback. Types: **lalamiko** (complaint), **pendekezo** (suggestion), **ulizo** (inquiry), **pongezi** (compliment). |
| **Taasisi / Sekta / Huduma** | Institution / sector / service. |
| **Namba ya kumbukumbu** | Reference number, `EMR-2026-NNNNN`. |
| **Statuses** | imepokelewa (received) → inashughulikiwa (in progress) → imejibiwa (answered) → imefungwa (closed). |
| **Submission modes** | personal (*Weka Taarifa Binafsi*), anonymous (*Bila Kujulikana*), account (*Akaunti ya eMrejesho*), civil-servant (*Watumishi wa Umma/Wastaafu*, with check number). |
| **Wizard / draft** | The 3-step submission form (`Wizard.tsx`) / its in-progress values (`useApp.draft`). |
| **Mgeni** | Guest: the audit user when nobody is logged in. |
| **Agent loop / task / turn / batch** | `runLoop()`; one request until finish/fail/decline/cancel (one audit record); one user message and its model calls; the tool calls of one model response. |
| **Snapshot / catalogue** | JSON of the screen and state (`buildSnapshot()`); the always-present list of sectors and institutions. |
| **App map / system prompt** | `app_map.md`; `SYSTEM_PROMPT` + app map + language line. |
| **data-esiri-\*** | Tagging attributes (section 8.4). |
| **Sensitive action / credit / gate** | A click on `data-esiri-sensitive="true"`; one approved click; the check in `driver.ts`. |
| **Password gate** | `typeText()` refusing password inputs + snapshot masking. |
| **Already-given check** | Rejection of `ask_user` questions about facts the user stated (`given.ts`). |
| **Ghost cursor / orb / floating stack** | The animated pointer; the plasma sphere; the right-edge column of round buttons with eSiri's orb on top. |
| **Status** | idle, listening, thinking, acting, speaking, awaiting_confirmation, awaiting_answer. |
| **Mute mode** | `?mute=1`: no speech output and no microphone (tests). |
| **Rejesha data ya mfano** | Reset demo data (`resetDemo()`). |
| **@llm** | Tag of tests that need the OpenAI key. |
