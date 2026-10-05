import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { COAT, PageFrame } from '../components/Layout';
import { ez } from '../components/esiriProps';
import { useT, type I18nKey } from '../i18n';
import { isEmail, normalizePhone, useApp } from '../store/appStore';
import { REGIONS } from '../store/data';
import './Auth.css';

/** Only same-site paths are accepted as a redirect target. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export function Login() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const login = useApp((s) => s.login);
  const toast = useApp((s) => s.toast);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<I18nKey | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('login.required');
      return;
    }
    if (!login(identifier, password)) {
      setError('login.error');
      return;
    }
    setError(null);
    const acc = useApp.getState().accounts.find((a) => a.username === useApp.getState().currentUser);
    toast(t('login.welcome', { name: acc?.fullName ?? '' }));
    navigate(next, { replace: true });
  };

  return (
    <PageFrame>
      <div className="container auth-wrap">
        <form className="auth-card card" onSubmit={onSubmit} noValidate data-testid="login-form">
          <img src={COAT} alt="" className="auth-coat" />
          <h1>{t('login.title')}</h1>
          <p className="auth-sub">{t('login.subtitle')}</p>
          {error && (
            <div className="auth-error" role="alert" data-testid="login-error">
              <AlertCircle size={18} /> {t(error)}
            </div>
          )}
          <label className="field">
            <span className="field-label">{t('login.identifier')}</span>
            <input
              className="input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              {...ez('login.identifier', t('login.identifier'))}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('login.password')}</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              {...ez('login.password', t('login.password'))}
            />
          </label>
          <button type="button" className="link-btn auth-forgot" onClick={() => toast(t('toast.notAvailable'))} {...ez('login.forgot', t('login.forgot'))}>
            {t('login.forgot')}
          </button>
          <button type="submit" className="btn btn-primary auth-submit" {...ez('login.submit', t('login.submit'))}>
            <LogIn size={17} /> {t('login.submit')}
          </button>
          <p className="auth-switch">
            {t('login.noAccount')}{' '}
            <button type="button" className="link-btn" onClick={() => navigate(`/jisajili${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`)} {...ez('login.to-register', t('login.toRegister'))}>
              {t('login.toRegister')}
            </button>
          </p>
        </form>
      </div>
    </PageFrame>
  );
}

export function Register() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const register = useApp((s) => s.register);
  const toast = useApp((s) => s.toast);
  const [f, setF] = useState({ fullName: '', phone: '', email: '', region: '', password: '', confirm: '', terms: false });
  const [errors, setErrors] = useState<Record<string, I18nKey>>({});
  const [exists, setExists] = useState(false);

  const set = (k: keyof typeof f, v: string | boolean) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => {
      const n = { ...e };
      delete n[k];
      return n;
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, I18nKey> = {};
    if (!f.fullName.trim()) er.fullName = 'err.required';
    if (!f.phone.trim()) er.phone = 'err.required';
    else if (!normalizePhone(f.phone)) er.phone = 'err.invalid_phone';
    if (f.email.trim() && !isEmail(f.email)) er.email = 'err.invalid_email';
    if (!f.region) er.region = 'err.required';
    if (!f.password) er.password = 'err.required';
    else if (f.password.length < 8) er.password = 'err.password_short';
    if (!f.confirm) er.confirm = 'err.required';
    else if (f.confirm !== f.password) er.confirm = 'err.password_mismatch';
    if (!f.terms) er.terms = 'err.terms';
    setErrors(er);
    if (Object.keys(er).length) return;
    const res = register({ fullName: f.fullName, phone: f.phone, email: f.email, region: f.region, password: f.password });
    if (res === 'exists') {
      setExists(true);
      return;
    }
    toast(t('register.success', { name: f.fullName.trim() }));
    navigate(next, { replace: true });
  };

  const err = (k: string) =>
    errors[k] ? (
      <span className="field-error" data-testid="field-error">
        {t(errors[k])}
      </span>
    ) : null;

  return (
    <PageFrame>
      <div className="container auth-wrap">
        <form className="auth-card auth-card-wide card" onSubmit={onSubmit} noValidate data-testid="register-form">
          <img src={COAT} alt="" className="auth-coat" />
          <h1>{t('register.title')}</h1>
          <p className="auth-sub">{t('register.subtitle')}</p>
          {exists && (
            <div className="auth-error" role="alert" data-testid="register-error">
              <AlertCircle size={18} /> {t('register.exists')}
            </div>
          )}
          <div className="auth-grid">
            <label className="field">
              <span className="field-label">
                {t('register.fullName')}
                <span className="req">*</span>
              </span>
              <input className={`input ${errors.fullName ? 'invalid' : ''}`} value={f.fullName} onChange={(e) => set('fullName', e.target.value)} {...ez('register.full-name', t('register.fullName'))} />
              {err('fullName')}
            </label>
            <label className="field">
              <span className="field-label">
                {t('register.phone')}
                <span className="req">*</span>
              </span>
              <input className={`input ${errors.phone ? 'invalid' : ''}`} type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0712 345 678" {...ez('register.phone', t('register.phone'))} />
              {err('phone')}
            </label>
            <label className="field">
              <span className="field-label">
                {t('register.email')} <span className="opt">{t('wizard.optional')}</span>
              </span>
              <input className={`input ${errors.email ? 'invalid' : ''}`} type="email" value={f.email} onChange={(e) => set('email', e.target.value)} {...ez('register.email', t('register.email'))} />
              {err('email')}
            </label>
            <label className="field">
              <span className="field-label">
                {t('register.region')}
                <span className="req">*</span>
              </span>
              <select className={`select ${errors.region ? 'invalid' : ''}`} value={f.region} onChange={(e) => set('region', e.target.value)} {...ez('register.region', t('register.region'))}>
                <option value="">{t('wizard.choose')}</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {err('region')}
            </label>
            <label className="field">
              <span className="field-label">
                {t('register.password')}
                <span className="req">*</span>
              </span>
              <input className={`input ${errors.password ? 'invalid' : ''}`} type="password" value={f.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" {...ez('register.password', t('register.password'))} />
              {errors.password ? err('password') : <span className="field-hint">{t('register.passwordHint')}</span>}
            </label>
            <label className="field">
              <span className="field-label">
                {t('register.passwordConfirm')}
                <span className="req">*</span>
              </span>
              <input className={`input ${errors.confirm ? 'invalid' : ''}`} type="password" value={f.confirm} onChange={(e) => set('confirm', e.target.value)} autoComplete="new-password" {...ez('register.password-confirm', t('register.passwordConfirm'))} />
              {err('confirm')}
            </label>
          </div>
          <label className="check-row">
            <input type="checkbox" checked={f.terms} onChange={(e) => set('terms', e.target.checked)} {...ez('register.terms', t('register.terms'), { state: f.terms ? 'on' : 'off' })} />
            <span>
              {t('register.terms')}
              <span className="req">*</span>
            </span>
          </label>
          {err('terms')}
          <button type="submit" className="btn btn-primary auth-submit" {...ez('register.submit', t('register.submit'), { sensitive: true })}>
            <UserPlus size={17} /> {t('register.submit')}
          </button>
          <p className="auth-switch">
            {t('register.haveAccount')}{' '}
            <button type="button" className="link-btn" onClick={() => navigate('/ingia')} {...ez('register.to-login', t('register.toLogin'))}>
              {t('register.toLogin')}
            </button>
          </p>
        </form>
      </div>
    </PageFrame>
  );
}
