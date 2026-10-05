import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Briefcase, ChevronLeft, ChevronRight, Construction, Droplets, Fingerprint, Fish, Gem, GraduationCap, HeartPulse,
  Landmark, Leaf, Map, Megaphone, Phone, RadioTower, Search, Shield, Trees, User, Users, Zap, ClipboardList, BadgeCheck,
} from 'lucide-react';
import { PageFrame } from '../components/Layout';
import { ez } from '../components/esiriProps';
import { pick, useLang, useT } from '../i18n';
import {
  FEATURED_SERVICES, INSTITUTIONS, SECTORS, serviceById, type SectorIcon,
} from '../store/data';
import './Landing.css';

export const SECTOR_ICONS: Record<SectorIcon, ReactNode> = {
  zap: <Zap />,
  droplets: <Droplets />,
  landmark: <Landmark />,
  fingerprint: <Fingerprint />,
  shield: <Shield />,
  'radio-tower': <RadioTower />,
  construction: <Construction />,
  'heart-pulse': <HeartPulse />,
  'graduation-cap': <GraduationCap />,
  map: <Map />,
  briefcase: <Briefcase />,
  trees: <Trees />,
  'bar-chart': <BarChart3 />,
  leaf: <Leaf />,
  users: <Users />,
  gem: <Gem />,
  fish: <Fish />,
};

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function Typewriter({ lines }: { lines: string[] }) {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const line = lines[i % lines.length];
  useEffect(() => {
    const full = n >= line.length;
    const delay = deleting ? 35 : full ? 1800 : 80;
    const id = window.setTimeout(() => {
      if (!deleting && full) setDeleting(true);
      else if (deleting && n === 0) {
        setDeleting(false);
        setI((x) => x + 1);
      } else setN((x) => x + (deleting ? -1 : 1));
    }, delay);
    return () => window.clearTimeout(id);
  }, [n, deleting, line]);
  useEffect(() => {
    setN(0);
    setDeleting(false);
  }, [lines[0]]); // restart when the language changes
  return (
    <p className="typewriter" aria-label={line}>
      <span className="tw-dot" />
      <span>{line.slice(0, n)}</span>
      <span className="tw-caret">|</span>
    </p>
  );
}

type SearchKind = 'taasisi' | 'huduma' | 'sekta';

