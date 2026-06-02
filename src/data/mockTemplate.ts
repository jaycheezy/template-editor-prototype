import type {
  AdElement,
  AnimationModel,
  Clip,
  DataSource,
  Group,
  Track,
} from '../types';
import { buildEffectClip } from '../lib/clips';
import { getEffect } from '../lib/effects';

export const CANVAS = { width: 300, height: 250 };

function jersey(primary: string, accent: string, number: string): string {
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

function oddsBoxSvg(width: number, height: number, radius: number, fill: string): string {
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${fill}"/>
  </svg>`;
}

const ODDS_BOX = { width: 84, height: 26, radius: 3, fill: '#e10600' };

const BG_SVG = `<svg viewBox="0 0 300 250" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6a121c"/>
      <stop offset="0.55" stop-color="#4a0c14"/>
      <stop offset="1" stop-color="#2c060b"/>
    </linearGradient>
    <radialGradient id="vig" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0" stop-color="rgba(255,255,255,0.08)"/>
      <stop offset="1" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
  </defs>
  <rect width="300" height="250" fill="url(#bg)"/>
  <rect width="300" height="250" fill="url(#vig)"/>
  <rect width="300" height="46" fill="#1c0407"/>
  <line x1="0" y1="46" x2="300" y2="46" stroke="#e10600" stroke-width="2"/>
  <text x="150" y="24" text-anchor="middle" font-family="'Source Sans 3',sans-serif"
    font-weight="900" font-size="20" letter-spacing="1" fill="#ffffff">YOUR <tspan fill="#e10600">B</tspan>RAND</text>
  <text x="150" y="37" text-anchor="middle" font-family="'Source Sans 3',sans-serif"
    font-weight="700" font-size="8" letter-spacing="3" fill="#e6b8bd">BETTING &amp; CASINO</text>
  <text x="150" y="150" text-anchor="middle" font-family="'Source Sans 3',sans-serif"
    font-weight="900" font-size="16" fill="rgba(255,255,255,0.9)">VS</text>
</svg>`;

export const mockElements: AdElement[] = [
  {
    id: 'el.bg',
    name: '300X250_soccer_FTR',
    type: 'SVG',
    position: { x: 0, y: 0, z: 0 },
    size: { width: 300, height: 250 },
    rotation: 0,
    parentId: null,
    locked: true,
    svg: BG_SVG,
  },
  // Header group
  {
    id: 'el.competition',
    name: 'COMPETITION_NAME',
    type: 'TEXT',
    position: { x: 110, y: 52, z: 10 },
    size: { width: 80, height: 15 },
    rotation: 0,
    parentId: 'group.header',
    content: 'LA LIGA',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 900,
    lineHeight: 1,
    align: 'center',
    textCase: 'upper',
    fontFamily: 'Source Sans 3',
    boxColor: '#3367D6',
    boxRadius: 3,
    letterSpacing: 0.5,
  },
  {
    id: 'el.day',
    name: 'DAY',
    type: 'TEXT',
    position: { x: 75, y: 70, z: 10 },
    size: { width: 150, height: 12 },
    rotation: 0,
    parentId: 'group.header',
    content: 'Sat, May 30 - 21:16',
    color: '#e8c9cf',
    fontSize: 9,
    fontWeight: 600,
    lineHeight: 1,
    align: 'center',
    textCase: 'none',
    fontFamily: 'Source Sans 3',
  },
  {
    id: 'el.venue',
    name: 'VENUE',
    type: 'TEXT',
    position: { x: 100, y: 82, z: 10 },
    size: { width: 100, height: 12 },
    rotation: 0,
    parentId: 'group.header',
    content: 'WWK Arena',
    color: '#e8c9cf',
    fontSize: 9,
    fontWeight: 600,
    lineHeight: 1,
    align: 'center',
    textCase: 'none',
    fontFamily: 'Source Sans 3',
  },
  // Home group
  {
    id: 'el.home_jersey',
    name: 'HOME_JERSEY',
    type: 'IMAGE',
    position: { x: 44, y: 100, z: 10 },
    size: { width: 66, height: 76 },
    rotation: 0,
    parentId: 'group.home',
    svg: jersey('#1b3a8f', '#3a6fd8', '10'),
  },
  {
    id: 'el.home_name',
    name: 'HOME_NAME',
    type: 'TEXT',
    position: { x: 14, y: 192, z: 10 },
    size: { width: 92, height: 12 },
    rotation: 0,
    parentId: 'group.home',
    content: 'HOME TEAM',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1,
    align: 'center',
    textCase: 'upper',
    fontFamily: 'Source Sans 3',
    letterSpacing: 0.3,
  },
  {
    id: 'el.home_odds_box',
    name: 'HOME_ODDS_BOX',
    type: 'VECTOR',
    position: { x: 18, y: 207, z: 9 },
    size: { width: ODDS_BOX.width, height: ODDS_BOX.height },
    rotation: 0,
    parentId: 'group.home',
    svg: oddsBoxSvg(ODDS_BOX.width, ODDS_BOX.height, ODDS_BOX.radius, ODDS_BOX.fill),
    fill: ODDS_BOX.fill,
  },
  {
    id: 'el.home_odds',
    name: 'HOME_ODDS-FTR',
    type: 'TEXT',
    position: { x: 18, y: 207, z: 10 },
    size: { width: 84, height: 26 },
    rotation: 0,
    parentId: 'group.home',
    content: '7.00',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1,
    align: 'center',
    textCase: 'none',
    fontFamily: 'Source Sans 3',
  },
  // Draw group
  {
    id: 'el.draw',
    name: 'DRAW',
    type: 'TEXT',
    position: { x: 104, y: 192, z: 10 },
    size: { width: 92, height: 12 },
    rotation: 0,
    parentId: 'group.draw',
    content: 'DRAW',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1,
    align: 'center',
    textCase: 'upper',
    fontFamily: 'Source Sans 3',
    letterSpacing: 0.3,
  },
  {
    id: 'el.draw_odds_box',
    name: 'DRAW_ODDS_BOX',
    type: 'VECTOR',
    position: { x: 108, y: 207, z: 9 },
    size: { width: ODDS_BOX.width, height: ODDS_BOX.height },
    rotation: 0,
    parentId: 'group.draw',
    svg: oddsBoxSvg(ODDS_BOX.width, ODDS_BOX.height, ODDS_BOX.radius, ODDS_BOX.fill),
    fill: ODDS_BOX.fill,
  },
  {
    id: 'el.draw_odds',
    name: 'DRAW_ODDS-FTR',
    type: 'TEXT',
    position: { x: 108, y: 207, z: 10 },
    size: { width: 84, height: 26 },
    rotation: 0,
    parentId: 'group.draw',
    content: '21.00',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1,
    align: 'center',
    textCase: 'none',
    fontFamily: 'Source Sans 3',
  },
  // Away group
  {
    id: 'el.away_jersey',
    name: 'AWAY_JERSEY',
    type: 'IMAGE',
    position: { x: 190, y: 100, z: 10 },
    size: { width: 66, height: 76 },
    rotation: 0,
    parentId: 'group.away',
    svg: jersey('#9c1420', '#d83a44', '7'),
  },
  {
    id: 'el.away_name',
    name: 'AWAY_NAME',
    type: 'TEXT',
    position: { x: 194, y: 192, z: 10 },
    size: { width: 92, height: 12 },
    rotation: 0,
    parentId: 'group.away',
    content: 'AWAY TEAM',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1,
    align: 'center',
    textCase: 'upper',
    fontFamily: 'Source Sans 3',
    letterSpacing: 0.3,
  },
  {
    id: 'el.away_odds_box',
    name: 'AWAY_ODDS_BOX',
    type: 'VECTOR',
    position: { x: 198, y: 207, z: 9 },
    size: { width: ODDS_BOX.width, height: ODDS_BOX.height },
    rotation: 0,
    parentId: 'group.away',
    svg: oddsBoxSvg(ODDS_BOX.width, ODDS_BOX.height, ODDS_BOX.radius, ODDS_BOX.fill),
    fill: ODDS_BOX.fill,
  },
  {
    id: 'el.away_odds',
    name: 'AWAY_ODDS-FTR',
    type: 'TEXT',
    position: { x: 198, y: 207, z: 10 },
    size: { width: 84, height: 26 },
    rotation: 0,
    parentId: 'group.away',
    content: '2.67',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1,
    align: 'center',
    textCase: 'none',
    fontFamily: 'Source Sans 3',
  },
];

function group(id: string, name: string, children: string[]): Group {
  return {
    id,
    name,
    parentId: null,
    children,
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 },
  };
}

export const mockGroups: Record<string, Group> = {
  'group.header': group('group.header', 'Header', ['el.competition', 'el.day', 'el.venue']),
  'group.home': group('group.home', 'Home', ['el.home_odds', 'el.home_name', 'el.home_jersey', 'el.home_odds_box']),
  'group.draw': group('group.draw', 'Draw', ['el.draw', 'el.draw_odds', 'el.draw_odds_box']),
  'group.away': group('group.away', 'Away', ['el.away_odds', 'el.away_name', 'el.away_jersey', 'el.away_odds_box']),
};

export const mockDataSources: DataSource[] = [
  { id: 'ds.ftr', name: 'Full Time Result', market: 'market' },
  { id: 'ds.event', name: 'Event', market: 'fixture' },
];

/** Build the initial animation model with a few seeded effects. */
export function buildInitialAnimation(): AnimationModel {
  const tracks: Record<string, Track> = {};
  const clips: Record<string, Clip> = {};

  const seed = (targetId: string, effectId: string, startTime: number) => {
    const effect = getEffect(effectId);
    if (!effect) return;
    // groups animate from their own (zeroed) transform base
    const base = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 };
    const { clip, tracks: builtTracks } = buildEffectClip(targetId, base, effect, startTime);
    clips[clip.id] = clip;
    builtTracks.forEach((t) => {
      tracks[t.id] = t;
    });
  };

  seed('group.header', 'fade-in', 0);
  seed('group.home', 'slide-in-left', 150);
  seed('group.away', 'pop-in', 150);
  seed('group.draw', 'fade-in', 400);

  return { durationMs: 5000, fps: 30, tracks, clips };
}
