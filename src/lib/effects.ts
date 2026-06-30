import type { AnimatableProperty, ClipKind, EasingFunction } from '../types';
import type { ResolvedTransform } from './engine';

export interface EffectKeyframeSpec {
  /** position within the clip, 0..1 */
  at: number;
  /** absolute property value, computed from the element base transform */
  value: number;
}

export interface EffectTrackSpec {
  property: AnimatableProperty;
  keyframes: EffectKeyframeSpec[];
}

export interface EffectDef {
  id: string;
  label: string;
  kind: ClipKind;
  category: 'fade' | 'slide' | 'scale' | 'rotate';
  /** roadmap phase this preset belongs to (3a starter set vs 3b extended). */
  phase: 'p3a' | 'p3b';
  defaultDuration: number;
  defaultEasing: EasingFunction;
  build: (base: ResolvedTransform, intensity?: number) => EffectTrackSpec[];
}

const SLIDE = 60;

/** clamp helper for intensity-derived values */
const n = (v: number) => (Number.isFinite(v) ? v : 1);

type SlideDir = 'left' | 'right' | 'up' | 'down';

const SLIDE_AXIS: Record<SlideDir, AnimatableProperty> = {
  left: 'x',
  right: 'x',
  up: 'y',
  down: 'y',
};

/** sign of the offset relative to the base position for a given edge */
const SLIDE_SIGN: Record<SlideDir, number> = {
  left: -1,
  right: 1,
  up: -1,
  down: 1,
};

const DIR_LABEL: Record<SlideDir, string> = {
  left: 'Left',
  right: 'Right',
  up: 'Up',
  down: 'Down',
};

/** Slide In: element enters from the named edge toward its base position. */
function slideIn(dir: SlideDir): EffectDef {
  const axis = SLIDE_AXIS[dir];
  return {
    id: `slide-in-${dir}`,
    label: `Slide In ${DIR_LABEL[dir]}`,
    kind: 'IN',
    category: 'slide',
    phase: 'p3a',
    defaultDuration: 500,
    defaultEasing: 'easeOut',
    build: (b, i = 1) => [
      {
        property: axis,
        keyframes: [{ at: 0, value: b[axis] + SLIDE_SIGN[dir] * SLIDE * n(i) }, { at: 1, value: b[axis] }],
      },
    ],
  };
}

/** Slide Out: element exits from its base position toward the named edge. */
function slideOut(dir: SlideDir): EffectDef {
  const axis = SLIDE_AXIS[dir];
  return {
    id: `slide-out-${dir}`,
    label: `Slide Out ${DIR_LABEL[dir]}`,
    kind: 'OUT',
    category: 'slide',
    phase: 'p3a',
    defaultDuration: 500,
    defaultEasing: 'easeIn',
    build: (b, i = 1) => [
      {
        property: axis,
        keyframes: [{ at: 0, value: b[axis] }, { at: 1, value: b[axis] + SLIDE_SIGN[dir] * SLIDE * n(i) }],
      },
      { property: 'opacity', keyframes: [{ at: 0.4, value: 1 }, { at: 1, value: 0 }] },
    ],
  };
}

