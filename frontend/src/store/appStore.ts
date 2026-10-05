import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  DISTRICTS, SAMPLE_ACCOUNT, hashPassword, seedSubmissions, institutionById,
  type Account, type FeedbackType, type Language, type Mode, type Submission,
} from './data';

export type { Language };

export interface Toast {
  id: string;
  text: string;
}

export type Outcome = 'Completed' | 'Declined' | 'Cancelled' | 'Failed';

export interface AuditStep {
  time: string;
  tool: string;
  target: string;
  text?: string;
  ok: boolean;
  error?: string;
}

export interface AuditConfirmation {
  summary: string;
  result: 'approved' | 'declined';
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  user: string;
  language: Language;
  inputMode: 'voice' | 'text';
  request: string;
  steps: AuditStep[];
  confirmations: AuditConfirmation[];
  outcome: Outcome;
  finalMessage: string;
  durationMs: number;
}

/** The submission wizard's in-progress form (not persisted). */
export interface Draft {
  institutionId: string;
  mode: Mode;
  step: 1 | 2 | 3;
  serviceId: string;
  type: FeedbackType | '';
  description: string;
  attachment: { name: string; size: number } | null;
  region: string;
  district: string;
  location: string;
  incidentDate: string;
  fullName: string;
  phone: string;
  email: string;
  checkNumber: string;
  confirmed: boolean;
  /** field → error code (required, min_words, invalid_phone, invalid_email, invalid_check_number) */
  errors: Record<string, string>;
}

export type DraftField = Exclude<keyof Draft, 'institutionId' | 'mode' | 'step' | 'errors'>;

interface PersistedState {
  language: Language;
  sessionId: string;
  wakeMode: boolean;
  accounts: Account[];
  currentUser: string | null;
  submissions: Submission[];
  audit: AuditRecord[];
}

interface AppState extends PersistedState {
  toasts: Toast[];
  draft: Draft | null;

  setLanguage: (lang: Language) => void;
  setWakeMode: (on: boolean) => void;
  newSession: () => void;
  resetDemo: () => void;

  login: (identifier: string, password: string) => boolean;
  logout: () => void;
  register: (a: { fullName: string; phone: string; email: string; region: string; password: string }) => 'ok' | 'exists';

  startDraft: (institutionId: string, mode: Mode) => void;
  updateDraft: (patch: Partial<Draft>) => void;
  submitDraft: () => string | null;
  withdraw: (ref: string) => boolean;

  toast: (text: string) => void;
  dismissToast: (id: string) => void;

  addAudit: (rec: AuditRecord) => void;
  clearAudit: () => void;
}

// ---------------------------------------------------------------------------
// helpers

export function randomId(len = 4, alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'): string {
  let s = '';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) s += alphabet[buf[i] % alphabet.length];
  return s;
}

function newSessionId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `s-${Date.now()}-${randomId(10)}`;
}

/** Tanzanian mobile number → canonical 0XXXXXXXXX, or null if invalid. */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/[\s\-().]/g, '').replace(/^\+/, '');
  if (/^0[67]\d{8}$/.test(d)) return d;
  if (/^255[67]\d{8}$/.test(d)) return `0${d.slice(3)}`;
  return null;
}

export function formatPhone(p: string): string {
  return /^\d{10}$/.test(p) ? `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}` : p;
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

const locale = (lang: Language) => (lang === 'sw' ? 'sw-TZ' : 'en-GB');

export function formatDate(iso: string, lang: Language): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale(lang), { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatTime(iso: string, lang: Language): string {
  return new Date(iso).toLocaleTimeString(locale(lang), { hour: '2-digit', minute: '2-digit' });
}

/** Alias kept for the copied audit page. */
export const formatDateLong = formatDate;

export function hasDistrictList(region: string): boolean {
  return Boolean(DISTRICTS[region]);
}

function newReference(existing: Set<string>): string {
  let ref = '';
  do {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    ref = `EMR-2026-${String(10000 + (buf[0] % 90000))}`;
  } while (existing.has(ref));
  return ref;
}

export function emptyDraft(institutionId: string, mode: Mode): Draft {
  return {
    institutionId,
    mode,
    step: 1,
    serviceId: '',
    type: '',
    description: '',
    attachment: null,
    region: '',
    district: '',
    location: '',
    incidentDate: '',
    fullName: '',
    phone: '',
    email: '',
    checkNumber: '',
    confirmed: false,
    errors: {},
  };
}

/** Validation per step. Returns field → error code. */
export function validateStep(d: Draft, step: 1 | 2 | 3): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 1) {
    if (!d.serviceId) e.service = 'required';
    if (!d.type) e.type = 'required';
    if (!d.description.trim()) e.description = 'required';
    else if (wordCount(d.description) < 5) e.description = 'min_words';
  } else if (step === 2) {
    if (!d.region) e.region = 'required';
    if (!d.district.trim()) e.district = 'required';
    if (!d.location.trim()) e.location = 'required';
    if (d.mode === 'personal' || d.mode === 'civil-servant') {
      if (!d.fullName.trim()) e.full_name = 'required';
      if (!d.phone.trim()) e.phone = 'required';
      else if (!normalizePhone(d.phone)) e.phone = 'invalid_phone';
    }
    if (d.mode === 'personal' && d.email.trim() && !isEmail(d.email)) e.email = 'invalid_email';
    if (d.mode === 'civil-servant') {
      if (!d.checkNumber.trim()) e.check_number = 'required';
      else if (!/^\d{6,12}$/.test(d.checkNumber.trim())) e.check_number = 'invalid_check_number';
    }
  } else if (!d.confirmed) e.confirmed = 'required';
  return e;
}

