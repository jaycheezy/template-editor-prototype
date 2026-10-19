import { useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Select,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  LuActivity,
  LuArrowDown,
  LuArrowLeft,
  LuArrowRight,
  LuArrowUp,
  LuArrowUpDown,
  LuChevronDown,
  LuChevronLeft,
  LuChevronUp,
  LuCopy,
  LuDiamond,
  LuEye,
  LuEyeOff,
  LuMaximize2,
  LuMinimize2,
  LuPlus,
  LuRotateCw,
  LuSparkles,
  LuTrash2,
  LuWaves,
} from 'react-icons/lu';
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

/** The roles a user picks from; they map onto the IN / DURING / OUT clip kinds. */
const ROLES: { kind: ClipKind; label: string; color: string }[] = [
  { kind: 'IN', label: 'Entrance', color: 'green.500' },
  { kind: 'DURING', label: 'Emphasis', color: 'orange.500' },
  { kind: 'OUT', label: 'Exit', color: 'red.500' },
];

const roleLabel = (kind: ClipKind) => ROLES.find((r) => r.kind === kind)?.label ?? kind;
const roleColor = (kind: ClipKind) => ROLES.find((r) => r.kind === kind)?.color ?? 'gray.500';

/** Arrows point in the direction the layer travels. */
const EFFECT_ICONS: Record<string, IconType> = {
  'fade-in': LuEye,
  'slide-in-left': LuArrowRight,
  'slide-in-right': LuArrowLeft,
  'slide-in-up': LuArrowDown,
  'slide-in-down': LuArrowUp,
  'pop-in': LuMaximize2,
  'spin-in': LuRotateCw,
  pulse: LuActivity,
  float: LuArrowUpDown,
  wiggle: LuWaves,
  'fade-out': LuEyeOff,
  'slide-out-left': LuArrowLeft,
  'slide-out-right': LuArrowRight,
  'slide-out-up': LuArrowUp,
  'slide-out-down': LuArrowDown,
  'pop-out': LuMinimize2,
};

const fieldLabelProps = { fontSize: '12px', color: 'gray.500', mb: 1 } as const;

function AppliedClipCard({
  clip,
  open,
  onToggle,
  onChangeType,
  onConvert,
  canCustom,
  canExtended,
}: {
  clip: Clip;
  open: boolean;
  onToggle: () => void;
  onChangeType: (clip: Clip, effectId: string) => void;
  onConvert: (clipId: string) => void;
  canCustom: boolean;
  canExtended: boolean;
}) {
  const durationMs = useEditorStore((s) => s.animation.durationMs);
  const updateClipTiming = useEditorStore((s) => s.updateClipTiming);
  const updateClipIntensity = useEditorStore((s) => s.updateClipIntensity);
  const duplicateClip = useEditorStore((s) => s.duplicateClip);
  const deleteClip = useEditorStore((s) => s.deleteClip);

  const effect = clip.effectId ? getEffect(clip.effectId) : undefined;
  const isSlide = effect != null && effect.id.startsWith('slide-');
  const supportsIntensity = effect != null && effect.category !== 'fade' && !isSlide;
  const typeOptions = effectsByKindForPhases(clip.kind, canExtended);
  const title = clip.label ?? effect?.label ?? clip.effectId ?? 'Animation';

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="4px" overflow="hidden" bg="gray.50">
      <Flex
        as="button"
        type="button"
        w="100%"
        align="center"
        justify="space-between"
        px={4}
        py={3}
        aria-expanded={open}
        onClick={onToggle}
        borderBottomWidth={open ? '1px' : 0}
        borderColor="gray.200"
        _hover={{ bg: 'gray.100' }}
      >
        <Text fontSize="14px" fontWeight={500} textAlign="left">
          {title}
        </Text>
        <HStack spacing={3}>
          <Text fontSize="12px" color={roleColor(clip.kind)}>
            {roleLabel(clip.kind)}
          </Text>
          <Icon as={open ? LuChevronUp : LuChevronDown} boxSize={4} />
        </HStack>
      </Flex>

      {open && (
        <VStack align="stretch" spacing={4} p={4}>
          <Box>
            <Text {...fieldLabelProps}>Type</Text>
            <Select
              size="sm"
              bg="white"
              borderRadius="4px"
              value={clip.effectId ?? ''}
              onChange={(e) => onChangeType(clip, e.target.value)}
            >
              {!typeOptions.some((o) => o.id === clip.effectId) && clip.effectId && (
                <option value={clip.effectId}>{title}</option>
              )}
              {typeOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Box>
          <Box>
            <Text {...fieldLabelProps}>Duration (s)</Text>
            <Input
              size="sm"
              bg="white"
              borderRadius="4px"
              type="number"
              step={0.1}
              value={(clip.duration / 1000).toFixed(1)}
              onChange={(e) => updateClipTiming(clip.id, { duration: Math.max(100, Number(e.target.value) * 1000) })}
            />
          </Box>
          <Box>
            <Text {...fieldLabelProps}>Start (s)</Text>
            <Input
              size="sm"
              bg="white"
              borderRadius="4px"
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
          <Box>
            <Text {...fieldLabelProps}>Easing</Text>
            <Select
              size="sm"
              bg="white"
              borderRadius="4px"
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
            <Box>
              <Text {...fieldLabelProps}>Distance (px)</Text>
              <Input
                size="sm"
                bg="white"
                borderRadius="4px"
                type="number"
                step={10}
                min={0}
                value={Math.round((clip.intensity ?? 1) * SLIDE_DISTANCE)}
                onChange={(e) => updateClipIntensity(clip.id, Math.max(0, Number(e.target.value)) / SLIDE_DISTANCE)}
              />
            </Box>
          )}
          {canExtended && supportsIntensity && (
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text {...fieldLabelProps} mb={0}>
                  Intensity
                </Text>
                <Text fontSize="12px" color="gray.500">
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
          <HStack justify="space-between" pt={1}>
            <HStack spacing={1}>
              {canExtended && (
                <Button
                  size="xs"
                  variant="ghost"
                  leftIcon={<Icon as={LuCopy} />}
                  color="gray.600"
                  onClick={() => duplicateClip(clip.id)}
                >
                  Duplicate
                </Button>
              )}
              {canCustom && (
                <Button size="xs" variant="ghost" color="gray.600" onClick={() => onConvert(clip.id)}>
                  Convert to Custom
                </Button>
              )}
            </HStack>
            <Button
              size="xs"
              variant="ghost"
              color="gray.700"
              fontWeight={400}
              leftIcon={<Icon as={LuTrash2} boxSize={4} />}
              _hover={{ color: 'red.500', bg: 'transparent' }}
              onClick={() => deleteClip(clip.id)}
            >
              Remove
            </Button>
          </HStack>
        </VStack>
      )}
    </Box>
  );
}

