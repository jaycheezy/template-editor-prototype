import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, HStack, Icon, IconButton, Input, Text } from '@chakra-ui/react';
import {
  LuPlay,
  LuPause,
  LuSkipBack,
  LuRepeat,
  LuChevronDown,
  LuChevronRight,
  LuClock,
  LuZap,
  LuZoomIn,
  LuZoomOut,
  LuMagnet,
} from 'react-icons/lu';
import { useEditorStore } from '../../store/editorStore';
import { usePhase } from '../../store/featureStore';
import { sortKeyframes } from '../../lib/engine';
import { buildLayerRows, elementsInGroupOrder, sortElementsForLayerList, buildSiblingOrder } from '../../lib/layers';
import { layerListSelectableIds } from '../../lib/selection';
import { PROPERTY_COLORS, PROPERTY_LABELS } from '../../lib/effects';
import { formatTime } from '../../lib/format';
import type { AnimatableProperty, Clip, Track } from '../../types';

const BASE_PPMS = 0.12;
const LABEL_W = 160;
const TRACK_H = 30;
const RULER_H = 26;
const SNAP_MS = 100;

type Entry =
  | { kind: 'clip'; clip: Clip; property: AnimatableProperty; start: number; end: number; label: string }
  | { kind: 'track'; track: Track; property: AnimatableProperty; start: number; end: number; label: string };

interface Row {
  id: string;
  name: string;
  isGroup: boolean;
  depth: number;
  entries: Entry[];
}

