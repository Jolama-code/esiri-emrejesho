# CLAUDE.md — eSiri × e-Mrejesho PoC

eSiri is an AI agent (Swahili by default, English; voice or typed) that completes tasks inside a government web system by visibly clicking, typing and selecting in its UI, asks before consequential actions, and audits every task. The target system here is a **front-end mockup of e-Mrejesho** (Tanzania's citizen feedback system: complaints, suggestions, inquiries, compliments to institutions grouped by sector). Headline flow: a citizen describes a problem in everyday words → eSiri routes it to the right institution, picks the type, writes the description, fills the 3-step wizard, reads it back, submits after "yes", reads the reference number.

The sample citizen is **Rahma Mbuyu** (`rahma.mbuyu`, phone `0712345678`, password `Demo@2026`). Default language **sw**.

**Full details (architecture, real trace, safety, data flow, limitations): `docs/CODEMAP.md`.** Keep it in sync when you change behaviour.

## Run and test

```bash
cp .env.example .env            # OPENAI_API_KEY=... (never commit .env, never print the key)
./start.sh                      # installs on first run; backend :8000, frontend :5173 (Ctrl+C stops both)
# open http://localhost:5173 in Google Chrome (Chromium's speech recognition fails)

cd frontend
npm run build                   # tsc -b && vite build — must have zero TS errors
npx playwright test             # 39 e2e tests; starts both servers if not running
npm run test:e2e:nollm          # 27 tests without the OpenAI key (ui + screenshots)
npm run test:e2e:llm            # 12 @llm tests (agent.spec.ts + demo.spec.ts)
```

- The project path contains spaces: **quote every path** in shell commands.
- `pkill -f`/`pgrep -f` with a pattern from your own command line kills your own shell; find processes by port (`ss -ltnp | grep :8000`).
- The backend does not auto-reload: restart it after changing `backend/app/*.py` or `app_map.md` (read at import).
- Don't edit frontend files while Playwright runs against the dev server (Vite reloads the page mid-test).
- `?mute=1` disables speech output and the microphone (tests use it).

## Architecture in brief

```
Mockup pages (tagged data-esiri-*)  ←─ driver.ts + cursor.ts (click / type_text / select_option / navigate; confirmation + password gates)
        │                                        ▲ tool calls
snapshot.ts buildSnapshot() ──► controller.ts runLoop() ──► POST /api/agent/step (backend/app/main.py)
                                                              └─► OpenAI Chat Completions + TOOLS (agent.py, app_map.md)
speech: stt.ts (Web Speech sw-TZ/en-US), tts.ts (speechSynthesis / POST /api/tts → OpenAI)   audit: localStorage + /api/audit → backend/audit_log.jsonl
```

Loop: snapshot → model returns tool calls → frontend executes them in order with a visible ghost cursor → sends `{tool_results}` + fresh snapshot → repeat until `finish`. Backend keeps conversation memory per `session_id` in RAM (last 12 user turns) and replaces all but the newest snapshot with `[old snapshot omitted]`.

## Key files

| File | Role |
|---|---|
| `frontend/src/esiri/controller.ts` | Agent loop (`runLoop`, `execute`), confirmations/credits, guards (30 steps, 3 same failures), `cancel()`, audit (`finalizeTask`, user = account name or "Mgeni") |
| `frontend/src/esiri/driver.ts` | `click()`, `typeText()` (refuses `input[type=password]`), `selectOption()`, `navigate()`; **the sensitive-click gate** |
| `frontend/src/esiri/snapshot.ts` | `buildSnapshot()`: page, catalogue, institution/wizard/tracking/my-feedback state, elements (select options; passwords only `filled`) |
| `frontend/src/esiri/ui/{EsiriRoot,Panel,Orb}.tsx` | Floating stack (orb on top), stage orb, side panel, Alt+S / Esc; canvas plasma orb |
| `frontend/src/store/appStore.ts` | zustand `useApp` (persisted, localStorage `emrejesho-store`): language, accounts, currentUser, submissions, audit; wizard `draft` (not persisted), `validateStep()` |
| `frontend/src/store/data.ts` | Seed data: 17 sectors, 52 institutions with services, FAQs (TANESCO, DAWASA, NIDA, TRA, HESLB, TANROADS), regions/districts, help FAQs, sample account, seeded submissions |
| `frontend/src/pages/*` | Landing, Institutions (sector + all), InstitutionPage, Wizard, Success, Track, MyFeedback, Auth (Login/Register), Help (guide/FAQ/video), Audit |
| `frontend/src/components/{Layout,ModeModal,Common,esiriProps}.tsx` | Header/footer/page head, submission-mode modal, Modal/Toasts, `ez()` |
| `frontend/src/i18n/{sw,en}.ts` | All UI strings; `sw.ts` is primary and defines the keys, `en.ts` is typed `Dict` |
| `backend/app/main.py` | Endpoints, session memory, OpenAI call, error codes |
| `backend/app/agent.py` | `SYSTEM_PROMPT`, `TOOLS` (8 tools), `repair_dangling_tool_calls`, `trim_history`, `render_messages` |
| `backend/app/app_map.md` | The agent's knowledge: every page, id, wizard rule, cause→effect, flows, aliases (umeme → TANESCO …) |
| `frontend/e2e/*.spec.ts` | `ui` (23, no LLM), `agent` (11 @llm), `demo` (1 @llm), `screenshots` (4 → 76 PNGs) |

## Conventions

- **Every actionable element** gets `{...ez('area.thing[.action]', t('key'), opts)}`. Ids are lower-case, hyphenated, language-independent, with real data ids embedded: `institution-card.{id}.submit`, `landing.sector.{sectorId}`, `institution.faq.{faqId}`, `my-feedback.item.{ref}.withdraw`. Toggles/checkboxes/accordions pass `state` (`on`/`off`, `open`/`closed`). Dialogs use `Modal` (sets `data-esiri-modal`).
- **Sensitive = consequential**: exactly `wizard.submit`, `register.submit`, `withdraw.confirm`, `audit.clear-confirm` (`{ sensitive: true }`). A new one must also be listed in `SYSTEM_PROMPT` SAFETY and marked ⚠ in `app_map.md`.
- Dropdowns are native `<select>`s driven by `select_option`; the snapshot lists their options (≤40).
- **No hard-coded UI text.** Add each string to both `sw.ts` and `en.ts` (the compiler enforces identical keys). Natural Tanzanian Swahili. User data (descriptions, names, places, institution responses) is never translated; data texts are bilingual `{sw, en}` in `data.ts` (`pick()`).
- A new page or element must be documented in `app_map.md`; data the model must read goes into `buildSnapshot()` `state`.
- Driver functions never throw for UI problems; they return `{ok:false, code, error}`. Only cancellation throws.
- Tests assert **final state**, not the model's steps. LLM tests carry `@llm` and skip without a key.

## Rules not to break

1. **The confirmation gate stays in code** (`driver.ts` `click()`): no click on `data-esiri-sensitive="true"` unless `task.credits > 0`; credits only from an approved `ask_confirmation` in the same task (`controller.ts`). Human clicks are never gated.
2. **The password gate stays in code:** `typeText()` refuses password inputs (`password_field`), `selectOption()` on a password field falls through to that refusal, and `describeElement()` never includes password values. Audit steps store `••••`.
3. After a decline the task must not re-ask (`task.declined`) and ends Declined. Esc / Stop / "stop" cancels immediately (abort fetch, stop speech, hide cursor, audit Cancelled).
4. Every task produces exactly one audit record (`finalizeTask`), in localStorage and `POST /api/audit`.
5. Never commit `.env`; `/api/health` exposes only `has_key`. Don't modify or commit `reference/` or `ESIRI_EMREJESHO_BUILD_PROMPT.md` (local only, git-ignored).
6. `speak()` must always resolve (timeouts). Navigating to the wizard always starts at step 1.
7. Before committing: `npm run build` clean and the Playwright suite passing (at least the non-LLM tests without a key).

## Known gaps (see CODEMAP §19)

Mockup was built with agent tags; gates are client-side only and credits aren't bound to a specific element; `window.__esiriTest` exposed in all builds; backend sessions never evicted; voice paths untested automatically; ~35 s and ~7 model calls for a full submission; FAQ answers require the model to open the question first (answers are only in the snapshot when open).
