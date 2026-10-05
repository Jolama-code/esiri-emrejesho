import { expect, type Page } from '@playwright/test';

export interface Submission {
  ref: string;
  institutionId: string;
  serviceId: string;
  type: 'lalamiko' | 'pendekezo' | 'ulizo' | 'pongezi';
  description: string;
  region: string;
  district: string;
  location: string;
  mode: 'personal' | 'anonymous' | 'account' | 'civil-servant';
  fullName?: string;
  phone?: string;
  email?: string;
  checkNumber?: string;
  owner?: string;
  status: string;
}

export interface StoreState {
  language: 'en' | 'sw';
  currentUser: string | null;
  accounts: { username: string; fullName: string; phone: string; passwordHash: string }[];
  submissions: Submission[];
  audit: {
    request: string;
    user: string;
    outcome: 'Completed' | 'Declined' | 'Cancelled' | 'Failed';
    steps: { tool: string; target: string; text?: string; ok: boolean }[];
    confirmations: { summary: string; result: string }[];
    finalMessage: string;
  }[];
}

export const SEED_REFS = ['EMR-2026-48213', 'EMR-2026-31877', 'EMR-2026-27560', 'EMR-2026-50921'];

/** Read the persisted zustand store. */
export async function store(page: Page): Promise<StoreState> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('emrejesho-store') ?? '{}').state);
}

export const esiriId = (id: string) => `[data-esiri-id="${id}"]`;

/** Submissions that are not part of the seed data. */
export async function newSubmissions(page: Page): Promise<Submission[]> {
  return (await store(page)).submissions.filter((s) => !SEED_REFS.includes(s.ref));
}

/** Fresh storage (Playwright gives each test a new context), mute mode, on the landing page. */
export async function start(page: Page, path = '/'): Promise<void> {
  await page.goto(`/?mute=1`);
  await expect(page.locator(esiriId('header.home'))).toBeVisible();
  if (path !== '/') await page.goto(path);
}

/** Log in as the sample citizen through the human UI. */
export async function loginByHand(page: Page): Promise<void> {
  await page.goto('/ingia');
  await page.locator(esiriId('login.identifier')).fill('rahma.mbuyu');
  await page.locator(esiriId('login.password')).fill('Demo@2026');
  await page.locator(esiriId('login.submit')).click();
  await expect(page.getByTestId('user-menu')).toContainText('Rahma Mbuyu');
}

export async function openPanel(page: Page): Promise<void> {
  if (!(await page.locator('.esiri-panel.open').count())) {
    await page.getByTestId('esiri-orb').click();
  }
  await expect(page.locator('.esiri-panel.open')).toBeVisible();
}

/** Submit an anonymous complaint through the human UI; returns the reference number. */
export async function submitByHand(
  page: Page,
  opts: { institution?: string; service?: string; mode?: 'personal' | 'anonymous' | 'account' | 'civil-servant' } = {},
): Promise<string> {
  const institution = opts.institution ?? 'tanesco';
  const mode = opts.mode ?? 'anonymous';
  await page.goto(`/taasisi/${institution}`);
  await page.locator(esiriId('institution.submit')).click();
  await page.locator(esiriId(`mode.${mode}`)).click();
  await page.locator(esiriId('wizard.service')).selectOption(opts.service ?? 'tanesco-outage');
  await page.locator(esiriId('wizard.type')).selectOption('lalamiko');
  await page.locator(esiriId('wizard.description')).fill('Umeme umekatika katika mtaa wetu tangu jana usiku bila taarifa.');
  await page.locator(esiriId('wizard.next')).click();
  await page.locator(esiriId('wizard.region')).selectOption('Dar es Salaam');
  await page.locator(esiriId('wizard.district')).selectOption('Ubungo');
  await page.locator(esiriId('wizard.location')).fill('Sinza');
  if (mode === 'personal' || mode === 'civil-servant') {
    if (mode === 'civil-servant') await page.locator(esiriId('wizard.check-number')).fill('11223344');
    await page.locator(esiriId('wizard.full-name')).fill('Rahma Mbuyu');
    await page.locator(esiriId('wizard.phone')).fill('0712345678');
  }
  await page.locator(esiriId('wizard.next')).click();
  await page.locator(esiriId('wizard.confirm-checkbox')).check();
  await page.locator(esiriId('wizard.submit')).click();
  const ref = (await page.getByTestId('success-reference').textContent())!.trim();
  expect(ref).toMatch(/^EMR-2026-\d{5}$/);
  return ref;
}

/**
 * Send a typed request to eSiri and wait until it is idle again.
 * Confirmation cards are answered with `confirm` (default yes).
 * If eSiri asks a clarifying question (awaiting_answer): with `answer` it is answered and the loop continues;
 * with `expectQuestion` the helper returns the question text; otherwise the helper fails.
 */
export async function askEsiri(
  page: Page,
  text: string,
  opts: { confirm?: 'yes' | 'no'; timeout?: number; answer?: string; expectQuestion?: boolean } = {},
): Promise<{ status: string; reply: string; question?: string }> {
  const confirm = opts.confirm ?? 'yes';
  const status = page.getByTestId('esiri-status');
  await openPanel(page);
  await expect(status).toHaveText('idle');
  const before = await page.getByTestId('esiri-reply').count();
  await page.getByTestId('esiri-input').fill(text);
  await page.getByTestId('esiri-send').click();
  await expect(status).not.toHaveText('idle', { timeout: 5_000 }).catch(() => undefined);
  const deadline = Date.now() + (opts.timeout ?? 150_000);
  let answered = false;
  let question: string | undefined;
  while (Date.now() < deadline) {
    const btn = page.getByTestId(confirm === 'yes' ? 'esiri-confirm-yes' : 'esiri-confirm-no');
    if ((await btn.count()) > 0 && (await btn.first().isVisible())) {
      await btn.first().click();
      continue;
    }
    const s = (await status.textContent())?.trim();
    if (s === 'idle') {
      const replies = page.getByTestId('esiri-reply');
      const reply = (await replies.count()) > before ? ((await replies.last().textContent()) ?? '') : '';
      return { status: s, reply, question };
    }
    if (s === 'awaiting_answer') {
      const q = (await page.getByTestId('esiri-reply').last().textContent()) ?? '';
      if (opts.expectQuestion && !opts.answer) return { status: s, reply: q, question: q };
      if (opts.answer && !answered) {
        answered = true;
        question = q;
        await page.getByTestId('esiri-input').fill(opts.answer);
        await page.getByTestId('esiri-send').click();
        await expect(status).not.toHaveText('awaiting_answer', { timeout: 5_000 });
        continue;
      }
      throw new Error(`eSiri asked a clarifying question instead of acting: "${q}"`);
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`eSiri did not finish "${text}" in time`);
}
