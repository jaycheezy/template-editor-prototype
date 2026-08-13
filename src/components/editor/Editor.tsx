import { useEffect } from 'react';
import { Flex } from '@chakra-ui/react';
import HostBar from '../shell/HostBar';
import Topbar from '../shell/Topbar';
import Toolbox from '../shell/Toolbox';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import Canvas from '../canvas/Canvas';
import Timeline from '../timeline/Timeline';
import PreviewControls from '../timeline/PreviewControls';
import { useEditorStore } from '../../store/editorStore';
import { usePhase } from '../../store/featureStore';
import { usePlaybackLoop } from '../../lib/usePlayback';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function GroupShortcuts() {
  const canGroup = usePhase('groups');
  const groupSelection = useEditorStore((s) => s.groupSelection);
  const ungroupSelection = useEditorStore((s) => s.ungroupSelection);
  const enterGroup = useEditorStore((s) => s.enterGroup);
  const exitGroup = useEditorStore((s) => s.exitGroup);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const groups = useEditorStore((s) => s.groups);
  const enteredGroupId = useEditorStore((s) => s.enteredGroupId);

  useEffect(() => {
    if (!canGroup) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) ungroupSelection();
        else groupSelection();
        return;
      }

      if (e.key === 'Escape' && enteredGroupId) {
        e.preventDefault();
        exitGroup();
        return;
      }

      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && selectedIds.length === 1 && groups[selectedIds[0]]) {
        e.preventDefault();
        enterGroup(selectedIds[0]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    canGroup,
    enterGroup,
    enteredGroupId,
    exitGroup,
    groupSelection,
    groups,
    selectedIds,
    ungroupSelection,
  ]);

  return null;
}

export default function Editor() {
  usePlaybackLoop();
  const presets = usePhase('presets');
  const timeline = usePhase('timeline');
  return (
    <Flex direction="column" height="100vh" overflow="hidden">
      <GroupShortcuts />
      <HostBar />
      <Topbar />
      <Flex flex={1} overflow="hidden">
        <Toolbox />
        <LeftSidebar />
        <Flex direction="column" flex={1} overflow="hidden" bg="gray.100">
          <Canvas />
          {presets && (timeline ? <Timeline /> : <PreviewControls />)}
        </Flex>
        <RightSidebar />
      </Flex>
    </Flex>
  );
}
