import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, CircleHelp, Info, Mail, Maximize, Minus, Phone, PlayCircle, Plus, Search, Send } from 'lucide-react';
import { InstitutionLogo, PageFrame, PageHead } from '../components/Layout';
import { ModeModal } from '../components/ModeModal';
import { ez } from '../components/esiriProps';
import { pick, useLang, useT } from '../i18n';
import { institutionById, sectorById, type Faq } from '../store/data';
import './Institutions.css';
import './InstitutionPage.css';

// Approximate outline of mainland Tanzania (lon/lat projected onto a 400×380 box).
const TZ_OUTLINE =
  'M51,7 L170,9 L272,68 L296,75 L299,95 L347,133 L337,163 L333,194 L357,211 L350,245 L364,279 L388,330 L340,354 L289,367 L224,360 L201,364 L190,313 L170,296 L136,293 L92,272 L61,255 L48,228 L20,187 L17,143 L27,122 L54,88 L48,54 L61,27 Z';

const CITIES: Record<string, [number, number]> = {
  'Dar es Salaam': [349, 204],
  Dodoma: [229, 183],
  Arusha: [261, 87],
  Mwanza: [133, 58],
  Mbeya: [151, 276],
};

const PIN: Record<string, string> = {
  'wizara-ardhi': 'Dodoma', 'wizara-jamii': 'Dodoma', 'wizara-mifugo': 'Dodoma', ajira: 'Dodoma', 'tume-madini': 'Dodoma', 'tbc-central': 'Dodoma', gst: 'Dodoma', nemc: 'Dodoma',
  tanapa: 'Arusha', ncaa: 'Arusha', 'tbc-northern': 'Arusha',
  'tbc-lake': 'Mwanza', tafiri: 'Mwanza',
  'tbc-southern-highland': 'Mbeya', 'tbc-lake-nyasa': 'Mbeya',
};

export function TanzaniaMap({ city }: { city: string }) {
  const t = useT();
  const [px, py] = CITIES[city] ?? CITIES['Dar es Salaam'];
  return (
    <div className="map-panel" aria-label={t('inst.map')} role="img">
      <svg viewBox="-20 -10 440 400" preserveAspectRatio="xMidYMid meet">
        <rect x="-40" y="-40" width="500" height="480" fill="#aad3df" />
        <path d="M-40,-40 L51,7 L61,27 L48,54 L54,88 L27,122 L17,143 L20,187 L48,228 L61,255 L92,272 L136,293 L170,296 L190,313 L201,364 L224,360 L289,367 L340,354 L388,330 L380,420 L-40,420 Z" fill="#f2efe9" />
        <path d="M170,9 L272,68 L296,75 L299,95 L347,133 L400,60 L400,-40 L60,-40 Z" fill="#f2efe9" />
        <path d={TZ_OUTLINE} fill="#f7f4ec" stroke="#b9a8c9" strokeWidth="2" strokeDasharray="6 3" />
        <ellipse cx="128" cy="30" rx="58" ry="30" fill="#aad3df" />
        <path d="M24,150 C 32,180 40,205 58,236 L 50,240 C 32,210 20,182 16,152 Z" fill="#aad3df" />
        <path d="M196,318 C 204,335 206,350 202,366 L 196,366 C 198,350 194,334 190,320 Z" fill="#aad3df" />
        <ellipse cx="352" cy="178" rx="5" ry="13" fill="#f7f4ec" stroke="#c9bfa8" />
        <ellipse cx="358" cy="146" rx="4" ry="9" fill="#f7f4ec" stroke="#c9bfa8" />
        {[[110, 120], [180, 150], [250, 230], [300, 300], [140, 220], [220, 110], [320, 250]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="7" fill="#cfe6c4" opacity="0.8" />
        ))}
        {Object.entries(CITIES).map(([name, [x, y]]) => (
          <g key={name}>
            <circle cx={x} cy={y} r="3" fill="#555" />
            <text x={x + 6} y={y - 5} fontSize="12" fill="#444">
              {name}
            </text>
          </g>
        ))}
        <text x="180" y="210" fontSize="16" fill="#666" fontWeight="600">
          Tanzania
        </text>
        <g transform={`translate(${px - 11}, ${py - 30})`}>
          <path d="M11 0 C 4 0 0 5 0 11 C 0 19 11 30 11 30 C 11 30 22 19 22 11 C 22 5 18 0 11 0 Z" fill="#e5383b" />
          <circle cx="11" cy="11" r="4.5" fill="#fff" />
        </g>
      </svg>
      <div className="map-zoom" aria-hidden="true">
        <span>
          <Plus size={16} />
        </span>
        <span>
          <Minus size={16} />
        </span>
      </div>
      <span className="map-full" aria-hidden="true">
        <Maximize size={16} />
      </span>
    </div>
  );
}

