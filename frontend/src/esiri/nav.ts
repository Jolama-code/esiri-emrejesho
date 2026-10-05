import type { NavigateFunction } from 'react-router-dom';

let navigateFn: NavigateFunction | null = null;

export function setNavigator(fn: NavigateFunction): void {
  navigateFn = fn;
}

export function goTo(path: string): void {
  if (navigateFn) navigateFn(path);
  else window.history.pushState({}, '', path);
}

export type PageName =
  | 'landing'
  | 'institutions'
  | 'institution'
  | 'wizard'
  | 'success'
  | 'track'
  | 'my_feedback'
  | 'login'
  | 'register'
  | 'help_guide'
  | 'help_faq'
  | 'help_video'
  | 'audit';

export const PAGES: PageName[] = [
  'landing', 'institutions', 'institution', 'wizard', 'success', 'track', 'my_feedback',
  'login', 'register', 'help_guide', 'help_faq', 'help_video', 'audit',
];

export function pageFromPath(pathname: string): PageName {
  if (/^\/sekta\/[^/]+\/?$/.test(pathname) || /^\/taasisi\/?$/.test(pathname)) return 'institutions';
  if (/^\/taasisi\/[^/]+\/?$/.test(pathname)) return 'institution';
  if (/^\/wasilisha\/[^/]+\/?$/.test(pathname)) return 'wizard';
  if (pathname.startsWith('/imepokelewa')) return 'success';
  if (pathname.startsWith('/fuatilia')) return 'track';
  if (pathname.startsWith('/mrejesho-wangu')) return 'my_feedback';
  if (pathname.startsWith('/ingia')) return 'login';
  if (pathname.startsWith('/jisajili')) return 'register';
  if (pathname.startsWith('/msaada/mwongozo')) return 'help_guide';
  if (pathname.startsWith('/msaada/maswali')) return 'help_faq';
  if (pathname.startsWith('/msaada/video')) return 'help_video';
  if (pathname.startsWith('/ukaguzi')) return 'audit';
  return 'landing';
}

/** The data id embedded in the path (institution id, sector id or reference). */
export function idFromPath(pathname: string): string | undefined {
  const m = /^\/(?:taasisi|sekta|wasilisha|imepokelewa)\/([^/]+)/.exec(pathname);
  return m ? decodeURIComponent(m[1]) : undefined;
}
