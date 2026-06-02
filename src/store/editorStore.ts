import { create } from 'zustand';
import type {
  AdElement,
  AnimatableProperty,
  AnimationModel,
  EasingFunction,
  Group,
  TextElement,
} from '../types';
import {
  buildInitialAnimation,
  mockDataSources,
  mockElements,
  mockGroups,
} from '../data/mockTemplate';
import { buildEffectClip, makeCustomTrack, uid } from '../lib/clips';
import { getEffect } from '../lib/effects';
import { baseTransformForElement, type ResolvedTransform } from '../lib/engine';
import { applyLayerMove, reassignGlobalZ, type LayerDropTarget } from '../lib/layers';
import { resolveSelection, type SelectOptions } from '../lib/selection';

export type RightMode = 'properties' | 'animate';

export interface SelectedKeyframe {
  trackId: string;
  keyframeId: string;
}

interface EditorState {
  name: string;
  advertiser: string;
  elements: AdElement[];
  groups: Record<string, Group>;
  animation: AnimationModel;
  dataSources: typeof mockDataSources;

  selectedIds: string[];
  selectionAnchorId: string | null;
  rightMode: RightMode;

  // playback
  currentTime: number;
  isPlaying: boolean;
  loop: boolean;

  // selection / ui
  setName: (name: string) => void;
  select: (id: string | null, options?: SelectOptions) => void;
  setRightMode: (mode: RightMode) => void;

  // element editing
  updateElement: (id: string, patch: Partial<AdElement>) => void;
  updateTextElement: (id: string, patch: Partial<TextElement>) => void;
  updateElementPosition: (id: string, x: number, y: number) => void;
  deleteElement: (id: string) => void;
  moveElementLayer: (elementId: string, target: LayerDropTarget) => void;

  // grouping
  toggleGroupCollapsed: (groupId: string) => void;
  updateGroupTransform: (groupId: string, patch: Partial<Group['transform']>) => void;

  // animation
  applyEffect: (targetId: string, effectId: string) => void;
  deleteClip: (clipId: string) => void;
  convertClipToCustom: (clipId: string) => void;
  addCustomTrack: (targetId: string, property: AnimatableProperty) => void;
  deleteTrack: (trackId: string) => void;
  addKeyframe: (trackId: string, tMs: number, value: number) => void;
  updateKeyframe: (trackId: string, keyframeId: string, patch: { tMs?: number; value?: number; easing?: EasingFunction }) => void;
  deleteKeyframe: (trackId: string, keyframeId: string) => void;
  updateClipTiming: (clipId: string, patch: { startTime?: number; duration?: number; easing?: EasingFunction }) => void;
  setDuration: (ms: number) => void;
  setFps: (fps: number) => void;