function seed(): Pick<PersistedState, 'accounts' | 'submissions'> {
  return { accounts: [SAMPLE_ACCOUNT], submissions: seedSubmissions() };
}

function initialLanguage(): Language {
  try {
    const p = new URLSearchParams(window.location.search).get('lang');
    if (p === 'en' || p === 'sw') return p;
  } catch {
    /* ignore */
  }
  return 'sw';
}

// ---------------------------------------------------------------------------

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      language: initialLanguage(),
      sessionId: newSessionId(),
      wakeMode: false,
      currentUser: null,
      audit: [],
      ...seed(),
      toasts: [],
      draft: null,

      setLanguage: (language) => {
        document.documentElement.lang = language;
        set({ language });
      },
      setWakeMode: (wakeMode) => set({ wakeMode }),
      newSession: () => set({ sessionId: newSessionId() }),
      resetDemo: () => {
        const keepUser = get().currentUser === SAMPLE_ACCOUNT.username ? SAMPLE_ACCOUNT.username : null;
        set({ ...seed(), currentUser: keepUser, audit: [], draft: null, sessionId: newSessionId() });
      },

      login: (identifier, password) => {
        const id = identifier.trim().toLowerCase();
        const phone = normalizePhone(identifier);
        const acc = get().accounts.find((a) => a.username === id || (phone !== null && a.phone === phone));
        if (!acc || acc.passwordHash !== hashPassword(password)) return false;
        set({ currentUser: acc.username });
        return true;
      },
      logout: () => set({ currentUser: null, draft: null }),
      register: ({ fullName, phone, email, region, password }) => {
        const p = normalizePhone(phone) ?? phone;
        if (get().accounts.some((a) => a.phone === p)) return 'exists';
        const base = fullName.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'mtumiaji';
        let username = base;
        let n = 2;
        while (get().accounts.some((a) => a.username === username)) username = `${base}${n++}`;
        const acc: Account = { username, fullName: fullName.trim(), phone: p, email: email.trim(), region, passwordHash: hashPassword(password) };
        set((s) => ({ accounts: [...s.accounts, acc], currentUser: username }));
        return 'ok';
      },

      startDraft: (institutionId, mode) => set({ draft: emptyDraft(institutionId, mode) }),
      updateDraft: (patch) =>
        set((s) => {
          if (!s.draft) return {};
          const next = { ...s.draft, ...patch };
          // Clear errors of fields that were edited.
          const errors = { ...next.errors };
          const map: Record<string, string> = { serviceId: 'service', fullName: 'full_name', checkNumber: 'check_number' };
          for (const k of Object.keys(patch)) delete errors[map[k] ?? k];
          if (!('errors' in patch)) next.errors = errors;
          return { draft: next };
        }),
      submitDraft: () => {
        const s = get();
        const d = s.draft;
        if (!d || !institutionById(d.institutionId) || !d.type) return null;
        const user = s.accounts.find((a) => a.username === s.currentUser);
        const ref = newReference(new Set(s.submissions.map((x) => x.ref)));
        const now = new Date().toISOString();
        const personal =
          d.mode === 'anonymous'
            ? {}
            : d.mode === 'account' && user
              ? { fullName: user.fullName, phone: user.phone, email: user.email || undefined }
              : {
                  fullName: d.fullName.trim(),
                  phone: normalizePhone(d.phone) ?? d.phone.trim(),
                  email: d.mode === 'personal' && d.email.trim() ? d.email.trim() : undefined,
                };
        const sub: Submission = {
          ref,
          institutionId: d.institutionId,
          serviceId: d.serviceId,
          type: d.type,
          description: d.description.trim(),
          attachment: d.attachment ?? undefined,
          region: d.region,
          district: d.district.trim(),
          location: d.location.trim(),
          incidentDate: d.incidentDate || undefined,
          mode: d.mode,
          ...personal,
          checkNumber: d.mode === 'civil-servant' ? d.checkNumber.trim() : undefined,
          owner: d.mode !== 'anonymous' && user ? user.username : undefined,
          status: 'imepokelewa',
          history: [{ status: 'imepokelewa', date: now }],
          createdAt: now,
        };
        set((st) => ({ submissions: [sub, ...st.submissions], draft: null }));
        return ref;
      },
      withdraw: (ref) => {
        const sub = get().submissions.find((x) => x.ref === ref);
        if (!sub || sub.status !== 'imepokelewa') return false;
        set((s) => ({ submissions: s.submissions.filter((x) => x.ref !== ref) }));
        return true;
      },

      toast: (text) => {
        const id = randomId(6);
        set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text }] }));
        window.setTimeout(() => get().dismissToast(id), 5000);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

      addAudit: (rec) => set((s) => ({ audit: [rec, ...s.audit].slice(0, 500) })),
      clearAudit: () => set({ audit: [] }),
    }),
    {
      name: 'emrejesho-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedState => ({
        language: s.language,
        sessionId: s.sessionId,
        wakeMode: s.wakeMode,
        accounts: s.accounts,
        currentUser: s.currentUser,
        submissions: s.submissions,
        audit: s.audit,
      }),
    },
  ),
);

export function currentAccount(): Account | undefined {
  const s = useApp.getState();
  return s.accounts.find((a) => a.username === s.currentUser);
}

export function useCurrentAccount(): Account | undefined {
  return useApp((s) => s.accounts.find((a) => a.username === s.currentUser));
}
