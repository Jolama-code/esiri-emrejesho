import { useApp, currentAccount, wordCount, formatPhone } from '../store/appStore';
import {
  HELP_FAQS, INSTITUTIONS, SECTORS, institutionById, sectorById, serviceById,
  type Faq, type Submission,
} from '../store/data';
import { idFromPath, pageFromPath } from './nav';

export interface ElementInfo {
  id: string;
  role: string;
  label: string;
  state?: string;
  value?: string;
  filled?: boolean;
  selected?: string;
  options?: { value: string; label: string }[];
  options_count?: number;
  search?: string;
  disabled?: boolean;
  sensitive?: boolean;
}

const MAX_OPTIONS = 40;

export function openModalEl(): HTMLElement | null {
  const modals = document.querySelectorAll<HTMLElement>('[data-esiri-modal]');
  return modals.length ? modals[modals.length - 1] : null;
}

export function isVisible(el: HTMLElement): boolean {
  if (!el.isConnected || el.getClientRects().length === 0) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none';
}

/** True if el is not hidden behind an open modal. */
export function isReachable(el: HTMLElement): boolean {
  const modal = openModalEl();
  return !modal || modal.contains(el);
}

export function roleOf(el: HTMLElement): string {
  const explicit = el.getAttribute('data-esiri-role') ?? el.getAttribute('role');
  if (explicit) return explicit;
  const tag = el.tagName.toLowerCase();
  if (tag === 'select') return 'select';
  if (tag === 'input') {
    const type = (el as HTMLInputElement).type;
    if (type === 'checkbox') return 'checkbox';
    if (type === 'password') return 'password';
    if (type === 'date') return 'date';
    if (type === 'file') return 'file';
    return 'textbox';
  }
  if (tag === 'textarea') return 'textarea';
  if (tag === 'a') return 'link';
  return 'button';
}

export function isDisabled(el: HTMLElement): boolean {
  return (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true';
}

export function labelOf(el: HTMLElement): string {
  return (el.getAttribute('data-esiri-label') ?? el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 80);
}

/** Real options of a <select> (the empty placeholder option is skipped). */
export function selectOptions(el: HTMLSelectElement): { value: string; label: string }[] {
  return Array.from(el.options)
    .filter((o) => o.value !== '')
    .map((o) => ({ value: o.value, label: o.text.trim() }));
}

export function describeElement(el: HTMLElement): ElementInfo {
  const info: ElementInfo = {
    id: el.getAttribute('data-esiri-id') ?? '',
    role: roleOf(el),
    label: labelOf(el),
  };
  const state = el.getAttribute('data-esiri-state');
  if (state) info.state = state;
  if (el instanceof HTMLInputElement && el.type === 'password') {
    // Never expose password values, only whether something was typed.
    info.filled = el.value.length > 0;
  } else if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'file')) {
    if (!state && el.type === 'checkbox') info.state = el.checked ? 'on' : 'off';
  } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    info.value = el.value.slice(0, 160);
  } else if (el instanceof HTMLSelectElement) {
    const opts = selectOptions(el);
    info.value = el.value;
    const sel = opts.find((o) => o.value === el.value);
    if (sel) info.selected = sel.label;
    if (opts.length <= MAX_OPTIONS) info.options = opts;
    else {
      info.options = opts.slice(0, MAX_OPTIONS);
      info.options_count = opts.length;
      info.search = 'More options exist: call select_option with the visible label; the app matches it by label.';
    }
  }
  if (isDisabled(el)) info.disabled = true;
  if (el.getAttribute('data-esiri-sensitive') === 'true') info.sensitive = true;
  return info;
}

export function visibleElements(): ElementInfo[] {
  const modal = openModalEl();
  const scope: ParentNode = modal ?? document;
  const out: ElementInfo[] = [];
  const seen = new Set<string>();
  scope.querySelectorAll<HTMLElement>('[data-esiri-id]').forEach((el) => {
    if (el.closest('.esiri-panel')) return;
    // Toasts never block anything; the close button is documented in the app map instead,
    // so the agent does not waste steps closing notifications.
    if (el.getAttribute('data-esiri-id') === 'toast.close') return;
    if (!isVisible(el)) return;
    const info = describeElement(el);
    if (seen.has(info.id)) return;
    seen.add(info.id);
    out.push(info);
  });
  return out;
}

// ---------------------------------------------------------------------------

const lang = () => useApp.getState().language;
const nm = (t: { sw: string; en: string }) => t[lang()] || t.sw;

function faqState(faqs: Faq[], prefix: string) {
  return faqs
    .filter((f) => document.querySelector(`[data-esiri-id="${prefix}${f.id}"]`))
    .slice(0, 8)
    .map((f) => {
      const open = document.querySelector(`[data-esiri-id="${prefix}${f.id}"]`)?.getAttribute('data-esiri-state') === 'open';
      // Answers are only "on screen" once the question is opened.
      return open ? { id: f.id, question: nm(f.q), state: 'open', answer: nm(f.a) } : { id: f.id, question: nm(f.q), state: 'closed' };
    });
}

