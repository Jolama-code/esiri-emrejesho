import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Plus, Trash2 } from 'lucide-react';
import { PageFrame, PageHead } from '../components/Layout';
import { Modal } from '../components/Common';
import { ez } from '../components/esiriProps';
import { pick, useLang, useT, type I18nKey } from '../i18n';
import { formatDate, useApp, useCurrentAccount } from '../store/appStore';
import { institutionById, serviceById } from '../store/data';
import './Track.css';

export default function MyFeedback() {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const submissions = useApp((s) => s.submissions);
  const withdraw = useApp((s) => s.withdraw);
  const toast = useApp((s) => s.toast);
  const [confirmRef, setConfirmRef] = useState<string | null>(null);

  const mine = account ? submissions.filter((x) => x.owner === account.username) : [];

  return (
    <PageFrame>
      <div className="container">
        <PageHead subtitle={t('my.title')} back="/">
          <button className="btn btn-primary" onClick={() => navigate('/taasisi')} {...ez('my-feedback.new', t('my.new'))}>
            <Plus size={16} /> {t('my.new')}
          </button>
        </PageHead>
        <div className="my-head">
          <h1>{t('my.title')}</h1>
          <p>{t('my.subtitle')}</p>
          <span className="my-count">{t('my.count', { n: mine.length })}</span>
        </div>
        {mine.length === 0 ? (
          <div className="empty-box">{t('my.empty')}</div>
        ) : (
          <div className="my-list">
            {mine.map((s) => {
              const inst = institutionById(s.institutionId);
              const svc = serviceById(s.serviceId);
              return (
                <article key={s.ref} className="my-card card" data-testid="my-feedback-item" data-ref={s.ref} data-status={s.status}>
                  <div className="my-card-top">
                    <span className="sub-ref">{s.ref}</span>
                    <span className={`badge badge-${s.status}`}>{t(`status.${s.status}` as I18nKey)}</span>
                  </div>
                  <h3>{inst?.short ?? s.institutionId}</h3>
                  <div className="my-tags">
                    <span className="badge badge-type">{t(`type.${s.type}` as I18nKey)}</span>
                    <span className="my-svc">{svc ? pick(svc.service.name, lang) : ''}</span>
                  </div>
                  <p className="my-desc">{s.description}</p>
                  <div className="my-foot">
                    <span className="my-date">{formatDate(s.createdAt, lang)}</span>
                    <span className="spacer" />
                    {s.status === 'imepokelewa' && (
                      <button className="btn btn-danger-outline btn-sm" onClick={() => setConfirmRef(s.ref)} {...ez(`my-feedback.item.${s.ref}.withdraw`, `${t('my.withdraw')} ${s.ref}`)}>
                        <Trash2 size={14} /> {t('my.withdraw')}
                      </button>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/fuatilia?ref=${encodeURIComponent(s.ref)}`)} {...ez(`my-feedback.item.${s.ref}.open`, `${t('my.open')} ${s.ref}`)}>
                      <Eye size={14} /> {t('my.open')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      {confirmRef && (
        <Modal
          name="withdraw"
          title={t('my.withdrawTitle')}
          onClose={() => setConfirmRef(null)}
          footer={
            <>
              <button className="btn btn-neutral" onClick={() => setConfirmRef(null)} {...ez('withdraw.cancel', t('my.withdrawCancel'))}>
                {t('my.withdrawCancel')}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  const ref = confirmRef;
                  if (withdraw(ref)) toast(t('my.withdrawn', { ref }));
                  setConfirmRef(null);
                }}
                {...ez('withdraw.confirm', t('my.withdrawConfirm'), { sensitive: true })}
              >
                {t('my.withdrawConfirm')}
              </button>
            </>
          }
        >
          <p className="modal-text">{t('my.withdrawBody', { ref: confirmRef })}</p>
        </Modal>
      )}
    </PageFrame>
  );
}
