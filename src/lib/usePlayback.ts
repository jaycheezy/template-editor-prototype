import { useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useFeatureStore, resolveEffective } from '../store/featureStore';
import type { AnimationModel } from '../types';

/**
 * Last moment any animation content occurs (latest keyframe / clip end).
 * Used for preset-only preview so playback auto-fits to the content instead of
 * the full timeline duration (no manual duration field in Phase 3a.1).
 */
export function animationContentEnd(animation: AnimationModel): number {
  let end = 0;
  Object.values(animation.tracks).forEach((t) => {
    t.keyframes.forEach((k) => {
      if (k.tMs > end) end = k.tMs;
    });
  });
  Object.values(animation.clips).forEach((c) => {
    const e = c.startTime + c.duration;
    if (e > end) end = e;
  });
  return end;
}

/**
 * Drives the animation playhead via requestAnimationFrame while playing.
 * Lives in a hook so playback works whether or not the timeline editor is mounted
 * (e.g. preset-only preview).
 *
 * Preset-only mode (timeline off) plays once and holds the end state, fitting the
 * window to the animation content. The full timeline honours duration + loop.
 */
export function usePlaybackLoop() {
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const durationMs = useEditorStore((s) => s.animation.durationMs);
  const loop = useEditorStore((s) => s.loop);
  const rafRef = useRef<number | undefined>(undefined);
  const lastRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastRef.current = performance.now();
    const tick = (now: number) => {
      const delta = now - lastRef.current;
      lastRef.current = now;
      const state = useEditorStore.getState();
      const timelineOn = resolveEffective(useFeatureStore.getState().flags).p3at;
      const end = timelineOn ? durationMs : Math.max(animationContentEnd(state.animation), 1);
      const willLoop = timelineOn ? loop : false;
      const next = state.currentTime + delta;
      if (next >= end) {
        if (willLoop) {
          state.setCurrentTime(0);
        } else {
          state.setCurrentTime(end);
          state.pause();
          return;
        }
      } else {
        state.setCurrentTime(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, durationMs, loop]);
}
