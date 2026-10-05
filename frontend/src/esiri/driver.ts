/**
 * The "hands": executes click / type_text / select_option / navigate visibly with the ghost cursor.
 * Never throws for UI problems: returns {ok:false, error}. Only cancellation throws.
 */
import { clearHighlight, glideTo, highlight, press, ripple, showCursor } from './cursor';
import { describeElement, isDisabled, isReachable, isVisible, openModalEl, selectOptions } from './snapshot';
import { goTo, PAGES, type PageName } from './nav';
import { nextFrames, sleep } from './util';
import { useApp } from '../store/appStore';
import { MODES, institutionById, sectorById, type Mode } from '../store/data';

export interface ActionResult {
  ok: boolean;
  error?: string;
  code?: 'not_found' | 'disabled' | 'confirmation_required' | 'not_editable' | 'invalid' | 'password_field' | 'login_required';
  [k: string]: unknown;
}

export interface DriverContext {
  signal: AbortSignal;
  /** Is there an unused confirmation credit? */
  hasCredit: () => boolean;
  /** Use one confirmation credit. */
  useCredit: () => void;
  /** How long to wait for an element to appear (predicted ids later in a batch). */
  appearWaitMs?: number;
}

export interface NavigateArgs {
  institution_id?: string;
  sector_id?: string;
  mode?: string;
  ref?: string;
}

