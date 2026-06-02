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
  defaultDuration: number;
  defaultEasing: EasingFunction;
  build: (base: ResolvedTransform) => EffectTrackSpec[];
}

const SLIDE = 60;

export const EFFECTS: EffectDef[] = [
  // ---- IN ----
  {
    id: 'fade-in',
    label: 'Fade In',
    kind: 'IN',
    category: 'fade',
    defaultDuration: 500,
    defaultEasing: 'easeOut',
    build: () => [{ property: 'opacity', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }] }],
  },
  {
    id: 'slide-in-left',
    label: 'Slide In Left',
    kind: 'IN',
    category: 'slide',
    defaultDuration: 600,
    defaultEasing: 'easeOutBack',
    build: (b) => [
      { property: 'x', keyframes: [{ at: 0, value: b.x - SLIDE }, { at: 1, value: b.x }] },
      { property: 'opacity', keyframes: [{ at: 0, value: 0 }, { at: 0.6, value: 1 }] },
    ],
  },
  {
    id: 'slide-in-up',
    label: 'Slide In Up',
    kind: 'IN',
    category: 'slide',
    defaultDuration: 600,
    defaultEasing: 'easeOutBack',
    build: (b) => [
      { property: 'y', keyframes: [{ at: 0, value: b.y + SLIDE }, { at: 1, value: b.y }] },
      { property: 'opacity', keyframes: [{ at: 0, value: 0 }, { at: 0.6, value: 1 }] },
    ],
  },
  {
    id: 'pop-in',
    label: 'Pop In',
    kind: 'IN',
    category: 'scale',
    defaultDuration: 550,
    defaultEasing: 'easeOutBack',
    build: () => [
      { property: 'scaleX', keyframes: [{ at: 0, value: 0.4 }, { at: 1, value: 1 }] },
      { property: 'scaleY', keyframes: [{ at: 0, value: 0.4 }, { at: 1, value: 1 }] },
      { property: 'opacity', keyframes: [{ at: 0, value: 0 }, { at: 0.5, value: 1 }] },
    ],
  },
  {
    id: 'spin-in',
    label: 'Spin In',
    kind: 'IN',
    category: 'rotate',
    defaultDuration: 700,
    defaultEasing: 'easeOut',
    build: (b) => [
      { property: 'rotation', keyframes: [{ at: 0, value: b.rotation - 180 }, { at: 1, value: b.rotation }] },
      { property: 'opacity', keyframes: [{ at: 0, value: 0 }, { at: 0.5, value: 1 }] },
    ],
  },
  // ---- DURING ----
  {
    id: 'pulse',
    label: 'Pulse',
    kind: 'DURING',
    category: 'scale',
    defaultDuration: 800,
    defaultEasing: 'easeInOut',
    build: () => [
      { property: 'scaleX', keyframes: [{ at: 0, value: 1 }, { at: 0.5, value: 1.12 }, { at: 1, value: 1 }] },
      { property: 'scaleY', keyframes: [{ at: 0, value: 1 }, { at: 0.5, value: 1.12 }, { at: 1, value: 1 }] },
    ],
  },
  {
    id: 'float',
    label: 'Float',
    kind: 'DURING',
    category: 'slide',
    defaultDuration: 1000,
    defaultEasing: 'easeInOut',
    build: (b) => [
      { property: 'y', keyframes: [{ at: 0, value: b.y }, { at: 0.5, value: b.y - 8 }, { at: 1, value: b.y }] },
    ],
  },
  {
    id: 'wiggle',
    label: 'Wiggle',
    kind: 'DURING',
    category: 'rotate',
    defaultDuration: 700,
    defaultEasing: 'easeInOut',
    build: (b) => [
      {
        property: 'rotation',
        keyframes: [
          { at: 0, value: b.rotation },
          { at: 0.25, value: b.rotation - 6 },
          { at: 0.75, value: b.rotation + 6 },
          { at: 1, value: b.rotation },
        ],
      },
    ],
  },
  // ---- OUT ----
  {
    id: 'fade-out',
    label: 'Fade Out',
    kind: 'OUT',
    category: 'fade',
    defaultDuration: 500,
    defaultEasing: 'easeIn',
    build: () => [{ property: 'opacity', keyframes: [{ at: 0, value: 1 }, { at: 1, value: 0 }] }],
  },
  {
    id: 'slide-out-right',
    label: 'Slide Out Right',
    kind: 'OUT',
    category: 'slide',
    defaultDuration: 600,
    defaultEasing: 'easeIn',
    build: (b) => [
      { property: 'x', keyframes: [{ at: 0, value: b.x }, { at: 1, value: b.x + SLIDE }] },
      { property: 'opacity', keyframes: [{ at: 0.4, value: 1 }, { at: 1, value: 0 }] },
    ],
  },
  {
    id: 'pop-out',
    label: 'Pop Out',
    kind: 'OUT',
    category: 'scale',
    defaultDuration: 500,
    defaultEasing: 'easeIn',
    build: () => [
      { property: 'scaleX', keyframes: [{ at: 0, value: 1 }, { at: 1, value: 0.4 }] },
      { property: 'scaleY', keyframes: [{ at: 0, value: 1 }, { at: 1, value: 0.4 }] },
      { property: 'opacity', keyframes: [{ at: 0.5, value: 1 }, { at: 1, value: 0 }] },
    ],
  },
];

export function getEffect(id: string): EffectDef | undefined {
  return EFFECTS.find((e) => e.id === id);
}

export function effectsByKind(kind: ClipKind): EffectDef[] {
  return EFFECTS.filter((e) => e.kind === kind);
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
