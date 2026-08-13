/**
 * Feature flags aligned to the Template Editor epics (ADSCM-1371 / 1380 /
 * 1386 / 1392 / 1401). Each flag is a togglable bundle so the prototype can
 * preview the product at different stages. Later ARENA phases (3b / 3c) sit
 * in a collapsed group and are not part of the PO showcase.
 */
export type PhaseId =
  | 'layout'
  | 'author'
  | 'presets'
  | 'groups'
  | 'timeline'
  | 'extended'
  | 'keyframes';

export type PhaseGroup = 'epic' | 'later';

export interface PhaseMeta {
  id: PhaseId;
  label: string;
  short: string;
  description: string;
  epic?: string;
  group: PhaseGroup;
  /** other phases that must be on for this one to do anything */
  requires: PhaseId[];
}

/** Dependency order — prerequisites first so resolveEffective can cascade. */
export const PHASES: PhaseMeta[] = [
  {
    id: 'layout',
    label: 'Fix existing layout',
    short: 'Layout',
    description: 'Move, lock/hide, reorder, multi-select, and zoom/pan to work with off-canvas layers.',
    epic: 'ADSCM-1380',
    group: 'epic',
    requires: [],
  },
  {
    id: 'author',
    label: 'Add & restyle elements',
    short: 'Author',
    description: 'Add, rename, resize, and recolor text, image, and vector layers.',
    epic: 'ADSCM-1386',
    group: 'epic',
    requires: [],
  },
  {
    id: 'presets',
    label: 'Apply & play animations',
    short: 'Animations',
    description: 'Apply IN / OUT presets to layers and groups and preview them playing (no track editor).',
    epic: 'ADSCM-1371',
    group: 'epic',
    requires: [],
  },
  {
    id: 'groups',
    label: 'Groups',
    short: 'Groups',
    description: 'Create / ungroup / rename, nested groups, enter-group editing, group drag-reorder, and group transforms.',
    epic: 'ADSCM-1392',
    group: 'epic',
    requires: [],
  },
  {
    id: 'timeline',
    label: 'Timeline',
    short: 'Timeline',
    description: 'Per-layer track editor: ruler, draggable clips, retiming and scrubbing.',
    epic: 'ADSCM-1401',
    group: 'epic',
    requires: ['presets'],
  },
  {
    id: 'extended',
    label: 'Extended effects',
    short: 'Extended effects',
    description: 'DURING effects, more IN/OUT presets, effect parameters and duplication.',
    group: 'later',
    requires: ['presets'],
  },
  {
    id: 'keyframes',
    label: 'Custom keyframes',
    short: 'Custom keyframes',
    description: 'Custom keyframe authoring, convert-to-custom, timeline zoom and snapping.',
    group: 'later',
    requires: ['timeline'],
  },
];

export const PHASE_BY_ID: Record<PhaseId, PhaseMeta> = PHASES.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<PhaseId, PhaseMeta>,
);

/** PO-facing menu order, matching the Confluence one-pagers. */
export const EPIC_PHASE_IDS: PhaseId[] = ['presets', 'layout', 'author', 'groups', 'timeline'];

export const LATER_PHASE_IDS: PhaseId[] = ['extended', 'keyframes'];

export type FlagMap = Record<PhaseId, boolean>;

export const ALL_OFF: FlagMap = PHASES.reduce((acc, p) => {
  acc[p.id] = false;
  return acc;
}, {} as FlagMap);

/** Hosted prototype used in Confluence one-pager links. */
export const PROTOTYPE_ORIGIN = 'https://template-editor-prototype.netlify.app';

const EPIC_KEY_TO_PHASE: Record<string, PhaseId> = {
  '1371': 'presets',
  '1380': 'layout',
  '1484': 'layout',
  '1386': 'author',
  '1392': 'groups',
  '1401': 'timeline',
};

/** Resolve ADSCM-1371, 1371, or a phase id (presets, layout, …) to a PhaseId. */
export function resolveEpicPhase(raw: string): PhaseId | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if ((EPIC_PHASE_IDS as string[]).includes(lower)) return lower as PhaseId;
  const digits = trimmed.toUpperCase().replace(/^ADSCM-/, '');
  return EPIC_KEY_TO_PHASE[digits] ?? null;
}

/**
 * Flags for an epic plus every epic scheduled before it (EPIC_PHASE_IDS order).
 * Later (3b/3c) stays off.
 */
export function flagsUpToEpic(raw: string): FlagMap | null {
  const phase = resolveEpicPhase(raw);
  if (!phase) return null;
  const idx = EPIC_PHASE_IDS.indexOf(phase);
  if (idx < 0) return null;
  const flags: FlagMap = { ...ALL_OFF };
  EPIC_PHASE_IDS.slice(0, idx + 1).forEach((id) => {
    flags[id] = true;
  });
  return flags;
}

export function flagsFromSearch(search: string): FlagMap | null {
  const q = search.startsWith('?') ? search.slice(1) : search;
  const epic = new URLSearchParams(q).get('epic');
  if (!epic) return null;
  return flagsUpToEpic(epic);
}

export function prototypeUrlForEpic(epicKey: string, origin = PROTOTYPE_ORIGIN): string {
  const key = epicKey.toUpperCase().startsWith('ADSCM-') ? epicKey.toUpperCase() : `ADSCM-${epicKey}`;
  const url = new URL(origin.endsWith('/') ? origin : `${origin}/`);
  url.searchParams.set('epic', key);
  return url.toString();
}
