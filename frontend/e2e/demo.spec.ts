/**
 * The README 5-minute demo script as one continuous conversation (needs OPENAI_API_KEY).
 */
import { test, expect } from '@playwright/test';
import { askEsiri, esiriId, newSubmissions, start, store } from './helpers';

test('README demo script @llm', async ({ page, request }) => {
  const health = await (await request.get('http://localhost:8000/api/health')).json();
  test.skip(!health.has_key, 'needs OPENAI_API_KEY in .env');
  test.setTimeout(900_000);
  await start(page);

  // 1. The headline: an everyday description becomes a submitted complaint.
  await askEsiri(page, 'Umeme umekatika mtaani kwetu Sinza, Ubungo, Dar es Salaam tangu jana usiku. Nataka kulalamika bila kujulikana.');
  const [tanesco] = await newSubmissions(page);
  expect(tanesco).toMatchObject({ institutionId: 'tanesco', mode: 'anonymous', type: 'lalamiko' });

  // 2. Tracking.
  const track = await askEsiri(page, 'Fuatilia mrejesho EMR-2026-48213');
  expect(track.reply.toLowerCase()).toMatch(/shughulik/);

  // 3. Login help: eSiri fills the username and asks for the password; the user types it and presses Ingia.
  await askEsiri(page, 'Nisaidie kuingia, jina langu la mtumiaji ni rahma.mbuyu', { expectQuestion: true });
  await expect(page.locator(esiriId('login.identifier'))).toHaveValue('rahma.mbuyu');
  await page.locator(esiriId('login.password')).fill('Demo@2026');
  await page.locator(esiriId('login.submit')).click();
  await expect(page.getByTestId('user-menu')).toContainText('Rahma Mbuyu');

  // 4. Institution FAQ (logging in by hand completed the login-help task).
  await expect(page.getByTestId('esiri-status')).toHaveText('idle');
  const faq = await askEsiri(page, 'Nawezaje kupata namba ya NIDA?');
  await expect(page).toHaveURL(/\/taasisi\/nida/);
  expect(faq.reply.toLowerCase()).toMatch(/152|ofisi|jisajili|usajili|tovuti/);

  // 5. My feedback.
  await askEsiri(page, 'Onyesha mrejesho wangu');
  await expect(page).toHaveURL(/\/mrejesho-wangu/);

  // 6. A submission through the account, then a declined withdrawal.
  await askEsiri(page, 'Send a suggestion to DAWASA through my account: please add evening payment hours at the Ubungo office. Ubungo, Dar es Salaam, Kimara.');
  const dawasa = (await newSubmissions(page)).find((s) => s.institutionId === 'dawasa')!;
  expect(dawasa).toMatchObject({ mode: 'account', type: 'pendekezo', owner: 'rahma.mbuyu' });
  await askEsiri(page, `Ondoa mrejesho ${dawasa.ref}`, { confirm: 'no' });
  expect((await store(page)).submissions.some((s) => s.ref === dawasa.ref)).toBe(true);

  // 7. The audit log.
  // Opening is navigation only; if eSiri ever asked to clear the log, "no" keeps the records.
  await askEsiri(page, 'Fungua kumbukumbu za eSiri', { confirm: 'no' });
  await expect(page).toHaveURL(/\/ukaguzi/);
  const audit = (await store(page)).audit;
  expect(audit.length).toBeGreaterThanOrEqual(7);
  expect(audit.some((r) => r.outcome === 'Declined')).toBe(true);
  expect(audit.filter((r) => r.outcome === 'Failed')).toHaveLength(0);
  expect(audit[0].confirmations, 'opening the audit page needs no confirmation').toHaveLength(0);
});
