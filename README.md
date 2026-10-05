# eSiri × e-Mrejesho — proof of concept

**eSiri** is an AI agent for government web systems. A citizen speaks or types a request in **Swahili** or English, and eSiri completes the task *inside the existing web interface* by visibly moving its own cursor, clicking and typing like a person. It asks for confirmation before consequential actions and records every task in an audit log.

This repository puts eSiri on top of a realistic **mockup of e-Mrejesho**, Tanzania's government system for sending, receiving and tracking citizen feedback (malalamiko, mapendekezo, maulizo, pongezi). Its headline ability: a citizen describes a problem in everyday words — *"Umeme umekatika mtaani kwetu Sinza…"* — and eSiri finds the right institution (TANESCO), chooses the feedback type, writes a clear description, fills the whole 3-step form, reads it back, and submits only after the citizen says yes. Then it reads out the reference number.

The interface defaults to **Swahili**; English is one click away.

---

## Requirements

- **Node.js 18+** and npm
- **Python 3.10+**
- **Google Chrome** (voice input uses Chrome's speech recognition; Chromium does not work)
- Internet access (OpenAI for the agent and Swahili speech; Google for speech recognition and fonts)
- An **OpenAI API key**

## Setup and run

```bash
cp .env.example .env        # then put your key in .env:  OPENAI_API_KEY=sk-...
./start.sh                  # first run installs everything (venv + npm); then starts both servers
```

Open **http://localhost:5173** in Google Chrome and allow the microphone when asked. `Ctrl+C` stops both servers.

- Backend: FastAPI on `http://localhost:8000` · Frontend: Vite on `http://localhost:5173`.
- The project path may contain spaces; `start.sh` quotes everything.
- Optional `.env` settings: `OPENAI_MODEL` (default `gpt-4.1-mini`), `OPENAI_TTS_MODEL` (`gpt-4o-mini-tts`), `OPENAI_TTS_VOICE` (`coral`), `ESIRI_ENGLISH_TTS` (`browser` or `openai`).

## Sample account

| | |
|---|---|
| Name | **Rahma Mbuyu** |
| Phone | `0712 345 678` |
| Username | `rahma.mbuyu` |
| Password | `Demo@2026` |

Rahma already has three submissions (`EMR-2026-48213` TANESCO – Inashughulikiwa, `EMR-2026-31877` DAWASA – Imejibiwa, `EMR-2026-27560` NIDA – Imefungwa). `EMR-2026-50921` is an anonymous TANROADS complaint (Imepokelewa) that anyone can track by number. The user menu's **Rejesha data ya mfano** restores all of this.

## Using eSiri

- **Open eSiri:** click the **orb at the top of the floating stack** on the right edge (the blue plasma sphere), or press **Alt+S**. eSiri opens its side panel and starts listening.
- **Speak** your request in Swahili (default) or English. Or **type** it in the panel — typing always works, also for yes/no answers.
- eSiri moves its own cursor (labelled *eSiri*) and you can watch every click. Each step is listed in the panel.
- Before **submitting feedback, creating an account, withdrawing feedback or clearing the audit log**, eSiri asks. Say or click **Ndiyo / Yes** or **Hapana / No**.
- **Esc**, the **■ Stop** button, a click on the orb while it works, or saying **"eSiri, simama" / "stop"** cancels immediately.
- **Language:** the header's *English / Kiswahili* link, the SW/EN chip in the panel, or just ask ("Speak English", "Ongea Kiswahili").
- **Passwords:** eSiri never types a password. When it helps you log in it fills your username and asks you to type the password and press *Ingia* yourself.
- Optional *always listening* toggle in the panel: say **"eSiri"** followed by your request.
- Every task (completed, declined, cancelled, failed) is in **Kumbukumbu za eSiri** (user menu, or the footer link when logged out).

## 5-minute demo script

Start at `http://localhost:5173`, logged out, Swahili. Open eSiri with **Alt+S** (or the orb). Speak or type each line.

1. **Describe a problem (the headline).**
   *"Umeme umekatika mtaani kwetu Sinza, Ubungo, Dar es Salaam tangu jana usiku. Nataka kulalamika bila kujulikana."*
   → eSiri opens TANESCO, chooses *Bila Kujulikana*, picks *Kukatika kwa umeme* and *Lalamiko*, writes the description, fills Dar es Salaam / Ubungo / Sinza, ticks the confirmation box and reads back a summary. Say **"Ndiyo"**. It submits and reads the reference number aloud ("E M R, 2026, …").
2. **Track feedback.** *"Fuatilia mrejesho EMR-2026-48213"* → tracking page, status *Inashughulikiwa*.
3. **Login help.** *"Nisaidie kuingia, jina langu la mtumiaji ni rahma.mbuyu"* → eSiri fills the username and asks you to type the password. Type `Demo@2026` yourself and press **Ingia**.
4. **Institution FAQ.** *"Nawezaje kupata namba ya NIDA?"* → NIDA page, the matching question opens, eSiri answers from it.
5. **Mrejesho Wangu.** *"Onyesha mrejesho wangu"* → My Feedback; eSiri summarises the statuses (the DAWASA one has a response).
6. **A decline.** Send something to withdraw first, e.g. in English: *"Send a suggestion to DAWASA through my account: please add evening payment hours at the Ubungo office. Ubungo, Dar es Salaam, Kimara."* (say **Yes**). Then: *"Ondoa mrejesho EMR-2026-NNNNN"* (the new number) → when eSiri asks, say **"Hapana"**. Nothing is withdrawn; eSiri does not ask again.
7. **Audit log.** *"Fungua kumbukumbu za eSiri"* → every task above with its steps, confirmations and outcome (Completed / Declined).

Tips: a fresh conversation (↺ in the panel) before a rehearsal; *Rejesha data ya mfano* in the user menu resets the demo data.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Panel banner "OpenAI API key is missing" | Put `OPENAI_API_KEY=sk-...` in `.env` (project root) and restart `./start.sh`. |
| "The OpenAI API key was rejected" | The key is invalid or has a typo (check nothing is pasted in front of it); fix `.env`, restart. |
| "The model … is not available" | Set `OPENAI_MODEL=gpt-4.1-mini` (or another model your key can use) in `.env`. |
| "Voice recognition needs Google Chrome…" | Use Google Chrome (not Chromium/Firefox) with internet. Typing always works. |
| Microphone blocked | Click the lock icon in Chrome's address bar → allow microphone → reload. |
| No Swahili speech | Swahili is spoken through OpenAI TTS; check the key and internet. The text is always shown. |
| "eSiri service is not reachable" | The backend is not running: start `./start.sh` again; check port 8000 is free. |
| Port 5173 or 8000 busy | Stop the other process (`ss -ltnp | grep -E ':5173|:8000'`). |

## Tests

```bash
cd frontend
npm run build              # zero TypeScript errors required
npx playwright install chromium   # once
npx playwright test        # all 39 tests (starts both servers if needed)
npm run test:e2e:nollm     # 27 tests without the OpenAI key (UI, safety gates, snapshot, visual)
npm run test:e2e:llm       # 12 eSiri tests (11 scenarios + the demo script; @llm, need the key)
```

Visual tests save 76 screenshots (every page, SW and EN, 1366×768 and 1920×1080, panel open) to `frontend/e2e/screenshots/`.

## Architecture (short)

```
e-Mrejesho mockup (React pages tagged data-esiri-*)  ←─ driver.ts + cursor.ts (click / type / select / navigate, confirmation gate, password gate)
        │                                                      ▲ tool calls
snapshot.ts buildSnapshot() ──► controller.ts runLoop() ──► POST /api/agent/step (backend/app/main.py)
                                                               └─► OpenAI Chat Completions + tools (agent.py, app_map.md)
speech: stt.ts (Chrome Web Speech, sw-TZ / en-US), tts.ts (browser voice / POST /api/tts → OpenAI)
audit: localStorage + POST /api/audit → backend/audit_log.jsonl
```

The model never touches the page. It only returns tool calls (`click`, `type_text`, `select_option`, `navigate`, `ask_confirmation`, `ask_user`, `set_language`, `finish`). The browser code executes them, and enforces the rules in code: no sensitive click without a "yes" in the same task, no password typing, a 30-step limit, cancellation. Details: [`docs/CODEMAP.md`](docs/CODEMAP.md).

## Privacy note

- With every eSiri step, a **snapshot of the screen is sent to OpenAI**: page, visible buttons and fields **including what is typed into the form (description, names, phone numbers, places)**, the institution catalogue, and on tracking/My Feedback pages the visible submissions.
- Spoken Swahili replies are sent to OpenAI to be turned into speech.
- **Your voice goes to Google** through Chrome's built-in speech recognition while eSiri listens.
- **Passwords are never typed by eSiri and never included in snapshots** (only "filled: yes/no"); both rules are enforced in code and tested.
- All e-Mrejesho data (accounts, submissions, audit) stays in this browser's localStorage; the audit is also appended to `backend/audit_log.jsonl` on this machine. Account passwords are stored only as a hash. This is a demo mockup, not the real e-Mrejesho.
