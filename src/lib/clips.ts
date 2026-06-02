import type { Clip, EasingFunction, Keyframe, Track } from '../types';
import type { EffectDef } from './effects';
import type { ResolvedTransform } from './engine';

let counter = 0;
export function uid(prefix = 'id'): string {
  counter += 1;
  return `${prefix}.${Date.now().toString(36)}.${counter}`;
}

export interface BuiltClip {
  clip: Clip;
  tracks: Track[];
}

/**
 * Build an effect clip + its generated tracks for a target, given the target's
 * base transform. Mirrors the spec's "applying IN/DURING/OUT creates/updates
 * generated tracks for owned properties plus clip metadata".
 */
export function buildEffectClip(
  targetId: string,
  base: ResolvedTransform,
  effect: EffectDef,
  startTime: number,
  trackIndexBase = 0,
): BuiltClip {
  const clipId = uid('clip');
  const easing = effect.defaultEasing;
  const duration = effect.defaultDuration;
  const specs = effect.build(base);

  const tracks: Track[] = specs.map((spec, i) => {
    const keyframes: Keyframe[] = spec.keyframes.map((k) => ({
      id: uid('kf'),
      tMs: Math.round(startTime + k.at * duration),
      value: k.value,
      easing,
    }));
    return {
      id: uid('track'),
      targetId,
      property: spec.property,
      trackIndex: trackIndexBase + i,
      keyframes,
      clipId,
    };
  });

  const clip: Clip = {
    id: clipId,
    targetId,
    kind: effect.kind,
    effectId: effect.id,
    label: effect.label,
    startTime,
    duration,
    easing,
    trackIds: tracks.map((t) => t.id),
  };

  return { clip, tracks };
}

export function makeCustomTrack(
  targetId: string,
  property: Track['property'],
  startTime: number,
  endTime: number,
  startValue: number,
  endValue: number,
  trackIndex: number,
  easing: EasingFunction = 'easeInOut',
): Track {
  return {
    id: uid('track'),
    targetId,
    property,
    trackIndex,
    keyframes: [
      { id: uid('kf'), tMs: startTime, value: startValue, easing },
      { id: uid('kf'), tMs: endTime, value: endValue, easing },
    ],
  };
}
