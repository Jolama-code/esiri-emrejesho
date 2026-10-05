import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import Landing from './pages/Landing';
import Institutions from './pages/Institutions';
import InstitutionPage from './pages/InstitutionPage';
import Wizard from './pages/Wizard';
import Success from './pages/Success';
import Track from './pages/Track';
import MyFeedback from './pages/MyFeedback';
import { Login, Register } from './pages/Auth';
import { HelpFaq, HelpGuide, HelpVideo } from './pages/Help';
import Audit from './pages/Audit';
import { Toasts } from './components/Common';
import { EsiriRoot } from './esiri/ui/EsiriRoot';
import { setNavigator } from './esiri/nav';
import { useApp } from './store/appStore';
import { useEsiri } from './esiri/esiriStore';

function NavBridge() {
  const navigate = useNavigate();
  useEffect(() => setNavigator(navigate), [navigate]);
  return null;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

function RequireLogin({ children }: { children: ReactNode }) {
  const loggedIn = useApp((s) => s.currentUser !== null);
  const location = useLocation();
  return loggedIn ? <>{children}</> : <Navigate to={`/ingia?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
}

/** Remount per data id so local page state (search, pagination, FAQ accordion) resets. */
function Keyed({ param, children }: { param: string; children: ReactNode }) {
  const p = useParams();
  return <div key={p[param] ?? ''} style={{ display: 'contents' }}>{children}</div>;
}

function Shell() {
  const panelOpen = useEsiri((s) => s.panelOpen);
  return (
    <div className={`app-shell ${panelOpen ? 'panel-open' : ''}`}>
      <NavBridge />
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/taasisi" element={<Institutions />} />
        <Route path="/sekta/:sectorId" element={<Keyed param="sectorId"><Institutions /></Keyed>} />
        <Route path="/taasisi/:institutionId" element={<Keyed param="institutionId"><InstitutionPage /></Keyed>} />
        <Route path="/wasilisha/:institutionId" element={<Wizard />} />
        <Route path="/imepokelewa/:ref" element={<Success />} />
        <Route path="/fuatilia" element={<Track />} />
        <Route path="/mrejesho-wangu" element={<RequireLogin><MyFeedback /></RequireLogin>} />
        <Route path="/ingia" element={<Login />} />
        <Route path="/jisajili" element={<Register />} />
        <Route path="/msaada/mwongozo" element={<HelpGuide />} />
        <Route path="/msaada/maswali" element={<HelpFaq />} />
        <Route path="/msaada/video" element={<HelpVideo />} />
        <Route path="/ukaguzi" element={<Audit />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
      <EsiriRoot />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
