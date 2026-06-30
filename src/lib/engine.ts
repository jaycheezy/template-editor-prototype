import type {
  AdElement,
  AnimatableProperty,
  AnimationModel,
  Clip,
  Group,
  Keyframe,
  Track,
} from '../types';
import { lerp } from './easing';

export interface ResolvedTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}

export function sortKeyframes(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.tMs - b.tMs);
}

/**
 * Sample a track at time t. Returns null before the first keyframe so the
 * track does not override the element's base state (Extension v1 semantics).
 */
export function sampleTrack(track: Track, tMs: number): number | null {
  const kfs = sortKeyframes(track.keyframes);
  if (kfs.length === 0) return null;
  if (tMs < kfs[0].tMs) return null;
  if (kfs.length === 1) return kfs[0].value;

  let startKf: Keyframe = kfs[0];
  let endKf: Keyframe | null = null;
  for (let i = 0; i < kfs.length; i++) {
    if (kfs[i].tMs <= tMs) startKf = kfs[i];
    if (kfs[i].tMs > tMs && !endKf) {
      endKf = kfs[i];
      break;
    }
  }
  if (!endKf) return startKf.value; // hold final value
  const span = endKf.tMs - startKf.tMs;
  const progress = span > 0 ? (tMs - startKf.tMs) / span : 1;
  return lerp(startKf.value, endKf.value, progress, endKf.easing);
}

const BASE_PROPERTY: Record<AnimatableProperty, (e: AdElement) => number> = {
  x: (e) => e.position.x,
  y: (e) => e.position.y,
  rotation: (e) => e.rotation,
  scaleX: () => 1,
  scaleY: () => 1,
  opacity: () => 1,
};

/**
 * Resolve animated transform for a single target (element or group) at time t.
 * Honours the v1 "one canonical track per property" rule (latest track wins)
 * and the delayed-IN visibility rule (hidden before a delayed IN clip starts).
 */
export function resolveAnimatedProps(
  targetId: string,
  base: ResolvedTransform,
  animation: AnimationModel,
  tMs: number,
): ResolvedTransform {
  const result = { ...base };
  const tracks = Object.values(animation.tracks).filter((t) => t.targetId === targetId);

  for (const track of tracks) {
    const value = sampleTrack(track, tMs);
    if (value !== null) {
      result[track.property] = value;
    }
  }

  // Delayed IN visibility: hide target before a delayed IN clip starts.
  const delayedIn = Object.values(animation.clips).find(
    (c) => c.targetId === targetId && c.kind === 'IN' && c.startTime > 0,
  );
  if (delayedIn && tMs < delayedIn.startTime) {
    result.opacity = 0;
  }

  return result;
}

export function baseTransformForElement(e: AdElement): ResolvedTransform {
  return {
    x: BASE_PROPERTY.x(e),
    y: BASE_PROPERTY.y(e),
    rotation: BASE_PROPERTY.rotation(e),
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
  };
}

/** Compose a child transform onto a parent (group) transform. */
export function composeTransform(parent: ResolvedTransform, child: ResolvedTransform): ResolvedTransform {
  return {
    x: parent.x + child.x,
    y: parent.y + child.y,
    rotation: parent.rotation + child.rotation,
    scaleX: parent.scaleX * child.scaleX,
    scaleY: parent.scaleY * child.scaleY,
    opacity: parent.opacity * child.opacity,
  };
}

/**
 * Walk the group chain to accumulate inherited (animated) group transforms,
 * relative to the group's own base transform.
 */
export function resolveGroupChain(
  parentId: string | null,
  groups: Record<string, Group>,
  animation: AnimationModel,
  tMs: number,
): ResolvedTransform {
  let acc: ResolvedTransform = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 };
  let currentId = parentId;
  const seen = new Set<string>();
  while (currentId && groups[currentId] && !seen.has(currentId)) {
    seen.add(currentId);
    const group = groups[currentId];
    const animated = resolveAnimatedProps(
      group.id,
      { ...group.transform },
      animation,
      tMs,
    );
    acc = composeTransform(animated, acc);
    currentId = group.parentId;
  }
  return acc;
}

export interface RenderedElement {
  element: AdElement;
  transform: ResolvedTransform;
  hidden: boolean;
}

/** Whether an element is hidden by its own flag or any ancestor group. */
export function isEffectivelyHidden(
  element: AdElement,
  groups: Record<string, Group>,
): boolean {
  if (element.hidden) return true;
  let currentId = element.parentId;
  const seen = new Set<string>();
  while (currentId && groups[currentId] && !seen.has(currentId)) {
    seen.add(currentId);
    if (groups[currentId].hidden) return true;
    currentId = groups[currentId].parentId;
  }
  return false;
}

/** Whether an element is locked by its own flag or any ancestor group. */
export function isEffectivelyLocked(
  element: AdElement,
  groups: Record<string, Group>,
): boolean {
  if (element.locked) return true;
  let currentId = element.parentId;
  const seen = new Set<string>();
  while (currentId && groups[currentId] && !seen.has(currentId)) {
    seen.add(currentId);
    if (groups[currentId].locked) return true;
    currentId = groups[currentId].parentId;
  }
  return false;
}

/** Compute final transforms for every element at time t. */
export function renderScene(
  elements: AdElement[],
  groups: Record<string, Group>,
  animation: AnimationModel,
  tMs: number,
): RenderedElement[] {
  return elements.map((element) => {
    const own = resolveAnimatedProps(element.id, baseTransformForElement(element), animation, tMs);
    const groupChain = resolveGroupChain(element.parentId, groups, animation, tMs);
    // Group transform x/y are offsets; element own x/y are absolute positions.
    const transform: ResolvedTransform = {
      x: own.x + groupChain.x,
      y: own.y + groupChain.y,
      rotation: own.rotation + groupChain.rotation,
      scaleX: own.scaleX * groupChain.scaleX,
      scaleY: own.scaleY * groupChain.scaleY,
      opacity: own.opacity * groupChain.opacity,
    };
    return { element, transform, hidden: isEffectivelyHidden(element, groups) };
  });
}

export function clipForTrack(track: Track, clips: Record<string, Clip>): Clip | undefined {
  return track.clipId ? clips[track.clipId] : undefined;
}
