/**
 * End-to-end eSiri scenarios driven only through the panel text input (needs OPENAI_API_KEY).
 * Each test gets fresh storage; prerequisites are set up through the human UI.
 * Assertions check the final app state, not the exact steps the model chose.
 */
import { test, expect } from '@playwright/test';
import { askEsiri, esiriId, loginByHand, newSubmissions, start, store, submitByHand } from './helpers';

test.describe('eSiri agent @llm', () => {
  test.beforeEach(async ({ request }) => {
    const health = await (await request.get('http://localhost:8000/api/health')).json();
    test.skip(!health.has_key, 'needs OPENAI_API_KEY in .env');
  });

  test('1. anonymous TANESCO complaint described in everyday Swahili', async ({ page }) => {
    await start(page);
    await askEsiri(page, 'Umeme umekatika mtaani kwetu Sinza, Ubungo, Dar es Salaam tangu jana usiku. Nataka kulalamika bila kujulikana.');
    const subs = await newSubmissions(page);
    expect(subs).toHaveLength(1);
    const s = subs[0];
    expect(s.institutionId).toBe('tanesco');
    expect(s.type).toBe('lalamiko');
    expect(s.mode).toBe('anonymous');
    expect(s.region).toBe('Dar es Salaam');
    expect(s.district).toBe('Ubungo');
    expect(s.fullName).toBeUndefined();
    expect(s.description.split(/\s+/).length).toBeGreaterThanOrEqual(5);
    await expect(page.getByTestId('success-reference')).toHaveText(s.ref);
    const rec = (await store(page)).audit[0];
    expect(rec.outcome).toBe('Completed');
    expect(rec.confirmations.filter((c) => c.result === 'approved').length).toBeGreaterThanOrEqual(1);
    expect(rec.user).toBe('Mgeni');
  });

  test('2. English, personal mode suggestion to DAWASA', async ({ page }) => {
    await start(page);
    await page.locator(esiriId('header.lang.en')).click();
    await askEsiri(
      page,
      'Send a suggestion to DAWASA in my name, Rahma Mbuyu, phone 0712345678: please add evening water-bill payment hours at the Ubungo office. I live in Ubungo, Dar es Salaam, Kimara.',
    );
    const subs = await newSubmissions(page);
    expect(subs).toHaveLength(1);
    const s = subs[0];
    expect(s.institutionId).toBe('dawasa');
    expect(s.type).toBe('pendekezo');
    expect(s.mode).toBe('personal');
    expect(s.fullName).toBe('Rahma Mbuyu');
    expect(s.phone).toBe('0712345678');
    expect(s.district).toBe('Ubungo');
    expect(s.location.toLowerCase()).toContain('kimara');
  });

  test('3. logged in, compliment to NIDA through the account', async ({ page }) => {
    await start(page);
    await loginByHand(page);
    await askEsiri(page, 'Wasilisha pongezi kwa NIDA kupitia akaunti yangu kwa huduma nzuri ya kupata kitambulisho, Dodoma, Dodoma Jiji, Area D.');
    const subs = await newSubmissions(page);
    expect(subs).toHaveLength(1);
    const s = subs[0];
    expect(s.institutionId).toBe('nida');
    expect(s.type).toBe('pongezi');
    expect(s.mode).toBe('account');
    expect(s.owner).toBe('rahma.mbuyu');
    expect(s.region).toBe('Dodoma');
    expect(s.district).toBe('Dodoma Jiji');
  });

  test('4. civil-servant mode with check number', async ({ page }) => {
    await start(page);
    await askEsiri(
      page,
      'Nataka kulalamika kwa NSSF kama mtumishi wa umma: michango yangu ya miezi mitatu haionekani kwenye taarifa. Namba yangu ya utumishi ni 11223344, jina Rahma Mbuyu, simu 0712345678. Niko Ilala, Dar es Salaam, Kariakoo.',
    );
    const subs = await newSubmissions(page);
    expect(subs).toHaveLength(1);
    const s = subs[0];
    expect(s.institutionId).toBe('nssf');
    expect(s.mode).toBe('civil-servant');
    expect(s.checkNumber).toBe('11223344');
    expect(s.fullName).toBe('Rahma Mbuyu');
    expect(s.district).toBe('Ilala');
  });

  test('5. track EMR-2026-48213', async ({ page }) => {
    await start(page);
    const { reply } = await askEsiri(page, 'Fuatilia mrejesho EMR-2026-48213');
    await expect(page).toHaveURL(/\/fuatilia/);
    await expect(page.getByTestId('track-result')).toHaveAttribute('data-ref', 'EMR-2026-48213');
    expect(reply.toLowerCase()).toMatch(/inashughulikiwa|inafanyiwa kazi|shughulik/);
  });

  test('6. missing information → one question, then submission to DAWASA', async ({ page }) => {
    await start(page);
    const res = await askEsiri(page, 'Nataka kulalamika kuhusu maji', {
      answer: 'Bila kujulikana, Kinondoni, Dar es Salaam, Mwananyamala, hakuna maji tangu wiki iliyopita',
    });
    expect(res.question, 'eSiri asked a clarifying question').toBeTruthy();
    const subs = await newSubmissions(page);
    expect(subs).toHaveLength(1);
    expect(subs[0].institutionId).toBe('dawasa');
    expect(subs[0].mode).toBe('anonymous');
    expect(subs[0].district).toBe('Kinondoni');
    expect(subs[0].type).toBe('lalamiko');
  });

  test('7. login help: identifier filled, password never typed', async ({ page }) => {
    await start(page);
    const res = await askEsiri(page, 'Nisaidie kuingia, jina langu la mtumiaji ni rahma.mbuyu', { expectQuestion: true });
    await expect(page).toHaveURL(/\/ingia/);
    await expect(page.locator(esiriId('login.identifier'))).toHaveValue('rahma.mbuyu');
    await expect(page.locator(esiriId('login.password'))).toHaveValue('');
    expect((res.question ?? res.reply).toLowerCase()).toMatch(/nenosiri|password/);
    await expect(page.locator(esiriId('header.login'))).toBeVisible(); // still logged out
  });

  test('8. decline withdrawing feedback', async ({ page }) => {
    await start(page);
    await loginByHand(page);
    const ref = await submitByHand(page, { mode: 'account' });
    await page.goto('/');
    await askEsiri(page, `Ondoa mrejesho ${ref}`, { confirm: 'no' });
    const s = await store(page);
    expect(s.submissions.some((x) => x.ref === ref)).toBe(true);
    const rec = s.audit[0];
    expect(rec.outcome).toBe('Declined');
    expect(rec.confirmations).toHaveLength(1);
    expect(rec.confirmations[0].result).toBe('declined');
  });

  test('9. Esc cancels a running submission', async ({ page }) => {
    await start(page);
    const status = page.getByTestId('esiri-status');
    await page.getByTestId('esiri-orb').click();
    await page.getByTestId('esiri-input').fill('Umeme umekatika mtaani kwetu Sinza, Ubungo, Dar es Salaam tangu jana. Nataka kulalamika bila kujulikana.');
    await page.getByTestId('esiri-send').click();
    await expect(status).toHaveText('acting', { timeout: 60_000 });
    await page.keyboard.press('Escape');
    await expect(status).toHaveText('idle', { timeout: 5_000 });
    const rec = (await store(page)).audit[0];
    expect(rec.outcome).toBe('Cancelled');
    await page.waitForTimeout(3000);
    expect(await newSubmissions(page)).toHaveLength(0);
  });

  test('10. FAQ: how to get a NIDA number', async ({ page }) => {
    await start(page);
    const { reply } = await askEsiri(page, 'Nawezaje kupata namba ya NIDA?');
    await expect(page).toHaveURL(/\/taasisi\/nida/);
    await expect(page.locator(esiriId('institution.faq.nida-faq-1'))).toHaveAttribute('data-esiri-state', 'open');
    // The answer is based on the FAQ: registration at the district office and/or *152*00#.
    expect(reply.toLowerCase()).toMatch(/152|ofisi|jisajili|usajili|tovuti/);
  });

  test('11. "Speak English" switches UI and replies', async ({ page }) => {
    await start(page);
    const { reply } = await askEsiri(page, 'Speak English');
    expect((await store(page)).language).toBe('en');
    await expect(page.locator(esiriId('header.nav.home'))).toHaveText('Home');
    expect(reply).toMatch(/\b(the|I|you|English|now)\b/i);
  });
});
