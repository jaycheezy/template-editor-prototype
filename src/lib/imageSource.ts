import type {
  CustomImageSource,
  ImageElement,
  ImageSource,
  ImageSourceKind,
  StaticImageSource,
  TeamAssetKind,
  TeamImageSource,
  TeamSide,
} from '../types';

/**
 * Fixture used to preview dynamic images in the editor. In production this
 * comes from the sample event picked in the preview; the prototype hard-codes
 * one match.
 */
export const PREVIEW_MATCH: Record<
  TeamSide,
  { name: string; primary: string; accent: string; number: string; competitorId: string }
> = {
  home: { name: 'Home Team', primary: '#1b3a8f', accent: '#3a6fd8', number: '10', competitorId: '2672' },
  away: { name: 'Away Team', primary: '#9c1420', accent: '#d83a44', number: '7', competitorId: '2673' },
};

export interface ImageToken {
  name: string;
  description: string;
  value: string;
}

/** Variables offered in the "{" dropdown for custom image URLs (home / away event data). */
export const IMAGE_TOKENS: ImageToken[] = [
  {
    name: 'TEAM_HOME_COMPETITOR_ID',
    description: 'Sportradar competitor ID of the home team',
    value: PREVIEW_MATCH.home.competitorId,
  },
  {
    name: 'TEAM_AWAY_COMPETITOR_ID',
    description: 'Sportradar competitor ID of the away team',
    value: PREVIEW_MATCH.away.competitorId,
  },
  {
    name: 'HOME_COMPETITOR_ID',
    description: 'Competitor ID of the home team (event source)',
    value: PREVIEW_MATCH.home.competitorId,
  },
  {
    name: 'AWAY_COMPETITOR_ID',
    description: 'Competitor ID of the away team (event source)',
    value: PREVIEW_MATCH.away.competitorId,
  },
];

export const DEFAULT_CUSTOM_URL = (team: TeamSide) =>
  `https://cdn.fresh8.co/assets/operator-jerseys/sportradar/{TEAM_${team.toUpperCase()}_COMPETITOR_ID}.png`;

/** Replace known {TOKENS} with preview values; unknown tokens are reported as unresolved. */
export function resolveTemplate(template: string): { url: string; unresolved: string[] } {
  const unresolved: string[] = [];
  const url = template.replace(/\{([^{}]+)\}/g, (match, raw: string) => {
    const name = raw.trim();
    const token = IMAGE_TOKENS.find((t) => t.name === name);
    if (!token) {
      unresolved.push(name);
      return match;
    }
    return token.value;
  });
  if (/[{}]/.test(url) && unresolved.length === 0) unresolved.push('?');
  return { url, unresolved };
}

/** Which team a template points at, judged from its tokens (null when ambiguous / none). */
export function inferTeamFromTemplate(template: string): TeamSide | null {
  const home = /\{(TEAM_)?HOME_/.test(template);
  const away = /\{(TEAM_)?AWAY_/.test(template);
  if (home && !away) return 'home';
  if (away && !home) return 'away';
  return null;
}

/** Best guess of the team an element is about, from its layer name (HOME_JERSEY, AWAY_CUSTOM …). */
export function inferTeamFromName(name: string): TeamSide {
  return /away/i.test(name) ? 'away' : 'home';
}

export function jerseySvg(primary: string, accent: string, number: string): string {
  const gid = `jg-${number}-${primary.replace('#', '')}`;
  return `<svg viewBox="0 0 100 112" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${accent}"/>
        <stop offset="1" stop-color="${primary}"/>
      </linearGradient>
    </defs>
    <path d="M34 6 L44 2 Q50 9 56 2 L66 6 L94 22 L82 44 L74 39 L74 106 Q50 112 26 106 L26 39 L18 44 L6 22 Z"
      fill="url(#${gid})" stroke="rgba(0,0,0,0.25)" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M44 3 Q50 12 56 3 L52 14 Q50 16 48 14 Z" fill="rgba(255,255,255,0.85)"/>
    <text x="50" y="74" text-anchor="middle" font-family="'Source Sans 3',sans-serif" font-weight="900"
      font-size="34" fill="rgba(255,255,255,0.92)">${number}</text>
  </svg>`;
}

export function badgeSvg(primary: string, accent: string, letter: string): string {
  return `<svg viewBox="0 0 100 112" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <path d="M50 4 L92 18 V54 C92 80 74 98 50 108 C26 98 8 80 8 54 V18 Z"
      fill="${primary}" stroke="${accent}" stroke-width="5" stroke-linejoin="round"/>
    <text x="50" y="68" text-anchor="middle" font-family="'Source Sans 3',sans-serif" font-weight="900"
      font-size="44" fill="rgba(255,255,255,0.92)">${letter}</text>
  </svg>`;
}

export function teamAssetSvg(team: TeamSide, asset: TeamAssetKind): string {
  const t = PREVIEW_MATCH[team];
  return asset === 'jersey'
    ? jerseySvg(t.primary, t.accent, t.number)
    : badgeSvg(t.primary, t.accent, team === 'home' ? 'H' : 'A');
}

export const PLACEHOLDER_IMAGE_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100" height="100" rx="6" fill="#d6e2f7"/>
  <path d="M20 70 L42 46 L58 62 L70 50 L84 70 Z" fill="#7095E2"/>
  <circle cx="68" cy="32" r="8" fill="#7095E2"/>
</svg>`;

export const EMPTY_SLOT_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">
  <rect x="1.5" y="1.5" width="97" height="97" rx="6" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.55)"
    stroke-width="1.5" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>
</svg>`;

export const DEFAULT_STATIC: StaticImageSource = { kind: 'static', url: '' };

export function defaultTeam(name: string): TeamImageSource {
  return { kind: 'team', team: inferTeamFromName(name), asset: 'jersey' };
}

export function defaultCustom(name: string): CustomImageSource {
  const team = inferTeamFromName(name);
  return {
    kind: 'custom',
    urlTemplate: DEFAULT_CUSTOM_URL(team),
    fallback: 'jersey',
    fallbackTeam: team,
    fallbackUrl: '',
  };
}

/** Source to use when the user switches an element to `kind`, restoring its last draft if any. */
export function sourceForKind(el: ImageElement, kind: ImageSourceKind): ImageSource {
  if (kind === 'unset') return { kind: 'unset' };
  const draft = el.sourceDrafts ? el.sourceDrafts[kind] : undefined;
  if (draft) return draft;
  if (kind === 'static') return DEFAULT_STATIC;
  if (kind === 'team') return defaultTeam(el.name);
  return defaultCustom(el.name);
}

export const SOURCE_LABELS: Record<Exclude<ImageSourceKind, 'unset'>, string> = {
  static: 'Static image',
  team: 'Team asset',
  custom: 'Custom URL',
};
