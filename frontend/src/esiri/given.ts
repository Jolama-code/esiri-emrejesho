/**
 * Deterministic check of what the user already said (used to reject unnecessary ask_user questions).
 * Only facts that can be recognised reliably are detected: regions, districts, submission mode, phone number.
 */
import { DISTRICTS, REGIONS } from '../store/data';

export type Given = Partial<Record<'region' | 'district' | 'mode' | 'phone', string>>;

const norm = (s: string) => ` ${s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9+]+/g, ' ')} `;

const MODE_PATTERNS: [string, RegExp][] = [
  ['anonymous', /\b(bila kujulikana|bila jina|anonymous(ly)?)\b/],
  ['civil-servant', /\b(mtumishi wa umma|watumishi wa umma|mstaafu|wastaafu|public servant|civil servant|retiree)\b/],
  ['account', /\b(akaunti yangu|my account|through my account)\b/],
  ['personal', /\b(kwa jina langu|in my name|taarifa (zangu )?binafsi|my name is|jina langu ni)\b/],
];

export function extractGiven(text: string): Given {
  const s = norm(text);
  const out: Given = {};
  const region = [...REGIONS].sort((a, b) => b.length - a.length).find((r) => s.includes(norm(r)));
  if (region) out.region = region;
  for (const list of Object.values(DISTRICTS)) {
    const d = list.find((x) => s.includes(norm(x)));
    if (d) {
      out.district = d;
      break;
    }
  }
  for (const [mode, re] of MODE_PATTERNS) {
    if (re.test(s)) {
      out.mode = mode;
      break;
    }
  }
  const phone = /(?<!\d)(?:\+?255|0)[67]\d{8}(?!\d)/.exec(text.replace(/[\s-]/g, ''));
  if (phone) out.phone = phone[0];
  return out;
}