export function submissionSummary(s: Submission, full = false): Record<string, unknown> {
  const inst = institutionById(s.institutionId);
  const svc = serviceById(s.serviceId);
  const out: Record<string, unknown> = {
    ref: s.ref,
    institution: inst?.short ?? s.institutionId,
    service: svc ? nm(svc.service.name) : s.serviceId,
    type: s.type,
    status: s.status,
    submitted: s.createdAt.slice(0, 10),
    mode: s.mode,
  };
  if (full) {
    out.description = s.description.length > 240 ? `${s.description.slice(0, 240)}…` : s.description;
    out.location = `${s.location}, ${s.district}, ${s.region}`;
    out.status_history = s.history.map((h) => `${h.status} ${h.date.slice(0, 10)}`);
  }
  if (s.response) out.response = s.response;
  if (s.checkNumber) out.check_number = s.checkNumber;
  return out;
}

export function buildSnapshot(): Record<string, unknown> {
  const s = useApp.getState();
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const page = pageFromPath(path);
  const pathId = idFromPath(path);
  const acc = currentAccount();

  const state: Record<string, unknown> = {
    logged_in: Boolean(acc),
    user: acc ? { name: acc.fullName, phone: formatPhone(acc.phone) } : null,
    catalogue: {
      sectors: SECTORS.map((x) => ({ id: x.id, name: nm(x.name) })),
      institutions: INSTITUTIONS.map((i) => ({ id: i.id, short: i.short, sector: i.sector })),
    },
  };

  if (page === 'institutions') {
    const sector = sectorById(pathId);
    state.list = { sector: sector ? { id: sector.id, name: nm(sector.name) } : 'all' };
  }

  const instId = page === 'institution' || page === 'wizard' ? pathId : undefined;
  const inst = institutionById(instId);
  if (inst) {
    const ci: Record<string, unknown> = {
      id: inst.id,
      short: inst.short,
      full: inst.full,
      sector: inst.sector,
      services: inst.services.map((x) => ({ id: x.id, name: nm(x.name) })),
    };
    if (page === 'institution') ci.faqs = faqState(inst.faqs, 'institution.faq.');
    state.current_institution = ci;
  }

  if (page === 'wizard' && s.draft && s.draft.institutionId === instId) {
    const d = s.draft;
    const svc = serviceById(d.serviceId);
    const fields: Record<string, unknown> = {
      service: d.serviceId ? `${d.serviceId} (${svc ? nm(svc.service.name) : '?'})` : '',
      type: d.type,
      description: d.description.length > 600 ? `${d.description.slice(0, 600)}…` : d.description,
      word_count: wordCount(d.description),
      attachment: d.attachment?.name ?? null,
      region: d.region,
      district: d.district,
      location: d.location,
      incident_date: d.incidentDate,
    };
    if (d.mode === 'personal' || d.mode === 'civil-servant') {
      fields.full_name = d.fullName;
      fields.phone = d.phone;
    }
    if (d.mode === 'personal') fields.email = d.email;
    if (d.mode === 'civil-servant') fields.check_number = d.checkNumber;
    if (d.step === 3) fields.confirmed = d.confirmed;
    state.wizard = {
      step: d.step,
      mode: d.mode,
      fields,
      errors: d.errors,
      ...(d.mode === 'account' && acc ? { account_details: { name: acc.fullName, phone: formatPhone(acc.phone) } } : {}),
    };
  }

  if (page === 'success' && pathId) state.success = { reference: pathId };

  if (page === 'track') {
    const ref = (params.get('ref') ?? '').trim().toUpperCase();
    if (ref) {
      const sub = s.submissions.find((x) => x.ref === ref);
      state.tracking = sub ? { searched: ref, result: submissionSummary(sub, true) } : { searched: ref, result: 'not_found' };
    } else state.tracking = { searched: null };
  }

  if (page === 'my_feedback' && acc) {
    state.my_feedback = s.submissions
      .filter((x) => x.owner === acc.username)
      .map((x) => ({ ...submissionSummary(x), can_withdraw: x.status === 'imepokelewa' }));
  }

  if (page === 'help_faq') state.help_faqs = faqState(HELP_FAQS, 'help.faq.');
  if (page === 'audit') state.audit_records = s.audit.length;

  const modal = openModalEl();
  return {
    page,
    route: path + window.location.search,
    language: s.language,
    open_modal: modal?.getAttribute('data-esiri-modal') ?? null,
    toasts: s.toasts.map((t) => t.text),
    state,
    elements: visibleElements(),
  };
}
