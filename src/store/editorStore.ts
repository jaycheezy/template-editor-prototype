import { create } from 'zustand';
import type {
  AdElement,
  AnimatableProperty,
  AnimationModel,
  EasingFunction,
  Group,
  Keyframe,
  TextElement,
} from '../types';
import {
  buildInitialAnimation,
  CANVAS,
  mockDataSources,
  mockElements,
  mockGroups,
} from '../data/mockTemplate';
import { buildEffectClip, makeCustomTrack, uid } from '../lib/clips';
import { getEffect } from '../lib/effects';
import {
  baseTransformForElement,
  isEffectivelyLocked,
  sortKeyframes,
  type ResolvedTransform,
} from '../lib/engine';
import { applyLayerMove, reassignGlobalZ, type LayerDropTarget } from '../lib/layers';
import { resolveSelection, type SelectOptions } from '../lib/selection';
import { createElement, type NewElementType } from '../lib/factory';

export type ZOrderOp = 'front' | 'back' | 'forward' | 'backward';

export type RightMode = 'properties' | 'animate';

export interface SelectedKeyframe {
  trackId: string;
  keyframeId: string;
}

/** Snapshot of the editable document for undo/redo history. */
export interface DocSnapshot {
  elements: AdElement[];
  groups: Record<string, Group>;
  animation: AnimationModel;
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
  /** group the user has "entered" for nested editing (Phase 2), null = root scope */
  enteredGroupId: string | null;

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
  moveSelectionBy: (ids: string[], dx: number, dy: number) => void;
  resizeElement: (id: string, size: { width: number; height: number }, position?: { x: number; y: number }) => void;
  deleteElement: (id: string) => void;
  moveElementLayer: (elementId: string, target: LayerDropTarget) => void;
  addElement: (type: NewElementType) => void;
  renameElement: (id: string, name: string) => void;
  toggleElementHidden: (id: string) => void;
  toggleElementLocked: (id: string) => void;
  reorderElementZ: (id: string, op: ZOrderOp) => void;

  // grouping
  toggleGroupCollapsed: (groupId: string) => void;
  updateGroupTransform: (groupId: string, patch: Partial<Group['transform']>) => void;
  renameGroup: (groupId: string, name: string) => void;
  toggleGroupHidden: (groupId: string) => void;
  toggleGroupLocked: (groupId: string) => void;
  groupSelection: () => void;
  ungroup: (groupId: string) => void;
  enterGroup: (groupId: string) => void;
  exitGroup: () => void;

  // animation
  applyEffect: (targetId: string, effectId: string) => void;
  applyEffectToSelection: (effectId: string) => void;
  deleteClip: (clipId: string) => void;
  duplicateClip: (clipId: string) => void;
  updateClipIntensity: (clipId: string, intensity: number) => void;
  convertClipToCustom: (clipId: string) => void;
  shiftTrack: (trackId: string, deltaMs: number) => void;
  duplicateKeyframe: (trackId: string, keyframeId: string) => void;
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

  // history (undo / redo of document edits)
  past: DocSnapshot[];
  future: DocSnapshot[];
  undo: () => void;
  redo: () => void;
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
  enteredGroupId: null,

  currentTime: 1500,
  isPlaying: false,
  loop: true,

  past: [],
  future: [],

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

  moveSelectionBy: (ids, dx, dy) =>
    set((s) => {
      const movable = new Set(
        ids.filter((id) => {
          const el = s.elements.find((e) => e.id === id);
          return el && !isEffectivelyLocked(el, s.groups);
        }),
      );
      return {
        elements: s.elements.map((e) =>
          movable.has(e.id)
            ? { ...e, position: { ...e.position, x: Math.round(e.position.x + dx), y: Math.round(e.position.y + dy) } }
            : e,
        ),
      };
    }),

  resizeElement: (id, size, position) =>
    set((s) => ({
      elements: s.elements.map((e) => {
        if (e.id !== id) return e;
        return {
          ...e,
          size: { width: Math.max(8, Math.round(size.width)), height: Math.max(8, Math.round(size.height)) },
          position: position ? { ...e.position, x: Math.round(position.x), y: Math.round(position.y) } : e.position,
        };
      }),
    })),

  addElement: (type) =>
    set((s) => {
      const maxZ = s.elements.reduce((m, e) => Math.max(m, e.position.z), 0);
      const el = createElement(type, CANVAS.width / 2, CANVAS.height / 2, maxZ + 1);
      const elements = reassignGlobalZ([...s.elements, el], s.groups);
      return {
        elements,
        selectedIds: [el.id],
        selectionAnchorId: el.id,
        rightMode: 'properties',
      };
    }),

