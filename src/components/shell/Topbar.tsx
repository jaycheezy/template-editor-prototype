import { useEffect, useState } from 'react';
import { Button, Divider, Flex, HStack, Icon, IconButton, Input, Text } from '@chakra-ui/react';
import { LuPencil, LuUndo2, LuRedo2 } from 'react-icons/lu';
import { useEditorStore } from '../../store/editorStore';
import FeatureMenu from './FeatureMenu';

export default function Topbar() {
  const name = useEditorStore((s) => s.name);
  const setName = useEditorStore((s) => s.setName);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== 'z') return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <Flex h="56px" align="center" px={4} borderBottomWidth="1px" borderColor="gray.200" bg="white" flexShrink={0}>
      <HStack spacing={2}>
        {editing ? (
          <Input
            value={name}
            autoFocus
            size="sm"
            width="260px"
            fontSize="20px"
            fontWeight={700}
            variant="flushed"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
          />
        ) : (
          <Text fontSize="20px" fontWeight={700} color="gray.900">
            {name}
          </Text>
        )}
        <Icon
          as={LuPencil}
          color="gray.400"
          boxSize={4}
          cursor="pointer"
          _hover={{ color: 'mcBlue.500' }}
          onClick={() => setEditing(true)}
        />
      </HStack>

      <Flex flex={1} justify="flex-end" align="center" gap={3}>
        <HStack spacing={1}>
          <IconButton
            aria-label="Undo"
            title="Undo (⌘/Ctrl+Z)"
            size="sm"
            variant="ghost"
            color="gray.600"
            icon={<Icon as={LuUndo2} />}
            isDisabled={!canUndo}
            onClick={undo}
          />
          <IconButton
            aria-label="Redo"
            title="Redo (⌘/Ctrl+Shift+Z)"
            size="sm"
            variant="ghost"
            color="gray.600"
            icon={<Icon as={LuRedo2} />}
            isDisabled={!canRedo}
            onClick={redo}
          />
        </HStack>
        <Divider orientation="vertical" h="24px" />
        <FeatureMenu />
        <Button
          variant="solid"
          bg="#E4F3FF"
          color="#3367D6"
          _hover={{ bg: '#d6ecff' }}
          size="sm"
          px={5}
          fontWeight={700}
        >
          Cancel
        </Button>
        <Button colorScheme="mcBlue" size="sm" px={6} fontWeight={700}>
          Save
        </Button>
      </Flex>
    </Flex>
  );
}
