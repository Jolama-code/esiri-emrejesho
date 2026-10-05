import { useState, type ReactNode } from 'react';
import { PlayCircle, Search } from 'lucide-react';
import { SiteFooter, SiteHeader } from '../components/Layout';
import { ez } from '../components/esiriProps';
import { useT, type I18nKey } from '../i18n';
import { HELP_FAQS } from '../store/data';
import { useApp } from '../store/appStore';
import { FaqList } from './InstitutionPage';
import './Institutions.css';
import './InstitutionPage.css';
import './Help.css';

function HelpFrame({ children, testId }: { children: ReactNode; testId: string }) {
  return (
    <div className="page help-page">
      <SiteHeader />
      <div className="help-banner" aria-hidden="true" />
      <main className="page-main help-main">
        <div className="container">
          <article className="help-card card" data-testid={testId}>
            {children}
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function HelpGuide() {
  const t = useT();
  const steps: [I18nKey, I18nKey][] = [
    ['help.step1T', 'help.step1D'],
    ['help.step2T', 'help.step2D'],
    ['help.step3T', 'help.step3D'],
    ['help.step4T', 'help.step4D'],
    ['help.step5T', 'help.step5D'],
  ];
  return (
    <HelpFrame testId="help-guide">
      <h1 className="help-title">{t('help.guideTitle')}</h1>
      <p className="help-sub">{t('help.guideSub')}</p>
      <h2 className="help-h2">{t('help.tenMin')}</h2>
      <ol className="guide-steps">
        {steps.map(([title, desc]) => (
          <li key={title}>
            <b>{t(title)}</b>
            <span>{t(desc)}</span>
          </li>
        ))}
      </ol>
      <h2 className="help-h2">{t('help.basics')}</h2>
      <div className="basics-grid">
        <p>
          {t('help.website')} <b>mrejesho.go.tz</b>
        </p>
        <p>
          {t('help.ussd')} <span className="ussd-y">*152*00#</span>
        </p>
        <p>{t('help.sms')}</p>
        <p>{t('help.noData')}</p>
      </div>
    </HelpFrame>
  );
}

export function HelpFaq() {
  const t = useT();
  const [q, setQ] = useState('');
  return (
    <HelpFrame testId="help-faq">
      <h1 className="help-title">{t('help.faqTitle')}</h1>
      <p className="help-sub">{t('help.faqSub')}</p>
      <label className="pill-search help-search">
        <span className="pill-icon">
          <Search size={18} />
        </span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('inst.faqSearch')} aria-label={t('inst.faqSearch')} {...ez('help.faq-search', t('inst.faqSearch'))} />
      </label>
      <FaqList faqs={HELP_FAQS} prefix="help.faq." query={q} />
    </HelpFrame>
  );
}

export function HelpVideo() {
  const t = useT();
  const toast = useApp((s) => s.toast);
  const videos: [string, I18nKey, string][] = [
    ['send', 'help.video1', '3:20'],
    ['track', 'help.video2', '1:45'],
    ['account', 'help.video3', '2:10'],
  ];
  return (
    <HelpFrame testId="help-video">
      <h1 className="help-title">{t('help.videoTitle')}</h1>
      <p className="help-sub">{t('help.videoSub')}</p>
      <div className="video-grid">
        {videos.map(([id, title, dur]) => (
          <button key={id} className="video-tile" onClick={() => toast(t('help.videoSoon'))} {...ez(`help.video.${id}`, t(title))}>
            <span className="video-thumb">
              <PlayCircle size={52} strokeWidth={1.4} />
              <span className="video-dur">{dur}</span>
            </span>
            <b>{t(title)}</b>
            <span>{t('help.videoSoon')}</span>
          </button>
        ))}
      </div>
    </HelpFrame>
  );
}
