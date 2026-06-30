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
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { LuCopy, LuPlus, LuSparkles, LuTrash2, LuDiamond } from 'react-icons/lu';
import { useEditorStore } from '../../store/editorStore';
import { usePhase } from '../../store/featureStore';
import { EASING_OPTIONS } from '../../lib/easing';
import { effectsByKindForPhases, getEffect, PROPERTY_COLORS, PROPERTY_LABELS, SLIDE_DISTANCE } from '../../lib/effects';
import type { AnimatableProperty, Clip, ClipKind, EasingFunction, Track } from '../../types';
import { sortKeyframes } from '../../lib/engine';

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

function AppliedClipCard({ clip, canCustom, canExtended }: { clip: Clip; canCustom: boolean; canExtended: boolean }) {
  const tracks = useEditorStore((s) => s.animation.tracks);
  const durationMs = useEditorStore((s) => s.animation.durationMs);
  const updateClipTiming = useEditorStore((s) => s.updateClipTiming);
  const updateClipIntensity = useEditorStore((s) => s.updateClipIntensity);
  const convertClipToCustom = useEditorStore((s) => s.convertClipToCustom);
  const duplicateClip = useEditorStore((s) => s.duplicateClip);
  const deleteClip = useEditorStore((s) => s.deleteClip);
  const color = PROPERTY_COLORS[clipPrimaryProperty(clip, tracks)];

  const effect = clip.effectId ? getEffect(clip.effectId) : undefined;
  const isSlide = effect != null && effect.id.startsWith('slide-');
  const supportsIntensity = effect != null && effect.category !== 'fade' && !isSlide;

  return (
    <Box borderWidth="1px" borderLeftWidth="3px" borderLeftColor={color} borderColor="gray.200" borderRadius="8px" p={3} bg="gray.50">
      <HStack justify="space-between" mb={3}>
        <HStack spacing={2}>
          <Icon as={LuSparkles} color="mcBlue.500" boxSize={3.5} />
          <Text fontSize="14px" fontWeight={700}>
            {clip.label ?? clip.effectId}
          </Text>
        </HStack>
        <HStack spacing={0}>
          {canExtended && (
            <IconButton
              aria-label="Duplicate effect"
              size="xs"
              variant="ghost"
              color="gray.400"
              _hover={{ color: 'mcBlue.500' }}
              icon={<Icon as={LuCopy} />}
              onClick={() => duplicateClip(clip.id)}
            />
          )}
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
      {isSlide && (
        <Box mb={3}>
          <Text fontSize="11px" color="gray.500" mb={1}>
            Distance (px)
          </Text>
          <Input
            size="xs"
            type="number"
            step={10}
            min={0}
            value={Math.round((clip.intensity ?? 1) * SLIDE_DISTANCE)}
            onChange={(e) => updateClipIntensity(clip.id, Math.max(0, Number(e.target.value)) / SLIDE_DISTANCE)}
          />
        </Box>
      )}
      {canExtended && supportsIntensity && (
        <Box mb={3}>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="11px" color="gray.500">
              Intensity
            </Text>
            <Text fontSize="11px" color="gray.500">
              {Math.round((clip.intensity ?? 1) * 100)}%
            </Text>
          </HStack>
          <Slider
            min={0.25}
            max={2}
            step={0.05}
            value={clip.intensity ?? 1}
            onChange={(v) => updateClipIntensity(clip.id, v)}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </Box>
      )}
      {canCustom && (
        <Button size="xs" variant="outline" width="100%" onClick={() => convertClipToCustom(clip.id)}>
          Convert to Custom
        </Button>
      )}
    </Box>
  );
}