/** "Select Role" -> pick Entrance / Emphasis / Exit -> pick the animation. */
function AddAnimationPicker({
  step,
  canExtended,
  onPickRole,
  onBack,
  onApply,
}: {
  step: ClipKind | 'roles';
  canExtended: boolean;
  onPickRole: (kind: ClipKind) => void;
  onBack: () => void;
  onApply: (effectId: string) => void;
}) {
  const roles = ROLES.filter((r) => canExtended || r.kind !== 'DURING');
  const optionProps = {
    variant: 'outline',
    justifyContent: 'flex-start',
    w: '100%',
    h: '40px',
    px: 4,
    bg: 'white',
    borderColor: 'gray.200',
    borderRadius: '4px',
    fontWeight: 400,
    fontSize: '14px',
    _hover: { borderColor: 'mcBlue.400', bg: 'mcBlue.50' },
  } as const;

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="4px" bg="gray.50" p={4} mt={4}>
      {step === 'roles' ? (
        <>
          <Text fontSize="16px" fontWeight={600} color="gray.500" mb={3}>
            Select Role
          </Text>
          <VStack align="stretch" spacing={2}>
            {roles.map((r) => (
              <Button key={r.kind} {...optionProps} onClick={() => onPickRole(r.kind)}>
                {r.label}
              </Button>
            ))}
          </VStack>
        </>
      ) : (
        <>
          <HStack mb={3} spacing={1}>
            <IconButton
              aria-label="Back to roles"
              size="xs"
              variant="ghost"
              color="gray.500"
              icon={<Icon as={LuChevronLeft} boxSize={4} />}
              onClick={onBack}
            />
            <Text fontSize="16px" fontWeight={600} color="gray.500">
              {roleLabel(step)}
            </Text>
          </HStack>
          <VStack align="stretch" spacing={2}>
            {effectsByKindForPhases(step, canExtended).map((e) => (
              <Button
                key={e.id}
                {...optionProps}
                leftIcon={<Icon as={EFFECT_ICONS[e.id] ?? LuSparkles} boxSize={4} color="gray.600" />}
                onClick={() => onApply(e.id)}
              >
                {e.label}
              </Button>
            ))}
          </VStack>
        </>
      )}
    </Box>
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

function AnimateBody({ selectedIds }: { selectedIds: string[] }) {
  const clips = useEditorStore((s) => s.animation.clips);
  const applyEffect = useEditorStore((s) => s.applyEffect);
  const applyEffectToSelection = useEditorStore((s) => s.applyEffectToSelection);
  const deleteClip = useEditorStore((s) => s.deleteClip);
  const updateClipTiming = useEditorStore((s) => s.updateClipTiming);
  const convertClipToCustom = useEditorStore((s) => s.convertClipToCustom);
  const p3b = usePhase('extended');
  const p3c = usePhase('keyframes');

  // undefined = default (first card open), null = all collapsed
  const [openRaw, setOpen] = useState<string | null | undefined>(undefined);
  const [step, setStep] = useState<'closed' | 'roles' | ClipKind>('closed');
  const [customOpen, setCustomOpen] = useState(false);

  const multi = selectedIds.length > 1;
  const primaryId = selectedIds[selectedIds.length - 1];

  const applied = useMemo(
    () =>
      Object.values(clips)
        .filter((c) => c.targetId === primaryId && c.kind !== 'CUSTOM')
        .sort((a, b) => a.startTime - b.startTime),
    [clips, primaryId],
  );
  const openId = openRaw === undefined ? (applied[0]?.id ?? null) : openRaw;

  /** The clip that exists now but not before `before` was captured. */
  const newClipSince = (before: Set<string>): Clip | undefined =>
    Object.values(useEditorStore.getState().animation.clips).find((c) => !before.has(c.id) && c.targetId === primaryId);
  const clipIds = () => new Set(Object.keys(useEditorStore.getState().animation.clips));

  const onApply = (effectId: string) => {
    const before = clipIds();
    if (multi) applyEffectToSelection(effectId);
    else applyEffect(primaryId, effectId);
    const created = multi ? undefined : newClipSince(before);
    if (created) setOpen(created.id);
    setStep('closed');
  };

  // swap the effect but keep the timing the user already set
  const onChangeType = (clip: Clip, effectId: string) => {
    if (effectId === clip.effectId) return;
    const { startTime, duration, easing } = clip;
    const before = clipIds();
    deleteClip(clip.id);
    before.delete(clip.id);
    applyEffect(clip.targetId, effectId);
    const created = newClipSince(before);
    if (created) {
      updateClipTiming(created.id, { startTime, duration, easing });
      setOpen(created.id);
    }
  };

  const onConvert = (clipId: string) => {
    convertClipToCustom(clipId);
    setCustomOpen(true);
  };

  return (
    <Box flex={1} overflowY="auto" px={4} py={4}>
      {multi && (
        <Text fontSize="12px" color="mcBlue.600" fontWeight={600} mb={3}>
          Applying to {selectedIds.length} selected layers/groups.
        </Text>
      )}

      {!multi && (
        <Box>
          <Text fontSize="17px" fontWeight={700} mb={3}>
            Applied Animations
          </Text>
          {applied.length === 0 ? (
            <Text fontSize="14px" color="gray.500" mb={4}>
              No animations on this element
            </Text>
          ) : (
            <VStack align="stretch" spacing={2} mb={4}>
              {applied.map((c) => (
                <AppliedClipCard
                  key={c.id}
                  clip={c}
                  open={openId === c.id}
                  onToggle={() => setOpen(openId === c.id ? null : c.id)}
                  onChangeType={onChangeType}
                  onConvert={onConvert}
                  canCustom={p3c}
                  canExtended={p3b}
                />
              ))}
            </VStack>
          )}
        </Box>
      )}

      <Box mx={-4} borderTopWidth="1px" borderBottomWidth="1px" borderColor="gray.200">
        <Button
          variant="ghost"
          w="100%"
          h="56px"
          borderRadius={0}
          color="mcBlue.600"
          fontSize="16px"
          fontWeight={600}
          leftIcon={<Icon as={LuPlus} boxSize={4} />}
          onClick={() => setStep(step === 'closed' ? 'roles' : 'closed')}
          aria-expanded={step !== 'closed'}
        >
          Add New Animation
        </Button>
      </Box>

      {step !== 'closed' && (
        <AddAnimationPicker
          step={step}
          canExtended={p3b}
          onPickRole={setStep}
          onBack={() => setStep('roles')}
          onApply={onApply}
        />
      )}

      {p3c && !multi && (
        <Box mt={4}>
          <Button
            variant="ghost"
            w="100%"
            justifyContent="space-between"
            px={0}
            fontSize="14px"
            fontWeight={600}
            rightIcon={<Icon as={customOpen ? LuChevronUp : LuChevronDown} boxSize={4} />}
            onClick={() => setCustomOpen(!customOpen)}
          >
            Custom keyframes
          </Button>
          {customOpen && (
            <Box mt={2}>
              <CustomTab targetId={primaryId} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

export default function AnimatePanel() {
  const selectedIds = useEditorStore((s) => s.selectedIds);

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

  // keyed so the open card / add flow reset when the selection changes
  return (
    <Flex direction="column" height="100%">
      <AnimateBody key={selectedIds.join('|')} selectedIds={selectedIds} />
    </Flex>
  );
}