export const EFFECTS: EffectDef[] = [
  // ---- IN (3a starter set) ----
  {
    id: 'fade-in',
    label: 'Fade In',
    kind: 'IN',
    category: 'fade',
    phase: 'p3a',
    defaultDuration: 500,
    defaultEasing: 'easeOut',
    build: () => [{ property: 'opacity', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }] }],
  },
  slideIn('left'),
  slideIn('right'),
  slideIn('up'),
  slideIn('down'),
  {
    id: 'pop-in',
    label: 'Grow In',
    kind: 'IN',
    category: 'scale',
    phase: 'p3a',
    defaultDuration: 500,
    defaultEasing: 'easeOut',
    build: (_b, i = 1) => {
      const from = Math.max(0.05, 1 - 0.6 * n(i));
      return [
        { property: 'scaleX', keyframes: [{ at: 0, value: from }, { at: 1, value: 1 }] },
        { property: 'scaleY', keyframes: [{ at: 0, value: from }, { at: 1, value: 1 }] },
      ];
    },
  },
  {
    id: 'spin-in',
    label: 'Spin In',
    kind: 'IN',
    category: 'rotate',
    phase: 'p3b',
    defaultDuration: 700,
    defaultEasing: 'easeOut',
    build: (b, i = 1) => [
      { property: 'rotation', keyframes: [{ at: 0, value: b.rotation - 180 * n(i) }, { at: 1, value: b.rotation }] },
    ],
  },
  // ---- DURING (3b) ----
  {
    id: 'pulse',
    label: 'Pulse',
    kind: 'DURING',
    category: 'scale',
    phase: 'p3b',
    defaultDuration: 800,
    defaultEasing: 'easeInOut',
    build: (_b, i = 1) => {
      const peak = 1 + 0.12 * n(i);
      return [
        { property: 'scaleX', keyframes: [{ at: 0, value: 1 }, { at: 0.5, value: peak }, { at: 1, value: 1 }] },
        { property: 'scaleY', keyframes: [{ at: 0, value: 1 }, { at: 0.5, value: peak }, { at: 1, value: 1 }] },
      ];
    },
  },
  {
    id: 'float',
    label: 'Float',
    kind: 'DURING',
    category: 'slide',
    phase: 'p3b',
    defaultDuration: 1000,
    defaultEasing: 'easeInOut',
    build: (b, i = 1) => [
      { property: 'y', keyframes: [{ at: 0, value: b.y }, { at: 0.5, value: b.y - 8 * n(i) }, { at: 1, value: b.y }] },
    ],
  },
  {
    id: 'wiggle',
    label: 'Wiggle',
    kind: 'DURING',
    category: 'rotate',
    phase: 'p3b',
    defaultDuration: 700,
    defaultEasing: 'easeInOut',
    build: (b, i = 1) => {
      const a = 6 * n(i);
      return [
        {
          property: 'rotation',
          keyframes: [
            { at: 0, value: b.rotation },
            { at: 0.25, value: b.rotation - a },
            { at: 0.75, value: b.rotation + a },
            { at: 1, value: b.rotation },
          ],
        },
      ];
    },
  },
  // ---- OUT ----
  {
    id: 'fade-out',
    label: 'Fade Out',
    kind: 'OUT',
    category: 'fade',
    phase: 'p3a',
    defaultDuration: 500,
    defaultEasing: 'easeIn',
    build: () => [{ property: 'opacity', keyframes: [{ at: 0, value: 1 }, { at: 1, value: 0 }] }],
  },
  slideOut('left'),
  slideOut('right'),
  slideOut('up'),
  slideOut('down'),
  {
    id: 'pop-out',
    label: 'Shrink Out',
    kind: 'OUT',
    category: 'scale',
    phase: 'p3a',
    defaultDuration: 500,
    defaultEasing: 'easeIn',
    build: (_b, i = 1) => {
      const to = Math.max(0.05, 1 - 0.6 * n(i));
      return [
        { property: 'scaleX', keyframes: [{ at: 0, value: 1 }, { at: 1, value: to }] },
        { property: 'scaleY', keyframes: [{ at: 0, value: 1 }, { at: 1, value: to }] },
        { property: 'opacity', keyframes: [{ at: 0.5, value: 1 }, { at: 1, value: 0 }] },
      ];
    },
  },
];

export function getEffect(id: string): EffectDef | undefined {
  return EFFECTS.find((e) => e.id === id);
}

export function effectsByKind(kind: ClipKind): EffectDef[] {
  return EFFECTS.filter((e) => e.kind === kind);
}

/** Effects of a kind, filtered by which phases are enabled (3b adds extended presets). */
export function effectsByKindForPhases(kind: ClipKind, p3bEnabled: boolean): EffectDef[] {
  return EFFECTS.filter((e) => e.kind === kind && (p3bEnabled || e.phase === 'p3a'));
}

export const PROPERTY_COLORS: Record<AnimatableProperty, string> = {
  x: '#E0457B',
  y: '#149436',
  rotation: '#7A3FF2',
  scaleX: '#3367D6',
  scaleY: '#4C9BE6',
  opacity: '#F49B12',
};

export const PROPERTY_LABELS: Record<AnimatableProperty, string> = {
  x: 'Move X',
  y: 'Move Y',
  rotation: 'Rotation',
  scaleX: 'Scale X',
  scaleY: 'Scale Y',
  opacity: 'Opacity',
};
