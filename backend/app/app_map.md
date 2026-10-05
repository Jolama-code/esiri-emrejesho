# e-Mrejesho app map (for eSiri)

## 1. Reading the snapshot

- `page`: landing | institutions | institution | wizard | success | track | my_feedback | login | register | help_guide | help_faq | help_video | audit. `route` is the URL path with query.
- `open_modal`: name of an open dialog (`submission-mode`, `withdraw`, `clear-audit`) or null. While a modal is open, `elements` lists ONLY the modal's elements.
- `toasts`: notification texts (never blocking; ignore them).
- `state.logged_in`, `state.user` {name, phone}: the logged-in eMrejesho account, or null.
- `state.catalogue`: ALWAYS present. `sectors` [{id, name}] and `institutions` [{id, short, sector}]. Use these ids with navigate.
- `state.current_institution` (institution and wizard pages): id, short, full, sector, `services` [{id, name}], and on the institution page `faqs` [{id, question, state open|closed, answer (only when open)}].
- `state.wizard` (wizard page): `step` 1|2|3, `mode`, `fields` (current values: service, type, description, word_count, attachment, region, district, location, incident_date, and per mode full_name, phone, email, check_number; `confirmed` on step 3), `errors` {field: code} after a failed Endelea (codes: required, min_words, invalid_phone, invalid_email, invalid_check_number), `account_details` in account mode.
- `state.success.reference`: the new reference number on the success page.
- `state.tracking`: {searched, result} — result is the submission (ref, institution, service, type, status, submitted, mode, description, location, status_history, response) or "not_found".
- `state.my_feedback`: the logged-in user's submissions [{ref, institution, service, type, status, submitted, mode, response?, can_withdraw}].
- `state.help_faqs` (help_faq page): like institution faqs.
- `elements`: visible actionable elements {id, role, label, state?, value?, selected?, options?, disabled?, sensitive?}. role is button | link | textbox | textarea | select | checkbox | password | date. Selects list `options` [{value, label}]. Password fields never show their value, only `filled: true|false`.
- `sensitive: true` = needs an approved ask_confirmation before clicking (the app refuses otherwise).

## 2. Pages and element ids (⚠ = sensitive)

### Always available (header and footer)
- `header.home` (logo → landing), `header.nav.home` (Nyumbani), `header.nav.msaada` (opens the Msaada dropdown; state open/closed) → `header.msaada.mwongozo` (user guide), `header.msaada.video`, `header.msaada.maswali` (general FAQ). `header.nav.apps` is decorative.
- Language: `header.lang.en` (shown while Swahili is active, switches to English) or `header.lang.sw` (shown while English is active). Prefer the set_language tool.
- Logged out: `header.login` (Ingia → /ingia), `header.register` (Tengeneza Akaunti → /jisajili).
- Logged in: `header.user-menu` (state open/closed) → `header.menu.my-feedback` (Mrejesho Wangu), `header.menu.audit` (eSiri audit log), `header.menu.reset-demo` (restore demo data), `header.menu.logout` (Toka).
- Inner pages have `page.back` (the ← arrow). Footer: `footer.audit` (eSiri audit log, works logged out), external links `footer.link.*`.
- `toast.close` exists but never needs clicking.

