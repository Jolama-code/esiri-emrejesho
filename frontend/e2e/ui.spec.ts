/**
 * Tests without the LLM: the mockup by hand, language, the safety gates in code, the snapshot, and the backend endpoints.
 */
import { test, expect } from '@playwright/test';
import { esiriId, loginByHand, newSubmissions, openPanel, start, store, submitByHand } from './helpers';

type TestHook = {
  buildSnapshot: () => Record<string, unknown> & { elements: { id: string; role: string; value?: string; filled?: boolean; options?: { value: string; label: string }[] }[]; state: Record<string, unknown> };
};

const zeroCtx = `({ signal: new AbortController().signal, hasCredit: () => false, useCredit: () => {} })`;

test.describe('mockup by hand', () => {
  test('landing: branding, Swahili default, search, services and sectors', async ({ page }) => {
    await start(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'sw');
    await expect(page.locator('.hero-hashtag')).toHaveText('#IambieSerikali');
    await expect(page.locator(esiriId('landing.sema-na-kiongozi'))).toHaveText(/SEMA NA KIONGOZI/);
    await expect(page.locator('.site-footer')).toContainText('© 2026 Hakimiliki : eGA. Haki Zote Zimehifadhiwa | e-Mrejesho');
    await expect(page.locator('.site-footer')).toContainText('eMrejesho v2.0 · eSiri PoC');
    const html = await page.content();
    expect(html).not.toMatch(/NURU|Nuru|Jolama/);
    // Search: institution, service, sector
    await page.locator(esiriId('landing.search.taasisi')).fill('tanes');
    await page.locator(esiriId('landing.search-result.tanesco')).click();
    await expect(page).toHaveURL(/\/taasisi\/tanesco$/);
    await page.goto('/');
    await page.locator(esiriId('landing.search.huduma')).fill('pasipoti');
    await page.locator(esiriId('landing.search-result.service.uhamiaji-passport')).click();
    await expect(page).toHaveURL(/\/taasisi\/uhamiaji$/);
    await page.goto('/');
    await page.locator(esiriId('landing.search.sekta')).fill('afya');
    await page.locator(esiriId('landing.search-result.sector.afya')).click();
    await expect(page).toHaveURL(/\/sekta\/afya$/);
    await page.goto('/');
    await page.locator(esiriId('landing.service.dawasa-supply')).click();
    await expect(page).toHaveURL(/\/taasisi\/dawasa$/);
    await page.goto('/');
    await page.locator(esiriId('landing.sector-search')).fill('nishati');
    await page.locator(esiriId('landing.sector.nishati')).click();
    await expect(page.getByTestId('institution-card')).toHaveCount(3);
    await page.goto('/');
    await page.locator(esiriId('landing.fuatilia')).click();
    await expect(page).toHaveURL(/\/fuatilia$/);
    await page.goto('/');
    await page.locator(esiriId('landing.sema-na-kiongozi')).click();
    await expect(page).toHaveURL(/\/taasisi$/);
  });

  test('institution lists: sector, search and pagination', async ({ page }) => {
    await start(page, '/sekta/mawasiliano-na-tehama');
    await expect(page.getByTestId('list-sector')).toHaveText('MAWASILIANO NA TEHAMA');
    await expect(page.getByTestId('institution-card')).toHaveCount(12);
    await page.locator(esiriId('pagination.next')).click();
    await expect(page.getByTestId('institution-card')).toHaveCount(3);
    await page.locator(esiriId('pagination.prev')).click();
    await page.locator(esiriId('institutions.search')).fill('pdpc');
    await expect(page.getByTestId('institution-card')).toHaveCount(1);
    await page.locator(esiriId('institution-card.pdpc.open')).click();
    await expect(page.getByTestId('institution-title')).toHaveText('PDPC');
    await page.goto('/taasisi');
    await expect(page.locator('.pager')).toContainText(/of 5\d/);
  });

  test('institution page: contacts, FAQ accordion and search, empty states', async ({ page }) => {
    await start(page, '/taasisi/nida');
    await page.locator(esiriId('institution.phone')).click();
    await expect(page.getByTestId('inst-phone')).toHaveText('0800 117 777');
    const q = page.locator(esiriId('institution.faq.nida-faq-1'));
    await expect(q).toHaveAttribute('data-esiri-state', 'closed');
    await q.click();
    await expect(q).toHaveAttribute('data-esiri-state', 'open');
    await expect(page.getByTestId('faq-answer')).toContainText('*152*00#');
    await page.locator(esiriId('institution.faq-search')).fill('poteza');
    await expect(page.getByTestId('faq-question')).toHaveCount(1);
    await page.goto('/taasisi/rea');
    await expect(page.locator('.inst-section').first()).toContainText('Hakuna maswali');
  });

  test('wizard validation (step 1 and step 2)', async ({ page }) => {
    await start(page, '/taasisi/tanesco');
    await page.locator(esiriId('institution.submit')).click();
    await expect(page.locator('[data-esiri-modal="submission-mode"]')).toBeVisible();
    await page.locator(esiriId('mode.personal')).click();
    await page.locator(esiriId('wizard.next')).click();
    await expect(page.getByTestId('field-error')).toHaveCount(3);
    await page.locator(esiriId('wizard.service')).selectOption('tanesco-outage');
    await page.locator(esiriId('wizard.type')).selectOption('lalamiko');
    await page.locator(esiriId('wizard.description')).fill('Umeme umekatika');
    await expect(page.getByTestId('word-count')).toHaveText('Idadi ya Maneno: 2');
    await page.locator(esiriId('wizard.next')).click();
    await expect(page.getByTestId('field-error')).toHaveText('Maelezo yanahitaji angalau maneno 5');
    await page.locator(esiriId('wizard.description')).fill('Umeme umekatika mtaani kwetu tangu jana');
    await page.locator(esiriId('wizard.next')).click();
    await expect(page.getByTestId('wizard-stepper')).toHaveAttribute('data-step', '2');
    await page.locator(esiriId('wizard.next')).click();
    await expect(page.getByTestId('field-error')).toHaveCount(5); // region, district, location, name, phone
    await page.locator(esiriId('wizard.region')).selectOption('Kigoma');
    await expect(page.locator(esiriId('wizard.district'))).toHaveJSProperty('tagName', 'INPUT');
    await page.locator(esiriId('wizard.region')).selectOption('Mwanza');
    await expect(page.locator(esiriId('wizard.district'))).toHaveJSProperty('tagName', 'SELECT');
    await page.locator(esiriId('wizard.district')).selectOption('Ilemela');
    await page.locator(esiriId('wizard.location')).fill('Kiseke');
    await page.locator(esiriId('wizard.full-name')).fill('Rahma Mbuyu');
    await page.locator(esiriId('wizard.phone')).fill('12345');
    await page.locator(esiriId('wizard.next')).click();
    await expect(page.getByTestId('field-error')).toHaveText(/Namba ya simu si sahihi/);
    await page.locator(esiriId('wizard.phone')).fill('+255 712 345 678');
    await page.locator(esiriId('wizard.next')).click();
    await expect(page.getByTestId('wizard-stepper')).toHaveAttribute('data-step', '3');
    await expect(page.getByTestId('wizard-summary')).toContainText('Kiseke, Ilemela, Mwanza');
    await expect(page.locator(esiriId('wizard.submit'))).toBeDisabled();
    await page.locator(esiriId('wizard.back')).click();
    await expect(page.locator(esiriId('wizard.location'))).toHaveValue('Kiseke');
  });

  for (const mode of ['anonymous', 'personal', 'civil-servant', 'account'] as const) {
    test(`submission end to end: ${mode} mode`, async ({ page }) => {
      await start(page);
      if (mode === 'account') {
        // Choosing the account mode while logged out goes to login and returns to the wizard.
        await page.goto('/taasisi/tanesco');
        await page.locator(esiriId('institution.submit')).click();
        await page.locator(esiriId('mode.account')).click();
        await expect(page).toHaveURL(/\/ingia\?next=/);
        await page.locator(esiriId('login.identifier')).fill('0712 345 678');
        await page.locator(esiriId('login.password')).fill('Demo@2026');
        await page.locator(esiriId('login.submit')).click();
        await expect(page).toHaveURL(/\/wasilisha\/tanesco\?mode=account/);
      }
      const ref = await submitByHand(page, { mode });
      await expect(page.getByTestId('success')).toContainText('Mrejesho wako umepokelewa kikamilifu!');
      const [s] = await newSubmissions(page);
      expect(s.ref).toBe(ref);
      expect(s.mode).toBe(mode);
      expect(s.status).toBe('imepokelewa');
      if (mode === 'anonymous') expect(s.fullName).toBeUndefined();
      if (mode === 'personal') expect(s.phone).toBe('0712345678');
      if (mode === 'civil-servant') expect(s.checkNumber).toBe('11223344');
      if (mode === 'account') {
        expect(s.owner).toBe('rahma.mbuyu');
        expect(s.fullName).toBe('Rahma Mbuyu');
      }
      await page.locator(esiriId('success.track')).click();
      await expect(page.getByTestId('track-result')).toHaveAttribute('data-ref', ref);
      await expect(page.getByTestId('track-status')).toHaveText('Imepokelewa');
    });
  }

  test('login success and failure, logout', async ({ page }) => {
    await start(page, '/ingia');
    await page.locator(esiriId('login.submit')).click();
    await expect(page.getByTestId('login-error')).toContainText('Jaza');
    await page.locator(esiriId('login.identifier')).fill('rahma.mbuyu');
    await page.locator(esiriId('login.password')).fill('wrong-password');
    await page.locator(esiriId('login.submit')).click();
    await expect(page.getByTestId('login-error')).toContainText('si sahihi');
    await page.locator(esiriId('login.password')).fill('Demo@2026');
    await page.locator(esiriId('login.submit')).click();
    await expect(page.getByTestId('user-menu')).toContainText('Rahma Mbuyu');
    await page.locator(esiriId('header.user-menu')).click();
    await page.locator(esiriId('header.menu.logout')).click();
    await expect(page.locator(esiriId('header.login'))).toBeVisible();
  });

  test('registration: validation, hashed password, logged in', async ({ page }) => {
    await start(page, '/jisajili');
    await page.locator(esiriId('register.submit')).click();
    await expect(page.getByTestId('field-error')).toHaveCount(6);
    await page.locator(esiriId('register.full-name')).fill('Juma Hassan');
    await page.locator(esiriId('register.phone')).fill('0754 111 222');
    await page.locator(esiriId('register.region')).selectOption('Arusha');
    await page.locator(esiriId('register.password')).fill('Siri@2026x');
    await page.locator(esiriId('register.password-confirm')).fill('Siri@2026y');
    await page.locator(esiriId('register.terms')).check();
    await page.locator(esiriId('register.submit')).click();
    await expect(page.getByTestId('field-error')).toHaveText('Manenosiri hayafanani');
    await page.locator(esiriId('register.password-confirm')).fill('Siri@2026x');
    await page.locator(esiriId('register.submit')).click();
    await expect(page.getByTestId('user-menu')).toContainText('Juma Hassan');
    const s = await store(page);
    const acc = s.accounts.find((a) => a.fullName === 'Juma Hassan')!;
    expect(acc.phone).toBe('0754111222');
    expect(acc.passwordHash).not.toContain('Siri');
    expect(JSON.stringify(s)).not.toContain('Siri@2026x');
  });

  test('tracking: found with response, not found, ?ref prefill', async ({ page }) => {
    await start(page, '/fuatilia');
    await page.locator(esiriId('track.reference-input')).fill('emr-2026-31877');
    await page.locator(esiriId('track.submit')).click();
    await expect(page.getByTestId('track-status')).toHaveText('Imejibiwa');
    await expect(page.getByTestId('track-response')).toContainText('SMS');
    await expect(page.locator('.tl-step.done')).toHaveCount(3);
    await page.locator(esiriId('track.reference-input')).fill('EMR-2026-00000');
    await page.locator(esiriId('track.submit')).click();
    await expect(page.getByTestId('track-not-found')).toContainText('EMR-2026-00000');
    await page.goto('/fuatilia?ref=EMR-2026-50921');
    await expect(page.locator(esiriId('track.reference-input'))).toHaveValue('EMR-2026-50921');
    await expect(page.getByTestId('track-result')).toContainText('TANROADS');
  });

  test('Mrejesho Wangu: list, open, withdraw with confirm modal', async ({ page }) => {
    await start(page, '/mrejesho-wangu');
    await expect(page).toHaveURL(/\/ingia\?next=/);
    await loginByHand(page);
    const ref = await submitByHand(page, { mode: 'account' });
    await page.locator(esiriId('header.user-menu')).click();
    await page.locator(esiriId('header.menu.my-feedback')).click();
    await expect(page.getByTestId('my-feedback-item')).toHaveCount(4);
    await expect(page.locator(esiriId('my-feedback.item.EMR-2026-48213.withdraw'))).toHaveCount(0); // not Imepokelewa
    await page.locator(esiriId(`my-feedback.item.${ref}.withdraw`)).click();
    await page.locator(esiriId('withdraw.cancel')).click();
    await expect(page.getByTestId('my-feedback-item')).toHaveCount(4);
    await page.locator(esiriId(`my-feedback.item.${ref}.withdraw`)).click();
    await page.locator(esiriId('withdraw.confirm')).click();
    await expect(page.getByTestId('my-feedback-item')).toHaveCount(3);
    expect((await store(page)).submissions.some((s) => s.ref === ref)).toBe(false);
    await page.locator(esiriId('my-feedback.item.EMR-2026-31877.open')).click();
    await expect(page.getByTestId('track-result')).toHaveAttribute('data-ref', 'EMR-2026-31877');
  });

  test('Msaada pages and dropdown', async ({ page }) => {
    await start(page);
    await page.locator(esiriId('header.nav.msaada')).click();
    await page.locator(esiriId('header.msaada.mwongozo')).click();
    await expect(page.getByTestId('help-guide')).toContainText('Mwongozo wa Mtumiaji – e-Mrejesho');
    await expect(page.getByTestId('help-guide')).toContainText('15555');
    await page.locator(esiriId('header.nav.msaada')).click();
    await page.locator(esiriId('header.msaada.maswali')).click();
    await expect(page.getByTestId('faq-question')).toHaveCount(8);
    await page.locator(esiriId('help.faq.help-7')).click();
    await expect(page.getByTestId('faq-answer')).toContainText('*152*00#');
    await page.locator(esiriId('header.nav.msaada')).click();
    await page.locator(esiriId('header.msaada.video')).click();
    await expect(page.locator('.video-tile')).toHaveCount(3);
  });

  test('language switch: Swahili default, English everywhere, back', async ({ page }) => {
    await start(page);
    await expect(page.locator(esiriId('header.nav.home'))).toHaveText('Nyumbani');
    await page.locator(esiriId('header.lang.en')).click();
    await expect(page.locator(esiriId('header.nav.home'))).toHaveText('Home');
    await expect(page.locator(esiriId('header.login'))).toContainText('Log in');
    await expect(page.locator('.hero-hashtag')).toHaveText('#IambieSerikali');
    await page.goto('/taasisi/tanesco');
    await page.locator(esiriId('institution.submit')).click();
    await expect(page.locator(esiriId('mode.anonymous'))).toContainText('Anonymous');
    await page.locator(esiriId('mode.close')).click();
    await openPanel(page);
    await page.getByTestId('esiri-lang-chip').click();
    await expect(page.locator(esiriId('header.nav.home'))).toHaveText('Nyumbani');
    expect((await store(page)).language).toBe('sw');
  });

  test('user menu: audit page and reset demo data', async ({ page }) => {
    await start(page);
    await loginByHand(page);
    await submitByHand(page, { mode: 'account' });
    await page.locator(esiriId('header.user-menu')).click();
    await page.locator(esiriId('header.menu.audit')).click();
    await expect(page).toHaveURL(/\/ukaguzi$/);
    await expect(page.locator('.audit-title')).toHaveText('Kumbukumbu za eSiri');
    await page.locator(esiriId('header.user-menu')).click();
    await page.locator(esiriId('header.menu.reset-demo')).click();
    expect(await newSubmissions(page)).toHaveLength(0);
    await page.goto('/');
    await page.locator(esiriId('footer.audit')).click();
    await expect(page).toHaveURL(/\/ukaguzi$/);
  });
});

