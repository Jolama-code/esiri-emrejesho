/**
 * Visual tests: every page in Swahili and English at 1366×768 and 1920×1080 with the eSiri panel open.
 * Asserts no horizontal page overflow and saves screenshots to e2e/screenshots/.
 */
import { test, expect, type Page } from '@playwright/test';
import { esiriId, loginByHand, openPanel, start, submitByHand } from './helpers';

const SIZES = [
  { w: 1366, h: 768 },
  { w: 1920, h: 1080 },
];

async function noOverflow(page: Page, name: string): Promise<void> {
  const res = await page.evaluate(() => {
    const doc = document.documentElement;
    const main = document.querySelector('.app-shell') as HTMLElement;
    const limit = main.getBoundingClientRect().right + 1;
    const offenders: string[] = [];
    main.querySelectorAll<HTMLElement>('main *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > limit && getComputedStyle(el).position !== 'fixed' && !el.closest('.sector-carousel')) {
        offenders.push(`${el.tagName.toLowerCase()}.${el.className}`.slice(0, 80));
      }
    });
    return { scroll: doc.scrollWidth - doc.clientWidth, offenders: offenders.slice(0, 5) };
  });
  expect(res.scroll, `${name}: horizontal page scroll`).toBeLessThanOrEqual(0);
  expect(res.offenders, `${name}: elements overflowing the content area`).toEqual([]);
}

for (const lang of ['sw', 'en'] as const) {
  for (const { w, h } of SIZES) {
    test(`screenshots ${lang} ${w}x${h}`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width: w, height: h });
      await start(page);
      if (lang === 'en') await page.locator(esiriId('header.lang.en')).click();
      await loginByHand(page);
      const ref = await submitByHand(page, { mode: 'anonymous' });
      await openPanel(page);
      // A short sample conversation so the panel is not empty in the pictures.
      await page.evaluate((l) => {
        const es = (window as unknown as { __esiriTest: { useEsiri: { getState: () => { addMsg: (m: object) => string } } } }).__esiriTest.useEsiri.getState();
        es.addMsg({ kind: 'user', text: l === 'sw' ? 'Umeme umekatika mtaani kwetu Sinza' : 'The power is out in our street in Sinza', mode: 'voice' });
        es.addMsg({ kind: 'step', text: l === 'sw' ? "Nimechagua 'Kukatika kwa umeme'" : "Selected 'Power outage'", status: 'ok', icon: 'select' });
        es.addMsg({ kind: 'confirm', summary: l === 'sw' ? 'Niwasilishe lalamiko kwa TANESCO kuhusu kukatika kwa umeme Sinza, bila kujulikana?' : 'Shall I submit the complaint to TANESCO about the outage in Sinza, anonymously?', state: 'approved' });
        es.addMsg({ kind: 'assistant', text: l === 'sw' ? 'Nimewasilisha lalamiko lako. Namba ya kumbukumbu ni EMR-2026-48213.' : 'I submitted your complaint. The reference number is EMR-2026-48213.' });
      }, lang);

      const shots: [string, string, (() => Promise<void>)?][] = [
        ['01-landing', '/'],
        ['02-landing-sectors', '/', async () => page.locator('#sekta').scrollIntoViewIfNeeded()],
        ['03-msaada-menu', '/', async () => page.locator(esiriId('header.nav.msaada')).click()],
        ['04-sector-list', '/sekta/mawasiliano-na-tehama'],
        ['05-all-institutions', '/taasisi'],
        ['06-institution', '/taasisi/nida', async () => page.locator(esiriId('institution.faq.nida-faq-1')).click()],
        ['07-mode-modal', '/taasisi/tanesco', async () => page.locator(esiriId('institution.submit')).click()],
        ['08-wizard-step1', '', async () => {
          // The mode modal from the previous shot is still open.
          await page.locator(esiriId('mode.personal')).click();
          await page.locator(esiriId('wizard.service')).selectOption('tanesco-outage');
          await page.locator(esiriId('wizard.description')).fill('Umeme umekatika mtaani kwetu Sinza tangu jana usiku.');
        }],
        ['09-wizard-step2', '', async () => {
          await page.locator(esiriId('wizard.type')).selectOption('lalamiko');
          await page.locator(esiriId('wizard.next')).click();
          await page.locator(esiriId('wizard.region')).selectOption('Dar es Salaam');
        }],
        ['10-wizard-step3', '', async () => {
          await page.locator(esiriId('wizard.district')).selectOption('Ubungo');
          await page.locator(esiriId('wizard.location')).fill('Sinza');
          await page.locator(esiriId('wizard.full-name')).fill('Rahma Mbuyu');
          await page.locator(esiriId('wizard.phone')).fill('0712345678');
          await page.locator(esiriId('wizard.next')).click();
          await page.locator(esiriId('wizard.confirm-checkbox')).check();
        }],
        ['11-success', `/imepokelewa/${ref}`],
        ['12-track', '/fuatilia?ref=EMR-2026-31877'],
        ['13-my-feedback', '/mrejesho-wangu'],
        ['14-help-guide', '/msaada/mwongozo'],
        ['15-help-faq', '/msaada/maswali'],
        ['16-help-video', '/msaada/video'],
        ['17-audit', '/ukaguzi'],
        ['18-login', '', async () => {
          await page.locator(esiriId('header.user-menu')).click();
          await page.locator(esiriId('header.menu.logout')).click();
          await page.locator(esiriId('header.login')).click();
        }],
        ['19-register', '/jisajili'],
      ];

      for (const [name, path, action] of shots) {
        if (path) {
          // In-app navigation keeps the panel conversation (a reload would clear it).
          await page.evaluate((p) => {
            window.history.pushState({}, '', p);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }, path);
        }
        await page.waitForTimeout(250);
        if (action) await action();
        await page.waitForTimeout(450);
        await expect(page.locator('.esiri-panel.open')).toBeVisible();
        await noOverflow(page, `${lang} ${w} ${name}`);
        await page.screenshot({ path: `e2e/screenshots/${lang}-${w}-${name}.png` });
      }
    });
  }
}
