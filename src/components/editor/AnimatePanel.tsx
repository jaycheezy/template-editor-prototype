import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Icon,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import { LuPlus, LuSparkles, LuTrash2, LuDiamond } from 'react-icons/lu';
import { useEditorStore } from '../../store/editorStore';
import { EASING_OPTIONS } from '../../lib/easing';
import { effectsByKind, PROPERTY_COLORS, PROPERTY_LABELS } from '../../lib/effects';
import type { AnimatableProperty, Clip, ClipKind, EasingFunction, Track } from '../../types';
import { sortKeyframes } from '../../lib/engine';

const TABS: { id: ClipKind; label: string }[] = [
  { id: 'IN', label: 'IN' },
  { id: 'DURING', label: 'DURING' },
  { id: 'OUT', label: 'OUT' },
  { id: 'CUSTOM', label: 'CUSTOM' },
];

const PROPERTY_GROUPS: { label: string; properties: AnimatableProperty[] }[] = [
  { label: 'Move', properties: ['x', 'y'] },
  { label: 'Scale', properties: ['scaleX', 'scaleY'] },
  { label: 'Rotate', properties: ['rotation'] },
  { label: 'Opacity', properties: ['opacity'] },
];

function clipPrimaryProperty(clip: Clip, tracks: Record<string, Track>): AnimatableProperty {
  const first = clip.trackIds.map((id) => tracks[id]).find(Boolean);
  return first?.property ?? 'opacity';
}