test.describe('eSiri overlay and safety in code', () => {
  test('floating stack: eSiri orb is the top button and opens the panel', async ({ page }) => {
    await start(page);
    const stack = page.getByTestId('float-stack');
    const buttons = stack.locator('button');
    await expect(buttons).toHaveCount(4);
    await expect(buttons.first()).toHaveAttribute('data-testid', 'esiri-orb');
    await expect(buttons.first().locator('.orb canvas')).toHaveCount(1);
    await page.getByTestId('stack-chatbot').click();
    await expect(page.locator('.toast')).toContainText('Kipengele hiki hakipo katika mfano huu');
    await page.getByTestId('esiri-orb').click();
    await expect(page.locator('.esiri-panel.open')).toBeVisible();
    await expect(page.getByTestId('esiri-status')).toHaveText('idle');
    await expect(page.locator('.suggest-chip')).toHaveCount(5);
    await expect(stack).toHaveClass(/hidden/);
    await page.getByTestId('esiri-close').click();
    await page.keyboard.press('Alt+s');
    await expect(page.locator('.esiri-panel.open')).toBeVisible();
  });

  test('sensitive clicks are refused without a confirmation credit', async ({ page }) => {
    await start(page);
    await loginByHand(page);
    await page.goto('/taasisi/tanesco');
    await page.locator(esiriId('institution.submit')).click();
    await page.locator(esiriId('mode.account')).click();
    await page.locator(esiriId('wizard.service')).selectOption('tanesco-outage');
    await page.locator(esiriId('wizard.type')).selectOption('lalamiko');
    await page.locator(esiriId('wizard.description')).fill('Umeme umekatika katika mtaa wetu tangu jana.');
    await page.locator(esiriId('wizard.next')).click();
    await page.locator(esiriId('wizard.region')).selectOption('Dar es Salaam');
    await page.locator(esiriId('wizard.district')).selectOption('Ubungo');
    await page.locator(esiriId('wizard.location')).fill('Sinza');
    await page.locator(esiriId('wizard.next')).click();
    await page.locator(esiriId('wizard.confirm-checkbox')).check();
    const res = await page.evaluate(`window.__esiriTest.click('wizard.submit', ${zeroCtx})`);
    expect(res).toMatchObject({ ok: false, code: 'confirmation_required' });
    expect(await newSubmissions(page)).toHaveLength(0);
    // With one credit it goes through and the credit is used.
    const used = await page.evaluate(async () => {
      let credits = 1;
      const hook = (window as unknown as { __esiriTest: { click: (id: string, ctx: unknown) => Promise<{ ok: boolean }> } }).__esiriTest;
      const r = await hook.click('wizard.submit', { signal: new AbortController().signal, hasCredit: () => credits > 0, useCredit: () => (credits -= 1) });
      return { ok: r.ok, credits };
    });
    expect(used).toEqual({ ok: true, credits: 0 });
    expect(await newSubmissions(page)).toHaveLength(1);
  });

  test('password gate: eSiri can never type a password', async ({ page }) => {
    await start(page, '/ingia');
    const res = await page.evaluate(`window.__esiriTest.typeText('login.password', 'Demo@2026', ${zeroCtx})`);
    expect(res).toMatchObject({ ok: false, code: 'password_field', error: 'eSiri never types passwords. Ask the user to type it themselves.' });
    await expect(page.locator(esiriId('login.password'))).toHaveValue('');
    // select_option on a password field is refused too.
    const res2 = await page.evaluate(`window.__esiriTest.selectOption('login.password', 'Demo@2026', ${zeroCtx})`);
    expect(res2).toMatchObject({ ok: false, code: 'password_field' });
    await expect(page.locator(esiriId('login.password'))).toHaveValue('');
  });

  test('snapshot never contains the password value', async ({ page }) => {
    await start(page, '/ingia');
    await page.locator(esiriId('login.identifier')).fill('rahma.mbuyu');
    await page.locator(esiriId('login.password')).fill('Demo@2026');
    const snap = (await page.evaluate(() => (window as unknown as { __esiriTest: TestHook }).__esiriTest.buildSnapshot())) as Awaited<ReturnType<TestHook['buildSnapshot']>>;
    expect(JSON.stringify(snap)).not.toContain('Demo@2026');
    const pw = snap.elements.find((e) => e.id === 'login.password')!;
    expect(pw.role).toBe('password');
    expect(pw.filled).toBe(true);
    expect(pw.value).toBeUndefined();
    expect(snap.elements.find((e) => e.id === 'login.identifier')!.value).toBe('rahma.mbuyu');
    expect(snap.page).toBe('login');
    expect((snap.state.catalogue as { institutions: unknown[] }).institutions.length).toBeGreaterThan(40);
  });

  test('select_option by value and by label; snapshot lists options', async ({ page }) => {
    await start(page, '/taasisi/nida');
    await page.locator(esiriId('institution.submit')).click();
    await page.locator(esiriId('mode.anonymous')).click();
    const sel = (id: string, v: string) => page.evaluate(`window.__esiriTest.selectOption(${JSON.stringify(id)}, ${JSON.stringify(v)}, ${zeroCtx})`);
    expect(await sel('wizard.type', 'pongezi')).toMatchObject({ ok: true, selected: { value: 'pongezi' } });
    await expect(page.locator(esiriId('wizard.type'))).toHaveValue('pongezi');
    expect(await sel('wizard.service', 'kuchukua KITAMBULISHO')).toMatchObject({ ok: true, selected: { value: 'nida-collection' } });
    await expect(page.locator(esiriId('wizard.service'))).toHaveValue('nida-collection');
    expect(await sel('wizard.type', 'no such option')).toMatchObject({ ok: false, code: 'invalid' });
    const snap = (await page.evaluate(() => (window as unknown as { __esiriTest: TestHook }).__esiriTest.buildSnapshot())) as Awaited<ReturnType<TestHook['buildSnapshot']>>;
    const type = snap.elements.find((e) => e.id === 'wizard.type')!;
    expect(type.role).toBe('select');
    expect(type.options!.map((o) => o.value)).toEqual(['lalamiko', 'pendekezo', 'ulizo', 'pongezi']);
    await page.locator(esiriId('wizard.description')).fill('Huduma nzuri sana ya kupata kitambulisho');
    await page.locator(esiriId('wizard.next')).click();
    // Accent/case-insensitive label match, and the district list appears.
    expect(await sel('wizard.region', 'dar es salaam')).toMatchObject({ ok: true, selected: { value: 'Dar es Salaam' } });
    expect(await sel('wizard.district', 'Kinondoni')).toMatchObject({ ok: true });
    const snap2 = (await page.evaluate(() => (window as unknown as { __esiriTest: TestHook }).__esiriTest.buildSnapshot())) as Awaited<ReturnType<TestHook['buildSnapshot']>>;
    expect(snap2.elements.find((e) => e.id === 'wizard.region')!.options).toHaveLength(31);
    expect((snap2.state.wizard as { step: number; fields: { district: string } }).fields.district).toBe('Kinondoni');
  });

  test('navigate never opens the wizard at step 3 and account mode needs login', async ({ page }) => {
    await start(page);
    const nav = (pageName: string, args: object) => page.evaluate(`window.__esiriTest.navigate(${JSON.stringify(pageName)}, ${JSON.stringify(args)}, ${zeroCtx})`);
    expect(await nav('wizard', { institution_id: 'tanesco', mode: 'account' })).toMatchObject({ ok: false, code: 'login_required' });
    expect(await nav('success', {})).toMatchObject({ ok: false });
    expect(await nav('wizard', { institution_id: 'tanesco', mode: 'anonymous' })).toMatchObject({ ok: true });
    await expect(page.getByTestId('wizard-stepper')).toHaveAttribute('data-step', '1');
  });
});

