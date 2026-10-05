import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Check, MessageSquareReply, Search } from 'lucide-react';
import { PageFrame, PageHead } from '../components/Layout';
import { ez } from '../components/esiriProps';
import { pick, useLang, useT, type I18nKey } from '../i18n';
import { formatDate, useApp } from '../store/appStore';
import { STATUSES, institutionById, serviceById, type Submission } from '../store/data';
import './Track.css';

/** Details + status timeline, shared by tracking and My Feedback. */
export function SubmissionDetails({ sub }: { sub: Submission }) {
  const t = useT();
  const lang = useLang();
  const inst = institutionById(sub.institutionId);
  const svc = serviceById(sub.serviceId);
  const reached = STATUSES.indexOf(sub.status);
  return (
    <div className="sub-details" data-testid="track-result" data-ref={sub.ref} data-status={sub.status}>
      <div className="sub-head">
        <div>
          <span className="sub-ref">{sub.ref}</span>
          <h2>{inst ? `${inst.short} – ${inst.full}` : sub.institutionId}</h2>
        </div>
        <span className={`badge badge-${sub.status}`} data-testid="track-status">
          {t(`status.${sub.status}` as I18nKey)}
        </span>
      </div>
      <dl className="sub-meta">
        <div>
          <dt>{t('track.type')}</dt>
          <dd>
            <span className="badge badge-type">{t(`type.${sub.type}` as I18nKey)}</span>
          </dd>
        </div>
        <div>
          <dt>{t('track.service')}</dt>
          <dd>{svc ? pick(svc.service.name, lang) : '—'}</dd>
        </div>
        <div>
          <dt>{t('track.date')}</dt>
          <dd>{formatDate(sub.createdAt, lang)}</dd>
        </div>
        <div>
          <dt>{t('track.location')}</dt>
          <dd>{`${sub.location}, ${sub.district}, ${sub.region}`}</dd>
        </div>
      </dl>
      <div className="sub-desc">
        <b>{t('track.description')}</b>
        <p>{sub.description}</p>
        {sub.mode === 'anonymous' && <p className="muted-note">{t('track.anonymous')}</p>}
      </div>
      <h3 className="timeline-title">{t('track.statusTitle')}</h3>
      <ol className="timeline" data-testid="timeline">
        {STATUSES.map((st, i) => {
          const ev = sub.history.find((h) => h.status === st);
          const done = i <= reached;
          return (
            <li key={st} className={`tl-step ${done ? 'done' : ''} ${i === reached ? 'current' : ''}`}>
              <span className="tl-dot">{done ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
              <span className="tl-label">{t(`status.${st}` as I18nKey)}</span>
              <span className="tl-date">{ev ? formatDate(ev.date, lang) : t('track.pending')}</span>
            </li>
          );
        })}
      </ol>
      {sub.response && (
        <div className="sub-response" data-testid="track-response">
          <MessageSquareReply size={20} />
          <div>
            <b>{t('track.response')}</b>
            <p>{sub.response}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Track() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const refParam = (params.get('ref') ?? '').trim().toUpperCase();
  const submissions = useApp((s) => s.submissions);
  const [value, setValue] = useState(refParam);
  const [empty, setEmpty] = useState(false);

  useEffect(() => setValue(refParam), [refParam]);

  const sub = refParam ? submissions.find((x) => x.ref === refParam) : undefined;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim().toUpperCase().replace(/\s+/g, '');
    if (!v) {
      setEmpty(true);
      return;
    }
    setEmpty(false);
    navigate(`/fuatilia?ref=${encodeURIComponent(v)}`);
  };

  return (
    <PageFrame>
      <div className="container">
        <PageHead subtitle={t('track.title')} back="/" />
        <div className="track-card card">
          <h1>{t('track.title')}</h1>
          <p className="track-sub">{t('track.subtitle')}</p>
          <form className="track-form" onSubmit={onSubmit}>
            <label className="field">
              <span className="field-label">{t('track.refLabel')}</span>
              <input
                className="input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={t('track.placeholder')}
                {...ez('track.reference-input', t('track.refLabel'))}
              />
            </label>
            <button type="submit" className="btn btn-primary" {...ez('track.submit', t('track.submit'))}>
              <Search size={16} /> {t('track.submit')}
            </button>
          </form>
          {empty && <p className="field-error">{t('track.empty')}</p>}
        </div>

        {refParam && !sub && (
          <div className="track-error card" data-testid="track-not-found" role="alert">
            <AlertCircle size={22} /> {t('track.notFound', { ref: refParam })}
          </div>
        )}
        {sub && (
          <div className="card track-result-card">
            <SubmissionDetails sub={sub} />
          </div>
        )}
      </div>
    </PageFrame>
  );
}
