import { useEffect } from 'react';
import { Button, Flex, HStack, Icon, Text } from '@chakra-ui/react';
import { LuPlay, LuPause, LuRotateCcw, LuInfo } from 'react-icons/lu';
import { useEditorStore } from '../../store/editorStore';
import { animationContentEnd } from '../../lib/usePlayback';

/**
 * Minimal preset-preview control (Phase 3a.1). A single Play / Replay button that
 * plays the animation once and holds the end state — no scrubber, time readout,
 * duration or fps controls. The full transport bar arrives with the Timeline
 * (Phase 3a.2). Delivered creatives autoplay with no transport UI at all.
 */
export default function PreviewControls() {
  const currentTime = useEditorStore((s) => s.currentTime);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const play = useEditorStore((s) => s.play);
  const pause = useEditorStore((s) => s.pause);
  const animation = useEditorStore((s) => s.animation);

  const end = Math.max(animationContentEnd(animation), 1);
  const hasAnimation = animationContentEnd(animation) > 0;
  const ended = !isPlaying && currentTime >= end - 1;

  // Autoplay once when the preview opens.
  useEffect(() => {
    setCurrentTime(0);
    if (animationContentEnd(useEditorStore.getState().animation) > 0) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = () => {
    if (isPlaying) {
      pause();
      return;
    }
    if (currentTime >= end - 1 || currentTime <= 0) setCurrentTime(0);
    play();
  };

  const label = isPlaying ? 'Pause' : ended ? 'Replay' : 'Play';
  const icon = isPlaying ? LuPause : ended ? LuRotateCcw : LuPlay;

  return (
    <Flex
      align="center"
      height="48px"
      px={4}
      borderTopWidth="1px"
      borderColor="gray.200"
      bg="white"
      flexShrink={0}
      userSelect="none"
      gap={3}
    >
      <Button
        size="sm"
        colorScheme={isPlaying ? 'red' : 'green'}
        leftIcon={<Icon as={icon} />}
        onClick={handleClick}
        isDisabled={!hasAnimation}
        minW="92px"
      >
        {label}
      </Button>
      <HStack spacing={1.5} color="gray.400">
        <Icon as={LuInfo} boxSize={3} />
        <Text fontSize="11px" whiteSpace="nowrap">
          {hasAnimation
            ? 'Preview plays once — enable Timeline to scrub and edit timing'
            : 'Apply an animation effect to a layer to preview it'}
        </Text>
      </HStack>
    </Flex>
  );
}
