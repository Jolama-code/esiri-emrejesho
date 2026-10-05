import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Copy, Home, RefreshCw } from 'lucide-react';
import { PageFrame } from '../components/Layout';
import { copyText } from '../components/Common';
import { ez } from '../components/esiriProps';
import { useT } from '../i18n';
import { useApp } from '../store/appStore';
import './Wizard.css';

export default function Success() {
  const t = useT();
  const navigate = useNavigate();
  const { ref = '' } = useParams();
  const toast = useApp((s) => s.toast);
  return (
    <PageFrame>
      <div className="container">
        <div className="success-card card" data-testid="success">
          <div className="success-icon">
            <CheckCircle2 size={48} />
          </div>
          <h1>{t('success.title')}</h1>
          <div className="ref-box">
            <div>
              <small>{t('success.refLabel')}</small>
              <span className="ref-num" data-testid="success-reference" {...ez('success.reference', ref)}>
                {ref}
              </span>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => void copyText(ref).then(() => toast(t('success.copied')))}
              {...ez('success.copy', t('success.copy'))}
            >
              <Copy size={15} /> {t('success.copy')}
            </button>
          </div>
          <p className="success-note">{t('success.note')}</p>
          <div className="success-actions">
            <button className="btn btn-primary" onClick={() => navigate(`/fuatilia?ref=${encodeURIComponent(ref)}`)} {...ez('success.track', t('success.track'))}>
              <RefreshCw size={16} /> {t('success.track')}
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/')} {...ez('success.home', t('success.home'))}>
              <Home size={16} /> {t('success.home')}
            </button>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