  // playback controls
  setCurrentTime: (t: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  setLoop: (loop: boolean) => void;
}

function baseTransformForTarget(state: EditorState, targetId: string): ResolvedTransform {
  const el = state.elements.find((e) => e.id === targetId);
  if (el) return baseTransformForElement(el);
  return { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 };
}

function nextTrackIndex(animation: AnimationModel, targetId: string): number {
  const idxs = Object.values(animation.tracks)
    .filter((t) => t.targetId === targetId)
    .map((t) => t.trackIndex);
  return idxs.length ? Math.max(...idxs) + 1 : 0;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  name: '300X250_soccer_FTR',
  advertiser: 'Demo Website',
  elements: reassignGlobalZ(mockElements, mockGroups),
  groups: mockGroups,
  animation: buildInitialAnimation(),
  dataSources: mockDataSources,

  selectedIds: ['el.competition'],
  selectionAnchorId: 'el.competition',
  rightMode: 'properties',

  currentTime: 1500,
  isPlaying: false,
  loop: true,

  setName: (name) => set({ name }),
  select: (id, options) =>
    set((s) => resolveSelection(s.selectedIds, s.selectionAnchorId, id, options)),
  setRightMode: (rightMode) => set({ rightMode }),

  updateElement: (id, patch) =>
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as AdElement) : e)),
    })),

  updateTextElement: (id, patch) =>
    set((s) => ({
      elements: s.elements.map((e) =>
        e.id === id && e.type === 'TEXT' ? ({ ...e, ...patch } as TextElement) : e,
      ),
    })),

  updateElementPosition: (id, x, y) =>
    set((s) => ({
      elements: s.elements.map((e) =>
        e.id === id ? { ...e, position: { ...e.position, x, y } } : e,
      ),
    })),

  deleteElement: (id) =>
    set((s) => {
      const el = s.elements.find((e) => e.id === id);
      if (!el || el.locked) return {};

      const nextElements = s.elements.filter((e) => e.id !== id);
      const nextGroups = { ...s.groups };
      if (el.parentId && nextGroups[el.parentId]) {
        nextGroups[el.parentId] = {
          ...nextGroups[el.parentId],
          children: nextGroups[el.parentId].children.filter((cid) => cid !== id),
        };
      }

      const nextTracks = { ...s.animation.tracks };
      const nextClips = { ...s.animation.clips };
      Object.values(nextClips).forEach((clip) => {
        if (clip.targetId !== id) return;
        clip.trackIds.forEach((tid) => delete nextTracks[tid]);
        delete nextClips[clip.id];
      });
      Object.keys(nextTracks).forEach((tid) => {
        if (nextTracks[tid].targetId === id) delete nextTracks[tid];
      });

      return {
        elements: nextElements,
        groups: nextGroups,
        animation: { ...s.animation, tracks: nextTracks, clips: nextClips },
        selectedIds: s.selectedIds.filter((sid) => sid !== id),
        selectionAnchorId: s.selectionAnchorId === id ? null : s.selectionAnchorId,
      };
    }),

  moveElementLayer: (elementId, target) =>
    set((s) => {
      const result = applyLayerMove(s.elements, s.groups, elementId, target);
      return result ?? {};
    }),

  toggleGroupCollapsed: (groupId) =>
    set((s) => ({
      groups: {
        ...s.groups,
        [groupId]: { ...s.groups[groupId], collapsed: !s.groups[groupId].collapsed },
      },
    })),

  updateGroupTransform: (groupId, patch) =>
    set((s) => ({
      groups: {
        ...s.groups,
        [groupId]: {
          ...s.groups[groupId],
          transform: { ...s.groups[groupId].transform, ...patch },
        },
      },
    })),

  applyEffect: (targetId, effectId) => {
    const state = get();
    const effect = getEffect(effectId);
    if (!effect) return;
    const base = baseTransformForTarget(state, targetId);
    const trackIndexBase = nextTrackIndex(state.animation, targetId);
    const { clip, tracks } = buildEffectClip(targetId, base, effect, 0, trackIndexBase);

    set((s) => {
      // Replace existing clip of same kind on this target (keeps things tidy).
      const removeClipIds = Object.values(s.animation.clips)
        .filter((c) => c.targetId === targetId && c.kind === effect.kind)
        .map((c) => c.id);
      const nextClips = { ...s.animation.clips };
      const nextTracks = { ...s.animation.tracks };
      removeClipIds.forEach((cid) => {
        nextClips[cid]?.trackIds.forEach((tid) => delete nextTracks[tid]);
        delete nextClips[cid];
      });
      nextClips[clip.id] = clip;
      tracks.forEach((t) => {
        nextTracks[t.id] = t;
      });
      return { animation: { ...s.animation, clips: nextClips, tracks: nextTracks } };
    });
  },

  deleteClip: (clipId) =>
    set((s) => {
      const clip = s.animation.clips[clipId];
      if (!clip) return {};
      const nextClips = { ...s.animation.clips };
      const nextTracks = { ...s.animation.tracks };
      clip.trackIds.forEach((tid) => delete nextTracks[tid]);
      delete nextClips[clipId];
      return { animation: { ...s.animation, clips: nextClips, tracks: nextTracks } };
    }),

  convertClipToCustom: (clipId) =>
    set((s) => {
      const clip = s.animation.clips[clipId];
      if (!clip) return {};
      return {
        animation: {
          ...s.animation,
          clips: {
            ...s.animation.clips,
            [clipId]: { ...clip, kind: 'CUSTOM', effectId: undefined, label: clip.label, isModified: true },
          },
        },
      };
    }),

  addCustomTrack: (targetId, property) => {
    const state = get();
    const base = baseTransformForTarget(state, targetId);
    const start = Math.round(state.currentTime);
    const end = Math.min(start + 500, state.animation.durationMs);
    const value = base[property];
    const trackIndex = nextTrackIndex(state.animation, targetId);
    const track = makeCustomTrack(targetId, property, start, end, value, value, trackIndex);
    set((s) => ({
      animation: { ...s.animation, tracks: { ...s.animation.tracks, [track.id]: track } },
    }));
  },

  deleteTrack: (trackId) =>
    set((s) => {
      const nextTracks = { ...s.animation.tracks };
      delete nextTracks[trackId];
      return { animation: { ...s.animation, tracks: nextTracks } };
    }),

  addKeyframe: (trackId, tMs, value) =>
    set((s) => {
      const track = s.animation.tracks[trackId];
      if (!track) return {};
      const kf = { id: uid('kf'), tMs: Math.round(tMs), value, easing: 'easeInOut' as EasingFunction };
      return {
        animation: {
          ...s.animation,
          tracks: {
            ...s.animation.tracks,
            [trackId]: { ...track, keyframes: [...track.keyframes, kf] },
          },
        },
      };
    }),

  updateKeyframe: (trackId, keyframeId, patch) =>
    set((s) => {
      const track = s.animation.tracks[trackId];
      if (!track) return {};
      return {
        animation: {
          ...s.animation,
          tracks: {
            ...s.animation.tracks,
            [trackId]: {
              ...track,
              keyframes: track.keyframes.map((k) => (k.id === keyframeId ? { ...k, ...patch } : k)),
            },
          },
        },
      };
    }),

  deleteKeyframe: (trackId, keyframeId) =>
    set((s) => {
      const track = s.animation.tracks[trackId];
      if (!track) return {};
      return {
        animation: {
          ...s.animation,
          tracks: {
            ...s.animation.tracks,
            [trackId]: { ...track, keyframes: track.keyframes.filter((k) => k.id !== keyframeId) },
          },
        },
      };
    }),

  updateClipTiming: (clipId, patch) =>
    set((s) => {
      const clip = s.animation.clips[clipId];
      if (!clip) return {};
      const startTime = patch.startTime ?? clip.startTime;
      const oldStart = clip.startTime;
      const delta = startTime - oldStart;
      const nextTracks = { ...s.animation.tracks };
      if (delta !== 0) {
        clip.trackIds.forEach((tid) => {
          const t = nextTracks[tid];
          if (t) {
            nextTracks[tid] = {
              ...t,
              keyframes: t.keyframes.map((k) => ({ ...k, tMs: k.tMs + delta })),
            };
          }
        });
      }
      return {
        animation: {
          ...s.animation,
          tracks: nextTracks,
          clips: { ...s.animation.clips, [clipId]: { ...clip, ...patch, startTime } },
        },
      };
    }),

  setDuration: (ms) =>
    set((s) => ({ animation: { ...s.animation, durationMs: Math.max(500, Math.round(ms)) } })),
  setFps: (fps) =>
    set((s) => ({ animation: { ...s.animation, fps: Math.max(1, Math.min(60, Math.round(fps))) } })),

  setCurrentTime: (t) =>
    set((s) => ({ currentTime: Math.max(0, Math.min(t, s.animation.durationMs)) })),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  reset: () => set({ currentTime: 0, isPlaying: false }),
  setLoop: (loop) => set({ loop }),
}));