test('already-given check recognises regions, districts, mode and phone', async ({ page }) => {
  await start(page);
  const given = (text: string) => page.evaluate(`window.__esiriTest.extractGiven(${JSON.stringify(text)})`);
  expect(await given('Umeme umekatika mtaani kwetu Sinza, Ubungo, Dar es Salaam tangu jana usiku. Nataka kulalamika bila kujulikana.')).toEqual({
    region: 'Dar es Salaam', district: 'Ubungo', mode: 'anonymous',
  });
  expect(await given('Wasilisha pongezi kwa NIDA kupitia akaunti yangu, Dodoma, Dodoma Jiji, Area D.')).toEqual({ region: 'Dodoma', district: 'Dodoma Jiji', mode: 'account' });
  expect(await given('in my name, Rahma Mbuyu, phone 0712 345 678')).toEqual({ mode: 'personal', phone: '0712345678' });
  expect(await given('Nataka kulalamika kuhusu maji')).toEqual({});
});

test.describe('backend', () => {
  test('health, Swahili TTS returns MP3, audit endpoint', async ({ request }) => {
    const health = await (await request.get('http://localhost:8000/api/health')).json();
    expect(health.ok).toBe(true);
    expect(JSON.stringify(health)).not.toMatch(/sk-/);
    const audit = await request.post('http://localhost:8000/api/audit', { data: { id: 'test', outcome: 'Completed' } });
    expect(audit.ok()).toBe(true);
    test.skip(!health.has_key, 'TTS needs OPENAI_API_KEY');
    const tts = await request.post('http://localhost:8000/api/tts', { data: { text: 'Mrejesho wako umepokelewa kikamilifu.', lang: 'sw' } });
    expect(tts.status()).toBe(200);
    expect(tts.headers()['content-type']).toContain('audio/mpeg');
    expect((await tts.body()).length).toBeGreaterThan(1000);
  });
});

