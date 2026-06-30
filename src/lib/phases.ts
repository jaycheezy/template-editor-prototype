/**
 * Feature phases from the ARENA "Template Editor & Animation Timeline" spec.
 * Each phase is a togglable bundle so the prototype can preview the product at
 * different stages of the roadmap. 3b/3c depend on 3a (they need the timeline).
 */
export type PhaseId = 'p1' | 'p2' | 'p3a' | 'p3at' | 'p3b' | 'p3c';

export interface PhaseMeta {
  id: PhaseId;
  label: string;
  short: string;
  description: string;
  /** other phases that must be on for this one to do anything */
  requires: PhaseId[];
}

export const PHASES: PhaseMeta[] = [
  {
    id: 'p1',
    label: 'Phase 1 · Canvas editing',
    short: 'Canvas editing',
    description:
      'Move, resize, add, rename, recolor, lock/hide and reorder elements directly on the canvas.',
    requires: [],
  },
  {
    id: 'p2',
    label: 'Phase 2 · Grouping',
    short: 'Grouping',
    description:
      'Create / ungroup, rename, nested layer tree, enter-group editing and group transforms.',
    requires: [],
  },
  {
    id: 'p3a',
    label: 'Phase 3a.1 · Preset animations',
    short: 'Preset animations',
    description:
      'Apply IN / OUT presets to layers and groups and preview them playing in the rendered canvas (no track editor).',
    requires: [],
  },
  {
    id: 'p3at',
    label: 'Phase 3a.2 · Timeline',
    short: 'Timeline',
    description: 'Per-layer track editor: ruler, draggable clips, retiming and scrubbing.',
    requires: ['p3a'],
  },
  {
    id: 'p3b',
    label: 'Phase 3b · Extended effects',
    short: 'Extended effects',
    description: 'DURING effects, more IN/OUT presets, effect parameters and duplication.',
    requires: ['p3a'],
  },
  {
    id: 'p3c',
    label: 'Phase 3c · Custom keyframes',
    short: 'Custom keyframes',
    description: 'Custom keyframe authoring, convert-to-custom, timeline zoom and snapping.',
    requires: ['p3at'],
  },
];

export const PHASE_BY_ID: Record<PhaseId, PhaseMeta> = PHASES.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<PhaseId, PhaseMeta>,
);