function AppliedClipCard({ clip }: { clip: Clip }) {
  const tracks = useEditorStore((s) => s.animation.tracks);
  const durationMs = useEditorStore((s) => s.animation.durationMs);
  const updateClipTiming = useEditorStore((s) => s.updateClipTiming);
  const convertClipToCustom = useEditorStore((s) => s.convertClipToCustom);
  const deleteClip = useEditorStore((s) => s.deleteClip);
  const color = PROPERTY_COLORS[clipPrimaryProperty(clip, tracks)];

  return (
    <Box borderWidth="1px" borderLeftWidth="3px" borderLeftColor={color} borderColor="gray.200" borderRadius="8px" p={3} bg="gray.50">
      <HStack justify="space-between" mb={3}>
        <HStack spacing={2}>
          <Icon as={LuSparkles} color="mcBlue.500" boxSize={3.5} />
          <Text fontSize="14px" fontWeight={700}>
            {clip.label ?? clip.effectId}
          </Text>
        </HStack>
        <IconButton
          aria-label="Delete effect"
          size="xs"
          variant="ghost"
          color="gray.400"
          _hover={{ color: 'red.500' }}
          icon={<Icon as={LuTrash2} />}
          onClick={() => deleteClip(clip.id)}
        />
      </HStack>
      <HStack spacing={3} mb={3}>
        <Box flex={1}>
          <Text fontSize="11px" color="gray.500" mb={1}>
            Duration (s)
          </Text>
          <Input
            size="xs"
            type="number"
            step={0.1}
            value={(clip.duration / 1000).toFixed(1)}
            onChange={(e) => updateClipTiming(clip.id, { duration: Math.max(100, Number(e.target.value) * 1000) })}
          />
        </Box>
        <Box flex={1}>
          <Text fontSize="11px" color="gray.500" mb={1}>
            Start (s)
          </Text>
          <Input
            size="xs"
            type="number"
            step={0.1}
            value={(clip.startTime / 1000).toFixed(1)}
            onChange={(e) =>
              updateClipTiming(clip.id, {
                startTime: Math.max(0, Math.min(Number(e.target.value) * 1000, durationMs)),
              })
            }
          />
        </Box>
      </HStack>
      <Box mb={3}>
        <Text fontSize="11px" color="gray.500" mb={1}>
          Easing
        </Text>
        <Select
          size="xs"
          value={clip.easing}
          onChange={(e) => updateClipTiming(clip.id, { easing: e.target.value as EasingFunction })}
        >
          {EASING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Box>
      <Button size="xs" variant="outline" width="100%" onClick={() => convertClipToCustom(clip.id)}>
        Convert to Custom
      </Button>
    </Box>
  );
}

function EffectGallery({ kind, targetId }: { kind: ClipKind; targetId: string }) {
  const applyEffect = useEditorStore((s) => s.applyEffect);
  const effects = effectsByKind(kind);
  const categories = useMemo(() => Array.from(new Set(effects.map((e) => e.category))), [effects]);

  return (
    <VStack align="stretch" spacing={4}>
      {categories.map((cat) => (
        <Box key={cat}>
          <Text fontSize="11px" fontWeight={700} textTransform="uppercase" color="gray.500" mb={2}>
            {cat}
          </Text>
          <SimpleGrid columns={2} spacing={2}>
            {effects
              .filter((e) => e.category === cat)
              .map((e) => (
                <Button
                  key={e.id}
                  variant="outline"
                  size="sm"
                  height="56px"
                  borderColor="gray.200"
                  flexDir="column"
                  gap={1}
                  onClick={() => applyEffect(targetId, e.id)}
                  _hover={{ borderColor: 'mcBlue.400', bg: 'mcBlue.50' }}
                >
                  <Box boxSize="14px" borderRadius="3px" bg={PROPERTY_COLORS[e.build({ x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 })[0].property]} />
                  <Text fontSize="11px" fontWeight={500}>
                    {e.label}
                  </Text>
                </Button>
              ))}
          </SimpleGrid>
        </Box>
      ))}
    </VStack>
  );
}

function KeyframeRow({ track, keyframeId }: { track: Track; keyframeId: string }) {
  const durationMs = useEditorStore((s) => s.animation.durationMs);
  const updateKeyframe = useEditorStore((s) => s.updateKeyframe);
  const deleteKeyframe = useEditorStore((s) => s.deleteKeyframe);
  const kf = track.keyframes.find((k) => k.id === keyframeId)!;
  return (
    <HStack spacing={1.5}>
      <Input
        size="xs"
        width="60px"
        type="number"
        value={Math.round(kf.tMs)}
        onChange={(e) => updateKeyframe(track.id, kf.id, { tMs: Math.max(0, Math.min(Number(e.target.value), durationMs)) })}
        title="Time (ms)"
      />
      <Input
        size="xs"
        width="56px"
        type="number"
        step={0.1}
        value={kf.value}
        onChange={(e) => updateKeyframe(track.id, kf.id, { value: Number(e.target.value) })}
        title="Value"
      />
      <Select
        size="xs"
        flex={1}
        value={kf.easing}
        onChange={(e) => updateKeyframe(track.id, kf.id, { easing: e.target.value as EasingFunction })}
      >
        {EASING_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <IconButton
        aria-label="Delete keyframe"
        size="xs"
        variant="ghost"
        color="gray.400"
        _hover={{ color: 'red.500' }}
        icon={<Icon as={LuTrash2} />}
        onClick={() => deleteKeyframe(track.id, kf.id)}
      />
    </HStack>
  );
}

function CustomTab({ targetId }: { targetId: string }) {
  const tracks = useEditorStore((s) => s.animation.tracks);
  const clips = useEditorStore((s) => s.animation.clips);
  const currentTime = useEditorStore((s) => s.currentTime);
  const addCustomTrack = useEditorStore((s) => s.addCustomTrack);
  const addKeyframe = useEditorStore((s) => s.addKeyframe);
  const deleteTrack = useEditorStore((s) => s.deleteTrack);

  const targetTracks = Object.values(tracks).filter(
    (t) => t.targetId === targetId && (!t.clipId || clips[t.clipId]?.kind === 'CUSTOM'),
  );
  const byProperty = (p: AnimatableProperty) => targetTracks.filter((t) => t.property === p);

  return (
    <VStack align="stretch" spacing={4}>
      {PROPERTY_GROUPS.map((group) => (
        <Box key={group.label}>
          <Text fontSize="11px" fontWeight={700} textTransform="uppercase" color="gray.500" mb={1.5}>
            {group.label}
          </Text>
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="8px" overflow="hidden">
            {group.properties.map((property) => {
              const propTracks = byProperty(property);
              return (
                <Box key={property} borderTopWidth="1px" borderColor="gray.100" _first={{ borderTopWidth: 0 }}>
                  <HStack px={2.5} py={2} spacing={2}>
                    <Box boxSize="8px" borderRadius="full" bg={PROPERTY_COLORS[property]} />
                    <Text fontSize="13px" fontWeight={600} flex={1}>
                      {PROPERTY_LABELS[property]}
                    </Text>
                    <IconButton
                      aria-label="Add track"
                      size="xs"
                      variant="ghost"
                      icon={<Icon as={LuPlus} />}
                      onClick={() => addCustomTrack(targetId, property)}
                    />
                  </HStack>
                  {propTracks.map((track) => (
                    <Box key={track.id} px={2.5} pb={2.5} bg="gray.50">
                      <HStack justify="flex-end" py={1}>
                        <IconButton
                          aria-label="Add keyframe at playhead"
                          size="xs"
                          variant="ghost"
                          icon={<Icon as={LuDiamond} />}
                          title="Add keyframe at playhead"
                          onClick={() => addKeyframe(track.id, currentTime, sortKeyframes(track.keyframes).slice(-1)[0]?.value ?? 0)}
                        />
                        <IconButton
                          aria-label="Delete track"
                          size="xs"
                          variant="ghost"
                          color="gray.400"
                          _hover={{ color: 'red.500' }}
                          icon={<Icon as={LuTrash2} />}
                          onClick={() => deleteTrack(track.id)}
                        />
                      </HStack>
                      <VStack align="stretch" spacing={1}>
                        {sortKeyframes(track.keyframes).map((kf) => (
                          <KeyframeRow key={kf.id} track={track} keyframeId={kf.id} />
                        ))}
                      </VStack>
                    </Box>
                  ))}
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}
    </VStack>
  );
}

export default function AnimatePanel() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const clips = useEditorStore((s) => s.animation.clips);
  const [tab, setTab] = useState<ClipKind>('IN');

  const primaryId = selectedIds[selectedIds.length - 1] ?? null;

  if (selectedIds.length === 0) {
    return (
      <Flex direction="column" align="center" justify="center" py={16} px={6} color="gray.400">
        <Icon as={LuSparkles} boxSize={6} mb={3} />
        <Text fontSize="13px" textAlign="center">
          Select a layer or group to animate it.
        </Text>
      </Flex>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <Flex direction="column" align="center" justify="center" py={16} px={6} color="gray.400">
        <Icon as={LuSparkles} boxSize={6} mb={3} />
        <Text fontSize="13px" textAlign="center" lineHeight="1.5">
          {selectedIds.length} items selected. Select a single layer or group to apply animation effects.
        </Text>
      </Flex>
    );
  }

  if (!primaryId) {
    return null;
  }

  const appliedClips = Object.values(clips).filter((c) => c.targetId === primaryId && c.kind === tab);

  return (
    <Flex direction="column" height="100%">
      <Grid templateColumns="repeat(4, 1fr)" borderBottomWidth="1px" borderColor="gray.200" px={4}>
        {TABS.map((t) => (
          <Button
            key={t.id}
            variant="unstyled"
            height="40px"
            borderRadius={0}
            fontSize="13px"
            fontWeight={600}
            color={tab === t.id ? 'mcBlue.600' : 'gray.500'}
            borderBottomWidth="2px"
            borderBottomColor={tab === t.id ? 'mcBlue.500' : 'transparent'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </Grid>

      <Box flex={1} overflowY="auto" px={4} py={4}>
        {tab === 'CUSTOM' ? (
          <CustomTab targetId={primaryId} />
        ) : (
          <VStack align="stretch" spacing={4}>
            {appliedClips.length > 0 && (
              <Box>
                <Text fontSize="11px" fontWeight={700} textTransform="uppercase" color="gray.500" mb={2}>
                  Applied
                </Text>
                <VStack align="stretch" spacing={2}>
                  {appliedClips.map((c) => (
                    <AppliedClipCard key={c.id} clip={c} />
                  ))}
                </VStack>
              </Box>
            )}
            <EffectGallery kind={tab} targetId={primaryId} />
          </VStack>
        )}
      </Box>
    </Flex>
  );
}