function EffectGallery({
  kind,
  p3b,
  onApply,
}: {
  kind: ClipKind;
  p3b: boolean;
  onApply: (effectId: string) => void;
}) {
  const effects = effectsByKindForPhases(kind, p3b);
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
                  onClick={() => onApply(e.id)}
                  _hover={{ borderColor: 'mcBlue.400', bg: 'mcBlue.50' }}
                >
                  <Box
                    boxSize="14px"
                    borderRadius="3px"
                    bg={PROPERTY_COLORS[e.build({ x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 })[0].property]}
                  />
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
  const duplicateKeyframe = useEditorStore((s) => s.duplicateKeyframe);
  const kf = track.keyframes.find((k) => k.id === keyframeId)!;
  return (
    <HStack spacing={1.5}>
      <Input
        size="xs"
        width="56px"
        type="number"
        value={Math.round(kf.tMs)}
        onChange={(e) => updateKeyframe(track.id, kf.id, { tMs: Math.max(0, Math.min(Number(e.target.value), durationMs)) })}
        title="Time (ms)"
      />
      <Input
        size="xs"
        width="52px"
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
        aria-label="Duplicate keyframe"
        size="xs"
        variant="ghost"
        color="gray.400"
        _hover={{ color: 'mcBlue.500' }}
        icon={<Icon as={LuCopy} />}
        onClick={() => duplicateKeyframe(track.id, kf.id)}
      />
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
  const shiftTrack = useEditorStore((s) => s.shiftTrack);

  // Show every track on the target — including the keyframes generated by quick
  // (preset) animations — so they can be inspected and tweaked in one place.
  const targetTracks = Object.values(tracks).filter((t) => t.targetId === targetId);
  const byProperty = (p: AnimatableProperty) => targetTracks.filter((t) => t.property === p);

  const trackSource = (track: Track): { label: string; preset: boolean } => {
    const clip = track.clipId ? clips[track.clipId] : undefined;
    if (clip && clip.kind !== 'CUSTOM') {
      return { label: `${clip.label ?? clip.effectId ?? 'Effect'} · ${clip.kind}`, preset: true };
    }
    return { label: 'Custom', preset: false };
  };

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
                  {propTracks.map((track) => {
                    const source = trackSource(track);
                    return (
                    <Box key={track.id} px={2.5} pb={2.5} bg="gray.50">
                      <HStack pt={1.5} spacing={1.5}>
                        <Box
                          boxSize="6px"
                          borderRadius="full"
                          bg={source.preset ? 'mcBlue.400' : 'gray.300'}
                        />
                        <Text fontSize="10px" fontWeight={600} color={source.preset ? 'mcBlue.600' : 'gray.400'} textTransform="uppercase" noOfLines={1}>
                          {source.label}
                        </Text>
                      </HStack>
                      <HStack justify="space-between" py={1}>
                        <HStack spacing={0}>
                          <IconButton
                            aria-label="Shift track left"
                            size="xs"
                            variant="ghost"
                            fontSize="11px"
                            onClick={() => shiftTrack(track.id, -100)}
                          >
                            −100
                          </IconButton>
                          <IconButton
                            aria-label="Shift track right"
                            size="xs"
                            variant="ghost"
                            fontSize="11px"
                            onClick={() => shiftTrack(track.id, 100)}
                          >
                            +100
                          </IconButton>
                        </HStack>
                        <HStack spacing={0}>
                          <IconButton
                            aria-label="Add keyframe at playhead"
                            size="xs"
                            variant="ghost"
                            icon={<Icon as={LuDiamond} />}
                            title="Add keyframe at playhead"
                            onClick={() =>
                              addKeyframe(track.id, currentTime, sortKeyframes(track.keyframes).slice(-1)[0]?.value ?? 0)
                            }
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
                      </HStack>
                      <VStack align="stretch" spacing={1}>
                        {sortKeyframes(track.keyframes).map((kf) => (
                          <KeyframeRow key={kf.id} track={track} keyframeId={kf.id} />
                        ))}
                      </VStack>
                    </Box>
                    );
                  })}
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
  const applyEffect = useEditorStore((s) => s.applyEffect);
  const applyEffectToSelection = useEditorStore((s) => s.applyEffectToSelection);
  const p3b = usePhase('p3b');
  const p3c = usePhase('p3c');

  const tabs = useMemo<{ id: ClipKind; label: string }[]>(() => {
    const out: { id: ClipKind; label: string }[] = [
      { id: 'IN', label: 'IN' },
      { id: 'OUT', label: 'OUT' },
    ];
    if (p3b) out.splice(1, 0, { id: 'DURING', label: 'DURING' });
    if (p3c) out.push({ id: 'CUSTOM', label: 'CUSTOM' });
    return out;
  }, [p3b, p3c]);

  const [tabRaw, setTab] = useState<ClipKind>('IN');
  const tab = tabs.some((t) => t.id === tabRaw) ? tabRaw : 'IN';

  const multi = selectedIds.length > 1;
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

  if (!primaryId) return null;

  const onApply = (effectId: string) => {
    if (multi) applyEffectToSelection(effectId);
    else applyEffect(primaryId, effectId);
  };

  const appliedClips = Object.values(clips).filter((c) => c.targetId === primaryId && c.kind === tab);

  return (
    <Flex direction="column" height="100%">
      <Grid templateColumns={`repeat(${tabs.length}, 1fr)`} borderBottomWidth="1px" borderColor="gray.200" px={4}>
        {tabs.map((t) => (
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

      {multi && tab !== 'CUSTOM' && (
        <Box px={4} pt={3}>
          <Text fontSize="12px" color="mcBlue.600" fontWeight={600}>
            Applying to {selectedIds.length} selected layers/groups.
          </Text>
        </Box>
      )}

      <Box flex={1} overflowY="auto" px={4} py={4}>
        {tab === 'CUSTOM' ? (
          <CustomTab targetId={primaryId} />
        ) : (
          <VStack align="stretch" spacing={4}>
            {!multi && appliedClips.length > 0 && (
              <Box>
                <Text fontSize="11px" fontWeight={700} textTransform="uppercase" color="gray.500" mb={2}>
                  Applied
                </Text>
                <VStack align="stretch" spacing={2}>
                  {appliedClips.map((c) => (
                    <AppliedClipCard key={c.id} clip={c} canCustom={p3c} canExtended={p3b} />
                  ))}
                </VStack>
              </Box>
            )}
            <EffectGallery kind={tab} p3b={p3b} onApply={onApply} />
          </VStack>
        )}
      </Box>
    </Flex>
  );
}
