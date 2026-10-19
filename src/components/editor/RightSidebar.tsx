import { Box, Button, Flex, HStack, Icon, Text } from '@chakra-ui/react';
import { LuFolder, LuLayers, LuType } from 'react-icons/lu';
import type { IconType } from 'react-icons';
import { useEditorStore } from '../../store/editorStore';
import { usePhase } from '../../store/featureStore';
import { iconForElement } from '../../lib/elementIcon';
import PropertiesPanel from './PropertiesPanel';
import AnimatePanel from './AnimatePanel';

export default function RightSidebar() {
  const elements = useEditorStore((s) => s.elements);
  const groups = useEditorStore((s) => s.groups);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const rightModeRaw = useEditorStore((s) => s.rightMode);
  const setRightMode = useEditorStore((s) => s.setRightMode);
  const canAnimate = usePhase('presets');
  const rightMode = canAnimate ? rightModeRaw : 'properties';

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
    icon = iconForElement(el);
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
          {canAnimate && (
            <HStack px={6} spacing={3} pb={3}>
              {(
                [
                  ['properties', 'Properties'],
                  ['animate', 'Animate'],
                ] as const
              ).map(([mode, label]) => {
                const active = rightMode === mode;
                return (
                  <Button
                    key={mode}
                    size="sm"
                    variant="outline"
                    bg="white"
                    color="gray.800"
                    fontWeight={400}
                    fontSize="14px"
                    px={4}
                    borderRadius="4px"
                    borderWidth={active ? '1.5px' : '1px'}
                    borderColor={active ? 'mcBlue.500' : 'gray.200'}
                    aria-pressed={active}
                    _hover={{ bg: 'white', borderColor: active ? 'mcBlue.500' : 'gray.300' }}
                    _active={{ bg: 'gray.50' }}
                    onClick={() => setRightMode(mode)}
                  >
                    {label}
                  </Button>
                );
              })}
            </HStack>
          )}
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
