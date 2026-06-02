import { Box, Button, Flex, HStack, Icon, Text } from '@chakra-ui/react';
import { LuFolder, LuImage, LuLayers, LuSparkles, LuSlidersHorizontal, LuType } from 'react-icons/lu';
import { FaShapes } from 'react-icons/fa';
import { PiBoundingBox } from 'react-icons/pi';
import type { IconType } from 'react-icons';
import { useEditorStore } from '../../store/editorStore';
import PropertiesPanel from './PropertiesPanel';
import AnimatePanel from './AnimatePanel';

export default function RightSidebar() {
  const elements = useEditorStore((s) => s.elements);
  const groups = useEditorStore((s) => s.groups);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const rightMode = useEditorStore((s) => s.rightMode);
  const setRightMode = useEditorStore((s) => s.setRightMode);

  const primaryId = selectedIds[selectedIds.length - 1] ?? null;
  const el = elements.find((e) => e.id === primaryId);
  const group = primaryId ? groups[primaryId] : undefined;
  const multi = selectedIds.length > 1;

  let icon: IconType = LuType;
  let name = '';
  if (multi) {
    icon = LuLayers;
    name = `${selectedIds.length} items selected`;
  } else if (group) {
    icon = LuFolder;
    name = group.name;
  } else if (el) {
    name = el.name;
    icon =
      el.type === 'SVG' ? FaShapes : el.type === 'IMAGE' ? LuImage : el.type === 'VECTOR' ? PiBoundingBox : LuType;
  }

  return (
    <Flex
      direction="column"
      borderLeftWidth="1px"
      borderColor="gray.200"
      minW="360px"
      maxW="360px"
      bg="white"
      flexShrink={0}
      height="100%"
    >
      {selectedIds.length > 0 ? (
        <>
          <HStack px={6} pt={4} pb={3} spacing={2}>
            <Icon as={icon} boxSize={5} />
            <Text fontSize="18px" fontWeight={700} noOfLines={1}>
              {name}
            </Text>
          </HStack>
          <HStack px={6} spacing={2} pb={2}>
            <Button
              size="sm"
              leftIcon={<Icon as={LuSlidersHorizontal} />}
              variant={rightMode === 'properties' ? 'solid' : 'ghost'}
              colorScheme="mcBlue"
              onClick={() => setRightMode('properties')}
            >
              Properties
            </Button>
            <Button
              size="sm"
              leftIcon={<Icon as={LuSparkles} />}
              variant={rightMode === 'animate' ? 'solid' : 'ghost'}
              colorScheme="mcBlue"
              onClick={() => setRightMode('animate')}
            >
              Animate
            </Button>
          </HStack>
          <Box borderTopWidth="1px" borderColor="gray.100" flex={1} overflowY="auto">
            {rightMode === 'properties' ? <PropertiesPanel /> : <AnimatePanel />}
          </Box>
        </>
      ) : (
        <Flex flex={1} align="center" justify="center" color="gray.400" px={6} textAlign="center">
          <Text fontSize="13px">Select a layer or group to edit its properties and animation.</Text>
        </Flex>
      )}
    </Flex>
  );
}