function query(id: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-esiri-id="${CSS.escape(id)}"]`);
  for (const el of all) if (isVisible(el) && !el.closest('.esiri-panel')) return el;
  return null;
}

/** Find an element, waiting briefly for it to appear (predicted ids in a batch). */
async function find(id: string, signal: AbortSignal, waitMs = 1500): Promise<HTMLElement | null> {
  const deadline = performance.now() + waitMs;
  for (;;) {
    const el = query(id);
    if (el) return el;
    if (performance.now() > deadline) return null;
    await sleep(100, signal);
  }
}

/** Wait briefly for an element; used to skip stale predictions after a page change. */
export async function elementPresent(id: string, signal: AbortSignal): Promise<boolean> {
  return (await find(id, signal)) !== null;
}

const WIZARD_STEP: Record<string, 1 | 2 | 3> = {
  'wizard.service': 1, 'wizard.type': 1, 'wizard.description': 1, 'wizard.attachment': 1,
  'wizard.region': 2, 'wizard.district': 2, 'wizard.location': 2, 'wizard.date': 2,
  'wizard.full-name': 2, 'wizard.phone': 2, 'wizard.email': 2, 'wizard.check-number': 2,
  'wizard.confirm-checkbox': 3, 'wizard.submit': 3,
};

function notFound(id: string): ActionResult {
  const modal = openModalEl()?.getAttribute('data-esiri-modal');
  let hint = '';
  // Deterministic hint for wizard fields: say which step they are on and how to get there.
  const want = WIZARD_STEP[id];
  const draft = useApp.getState().draft;
  if (want && draft && window.location.pathname.startsWith('/wasilisha/') && draft.step !== want) {
    hint =
      draft.step < want
        ? ` It is on wizard step ${want}; you are on step ${draft.step}. Click wizard.next first (fix any state.wizard.errors).`
        : ` It is on wizard step ${want}; you are on step ${draft.step}. Click wizard.back to return to it.`;
  }
  return {
    ok: false,
    code: 'not_found',
    error: `Element "${id}" is not on the screen${modal ? ` (the "${modal}" modal is open)` : ''}.${hint || ' Use an id from the latest snapshot.'}`,
  };
}

const where = () => window.location.pathname + window.location.search;

async function settle(signal: AbortSignal, before: string): Promise<void> {
  await sleep(350, signal);
  await nextFrames(2);
  if (where() !== before) {
    await sleep(250, signal);
    await nextFrames(2);
  }
}

async function approach(el: HTMLElement, signal: AbortSignal): Promise<{ x: number; y: number }> {
  showCursor();
  const before = el.getBoundingClientRect();
  const inView = before.top >= 60 && before.bottom <= window.innerHeight - 60 && before.left >= 0 && before.right <= window.innerWidth;
  if (!inView) {
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    // wait for the smooth scroll to settle
    let last = el.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      await sleep(60, signal);
      const now = el.getBoundingClientRect();
      if (Math.abs(now.top - last.top) < 0.5 && Math.abs(now.left - last.left) < 0.5) break;
      last = now;
    }
  }
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  await glideTo(x, y, signal);
  highlight(el);
  return { x, y };
}

const isPassword = (el: HTMLElement) => el instanceof HTMLInputElement && el.type === 'password';

export async function click(id: string, ctx: DriverContext): Promise<ActionResult> {
  const el = await find(id, ctx.signal, ctx.appearWaitMs);
  if (!el) return notFound(id);
  if (!isReachable(el)) return { ok: false, code: 'not_found', error: `Element "${id}" is behind an open modal.` };
  if (isDisabled(el)) return { ok: false, code: 'disabled', error: `"${describeElement(el).label}" is disabled right now.` };
  if (el instanceof HTMLSelectElement) {
    return { ok: false, code: 'invalid', error: `"${id}" is a dropdown. Use select_option to choose a value.` };
  }
  const sensitive = el.getAttribute('data-esiri-sensitive') === 'true';
  if (sensitive && !ctx.hasCredit()) {
    return {
      ok: false,
      code: 'confirmation_required',
      error: 'confirmation_required: this is a sensitive action. Call ask_confirmation first and click again after the user approves.',
    };
  }
  const { x, y } = await approach(el, ctx.signal);
  await sleep(140, ctx.signal);
  // Re-check after the animation: the UI may have changed.
  if (!el.isConnected || isDisabled(el)) {
    clearHighlight();
    return { ok: false, code: 'not_found', error: `Element "${id}" changed before it could be clicked.` };
  }
  ripple(x, y);
  await press(ctx.signal);
  if (sensitive) ctx.useCredit();
  const before = where();
  el.click();
  await sleep(120, ctx.signal);
  clearHighlight();
  await settle(ctx.signal, before);
  // Report the new state of checkboxes, toggles and accordions.
  const after = el.isConnected ? el : query(id);
  const state = after?.getAttribute('data-esiri-state');
  return state ? { ok: true, state } : { ok: true };
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  if (el instanceof HTMLSelectElement) el.dispatchEvent(new Event('change', { bubbles: true }));
}

export const PASSWORD_REFUSAL: ActionResult = {
  ok: false,
  code: 'password_field',
  error: 'eSiri never types passwords. Ask the user to type it themselves.',
};

export async function typeText(id: string, text: string, ctx: DriverContext): Promise<ActionResult> {
  const el = await find(id, ctx.signal, ctx.appearWaitMs);
  if (!el) return notFound(id);
  // Hard rule: passwords are never typed by eSiri, whatever the model asks.
  if (isPassword(el)) return { ...PASSWORD_REFUSAL };
  if (!isReachable(el)) return { ok: false, code: 'not_found', error: `Element "${id}" is behind an open modal.` };
  if (el instanceof HTMLSelectElement) {
    // wizard.district switches between a dropdown and a text field by region: choose the matching option instead.
    const res = await selectOption(id, text, ctx);
    return { ...res, note: `"${id}" is a dropdown, so the matching option was selected (use select_option for dropdowns).` };
  }
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) || el.type === 'checkbox' || el.type === 'file') {
    return { ok: false, code: 'not_editable', error: `"${id}" is not a text field.` };
  }
  if (isDisabled(el) || el.readOnly) return { ok: false, code: 'disabled', error: `"${id}" cannot be edited right now.` };
  const { x, y } = await approach(el, ctx.signal);
  ripple(x, y);
  await press(ctx.signal);
  el.focus();
  el.click();
  if (el.type === 'date') {
    // Date inputs only accept complete values.
    setNativeValue(el, text);
  } else {
    setNativeValue(el, '');
    await sleep(80, ctx.signal);
    let cur = '';
    const chars = Array.from(text);
    // Long texts (descriptions) are typed in small chunks so the user can follow without waiting too long.
    const chunk = chars.length > 160 ? 4 : chars.length > 80 ? 2 : 1;
    for (let i = 0; i < chars.length; i += chunk) {
      cur += chars.slice(i, i + chunk).join('');
      setNativeValue(el, cur);
      await sleep(30, ctx.signal);
    }
  }
  clearHighlight();
  await settle(ctx.signal, where());
  if (el.isConnected && el.value !== text) {
    return { ok: false, error: `The field "${id}" contains "${el.value}" instead of the requested text.` };
  }
  return { ok: true };
}

/** Lower-case, strip accents and punctuation, collapse spaces. */
export function normLabel(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export async function selectOption(id: string, value: string, ctx: DriverContext): Promise<ActionResult> {
  const el = await find(id, ctx.signal, ctx.appearWaitMs);
  if (!el) return notFound(id);
  if (!isReachable(el)) return { ok: false, code: 'not_found', error: `Element "${id}" is behind an open modal.` };
  if (!(el instanceof HTMLSelectElement)) {
    if ((el instanceof HTMLInputElement && el.type !== 'checkbox' && el.type !== 'file') || el instanceof HTMLTextAreaElement) {
      const res = await typeText(id, value, ctx);
      return res.code === 'password_field' ? res : { ...res, note: `"${id}" is a text field, so the value was typed (use type_text for text fields).` };
    }
    return { ok: false, code: 'not_editable', error: `"${id}" is not a dropdown.` };
  }
  if (isDisabled(el)) return { ok: false, code: 'disabled', error: `"${id}" cannot be changed right now.` };

  const options = selectOptions(el);
  const want = normLabel(value);
  const pickOne = (): { value: string; label: string } | 'ambiguous' | null => {
    const byValue = options.find((o) => o.value === value) ?? options.find((o) => normLabel(o.value) === want);
    if (byValue) return byValue;
    const byLabel = options.find((o) => normLabel(o.label) === want);
    if (byLabel) return byLabel;
    if (!want) return null;
    const starts = options.filter((o) => normLabel(o.label).startsWith(want));
    if (starts.length === 1) return starts[0];
    const contains = options.filter((o) => normLabel(o.label).includes(want) || want.includes(normLabel(o.label)));
    if (contains.length === 1) return contains[0];
    if (starts.length > 1 || contains.length > 1) return 'ambiguous';
    return null;
  };
  const opt = pickOne();
  if (!opt || opt === 'ambiguous') {
    const list = options.slice(0, 40).map((o) => o.label).join(', ');
    return {
      ok: false,
      code: 'invalid',
      error: `${opt === 'ambiguous' ? 'Several options match' : 'No option matches'} "${value}" in "${id}". Options: ${list}${options.length > 40 ? ', …' : ''}`,
    };
  }

  const { x, y } = await approach(el, ctx.signal);
  ripple(x, y);
  await press(ctx.signal);
  el.focus();
  setNativeValue(el, opt.value);
  await sleep(120, ctx.signal);
  clearHighlight();
  await settle(ctx.signal, where());
  const now = el.isConnected ? el : (query(id) as HTMLSelectElement | null);
  if (now && now.value !== opt.value) {
    return { ok: false, error: `Could not select "${opt.label}" in "${id}".` };
  }
  return { ok: true, selected: opt };
}

export async function navigate(page: string, args: NavigateArgs, ctx: DriverContext): Promise<ActionResult> {
  if (!PAGES.includes(page as PageName)) return { ok: false, code: 'invalid', error: `Unknown page "${page}".` };
  const s = useApp.getState();
  const loggedIn = s.currentUser !== null;
  let path = '/';
  switch (page as PageName) {
    case 'landing':
      path = '/';
      break;
    case 'institutions':
      if (args.sector_id) {
        if (!sectorById(args.sector_id)) return { ok: false, code: 'invalid', error: `Unknown sector_id "${args.sector_id}".` };
        path = `/sekta/${args.sector_id}`;
      } else path = '/taasisi';
      break;
    case 'institution':
      if (!institutionById(args.institution_id)) {
        return { ok: false, code: 'invalid', error: `navigate to "institution" needs a valid institution_id from the catalogue (got "${args.institution_id ?? ''}").` };
      }
      path = `/taasisi/${args.institution_id}`;
      break;
    case 'wizard': {
      const inst = institutionById(args.institution_id);
      if (!inst) return { ok: false, code: 'invalid', error: 'navigate to "wizard" needs a valid institution_id from the catalogue.' };
      if (!MODES.includes(args.mode as Mode)) {
        return { ok: false, code: 'invalid', error: `navigate to "wizard" needs mode: one of ${MODES.join(', ')}.` };
      }
      if (args.mode === 'account' && !loggedIn) {
        return { ok: false, code: 'login_required', error: 'Account mode needs the user to be logged in. Ask the user to log in first, or choose another mode.' };
      }
      // Always starts at step 1 (navigating straight to the confirmation step is not allowed).
      const d = s.draft;
      if (d && d.institutionId === inst.id && d.mode === args.mode) s.updateDraft({ step: 1 });
      else s.startDraft(inst.id, args.mode as Mode);
      path = `/wasilisha/${inst.id}?mode=${args.mode}`;
      break;
    }
    case 'success':
      return { ok: false, code: 'invalid', error: 'The confirmation page only appears after submitting feedback with wizard.submit.' };
    case 'track':
      path = args.ref ? `/fuatilia?ref=${encodeURIComponent(args.ref.trim().toUpperCase())}` : '/fuatilia';
      break;
    case 'my_feedback':
      if (!loggedIn) return { ok: false, code: 'login_required', error: 'My Feedback needs the user to be logged in. Offer to help them log in.' };
      path = '/mrejesho-wangu';
      break;
    case 'login':
      path = '/ingia';
      break;
    case 'register':
      path = '/jisajili';
      break;
    case 'help_guide':
      path = '/msaada/mwongozo';
      break;
    case 'help_faq':
      path = '/msaada/maswali';
      break;
    case 'help_video':
      path = '/msaada/video';
      break;
    case 'audit':
      path = '/ukaguzi';
      break;
  }
  const before = where();
  goTo(path);
  await settle(ctx.signal, before);
  return { ok: true };
}
