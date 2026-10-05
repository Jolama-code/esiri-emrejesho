import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, Send } from 'lucide-react';
import { InstitutionLogo, PageFrame, PageHead } from '../components/Layout';
import { ModeModal } from '../components/ModeModal';
import { ez } from '../components/esiriProps';
import { pick, useLang, useT } from '../i18n';
import { INSTITUTIONS, institutionsInSector, sectorById } from '../store/data';
import './Institutions.css';

const PER_PAGE = 12;

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** /sekta/:sectorId (one sector) and /taasisi (all institutions). */
export default function Institutions() {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const { sectorId } = useParams();
  const sector = sectorId ? sectorById(sectorId) : undefined;
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [modeFor, setModeFor] = useState<string | null>(null);

  useEffect(() => {
    setPage(0);
    setQuery('');
  }, [sectorId]);

  const base = sectorId ? (sector ? institutionsInSector(sector.id) : []) : INSTITUTIONS;
  const list = base.filter((i) => norm(`${i.short} ${i.full}`).includes(norm(query.trim())));
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = list.slice(cur * PER_PAGE, cur * PER_PAGE + PER_PAGE);

  return (
    <PageFrame>
      <div className="container">
        <PageHead subtitle={t('list.subtitle')} back="/">
          <label className="pill-search">
            <span className="pill-tag">{t('list.searchTag')}</span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={t('list.searchPlaceholder')}
              aria-label={t('list.searchPlaceholder')}
              {...ez('institutions.search', t('list.searchPlaceholder'))}
            />
          </label>
        </PageHead>

        <div className="list-title card">
          {sectorId ? (
            sector ? (
              <>
                {t('list.fromSector')} <b data-testid="list-sector">{pick(sector.name, lang).toUpperCase()}</b>
              </>
            ) : (
              t('list.sectorNotFound')
            )
          ) : (
            <b data-testid="list-sector">{t('list.all').toUpperCase()}</b>
          )}
        </div>

        {shown.length === 0 ? (
          <div className="empty-box">{t('list.empty')}</div>
        ) : (
          <div className="inst-grid">
            {shown.map((i) => (
              <article key={i.id} className="inst-card card" data-testid="institution-card" data-institution={i.id}>
                <button className="inst-card-head" onClick={() => navigate(`/taasisi/${i.id}`)} {...ez(`institution-card.${i.id}.open`, i.short)}>
                  <InstitutionLogo inst={i} size={50} />
                  <span className="inst-card-names">
                    <b>{i.short}</b>
                    <span>{i.full.toUpperCase()}</span>
                  </span>
                </button>
                <div className="inst-card-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => setModeFor(i.id)} {...ez(`institution-card.${i.id}.submit`, `${t('list.submit')} – ${i.short}`)}>
                    <Send size={15} /> {t('list.submit')}
                  </button>
                  <button className="btn btn-dark btn-sm" onClick={() => navigate('/fuatilia')} {...ez(`institution-card.${i.id}.track`, `${t('list.track')} – ${i.short}`)}>
                    <RefreshCw size={15} /> {t('list.track')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="pager card">
          <span>{t('list.itemsPerPage')}</span>
          <span>{t('list.range', { from: list.length ? cur * PER_PAGE + 1 : 0, to: Math.min(list.length, (cur + 1) * PER_PAGE), total: list.length })}</span>
          <button className="pager-btn" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label={t('list.prev')} {...ez('pagination.prev', t('list.prev'))}>
            <ChevronLeft size={18} />
          </button>
          <button className="pager-btn" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label={t('list.next')} {...ez('pagination.next', t('list.next'))}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      {modeFor && <ModeModal institutionId={modeFor} onClose={() => setModeFor(null)} />}
    </PageFrame>
  );
}
