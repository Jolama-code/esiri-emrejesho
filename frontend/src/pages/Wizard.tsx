import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlignLeft, Bold, Check, Code, Film, Image, Indent, Info, Italic, Link2, List, ListOrdered, Outdent, Paperclip, Pilcrow, Quote,
  RemoveFormatting, Strikethrough, Subscript, Superscript, Table, Underline, X,
} from 'lucide-react';
import { PageFrame, PageHead } from '../components/Layout';
import { ModeModal } from '../components/ModeModal';
import { ez } from '../components/esiriProps';
import { pick, useLang, useT, type I18nKey } from '../i18n';
import {
  formatPhone, hasDistrictList, useApp, useCurrentAccount, validateStep, wordCount, type Draft,
} from '../store/appStore';
import { DISTRICTS, FEEDBACK_TYPES, MODES, REGIONS, institutionById, serviceById, type Mode } from '../store/data';
import './Wizard.css';

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const t = useT();
  const items: [I18nKey, I18nKey][] = [
    ['wizard.step1', 'wizard.step1Sub'],
    ['wizard.step2', 'wizard.step2Sub'],
    ['wizard.step3', 'wizard.step3Sub'],
  ];
  return (
    <ol className="stepper" data-testid="wizard-stepper" data-step={step}>
      {items.map(([title, sub], i) => {
        const n = i + 1;
        const cls = n === step ? 'active' : n < step ? 'done' : '';
        return (
          <li key={title} className={`step ${cls}`}>
            <span className="step-num">{n < step ? <Check size={13} strokeWidth={3} /> : n}</span>
            <span className="step-text">
              <b>{t(title)}</b>
              <span>{t(sub)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Field({ label, required, optional, error, children, hint }: { label: string; required?: boolean; optional?: boolean; error?: string; children: ReactNode; hint?: string }) {
  const t = useT();
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="req">*</span>} {optional && <span className="opt">{t('wizard.optional')}</span>}
      </span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && (
        <span className="field-error" data-testid="field-error">
          {t(`err.${error}` as I18nKey)}
        </span>
      )}
    </label>
  );
}

const TOOLBAR = [Bold, Italic, Underline, Strikethrough, Quote, Code, ListOrdered, List, Subscript, Superscript, Outdent, Indent, Pilcrow];

function Step1({ d, update }: { d: Draft; update: (p: Partial<Draft>) => void }) {
  const t = useT();
  const lang = useLang();
  const inst = institutionById(d.institutionId)!;
  const fileRef = useRef<HTMLInputElement>(null);
  const e = d.errors;
  return (
    <div className="wz-grid">
      <Field label={t('wizard.service')} required error={e.service}>
        <select
          className={`select ${e.service ? 'invalid' : ''}`}
          value={d.serviceId}
          onChange={(ev) => update({ serviceId: ev.target.value })}
          {...ez('wizard.service', t('wizard.service'))}
        >
          <option value="">{t('wizard.choose')}</option>
          {inst.services.map((s) => (
            <option key={s.id} value={s.id}>
              {pick(s.name, lang)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('wizard.type')} required error={e.type}>
        <select className={`select ${e.type ? 'invalid' : ''}`} value={d.type} onChange={(ev) => update({ type: ev.target.value as Draft['type'] })} {...ez('wizard.type', t('wizard.type'))}>
          <option value="">{t('wizard.choose')}</option>
          {FEEDBACK_TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {t(`type.${ty}` as I18nKey)}
            </option>
          ))}
        </select>
      </Field>

      <div className="field wz-desc">
        <span className="field-label">
          {t('wizard.description')}
          <span className="req">*</span>
        </span>
        <div className={`editor ${e.description ? 'invalid' : ''}`}>
          <div className="editor-toolbar" role="toolbar" aria-label={t('wizard.toolbar')}>
            {TOOLBAR.map((Icon, i) => (
              <button key={i} type="button" tabIndex={-1} aria-hidden="true">
                <Icon size={15} />
              </button>
            ))}
            <span className="tb-select">{t('wizard.normal')} ▾</span>
            <span className="tb-select">{t('wizard.normal')} ▾</span>
            <span className="tb-select">{t('wizard.sansSerif')} ▾</span>
            {[AlignLeft, RemoveFormatting, Link2, Image, Film, Table].map((Icon, i) => (
              <button key={`b${i}`} type="button" tabIndex={-1} aria-hidden="true">
                <Icon size={15} />
              </button>
            ))}
          </div>
          <textarea
            className="editor-area"
            value={d.description}
            onChange={(ev) => update({ description: ev.target.value })}
            placeholder={t('wizard.descPlaceholder')}
            rows={5}
            {...ez('wizard.description', t('wizard.description'))}
          />
        </div>
        <span className="word-count" data-testid="word-count">
          {t('wizard.wordCount', { n: wordCount(d.description) })}
        </span>
        {e.description && (
          <span className="field-error" data-testid="field-error">
            {t(`err.${e.description}` as I18nKey)}
          </span>
        )}
      </div>

      <div className="field wz-attach">
        <input
          ref={fileRef}
          type="file"
          hidden
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (f) update({ attachment: { name: f.name, size: f.size } });
            ev.target.value = '';
          }}
          data-testid="attachment-input"
        />
        <button type="button" className="attach-btn" onClick={() => fileRef.current?.click()} {...ez('wizard.attachment', t('wizard.attachment'))}>
          <Paperclip size={18} />
          <span>{d.attachment ? `${d.attachment.name} (${Math.max(1, Math.round(d.attachment.size / 1024))} KB)` : t('wizard.attachment')}</span>
        </button>
        {d.attachment && (
          <button type="button" className="attach-remove" onClick={() => update({ attachment: null })} {...ez('wizard.attachment-remove', t('wizard.attachmentRemove'))}>
            <X size={14} /> {t('wizard.attachmentRemove')}
          </button>
        )}
      </div>
    </div>
  );
}

function Step2({ d, update }: { d: Draft; update: (p: Partial<Draft>) => void }) {
  const t = useT();
  const account = useCurrentAccount();
  const e = d.errors;
  const list = DISTRICTS[d.region];
  return (
    <div className="wz-grid">
      <Field label={t('wizard.region')} required error={e.region}>
        <select className={`select ${e.region ? 'invalid' : ''}`} value={d.region} onChange={(ev) => update({ region: ev.target.value, district: '' })} {...ez('wizard.region', t('wizard.region'))}>
          <option value="">{t('wizard.choose')}</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('wizard.district')} required error={e.district}>
        {hasDistrictList(d.region) ? (
          <select className={`select ${e.district ? 'invalid' : ''}`} value={d.district} onChange={(ev) => update({ district: ev.target.value })} {...ez('wizard.district', t('wizard.district'))}>
            <option value="">{t('wizard.choose')}</option>
            {list!.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        ) : (
          <input className={`input ${e.district ? 'invalid' : ''}`} value={d.district} onChange={(ev) => update({ district: ev.target.value })} {...ez('wizard.district', t('wizard.district'))} />
        )}
      </Field>
      <Field label={t('wizard.location')} required error={e.location}>
        <input className={`input ${e.location ? 'invalid' : ''}`} value={d.location} onChange={(ev) => update({ location: ev.target.value })} {...ez('wizard.location', t('wizard.location'))} />
      </Field>
      <Field label={t('wizard.date')} optional>
        <input className="input" type="date" max={new Date().toISOString().slice(0, 10)} value={d.incidentDate} onChange={(ev) => update({ incidentDate: ev.target.value })} {...ez('wizard.date', t('wizard.date'))} />
      </Field>

      {d.mode === 'anonymous' && (
        <div className="wz-note wz-full" data-testid="anon-note">
          <Info size={18} /> {t('wizard.anonNote')}
        </div>
      )}

      {d.mode === 'account' && account && (
        <div className="wz-full wz-account">
          <p className="wz-note">
            <Info size={18} /> {t('wizard.accountNote')}
          </p>
          <div className="wz-grid">
            <Field label={t('wizard.fullName')}>
              <input className="input" readOnly value={account.fullName} data-testid="account-name" />
            </Field>
            <Field label={t('wizard.phone')}>
              <input className="input" readOnly value={formatPhone(account.phone)} />
            </Field>
            <Field label={t('wizard.username')}>
              <input className="input" readOnly value={account.username} />
            </Field>
            <Field label={t('wizard.email')}>
              <input className="input" readOnly value={account.email || '—'} />
            </Field>
          </div>
        </div>
      )}

      {d.mode === 'civil-servant' && (
        <Field label={t('wizard.checkNumber')} required error={e.check_number}>
          <input className={`input ${e.check_number ? 'invalid' : ''}`} inputMode="numeric" value={d.checkNumber} onChange={(ev) => update({ checkNumber: ev.target.value })} {...ez('wizard.check-number', t('wizard.checkNumber'))} />
        </Field>
      )}
      {(d.mode === 'personal' || d.mode === 'civil-servant') && (
        <>
          <Field label={t('wizard.fullName')} required error={e.full_name}>
            <input className={`input ${e.full_name ? 'invalid' : ''}`} value={d.fullName} onChange={(ev) => update({ fullName: ev.target.value })} {...ez('wizard.full-name', t('wizard.fullName'))} />
          </Field>
          <Field label={t('wizard.phone')} required error={e.phone} hint={t('wizard.phoneHint')}>
            <input className={`input ${e.phone ? 'invalid' : ''}`} type="tel" value={d.phone} onChange={(ev) => update({ phone: ev.target.value })} {...ez('wizard.phone', t('wizard.phone'))} />
          </Field>
        </>
      )}
      {d.mode === 'personal' && (
        <Field label={t('wizard.email')} optional error={e.email}>
          <input className={`input ${e.email ? 'invalid' : ''}`} type="email" value={d.email} onChange={(ev) => update({ email: ev.target.value })} {...ez('wizard.email', t('wizard.email'))} />
        </Field>
      )}
    </div>
  );
}

function Step3({ d, update }: { d: Draft; update: (p: Partial<Draft>) => void }) {
  const t = useT();
  const lang = useLang();
  const account = useCurrentAccount();
  const inst = institutionById(d.institutionId)!;
  const svc = serviceById(d.serviceId);
  const rows: [string, ReactNode][] = [
    [t('wizard.institution'), `${inst.short} – ${inst.full}`],
    [t('wizard.service'), svc ? pick(svc.service.name, lang) : '—'],
    [t('wizard.type'), d.type ? t(`type.${d.type}` as I18nKey) : '—'],
    [t('wizard.description'), <span className="pre">{d.description}</span>],
    [t('wizard.locationTitle'), `${d.location}, ${d.district}, ${d.region}`],
    [t('wizard.date'), d.incidentDate || '—'],
    [t('wizard.mode'), t(`mode.${d.mode}` as I18nKey)],
  ];
  if (d.attachment) rows.push([t('wizard.attachment'), d.attachment.name]);
  if (d.mode === 'personal' || d.mode === 'civil-servant') {
    rows.push([t('wizard.fullName'), d.fullName], [t('wizard.phone'), d.phone]);
    if (d.mode === 'personal' && d.email) rows.push([t('wizard.email'), d.email]);
    if (d.mode === 'civil-servant') rows.push([t('wizard.checkNumber'), d.checkNumber]);
  }
  if (d.mode === 'account' && account) rows.push([t('wizard.fullName'), account.fullName], [t('wizard.phone'), formatPhone(account.phone)]);
  if (d.mode === 'anonymous') rows.push([t('wizard.personalDetails'), t('wizard.anonNote')]);
  return (
    <div className="wz-summary">
      <h3>{t('wizard.summaryTitle')}</h3>
      <dl className="summary-list" data-testid="wizard-summary">
        {rows.map(([k, v], i) => (
          <div key={i} className="summary-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <label className="check-row confirm-row">
        <input
          type="checkbox"
          checked={d.confirmed}
          onChange={(ev) => update({ confirmed: ev.target.checked })}
          {...ez('wizard.confirm-checkbox', t('wizard.confirm'), { state: d.confirmed ? 'on' : 'off' })}
        />
        <span>
          {t('wizard.confirm')}
          <span className="req">*</span>
        </span>
      </label>
      {d.errors.confirmed && (
        <span className="field-error" data-testid="field-error">
          {t('err.required')}
        </span>
      )}
    </div>
  );
}

export default function Wizard() {
  const t = useT();
  const navigate = useNavigate();
  const { institutionId } = useParams();
  const [params] = useSearchParams();
  const modeParam = params.get('mode') as Mode | null;
  const mode = modeParam && MODES.includes(modeParam) ? modeParam : null;
  const inst = institutionById(institutionId);
  const draft = useApp((s) => s.draft);
  const loggedIn = useApp((s) => s.currentUser !== null);
  const updateDraft = useApp((s) => s.updateDraft);
  const [modeModal, setModeModal] = useState(false);

  const ready = Boolean(inst && mode && draft && draft.institutionId === inst.id && draft.mode === mode);

  useEffect(() => {
    if (!inst) return;
    if (!mode) {
      setModeModal(true);
      return;
    }
    if (mode === 'account' && !loggedIn) return;
    const d = useApp.getState().draft;
    if (!d || d.institutionId !== inst.id || d.mode !== mode) useApp.getState().startDraft(inst.id, mode);
  }, [inst, mode, loggedIn]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [draft?.step]);

  if (!inst) {
    return (
      <PageFrame>
        <div className="container">
          <PageHead subtitle={t('wizard.subtitle')} back="/taasisi" />
          <div className="empty-box">{t('wizard.notFound')}</div>
        </div>
      </PageFrame>
    );
  }
  if (mode === 'account' && !loggedIn) {
    return <Navigate to={`/ingia?next=${encodeURIComponent(`/wasilisha/${inst.id}?mode=account`)}`} replace />;
  }

  const d = ready ? draft! : null;
  const next = () => {
    if (!d) return;
    const errors = validateStep(d, d.step);
    if (Object.keys(errors).length) {
      updateDraft({ errors });
      return;
    }
    updateDraft({ errors: {}, step: (d.step + 1) as 2 | 3 });
  };
  const back = () => {
    if (!d) return;
    if (d.step === 1) navigate(`/taasisi/${inst.id}`);
    else updateDraft({ errors: {}, step: (d.step - 1) as 1 | 2 });
  };
  const submit = () => {
    if (!d) return;
    const errors = validateStep(d, 3);
    if (Object.keys(errors).length) {
      updateDraft({ errors });
      return;
    }
    const ref = useApp.getState().submitDraft();
    if (ref) navigate(`/imepokelewa/${ref}`, { replace: true });
  };

  return (
    <PageFrame>
      <div className="container">
        <PageHead subtitle={t('wizard.subtitle')} back={back} />
        <div className="wizard card" data-testid="wizard" data-mode={mode ?? ''}>
          <div className="wz-inst">
            <b>{inst.short}</b> · {inst.full}
            {mode && <span className="badge badge-type">{t(`mode.${mode}` as I18nKey)}</span>}
          </div>
          <Stepper step={d?.step ?? 1} />
          {d && (
            <>
              {d.step === 1 && <Step1 d={d} update={updateDraft} />}
              {d.step === 2 && <Step2 d={d} update={updateDraft} />}
              {d.step === 3 && <Step3 d={d} update={updateDraft} />}
              <div className="wz-actions">
                {d.step > 1 && (
                  <button className="btn btn-neutral" onClick={back} {...ez('wizard.back', t('wizard.back'))}>
                    {t('wizard.back')}
                  </button>
                )}
                {d.step < 3 ? (
                  <button className="btn btn-neutral wz-next" onClick={next} {...ez('wizard.next', t('wizard.next'))}>
                    {t('wizard.next')}
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={submit} disabled={!d.confirmed} {...ez('wizard.submit', t('wizard.submit'), { sensitive: true })}>
                    {t('wizard.submit')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {modeModal && (
        <ModeModal
          institutionId={inst.id}
          onClose={() => setModeModal(false)}
          onCancel={() => {
            setModeModal(false);
            navigate(`/taasisi/${inst.id}`);
          }}
        />
      )}
    </PageFrame>
  );
}