function Ruler({ duration, ppms }: { duration: number; ppms: number }) {
  const marks: { t: number; major: boolean }[] = [];
  for (let t = 0; t <= duration; t += 250) marks.push({ t, major: t % 1000 === 0 });
  return (
    <Box position="relative" height={`${RULER_H}px`} ml={`${LABEL_W}px`} borderBottomWidth="1px" borderColor="gray.200" bg="gray.50">
      <Box position="absolute" top={0} height="100%" style={{ width: duration * ppms }}>
        {marks.map(({ t, major }) => (
          <Box key={t} position="absolute" top={0} style={{ left: t * ppms }}>
            <Box width="1px" height={major ? '10px' : '6px'} bg="gray.300" />
            {major && (
              <Text position="absolute" top="11px" left="2px" fontSize="9px" color="gray.500" whiteSpace="nowrap">
                {t / 1000}s
              </Text>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function Timeline() {
  const elements = useEditorStore((s) => s.elements);
  const groups = useEditorStore((s) => s.groups);
  const animation = useEditorStore((s) => s.animation);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const select = useEditorStore((s) => s.select);
  const setRightMode = useEditorStore((s) => s.setRightMode);
  const toggleGroupCollapsed = useEditorStore((s) => s.toggleGroupCollapsed);
  const currentTime = useEditorStore((s) => s.currentTime);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const toggle = useEditorStore((s) => s.toggle);
  const reset = useEditorStore((s) => s.reset);
  const loop = useEditorStore((s) => s.loop);
  const setLoop = useEditorStore((s) => s.setLoop);
  const setDuration = useEditorStore((s) => s.setDuration);
  const setFps = useEditorStore((s) => s.setFps);
  const updateClipTiming = useEditorStore((s) => s.updateClipTiming);
  const updateKeyframe = useEditorStore((s) => s.updateKeyframe);

  const canGroup = usePhase('p2');
  const canCustom = usePhase('p3c');
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(false);
  const PPMS = BASE_PPMS * zoom;
  const snapMs = useCallback((ms: number) => (snap ? Math.round(ms / SNAP_MS) * SNAP_MS : Math.round(ms)), [snap]);

  const { durationMs, fps, tracks, clips } = animation;
  const containerRef = useRef<HTMLDivElement>(null);

  // playback loop
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
      const next = state.currentTime + delta;
      if (next >= durationMs) {
        if (loop) state.setCurrentTime(0);
        else {
          state.setCurrentTime(durationMs);
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

  const entriesFor = useCallback(
    (targetId: string): Entry[] => {
      const out: Entry[] = [];
      Object.values(clips)
        .filter((c) => c.targetId === targetId && c.kind !== 'CUSTOM')
        .forEach((clip) => {
          const firstTrack = clip.trackIds.map((id) => tracks[id]).find(Boolean);
          out.push({
            kind: 'clip',
            clip,
            property: firstTrack?.property ?? 'opacity',
            start: clip.startTime,
            end: clip.startTime + clip.duration,
            label: clip.label ?? clip.effectId ?? 'Effect',
          });
        });
      Object.values(tracks)
        .filter((t) => t.targetId === targetId && (!t.clipId || clips[t.clipId]?.kind === 'CUSTOM'))
        .forEach((track) => {
          const kfs = sortKeyframes(track.keyframes);
          if (kfs.length === 0) return;
          out.push({
            kind: 'track',
            track,
            property: track.property,
            start: kfs[0].tMs,
            end: kfs[kfs.length - 1].tMs,
            label: PROPERTY_LABELS[track.property],
          });
        });
      return out;
    },
    [clips, tracks],
  );

  const rows: Row[] = useMemo(() => {
    if (!canGroup) {
      const order = buildSiblingOrder(elements, groups);
      return sortElementsForLayerList(elements, order).map((el) => ({
        id: el.id,
        name: el.name,
        isGroup: false,
        depth: 0,
        entries: entriesFor(el.id),
      }));
    }
    const byId = new Map(elements.map((e) => [e.id, e]));
    const result: Row[] = [];
    Object.values(groups)
      .filter((g) => !g.parentId)
      .forEach((g) => {
        result.push({ id: g.id, name: g.name, isGroup: true, depth: 0, entries: entriesFor(g.id) });
        if (!g.collapsed) {
          elementsInGroupOrder(g.children, byId).forEach((el) => {
            result.push({ id: el.id, name: el.name, isGroup: false, depth: 1, entries: entriesFor(el.id) });
          });
        }
      });
    elements
      .filter((e) => !e.parentId)
      .forEach((el) => {
        result.push({ id: el.id, name: el.name, isGroup: false, depth: 0, entries: entriesFor(el.id) });
      });
    return result;
  }, [elements, groups, entriesFor, canGroup]);

  const selectableIds = useMemo(
    () => layerListSelectableIds(buildLayerRows(elements, groups)),
    [elements, groups],
  );

  const handleRowSelect = useCallback(
    (id: string, e: React.MouseEvent) => {
      select(id, {
        additive: e.metaKey || e.ctrlKey,
        range: e.shiftKey,
        rangeOrder: selectableIds,
      });
      setRightMode('animate');
    },
    [select, selectableIds, setRightMode],
  );

  const seek = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left + el.scrollLeft - LABEL_W;
      setCurrentTime(Math.max(0, Math.min(x / PPMS, durationMs)));
    },
    [durationMs, setCurrentTime, PPMS],
  );

  const dragClip = (clipId: string, origStart: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const onMove = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) / PPMS;
      updateClipTiming(clipId, { startTime: Math.max(0, Math.min(snapMs(origStart + delta), durationMs)) });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const dragKeyframe = (trackId: string, keyframeId: string, origT: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const onMove = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) / PPMS;
      updateKeyframe(trackId, keyframeId, { tMs: Math.max(0, Math.min(snapMs(origT + delta), durationMs)) });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <Flex direction="column" height="240px" borderTopWidth="1px" borderColor="gray.200" bg="white" userSelect="none">
      {/* controls */}
      <HStack px={3} h="40px" borderBottomWidth="1px" borderColor="gray.200" spacing={2} flexShrink={0}>
        <IconButton aria-label="Reset" size="sm" variant="ghost" icon={<Icon as={LuSkipBack} />} onClick={reset} />
        <IconButton
          aria-label="Play/Pause"
          size="sm"
          colorScheme={isPlaying ? 'red' : 'green'}
          variant="solid"
          icon={<Icon as={isPlaying ? LuPause : LuPlay} />}
          onClick={toggle}
        />
        <IconButton
          aria-label="Loop"
          size="sm"
          variant="ghost"
          color={loop ? 'mcBlue.500' : 'gray.400'}
          icon={<Icon as={LuRepeat} />}
          onClick={() => setLoop(!loop)}
        />
        <Box px={2} py={0.5} bg="gray.100" borderRadius="6px" fontFamily="mono" fontSize="12px">
          {formatTime(currentTime)}
        </Box>
        <Text fontSize="11px" color="gray.400">
          / {formatTime(durationMs)}
        </Text>
        <Box flex={1} />
        <HStack spacing={1} borderWidth="1px" borderColor="gray.200" borderRadius="6px" px={2} h="26px">
          <Icon as={LuClock} boxSize={3} color="gray.400" />
          <Input
            variant="unstyled"
            size="xs"
            width="34px"
            textAlign="center"
            value={(durationMs / 1000).toFixed(1)}
            onChange={(e) => setDuration(Number(e.target.value) * 1000)}
          />
          <Text fontSize="10px" color="gray.400">
            s
          </Text>
        </HStack>
        <HStack spacing={1} borderWidth="1px" borderColor="gray.200" borderRadius="6px" px={2} h="26px">
          <Icon as={LuZap} boxSize={3} color="gray.400" />
          <Input
            variant="unstyled"
            size="xs"
            width="24px"
            textAlign="center"
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
          />
          <Text fontSize="10px" color="gray.400">
            fps
          </Text>
        </HStack>
        {canCustom && (
          <HStack spacing={1} pl={1}>
            <IconButton
              aria-label="Zoom out"
              size="xs"
              variant="ghost"
              icon={<Icon as={LuZoomOut} />}
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.5).toFixed(2)))}
            />
            <Text fontSize="10px" color="gray.400" minW="30px" textAlign="center">
              {Math.round(zoom * 100)}%
            </Text>
            <IconButton
              aria-label="Zoom in"
              size="xs"
              variant="ghost"
              icon={<Icon as={LuZoomIn} />}
              onClick={() => setZoom((z) => Math.min(4, +(z + 0.5).toFixed(2)))}
            />
            <IconButton
              aria-label="Toggle snapping"
              size="xs"
              variant="ghost"
              color={snap ? 'mcBlue.500' : 'gray.400'}
              icon={<Icon as={LuMagnet} />}
              title={snap ? 'Snap to 100ms: on' : 'Snap to 100ms: off'}
              onClick={() => setSnap((v) => !v)}
            />
          </HStack>
        )}
      </HStack>

      {/* scrollable timeline */}
      <Box ref={containerRef} flex={1} overflow="auto" position="relative">
        <Box style={{ width: LABEL_W + durationMs * PPMS, minWidth: '100%' }}>
          <Box position="sticky" top={0} zIndex={3} cursor="pointer" onPointerDown={(e) => seek(e.clientX)}>
            <Ruler duration={durationMs} ppms={PPMS} />
          </Box>

          {/* playhead */}
          <Box
            position="absolute"
            top={0}
            bottom={0}
            zIndex={4}
            pointerEvents="none"
            style={{ left: LABEL_W + currentTime * PPMS, width: 2 }}
          >
            <Box position="absolute" top={0} left="-5px" width={0} height={0}
              borderLeft="6px solid transparent" borderRight="6px solid transparent" borderTop="8px solid #E10600" />
            <Box position="absolute" top="6px" width="2px" bottom={0} bg="#E10600" />
          </Box>

          {rows.map((row) => {
            const laneCount = Math.max(1, row.entries.length);
            const selected = selectedIds.includes(row.id);
            return (
              <Flex
                key={row.id}
                borderBottomWidth="1px"
                borderColor="gray.100"
                bg={selected ? 'mcBlue.50' : 'white'}
                style={{ height: laneCount * TRACK_H }}
              >
                {/* label */}
                <Box width={`${LABEL_W}px`} flexShrink={0} borderRightWidth="1px" borderColor="gray.200">
                  <HStack
                    height={`${TRACK_H}px`}
                    pl={`${8 + row.depth * 14}px`}
                    pr={2}
                    spacing={1}
                    cursor="pointer"
                    onClick={(e) => handleRowSelect(row.id, e)}
                  >
                    {row.isGroup && (
                      <Icon
                        as={groups[row.id]?.collapsed ? LuChevronRight : LuChevronDown}
                        boxSize={3}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroupCollapsed(row.id);
                        }}
                      />
                    )}
                    <Text fontSize="12px" fontWeight={row.isGroup ? 700 : 500} noOfLines={1} color="gray.700">
                      {row.name}
                    </Text>
                  </HStack>
                </Box>

                {/* track area */}
                <Box position="relative" flex={1} onPointerDown={(e) => seek(e.clientX)}>
                  {row.entries.length === 0 && (
                    <Flex height={`${TRACK_H}px`} align="center" pl={3}>
                      <Text fontSize="10px" color="gray.300">
                        no animation
                      </Text>
                    </Flex>
                  )}
                  {row.entries.map((entry, laneIndex) => {
                    const color = PROPERTY_COLORS[entry.property];
                    const top = laneIndex * TRACK_H + TRACK_H / 2;
                    return (
                      <Box key={entry.kind === 'clip' ? entry.clip.id : entry.track.id}>
                        <Box
                          position="absolute"
                          height="14px"
                          borderRadius="full"
                          style={{
                            top: top - 7,
                            left: entry.start * PPMS,
                            width: Math.max((entry.end - entry.start) * PPMS, 10),
                            background: color,
                            opacity: 0.85,
                          }}
                          cursor={entry.kind === 'clip' ? 'grab' : 'default'}
                          onPointerDown={
                            entry.kind === 'clip'
                              ? dragClip(entry.clip.id, entry.clip.startTime)
                              : (e) => e.stopPropagation()
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowSelect(row.id, e);
                          }}
                          title={entry.label}
                        >
                          <Text px={2} fontSize="9px" color="white" lineHeight="14px" noOfLines={1} fontWeight={600}>
                            {entry.label}
                          </Text>
                        </Box>
                        {/* keyframes for custom tracks */}
                        {entry.kind === 'track' &&
                          sortKeyframes(entry.track.keyframes).map((kf) => (
                            <Box
                              key={kf.id}
                              position="absolute"
                              width="10px"
                              height="10px"
                              borderRadius="2px"
                              border="1px solid rgba(0,0,0,0.25)"
                              cursor="col-resize"
                              style={{
                                top: top - 5,
                                left: kf.tMs * PPMS - 5,
                                background: color,
                                transform: 'rotate(45deg)',
                              }}
                              onPointerDown={dragKeyframe(entry.track.id, kf.id, kf.tMs)}
                              title={`${kf.value} @ ${kf.tMs}ms`}
                            />
                          ))}
                      </Box>
                    );
                  })}
                </Box>
              </Flex>
            );
          })}
        </Box>
      </Box>
    </Flex>
  );
}