export function FaqList({ faqs, prefix, query }: { faqs: Faq[]; prefix: string; query: string }) {
  const t = useT();
  const lang = useLang();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const q = query.trim().toLowerCase();
  const shown = faqs.filter((f) => !q || `${pick(f.q, lang)} ${pick(f.a, lang)}`.toLowerCase().includes(q));
  if (!shown.length) {
    return (
      <div className="empty-box">
        <Info size={44} strokeWidth={1.5} />
        {t('inst.noFaqs')}
      </div>
    );
  }
  return (
    <div className="faq-list">
      {shown.map((f) => {
        const isOpen = open.has(f.id);
        return (
          <div key={f.id} className={`faq-item ${isOpen ? 'open' : ''}`}>
            <button
              className="faq-q"
              aria-expanded={isOpen}
              onClick={() =>
                setOpen((s) => {
                  const n = new Set(s);
                  if (n.has(f.id)) n.delete(f.id);
                  else n.add(f.id);
                  return n;
                })
              }
              {...ez(`${prefix}${f.id}`, pick(f.q, lang), { state: isOpen ? 'open' : 'closed' })}
              data-testid="faq-question"
            >
              <CircleHelp size={18} />
              <span>{pick(f.q, lang)}</span>
              <ChevronDown size={18} className="faq-chev" />
            </button>
            {isOpen && (
              <div className="faq-a" data-testid="faq-answer">
                {pick(f.a, lang)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function InstitutionPage() {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const { institutionId } = useParams();
  const inst = institutionById(institutionId);
  const [modeOpen, setModeOpen] = useState(false);
  const [faqQuery, setFaqQuery] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  if (!inst) {
    return (
      <PageFrame>
        <div className="container">
          <PageHead subtitle={t('list.subtitle')} back="/taasisi" />
          <div className="empty-box">{t('inst.notFound')}</div>
        </div>
      </PageFrame>
    );
  }
  const sector = sectorById(inst.sector);

  return (
    <PageFrame>
      <div className="container">
        <PageHead subtitle={t('list.subtitle')} back={sector ? `/sekta/${sector.id}` : '/taasisi'} />

        <div className="inst-top">
          <section className="inst-header card">
            <InstitutionLogo inst={inst} size={104} />
            <div className="inst-header-text">
              <h1 data-testid="institution-title">{inst.short}</h1>
              <p className="inst-full">{inst.full.toUpperCase()}</p>
              <p className="inst-hashtag">{t('inst.hashtag')}</p>
              <div className="inst-contacts">
                <button className="contact-btn" onClick={() => setShowPhone((v) => !v)} aria-label={t('inst.phone')} {...ez('institution.phone', t('inst.phone'), { state: showPhone ? 'shown' : 'hidden' })}>
                  <Phone size={18} />
                  {showPhone && <span data-testid="inst-phone">{inst.phone}</span>}
                </button>
                <button className="contact-btn" onClick={() => setShowEmail((v) => !v)} aria-label={t('inst.email')} {...ez('institution.email', t('inst.email'), { state: showEmail ? 'shown' : 'hidden' })}>
                  <Mail size={18} />
                  {showEmail && <span data-testid="inst-email">{inst.email}</span>}
                </button>
              </div>
              <div className="inst-submit-row">
                <button className="help-dot" onClick={() => navigate('/msaada/mwongozo')} aria-label={t('inst.help')} {...ez('institution.help', t('inst.help'))}>
                  ?
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setModeOpen(true)} {...ez('institution.submit', t('inst.submit'))}>
                  <Send size={15} /> {t('inst.submit')}
                </button>
              </div>
            </div>
          </section>
          <TanzaniaMap city={PIN[inst.id] ?? 'Dar es Salaam'} />
        </div>

        <section className="inst-services">
          <h3>{t('inst.services')}</h3>
          <div className="service-chips">
            {inst.services.map((s) => (
              <span key={s.id} className="service-chip">
                {pick(s.name, lang)}
              </span>
            ))}
          </div>
        </section>

        <section className="inst-section">
          <div className="inst-section-head">
            <Info size={22} />
            <div>
              <h3>{t('inst.faqTitle')}</h3>
              <p>{t('inst.faqSub')}</p>
            </div>
            <label className="pill-search faq-search">
              <span className="pill-icon">
                <Search size={18} />
              </span>
              <input
                value={faqQuery}
                onChange={(e) => setFaqQuery(e.target.value)}
                placeholder={t('inst.faqSearch')}
                aria-label={t('inst.faqSearch')}
                {...ez('institution.faq-search', t('inst.faqSearch'))}
              />
            </label>
          </div>
          <FaqList faqs={inst.faqs} prefix="institution.faq." query={faqQuery} />
        </section>

        <section className="inst-section">
          <div className="inst-section-head">
            <Info size={22} />
            <div>
              <h3>{t('inst.docsTitle')}</h3>
              <p>{t('inst.docsSub')}</p>
            </div>
          </div>
          <div className="empty-box">
            <Info size={44} strokeWidth={1.5} />
            {t('inst.noDocs')}
          </div>
        </section>

        <section className="inst-section">
          <div className="inst-section-head">
            <Info size={22} />
            <div>
              <h3>{t('inst.videoTitle')}</h3>
              <p>{t('inst.videoSub')}</p>
            </div>
          </div>
          <div className="video-card">
            <PlayCircle size={54} strokeWidth={1.4} />
            <span>{t('inst.videoPlaceholder')}</span>
          </div>
        </section>
      </div>
      {modeOpen && <ModeModal institutionId={inst.id} onClose={() => setModeOpen(false)} />}
    </PageFrame>
  );
}
