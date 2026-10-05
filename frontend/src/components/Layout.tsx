import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Globe, Info, LogIn, LogOut, PlayCircle, RotateCcw, ScrollText,
} from 'lucide-react';
import { useT } from '../i18n';
import { useApp, useCurrentAccount } from '../store/appStore';
import type { Institution } from '../store/data';
import { ez } from './esiriProps';
import { newConversation } from '../esiri/controller';

export const COAT = '/assets/tanzania-coat-of-arms.svg';

export function FlagStripe() {
  return (
    <div className="flag-stripe" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close]);
  return ref;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function SiteHeader() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const language = useApp((s) => s.language);
  const setLanguage = useApp((s) => s.setLanguage);
  const toast = useApp((s) => s.toast);
  const account = useCurrentAccount();
  const [msaada, setMsaada] = useState(false);
  const [menu, setMenu] = useState(false);
  const msaadaRef = useOutsideClose(msaada, () => setMsaada(false));
  const menuRef = useOutsideClose(menu, () => setMenu(false));

  useEffect(() => {
    setMsaada(false);
    setMenu(false);
  }, [location.pathname]);

  const path = location.pathname;
  const go = (to: string) => {
    setMsaada(false);
    setMenu(false);
    navigate(to);
  };

  return (
    <header className="site-header">
      <FlagStripe />
      <div className="container header-row">
        <button className="wordmark" onClick={() => go('/')} {...ez('header.home', t('header.home'))} aria-label={t('header.home')}>
          <img src={COAT} alt="" />
          <span className="wordmark-divider" />
          <span className="wordmark-text">
            <span className="e">e</span>Mrejesho
          </span>
        </button>

        <nav className="main-nav">
          <button className={`nav-link ${path === '/' ? 'active' : ''}`} onClick={() => go('/')} {...ez('header.nav.home', t('nav.home'))}>
            {t('nav.home')}
          </button>
          <div className="msaada-wrap" ref={msaadaRef} style={{ position: 'relative' }}>
            <button
              className={`nav-link ${path.startsWith('/msaada') || msaada ? 'active' : ''}`}
              onClick={() => setMsaada((v) => !v)}
              aria-expanded={msaada}
              {...ez('header.nav.msaada', t('nav.msaada'), { state: msaada ? 'open' : 'closed' })}
            >
              {t('nav.msaada')}
            </button>
            {msaada && (
              <div className="msaada-panel" role="menu">
                <span className="msaada-label">{t('nav.msaada')}</span>
                <div className="msaada-pills">
                  <button className="msaada-pill" role="menuitem" onClick={() => go('/msaada/mwongozo')} {...ez('header.msaada.mwongozo', t('msaada.mwongozo'))}>
                    <BookOpen size={16} /> {t('msaada.mwongozo')}
                  </button>
                  <button className="msaada-pill" role="menuitem" onClick={() => go('/msaada/video')} {...ez('header.msaada.video', t('msaada.video'))}>
                    <PlayCircle size={16} /> {t('msaada.video')}
                  </button>
                  <button className="msaada-pill" role="menuitem" onClick={() => go('/msaada/maswali')} {...ez('header.msaada.maswali', t('msaada.maswali'))}>
                    <CircleHelp size={16} /> {t('msaada.maswali')}
                  </button>
                </div>
              </div>
            )}
          </div>
          <button className="nav-link apps" onClick={() => toast(t('toast.notAvailable'))} {...ez('header.nav.apps', t('nav.apps'))}>
            {t('nav.apps')}
          </button>
          {language === 'sw' ? (
            <button className="nav-link" onClick={() => setLanguage('en')} {...ez('header.lang.en', t('header.langEnglish'))} lang="en">
              <Globe size={19} color="#1a8fd0" /> {t('header.langEnglish')}
            </button>
          ) : (
            <button className="nav-link" onClick={() => setLanguage('sw')} {...ez('header.lang.sw', t('header.langSwahili'))} lang="sw">
              <Globe size={19} color="#1a8fd0" /> {t('header.langSwahili')}
            </button>
          )}
        </nav>

        <div className="header-actions">
          {account ? (
            <div className="user-menu-wrap" ref={menuRef}>
              <button
                className="user-btn"
                onClick={() => setMenu((v) => !v)}
                aria-expanded={menu}
                {...ez('header.user-menu', account.fullName, { state: menu ? 'open' : 'closed' })}
                data-testid="user-menu"
              >
                <span className="avatar">{initials(account.fullName)}</span>
                {account.fullName}
                <ChevronDown size={16} />
              </button>
              {menu && (
                <div className="dropdown" role="menu">
                  <div className="dropdown-head">
                    <b>{account.fullName}</b>
                    <span>@{account.username}</span>
                  </div>
                  <button className="dropdown-item" role="menuitem" onClick={() => go('/mrejesho-wangu')} {...ez('header.menu.my-feedback', t('menu.myFeedback'))}>
                    <ClipboardList size={17} /> {t('menu.myFeedback')}
                  </button>
                  <button className="dropdown-item" role="menuitem" onClick={() => go('/ukaguzi')} {...ez('header.menu.audit', t('menu.audit'))}>
                    <ScrollText size={17} /> {t('menu.audit')}
                  </button>
                  <button
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      newConversation();
                      useApp.getState().resetDemo();
                      setMenu(false);
                      toast(t('toast.resetDone'));
                    }}
                    {...ez('header.menu.reset-demo', t('menu.reset'))}
                  >
                    <RotateCcw size={17} /> {t('menu.reset')}
                  </button>
                  <button
                    className="dropdown-item danger"
                    role="menuitem"
                    onClick={() => {
                      useApp.getState().logout();
                      go('/');
                      toast(t('toast.loggedOut'));
                    }}
                    {...ez('header.menu.logout', t('menu.logout'))}
                  >
                    <LogOut size={17} /> {t('menu.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button className="btn-ingia" onClick={() => go('/ingia')} {...ez('header.login', t('header.login'))}>
                <LogIn size={17} /> {t('header.login')}
              </button>
              <button className="btn-tengeneza" onClick={() => go('/jisajili')} {...ez('header.register', t('header.register'))}>
                {t('header.register')}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const t = useT();
  const navigate = useNavigate();
  const toast = useApp((s) => s.toast);
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src={COAT} alt="" />
            </div>
            <div>
              <h4>{t('footer.country')}</h4>
              <hr />
              <h5>{t('footer.version')}</h5>
              <p>{t('footer.tagline')}</p>
            </div>
          </div>
          <div className="footer-about">
            <Info size={26} />
            <p>{t('footer.about')}</p>
          </div>
          <div className="footer-links">
            <h4>{t('footer.links')}</h4>
            <ul>
              <li>
                <a href="https://gisp.gov.go.tz" target="_blank" rel="noreferrer" {...ez('footer.link.gisp', 'Government ICT Services Portal')}>
                  <ChevronRight size={16} /> Government ICT Services Portal
                </a>
              </li>
              <li>
                <a href="https://www.ega.go.tz" target="_blank" rel="noreferrer" {...ez('footer.link.ega', 'e-Government Authority')}>
                  <ChevronRight size={16} /> e-Government Authority
                </a>
              </li>
              <li>
                <a href="https://emikutano.go.tz" target="_blank" rel="noreferrer" {...ez('footer.link.emikutano', 'eMikutano')}>
                  <ChevronRight size={16} /> eMikutano
                </a>
              </li>
              <li>
                <button onClick={() => navigate('/ukaguzi')} {...ez('footer.audit', t('footer.audit'))}>
                  <ChevronRight size={16} /> {t('footer.audit')}
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-meta">
            <span>{t('footer.copyright')}</span>
            <span className="footer-poc">{t('footer.poc')}</span>
          </div>
          <div className="footer-meta">
            <button onClick={() => toast(t('toast.notAvailable'))}>{t('footer.privacy')}</button>
            <span>|</span>
            <button onClick={() => toast(t('toast.notAvailable'))}>{t('footer.terms')}</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** Standard page frame: header, content, footer. */
export function PageFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`page ${className}`}>
      <SiteHeader />
      <main className="page-main">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** "← Taarifa / subtitle" bar used on inner pages. */
export function PageHead({ subtitle, back, children }: { subtitle: string; back?: string | (() => void); children?: ReactNode }) {
  const t = useT();
  const navigate = useNavigate();
  const onBack = () => {
    if (typeof back === 'function') back();
    else if (typeof back === 'string') navigate(back);
    else if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };
  return (
    <div className="page-head">
      <button className="back-btn" onClick={onBack} aria-label={t('common.back')} {...ez('page.back', t('common.back'))}>
        <ArrowLeft size={22} />
      </button>
      <div className="page-head-text">
        <b>{t('common.taarifa')}</b>
        <span>{subtitle}</span>
      </div>
      {children && (
        <>
          <span className="spacer" />
          {children}
        </>
      )}
    </div>
  );
}

export function InstitutionLogo({ inst, size = 56 }: { inst: Institution; size?: number }) {
  if (inst.badge) {
    const len = inst.badge.initials.length;
    return (
      <span
        className="inst-badge"
        style={{ width: size, height: size, background: inst.badge.color, fontSize: size * (len > 4 ? 0.2 : len > 3 ? 0.24 : len > 2 ? 0.28 : 0.34) }}
        aria-hidden="true"
      >
        {inst.badge.initials}
      </span>
    );
  }
  return <img className="inst-coat" src={COAT} alt="" style={{ height: size * 1.05, width: 'auto' }} />;
}