function HeroSearch() {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const [q, setQ] = useState<Record<SearchKind, string>>({ taasisi: '', huduma: '', sekta: '' });
  const [open, setOpen] = useState<SearchKind | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const results = useMemo(() => {
    const kind = open;
    if (!kind) return [];
    const term = norm(q[kind]);
    if (!term) return [];
    if (kind === 'taasisi') {
      return INSTITUTIONS.filter((i) => norm(`${i.short} ${i.full}`).includes(term))
        .slice(0, 8)
        .map((i) => ({ id: `landing.search-result.${i.id}`, label: i.short, sub: i.full, to: `/taasisi/${i.id}` }));
    }
    if (kind === 'huduma') {
      const out: { id: string; label: string; sub: string; to: string }[] = [];
      for (const i of INSTITUTIONS)
        for (const s of i.services)
          if (norm(`${s.name.sw} ${s.name.en}`).includes(term)) out.push({ id: `landing.search-result.service.${s.id}`, label: pick(s.name, lang), sub: i.short, to: `/taasisi/${i.id}` });
      return out.slice(0, 8);
    }
    return SECTORS.filter((s) => norm(`${s.name.sw} ${s.name.en}`).includes(term))
      .slice(0, 8)
      .map((s) => ({ id: `landing.search-result.sector.${s.id}`, label: pick(s.name, lang), sub: '', to: `/sekta/${s.id}` }));
  }, [open, q, lang]);

  const field = (kind: SearchKind, label: string) => (
    <label className={`hs-field ${open === kind ? 'focus' : ''}`}>
      <span className="hs-icon">
        <Search size={15} />
      </span>
      <input
        value={q[kind]}
        placeholder={label}
        onChange={(e) => {
          setQ((x) => ({ ...x, [kind]: e.target.value }));
          setOpen(kind);
        }}
        onFocus={() => setOpen(kind)}
        aria-label={label}
        {...ez(`landing.search.${kind}`, label)}
      />
    </label>
  );

  return (
    <div className="hero-search" ref={wrap}>
      {field('taasisi', t('landing.searchTaasisi'))}
      {field('huduma', t('landing.searchHuduma'))}
      {field('sekta', t('landing.searchSekta'))}
      {open && q[open].trim() && (
        <div className={`hs-results hs-${open}`} role="listbox">
          {results.length === 0 ? (
            <div className="hs-empty">{t('landing.noResults')}</div>
          ) : (
            results.map((r) => (
              <button key={r.id} className="hs-result" onClick={() => navigate(r.to)} {...ez(r.id, r.sub ? `${r.label} – ${r.sub}` : r.label)}>
                <b>{r.label}</b>
                {r.sub && <span>{r.sub}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PhoneIllustration() {
  const t = useT();
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="hero-bubble">{t('landing.bubble')}</div>
      <svg className="hero-phone" viewBox="0 0 360 420" role="img">
        <defs>
          <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9a5b34" />
            <stop offset="1" stopColor="#6b3a1f" />
          </linearGradient>
          <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f8ff" />
            <stop offset="1" stopColor="#ffffff" />
          </linearGradient>
          <linearGradient id="sleeve" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c27a2c" />
            <stop offset="1" stopColor="#9a5a1c" />
          </linearGradient>
        </defs>
        <g transform="rotate(-12 200 180)">
          {/* sleeve and wrist */}
          <rect x="150" y="318" width="112" height="140" rx="18" fill="url(#sleeve)" />
          <rect x="150" y="318" width="112" height="14" fill="#7a4512" opacity="0.35" />
          {/* palm behind the phone */}
          <rect x="112" y="214" width="186" height="122" rx="56" fill="url(#skin)" />
          {/* phone */}
          <rect x="128" y="20" width="150" height="290" rx="22" fill="#11161f" />
          <rect x="137" y="34" width="132" height="262" rx="14" fill="url(#screen)" />
          <rect x="182" y="26" width="42" height="5" rx="2.5" fill="#2b3240" />
          <rect x="147" y="48" width="112" height="22" rx="6" fill="#00aeef" />
          <text x="203" y="63" textAnchor="middle" fontSize="11" fontWeight="700" fontStyle="italic" fill="#fff">eMrejesho</text>
          <circle cx="203" cy="132" r="34" fill="#1eb53a" opacity="0.15" />
          <circle cx="203" cy="132" r="25" fill="#1eb53a" />
          <path d="M191 132 l8 8 l15 -16" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="155" y="180" width="96" height="9" rx="4.5" fill="#cfe3ee" />
          <rect x="166" y="196" width="74" height="9" rx="4.5" fill="#e1edf3" />
          <rect x="155" y="222" width="96" height="26" rx="7" fill="#fbd03a" />
          <text x="203" y="239" textAnchor="middle" fontSize="10" fontWeight="700" fill="#3a2a00">EMR-2026</text>
          {/* fingers wrapped over the right edge */}
          {[170, 200, 230, 260].map((y, i) => (
            <rect key={y} x={258 - (i === 0 ? 4 : 0)} y={y} width="46" height="27" rx="13.5" fill={i % 2 ? '#8c512d' : '#9a5b34'} stroke="#6b3a1f" strokeWidth="1.5" />
          ))}
          {/* thumb over the left edge */}
          <rect x="104" y="196" width="40" height="92" rx="20" fill="#9a5b34" stroke="#6b3a1f" strokeWidth="1.5" transform="rotate(18 124 242)" />
        </g>
      </svg>
      <div className="hero-dots" />
    </div>
  );
}

export default function Landing() {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const [sectorQuery, setSectorQuery] = useState('');
  const carousel = useRef<HTMLDivElement>(null);
  const sectorsRef = useRef<HTMLElement>(null);
  const [page, setPage] = useState(0);

  const sectors = SECTORS.filter((s) => norm(`${s.name.sw} ${s.name.en}`).includes(norm(sectorQuery)));
  const pages = Math.max(1, Math.ceil(sectors.length / 12));

  const openSectors = () => {
    sectorsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => document.querySelector<HTMLInputElement>('[data-esiri-id="landing.sector-search"]')?.focus({ preventScroll: true }), 450);
  };

  const scrollCarousel = (dir: 1 | -1) => {
    const el = carousel.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };

  const onCarouselScroll = () => {
    const el = carousel.current;
    if (el) setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };

  return (
    <PageFrame className="landing">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-left">
            <h1 className="hero-hashtag">{t('landing.hashtag')}</h1>
            <Typewriter lines={[t('landing.typing1'), t('landing.typing2')]} />
            <p className="hero-desc">{t('landing.description')}</p>
            <button className="hero-btn hero-btn-main" onClick={() => navigate('/taasisi')} {...ez('landing.sema-na-kiongozi', t('landing.semaNaKiongozi'))}>
              <User size={18} /> {t('landing.semaNaKiongozi')}
            </button>
            <div className="hero-btn-row">
              <button className="hero-btn hero-btn-light" onClick={openSectors} {...ez('landing.toa-taarifa', t('landing.toaTaarifa'))}>
                <Megaphone size={18} /> {t('landing.toaTaarifa')}
              </button>
              <button className="hero-btn hero-btn-light" onClick={() => navigate('/fuatilia')} {...ez('landing.fuatilia', t('landing.fuatilia'))}>
                <ClipboardList size={18} /> {t('landing.fuatilia')}
              </button>
            </div>
            <div className="campaign">
              <div className="campaign-art" aria-hidden="true">
                {['#c62828', '#2e7d32', '#1565c0', '#f9a825'].map((c, i) => (
                  <span key={c} style={{ background: c, height: 70 + (i % 2) * 14 }} />
                ))}
              </div>
              <div className="campaign-text">
                <h2>{t('landing.campaignTitle')}</h2>
                <p>{t('landing.campaignSub')}</p>
                <button className="campaign-btn" onClick={openSectors} {...ez('landing.campaign', t('landing.campaignBtn'))}>
                  <Users size={18} /> {t('landing.campaignBtn')}
                </button>
              </div>
            </div>
            <HeroSearch />
          </div>
          <PhoneIllustration />
        </div>
        <div className="ussd-strip">
          <div className="container ussd-row">
            <span className="ussd-text">
              {t('landing.ussdCall')} <span className="y">*</span>152<span className="y">*</span>00 <span className="y">#</span> › 3
            </span>
            <span className="ussd-sep" />
            <span className="ussd-text">{t('landing.download')}</span>
            <span className="store-pill">Google Play</span>
            <span className="store-pill">App Store</span>
          </div>
        </div>
      </section>

      <section className="container lp-section">
        <div className="section-head">
          <h2>{t('landing.servicesTitle')}</h2>
          <button className="btn-viewmore" onClick={() => navigate('/taasisi')} {...ez('landing.services-more', t('landing.viewMore'))}>
            {t('landing.viewMore')} <ChevronRight size={16} />
          </button>
        </div>
        <div className="services-grid">
          {FEATURED_SERVICES.map((id) => {
            const hit = serviceById(id);
            if (!hit) return null;
            return (
              <button
                key={id}
                className="service-card"
                onClick={() => navigate(`/taasisi/${hit.institution.id}`)}
                {...ez(`landing.service.${id}`, `${pick(hit.service.name, lang)} – ${hit.institution.short}`)}
              >
                <span className="service-icon">
                  <BadgeCheck size={20} />
                </span>
                <span className="service-name">{pick(hit.service.name, lang)}</span>
                <span className="service-inst">{hit.institution.short}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="container lp-section" ref={sectorsRef} id="sekta">
        <div className="section-head">
          <h2>{t('landing.sectorsTitle')}</h2>
          <label className="sector-search">
            <input
              value={sectorQuery}
              onChange={(e) => setSectorQuery(e.target.value)}
              placeholder={t('landing.searchSector')}
              aria-label={t('landing.searchSector')}
              {...ez('landing.sector-search', t('landing.searchSector'))}
            />
            <Search size={18} />
          </label>
        </div>
        <div className="carousel-wrap">
          <button className="car-arrow left" onClick={() => scrollCarousel(-1)} aria-label={t('landing.prev')} {...ez('landing.sectors.prev', t('landing.prev'))}>
            <ChevronLeft size={16} />
          </button>
          <div className="sector-carousel" ref={carousel} onScroll={onCarouselScroll}>
            {sectors.map((s) => (
              <button key={s.id} className="sector-card" onClick={() => navigate(`/sekta/${s.id}`)} {...ez(`landing.sector.${s.id}`, pick(s.name, lang))}>
                <span className="sector-icon">
                  <span className="sector-sun" />
                  {SECTOR_ICONS[s.icon]}
                </span>
                <span className="sector-name">{pick(s.name, lang)}</span>
              </button>
            ))}
            {sectors.length === 0 && <div className="hs-empty">{t('landing.noResults')}</div>}
          </div>
          <button className="car-arrow right" onClick={() => scrollCarousel(1)} aria-label={t('landing.next')} {...ez('landing.sectors.next', t('landing.next'))}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="car-dots" aria-hidden="true">
          {Array.from({ length: pages }, (_, i) => (
            <span key={i} className={i === Math.min(page, pages - 1) ? 'on' : ''} />
          ))}
        </div>
      </section>

      <section className="container lp-section">
        <div className="award">
          <div className="award-text">
            <h2>{t('landing.awardTitle')}</h2>
            <p>{t('landing.awardBody')}</p>
          </div>
          <div className="award-cert" aria-hidden="true">
            <div className="cert-inner">
              <span className="cert-top">CHAMPION</span>
              <span className="cert-line">World Summit on the Information Society</span>
              <span className="cert-title">AI-Powered eMrejesho Platform</span>
              <span className="cert-line">e-Government Authority (e-GA)</span>
              <span className="cert-badge">{t('landing.awardBadge')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container lp-section">
        <div className="kitochi">
          <div className="kitochi-text">
            <h2>{t('landing.kitochiTitle')}</h2>
            <div className="kitochi-call">
              <Phone size={24} />
              <div>
                <b>{t('landing.kitochiCall')}</b>
                <span>{t('landing.kitochiCallSub')}</span>
              </div>
            </div>
            <p>{t('landing.kitochiApps')}</p>
            <div className="kitochi-stores">
              <span className="store-pill">Google Play</span>
              <span className="store-pill">App Store</span>
            </div>
          </div>
          <div className="feature-phone" aria-hidden="true">
            <div className="fp-screen">
              <span className="fp-time">12:30</span>
              <span className="fp-code">*152*00#</span>
            </div>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}

