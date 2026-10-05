import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Common';
import { ez } from './esiriProps';
import { useT, type I18nKey } from '../i18n';
import { useApp } from '../store/appStore';
import { MODES, type Mode } from '../store/data';

/** "Chagua namna ya kuwasilisha mrejesho wako" — the four submission modes. */
export function ModeModal({ institutionId, onClose, onCancel }: { institutionId: string; onClose: () => void; onCancel?: () => void }) {
  const t = useT();
  const navigate = useNavigate();

  const choose = (mode: Mode) => {
    const s = useApp.getState();
    const target = `/wasilisha/${institutionId}?mode=${mode}`;
    onClose();
    if (mode === 'account' && !s.currentUser) {
      s.toast(t('login.needAccount'));
      navigate(`/ingia?next=${encodeURIComponent(target)}`);
      return;
    }
    s.startDraft(institutionId, mode);
    navigate(target);
  };

  return (
    <Modal name="submission-mode" title={t('mode.title')} onClose={onCancel ?? onClose} width={960} closeId="mode.close">
      <p className="mode-sub">{t('mode.subtitle')}</p>
      <div className="mode-grid">
        {MODES.map((m) => (
          <button key={m} className="mode-option" onClick={() => choose(m)} {...ez(`mode.${m}`, t(`mode.${m}` as I18nKey))}>
            <span className="mode-chev">
              <ChevronRight size={14} />
            </span>
            <span className="mode-text">
              <b>{t(`mode.${m}` as I18nKey)}</b>
              <span>{t(`mode.${m}Desc` as I18nKey)}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