### Landing `/` (page landing)
- `landing.sema-na-kiongozi` (SEMA NA KIONGOZI → all institutions list), `landing.toa-taarifa` (TOA TAARIFA → scrolls to the sector cards), `landing.fuatilia` (FUATILIA MREJESHO → tracking page), `landing.campaign` (scrolls to sectors).
- Search inputs: `landing.search.taasisi` (institutions), `landing.search.huduma` (services), `landing.search.sekta` (sectors). Typing opens a result list: `landing.search-result.{institutionId}`, `landing.search-result.service.{serviceId}`, `landing.search-result.sector.{sectorId}` — clicking opens that institution or sector.
- Services grid: `landing.service.{serviceId}` (opens the service's institution), `landing.services-more` (all institutions).
- Sector cards: `landing.sector.{sectorId}` (opens that sector's institution list), `landing.sector-search`, `landing.sectors.prev|next`.

### Institution lists `/sekta/{sectorId}` and `/taasisi` (page institutions)
- `institutions.search` (filter by name), cards: `institution-card.{institutionId}.open` (institution page), `institution-card.{institutionId}.submit` (Tuma Mrejesho → opens the submission-mode modal), `institution-card.{institutionId}.track` (tracking page). `pagination.prev|next` (12 per page).

### Institution page `/taasisi/{institutionId}` (page institution)
- `institution.submit` (Wasilisha Mrejesho → opens the submission-mode modal), `institution.phone`, `institution.email` (reveal contacts), `institution.help`.
- FAQs: `institution.faq-search` (filter), `institution.faq.{faqId}` (toggle a question; state open/closed; the answer appears in state.current_institution.faqs when open). FAQs exist for TANESCO, DAWASA, NIDA, TRA, HESLB and TANROADS; other institutions show "Hakuna maswali".

### Submission-mode modal (open_modal "submission-mode")
- `mode.personal` (Weka Taarifa Binafsi), `mode.anonymous` (Bila Kujulikana), `mode.account` (Akaunti ya eMrejesho), `mode.civil-servant` (Watumishi wa Umma/Wastaafu), `mode.close`.
- Choosing a mode opens the wizard `/wasilisha/{institutionId}?mode={mode}` on step 1. `mode.account` while logged out goes to the login page instead (after login the user returns to the wizard).

### Wizard `/wasilisha/{institutionId}?mode=…` (page wizard)
Step 1 — Taarifa za Mrejesho:
- `wizard.service` (select; options are the institution's services, value = service id), `wizard.type` (select; values lalamiko, pendekezo, ulizo, pongezi), `wizard.description` (textarea; required, at least 5 words), `wizard.attachment` (opens the file picker — only a human can choose a file; skip it), `wizard.next` (Endelea → validates, then step 2).
Step 2 — Taarifa za Ziada:
- `wizard.region` (select, all 31 regions, value = region name), `wizard.district` (select for Dar es Salaam [Ilala, Kinondoni, Temeke, Ubungo, Kigamboni], Dodoma [Dodoma Jiji, Bahi, Chamwino, Chemba, Kondoa, Kondoa Mji, Kongwa, Mpwapwa], Arusha [Arusha Jiji, Arusha Vijijini, Meru, Karatu, Longido, Monduli, Ngorongoro], Mwanza [Nyamagana, Ilemela, Buchosa, Kwimba, Magu, Misungwi, Sengerema, Ukerewe], Mbeya [Mbeya Jiji, Mbeya Vijijini, Busokelo, Chunya, Kyela, Mbarali, Rungwe], Morogoro [Morogoro Manispaa, Morogoro Vijijini, Gairo, Ifakara Mji, Kilosa, Malinyi, Mlimba, Mvomero, Ulanga]; a text field for every other region). Choose the region FIRST: changing the region clears the district.
- `wizard.location` (Mahali/Mtaa, text, required), `wizard.date` (optional, format YYYY-MM-DD; only if the user gave an exact date).
- Mode fields: personal → `wizard.full-name`*, `wizard.phone`* (Tanzanian mobile, e.g. 0712345678 or +255712345678), `wizard.email` (optional); anonymous → none (note "Utambulisho wako hautahifadhiwa."); account → read-only details from the account, nothing to fill; civil-servant → `wizard.check-number`* (6–12 digits), `wizard.full-name`*, `wizard.phone`*.
- `wizard.back` (Rudi), `wizard.next` (Endelea → validates, then step 3).
Step 3 — Thibitisha Wasilisho la Mrejesho:
- A read-only summary of everything. `wizard.confirm-checkbox` (Nathibitisha kuwa taarifa hizi ni sahihi; state on/off; required), `wizard.back`, ⚠ `wizard.submit` (Wasilisha; disabled until the checkbox is on).
- `wizard.back` on step 1 returns to the institution page.

### Success `/imepokelewa/{ref}` (page success)
- `success.reference` (the reference number text), `success.copy`, `success.track` (opens tracking for THIS new reference only — for any other reference use the tracking page input), `success.home`.

### Tracking `/fuatilia` (page track)
- `track.reference-input` (type the reference, e.g. EMR-2026-48213), `track.submit` (Fuatilia). `/fuatilia?ref=…` (navigate page=track ref=…) pre-fills and searches. The result is in state.tracking; unknown numbers show an error ("not_found").

### Mrejesho Wangu `/mrejesho-wangu` (page my_feedback; login required)
- Cards per submission: `my-feedback.item.{ref}.open` (opens the tracking details), `my-feedback.item.{ref}.withdraw` (Ondoa mrejesho; only shown while the status is imepokelewa → opens the withdraw modal), `my-feedback.new`.
- Withdraw modal (open_modal "withdraw"): ⚠ `withdraw.confirm`, `withdraw.cancel`.

### Login `/ingia` (page login)
- `login.identifier` (phone number or username), `login.password` (password — eSiri NEVER types it; ask the user), `login.submit` (Ingia; the user presses it themselves after typing the password), `login.forgot` (decorative), `login.to-register`.

### Create account `/jisajili` (page register)
- `register.full-name`*, `register.phone`*, `register.email`, `register.region`* (select), `register.password`*, `register.password-confirm`* (both typed by the user only), `register.terms`* (checkbox), ⚠ `register.submit`, `register.to-login`. Success logs the new user in.

### Msaada pages
- `/msaada/mwongozo` (help_guide): the 10-minute guide (5 steps: download app or visit the website; register or log in; find the institution; submit your report; track with the reference number) and basics: website mrejesho.go.tz, USSD *152*00#, free SMS 15555.
- `/msaada/maswali` (help_faq): `help.faq-search`, `help.faq.{faqId}` (toggle; answers in state.help_faqs when open). Topics: what e-Mrejesho is, whether registration is needed, how to send, reference numbers, tracking, anonymity, sending without internet (USSD/SMS), response times.
- `/msaada/video` (help_video): `help.video.send|track|account` (placeholders).

### eSiri audit log `/ukaguzi` (page audit)
- `audit.filter.all|completed|declined|cancelled|failed`, `audit.export-csv`, `audit.clear` → modal "clear-audit": ⚠ `audit.clear-confirm`, `audit.clear-cancel`.

## 3. Cause and effect
- Submitting needs a mode. The mode decides the step-2 personal fields (see above). Account mode requires login; anonymous submissions store no name or phone and can only be tracked by reference number.
- Reference numbers look like EMR-2026-NNNNN (5 digits). New submissions start at status imepokelewa.
- Status order: imepokelewa (received) → inashughulikiwa (in progress) → imejibiwa (answered, with the institution's response) → imefungwa (closed).
- Withdrawing (Ondoa mrejesho) is only possible for the user's own submissions while the status is imepokelewa; it deletes the submission.
- Mrejesho Wangu lists submissions made while logged in (account mode, and personal or civil-servant submissions made while logged in).
- wizard.next shows validation errors instead of moving on when something required is missing; read state.wizard.errors and fix those fields.
- Changing the language changes labels, never ids. User data is never translated.
- Navigating to the wizard always opens step 1; the summary (step 3) is reached only with wizard.next.

## 4. Typical flows
- Describe-problem submission ("Umeme umekatika Sinza, Ubungo, Dar es Salaam… bila kujulikana"): (if anything required is missing → one ask_user) → navigate page=institution institution_id=tanesco → [click institution.submit, click mode.anonymous] → [select_option wizard.service tanesco-outage, select_option wizard.type lalamiko, type_text wizard.description "<2–3 clear sentences>", click wizard.next] → [select_option wizard.region "Dar es Salaam", select_option wizard.district "Ubungo", type_text wizard.location "Sinza", click wizard.next] → [click wizard.confirm-checkbox] → ask_confirmation "Niwasilishe lalamiko kwa TANESCO kuhusu kukatika kwa umeme Sinza, Ubungo, Dar es Salaam, bila kujulikana?" → click wizard.submit → finish with the reference number.
- Tracking ("Fuatilia mrejesho EMR-2026-48213"): click landing.fuatilia (or navigate page=track) → type_text track.reference-input → click track.submit → finish with the status from state.tracking (and the response if answered).
- Login help ("Nisaidie kuingia, jina langu la mtumiaji ni rahma.mbuyu"): click header.login (or navigate page=login) → type_text login.identifier "rahma.mbuyu" → ask_user "Tafadhali andika nenosiri lako kisha ubonyeze Ingia."
- FAQ lookup ("Nawezaje kupata namba ya NIDA?"): navigate page=institution institution_id=nida → click institution.faq.nida-faq-1 (the matching question) → finish with a short answer based on the shown answer.
- My feedback ("Onyesha mrejesho wangu"): if logged in → header.user-menu → header.menu.my-feedback → summarise state.my_feedback; else offer to help log in.
- Withdraw ("Ondoa mrejesho EMR-…"): my_feedback page → click my-feedback.item.{ref}.withdraw → ask_confirmation → click withdraw.confirm.

## 5. Natural-language aliases
- umeme, luku, kukatika kwa umeme, power, electricity, transformer → TANESCO (tanesco). Umeme vijijini / rural electrification → REA. Bei za mafuta, fuel → EWURA.
- maji, bomba, bili ya maji, water → DAWASA (dawasa) in Dar es Salaam (and Pwani towns); RUWASA (ruwasa) for villages / rural areas / other regions.
- kitambulisho, kitambulisho cha taifa, namba ya NIDA, NIN, national ID → NIDA (nida). Pasipoti, visa → Uhamiaji (uhamiaji). Cheti cha kuzaliwa, birth certificate → RITA (rita).
- kodi, TIN, risiti ya EFD, tax → TRA (tra). Benki, noti → BoT (bot).
- barabara, mashimo barabarani, daraja, road, potholes → TANROADS (tanroads). Nauli, daladala, bodaboda → LATRA. Treni, SGR → TRC. Mwendokasi, BRT → DART.
- mkopo wa elimu, mkopo wa chuo, bodi ya mikopo, student loan → HESLB (heslb). Matokeo ya mitihani, vyeti vya shule → NECTA.
- hospitali, Muhimbili → Hospitali ya Taifa Muhimbili (muhimbili); bima ya afya → NHIF; dawa hospitalini → MSD.
- polisi, wizi, uhalifu, police → Polisi (polisi); moto, fire, rescue → Zimamoto (zimamoto).
- simu, laini, utapeli mtandaoni, SIM → TCRA; intaneti ya TTCL → TTCL; mifumo ya serikali → eGA; taarifa binafsi, faragha, privacy → PDPC; redio/TV ya TBC → the TBC zone of the region.
- ardhi, hati, kiwanja, land → Wizara ya Ardhi (wizara-ardhi); hifadhi ya jamii, mafao, NSSF → NSSF; nafasi za kazi serikalini → Sekretarieti ya Ajira (ajira); hifadhi za taifa, mbuga → TANAPA; Ngorongoro → NCAA.
- bila kujulikana / anonymously → mode.anonymous; kwa jina langu / in my name / weka taarifa binafsi → mode.personal; kupitia akaunti yangu / through my account → mode.account; mtumishi wa umma, mstaafu, namba ya utumishi, check number → mode.civil-servant.
- lalamiko / kulalamika / complain → lalamiko; pendekezo / napendekeza / suggest → pendekezo; ulizo / swali / nauliza / ask → ulizo; pongezi / kushukuru / compliment, thank → pongezi.
- fungua / onyesha / open / show = open a page (navigation only). futa = delete/clear (audit.clear only on an explicit "futa kumbukumbu"). "Fungua kumbukumbu za eSiri" = open the audit page (navigate page=audit or header.menu.audit / footer.audit) and stop there.
- fuatilia / track → tracking page; mrejesho wangu / my feedback → Mrejesho Wangu; ingia / log in → login page; jisajili / tengeneza akaunti / register → registration page; msaada / help → Msaada pages; kumbukumbu za eSiri / audit log → audit page.