  renameElement: (id, name) =>
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, name } : e)),
    })),

  toggleElementHidden: (id) =>
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, hidden: !e.hidden } : e)),
    })),

  toggleElementLocked: (id) =>
    set((s) => ({
      elements: s.elements.map((e) =>
        e.id === id && e.id !== 'el.bg' ? { ...e, locked: !e.locked } : e,
      ),
    })),

  reorderElementZ: (id, op) =>
    set((s) => {
      const el = s.elements.find((e) => e.id === id);
      if (!el) return {};
      const siblings = s.elements
        .filter((e) => e.parentId === el.parentId && !e.locked)
        .sort((a, b) => a.position.z - b.position.z)
        .map((e) => e.id);
      const idx = siblings.indexOf(id);
      if (idx < 0) return {};
      siblings.splice(idx, 1);
      let insertAt = idx;
      if (op === 'front') insertAt = siblings.length;
      else if (op === 'back') insertAt = 0;
      else if (op === 'forward') insertAt = Math.min(idx + 1, siblings.length);
      else if (op === 'backward') insertAt = Math.max(idx - 1, 0);
      siblings.splice(insertAt, 0, id);

      // siblings is back-to-front (low z first); reflect into stored z within the sibling set
      const zForId = new Map<string, number>();
      const sortedZ = s.elements
        .filter((e) => e.parentId === el.parentId && !e.locked)
        .map((e) => e.position.z)
        .sort((a, b) => a - b);
      siblings.forEach((sid, i) => zForId.set(sid, sortedZ[i]));
      return {
        elements: s.elements.map((e) =>
          zForId.has(e.id) ? { ...e, position: { ...e.position, z: zForId.get(e.id)! } } : e,
        ),
      };
    }),

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

  renameGroup: (groupId, name) =>
    set((s) => ({
      groups: { ...s.groups, [groupId]: { ...s.groups[groupId], name } },
    })),

  toggleGroupHidden: (groupId) =>
    set((s) => ({
      groups: { ...s.groups, [groupId]: { ...s.groups[groupId], hidden: !s.groups[groupId].hidden } },
    })),

  toggleGroupLocked: (groupId) =>
    set((s) => ({
      groups: { ...s.groups, [groupId]: { ...s.groups[groupId], locked: !s.groups[groupId].locked } },
    })),

  groupSelection: () =>
    set((s) => {
      // Group selected root-level elements (and members of other groups) into a new root group.
      const memberIds = s.selectedIds.filter((id) => {
        const el = s.elements.find((e) => e.id === id);
        return el && !el.locked;
      });
      if (memberIds.length < 1) return {};

      const gid = uid('group');
      const orderedMembers = s.elements
        .filter((e) => memberIds.includes(e.id))
        .sort((a, b) => b.position.z - a.position.z)
        .map((e) => e.id);

      const nextGroups: Record<string, Group> = {};
      Object.entries(s.groups).forEach(([id, g]) => {
        nextGroups[id] = { ...g, children: g.children.filter((cid) => !memberIds.includes(cid)) };
      });
      nextGroups[gid] = {
        id: gid,
        name: `Group ${Object.keys(s.groups).length + 1}`,
        parentId: null,
        children: orderedMembers,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 },
      };

      let nextElements = s.elements.map((e) =>
        memberIds.includes(e.id) ? { ...e, parentId: gid } : e,
      );
      nextElements = reassignGlobalZ(nextElements, nextGroups);

      return {
        elements: nextElements,
        groups: nextGroups,
        selectedIds: [gid],
        selectionAnchorId: gid,
      };
    }),

  ungroup: (groupId) =>
    set((s) => {
      const group = s.groups[groupId];
      if (!group) return {};
      const nextGroups = { ...s.groups };
      delete nextGroups[groupId];

      let nextElements = s.elements.map((e) =>
        e.parentId === groupId ? { ...e, parentId: group.parentId } : e,
      );
      nextElements = reassignGlobalZ(nextElements, nextGroups);

      // remove tracks/clips that targeted the group itself
      const nextTracks = { ...s.animation.tracks };
      const nextClips = { ...s.animation.clips };
      Object.values(nextClips).forEach((clip) => {
        if (clip.targetId !== groupId) return;
        clip.trackIds.forEach((tid) => delete nextTracks[tid]);
        delete nextClips[clip.id];
      });
      Object.keys(nextTracks).forEach((tid) => {
        if (nextTracks[tid].targetId === groupId) delete nextTracks[tid];
      });

      return {
        elements: nextElements,
        groups: nextGroups,
        animation: { ...s.animation, tracks: nextTracks, clips: nextClips },
        selectedIds: group.children.filter((cid) => !nextGroups[cid]),
        selectionAnchorId: group.children[0] ?? null,
        enteredGroupId: s.enteredGroupId === groupId ? null : s.enteredGroupId,
      };
    }),

  enterGroup: (groupId) => set({ enteredGroupId: groupId }),
  exitGroup: () => set({ enteredGroupId: null }),

  applyEffect: (targetId, effectId) => {
    const state = get();
    const effect = getEffect(effectId);
    if (!effect) return;
    const base = baseTransformForTarget(state, targetId);
    const trackIndexBase = nextTrackIndex(state.animation, targetId);
    // OUT effects default to a 2s start so the layer is on-screen before it exits
    // (clamped so the clip still fits within the timeline duration).
    const defaultStart =
      effect.kind === 'OUT'
        ? Math.max(0, Math.min(2000, state.animation.durationMs - effect.defaultDuration))
        : 0;
    const { clip, tracks } = buildEffectClip(targetId, base, effect, defaultStart, trackIndexBase);

    set((s) => {
      const nextClips = { ...s.animation.clips };
      const nextTracks = { ...s.animation.tracks };

      // A new effect overrides only the properties it animates AND only against
      // effects of the same kind (or stray custom tracks). This keeps one
      // canonical track per {property, kind} so effects stack (slide + grow) and
      // complementary kinds coexist (Slide In + Slide Out both animate x, but at
      // different times, so neither should remove the other).
      const newProps = new Set(tracks.map((t) => t.property));
      Object.values(s.animation.tracks).forEach((t) => {
        if (t.targetId !== targetId || !newProps.has(t.property)) return;
        const existingClip = t.clipId ? s.animation.clips[t.clipId] : undefined;
        const conflicts = existingClip ? existingClip.kind === effect.kind : true;
        if (conflicts) delete nextTracks[t.id];
      });
      // Drop or trim any existing clip that lost tracks to the override above.
      Object.values(nextClips).forEach((c) => {
        if (c.targetId !== targetId) return;
        const remaining = c.trackIds.filter((tid) => nextTracks[tid]);
        if (remaining.length === 0) delete nextClips[c.id];
        else if (remaining.length !== c.trackIds.length) nextClips[c.id] = { ...c, trackIds: remaining };
      });

      nextClips[clip.id] = clip;
      tracks.forEach((t) => {
        nextTracks[t.id] = t;
      });
      return { animation: { ...s.animation, clips: nextClips, tracks: nextTracks } };
    });
  },

  applyEffectToSelection: (effectId) => {
    const { selectedIds, applyEffect } = get();
    selectedIds.forEach((id) => applyEffect(id, effectId));
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

  duplicateClip: (clipId) =>
    set((s) => {
      const clip = s.animation.clips[clipId];
      if (!clip) return {};
      const offset = Math.min(clip.duration, s.animation.durationMs - (clip.startTime + clip.duration));
      const newClipId = uid('clip');
      const nextTracks = { ...s.animation.tracks };
      const newTrackIds: string[] = [];
      clip.trackIds.forEach((tid) => {
        const t = s.animation.tracks[tid];
        if (!t) return;
        const newTid = uid('track');
        newTrackIds.push(newTid);
        nextTracks[newTid] = {
          ...t,
          id: newTid,
          clipId: newClipId,
          keyframes: t.keyframes.map((k) => ({ ...k, id: uid('kf'), tMs: k.tMs + offset })),
        };
      });
      const newClip = {
        ...clip,
        id: newClipId,
        startTime: clip.startTime + offset,
        trackIds: newTrackIds,
        label: clip.label ? `${clip.label} copy` : clip.label,
      };
      return {
        animation: {
          ...s.animation,
          clips: { ...s.animation.clips, [newClipId]: newClip },
          tracks: nextTracks,
        },
      };
    }),

  updateClipIntensity: (clipId, intensity) => {
    const state = get();
    const clip = state.animation.clips[clipId];
    if (!clip || !clip.effectId) return;
    const effect = getEffect(clip.effectId);
    if (!effect) return;
    const base = baseTransformForTarget(state, clip.targetId);
    const specs = effect.build(base, intensity);

    set((s) => {
      const nextTracks = { ...s.animation.tracks };
      // regenerate keyframes for the clip's owned tracks (match by property)
      clip.trackIds.forEach((tid) => {
        const track = nextTracks[tid];
        if (!track) return;
        const spec = specs.find((sp) => sp.property === track.property);
        if (!spec) return;
        nextTracks[tid] = {
          ...track,
          keyframes: spec.keyframes.map((k) => ({
            id: uid('kf'),
            tMs: Math.round(clip.startTime + k.at * clip.duration),
            value: k.value,
            easing: clip.easing,
          })),
        };
      });
      return {
        animation: {
          ...s.animation,
          tracks: nextTracks,
          clips: { ...s.animation.clips, [clipId]: { ...clip, intensity } },
        },
      };
    });
  },

  convertClipToCustom: (clipId) =>
    set((s) => {
      const clip = s.animation.clips[clipId];
      if (!clip) return {};
      const nextTracks = { ...s.animation.tracks };

      // Preserve delayed-entrance: the delayed-IN visibility rule keys off clip.kind==='IN',
      // so materialise an explicit opacity=0 hold before startTime before dropping the kind.
      if (clip.kind === 'IN' && clip.startTime > 0) {
        let opacityTrackId = clip.trackIds.find((tid) => nextTracks[tid]?.property === 'opacity');
        if (!opacityTrackId) {
          opacityTrackId = uid('track');
          nextTracks[opacityTrackId] = {
            id: opacityTrackId,
            targetId: clip.targetId,
            property: 'opacity',
            trackIndex: clip.trackIds.length,
            clipId,
            keyframes: [
              { id: uid('kf'), tMs: clip.startTime, value: 1, easing: clip.easing },
            ],
          };
          clip.trackIds.push(opacityTrackId);
        }
        const track = nextTracks[opacityTrackId];
        const sorted = sortKeyframes(track.keyframes);
        const firstT = sorted[0]?.tMs ?? clip.startTime;
        if (firstT > 0) {
          nextTracks[opacityTrackId] = {
            ...track,
            keyframes: [{ id: uid('kf'), tMs: 0, value: 0, easing: 'linear' }, ...track.keyframes],
          };
        }
      }

      return {
        animation: {
          ...s.animation,
          tracks: nextTracks,
          clips: {
            ...s.animation.clips,
            [clipId]: { ...clip, kind: 'CUSTOM', effectId: undefined, label: clip.label, isModified: true },
          },
        },
      };
    }),

  shiftTrack: (trackId, deltaMs) =>
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
              keyframes: track.keyframes.map((k) => ({ ...k, tMs: Math.max(0, k.tMs + deltaMs) })),
            },
          },
        },
      };
    }),

  duplicateKeyframe: (trackId, keyframeId) =>
    set((s) => {
      const track = s.animation.tracks[trackId];
      if (!track) return {};
      const kf = track.keyframes.find((k) => k.id === keyframeId);
      if (!kf) return {};
      const copy: Keyframe = {
        ...kf,
        id: uid('kf'),
        tMs: Math.min(kf.tMs + 100, s.animation.durationMs),
      };
      return {
        animation: {
          ...s.animation,
          tracks: {
            ...s.animation.tracks,
            [trackId]: { ...track, keyframes: [...track.keyframes, copy] },
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

  undo: () => {
    const { past } = get();
    if (!past.length) return;
    const prevSnap = past[past.length - 1];
    const current: DocSnapshot = {
      elements: get().elements,
      groups: get().groups,
      animation: get().animation,
    };
    timeTraveling = true;
    set({
      elements: prevSnap.elements,
      groups: prevSnap.groups,
      animation: prevSnap.animation,
      past: past.slice(0, -1),
      future: [current, ...get().future],
    });
    timeTraveling = false;
  },

  redo: () => {
    const { future } = get();
    if (!future.length) return;
    const nextSnap = future[0];
    const current: DocSnapshot = {
      elements: get().elements,
      groups: get().groups,
      animation: get().animation,
    };
    timeTraveling = true;
    set({
      elements: nextSnap.elements,
      groups: nextSnap.groups,
      animation: nextSnap.animation,
      future: future.slice(1),
      past: [...get().past, current],
    });
    timeTraveling = false;
  },
}));

/**
 * Record document edits for undo/redo. Continuous bursts (drags, rapid typing)
 * coalesce into a single history entry so one undo reverts the whole gesture.
 */
let timeTraveling = false;
let lastRecord = 0;
const COALESCE_MS = 350;

useEditorStore.subscribe((state, prev) => {
  if (timeTraveling) return;
  const docChanged =
    state.elements !== prev.elements ||
    state.groups !== prev.groups ||
    state.animation !== prev.animation;
  if (!docChanged) return;

  const now = Date.now();
  if (now - lastRecord < COALESCE_MS) {
    lastRecord = now;
    return;
  }
  lastRecord = now;

  const snap: DocSnapshot = {
    elements: prev.elements,
    groups: prev.groups,
    animation: prev.animation,
  };
  useEditorStore.setState((s) => ({ past: [...s.past, snap].slice(-100), future: [] }));
});
