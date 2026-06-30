import {
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Tag,
  Text,
} from '@chakra-ui/react';
import { IoTrophyOutline, IoCalendarClearOutline } from 'react-icons/io5';
import { LuFolderPlus, LuImage, LuPlus, LuType, LuX } from 'react-icons/lu';
import { PiBoundingBox } from 'react-icons/pi';
import { useEditorStore } from '../../store/editorStore';
import { usePhase } from '../../store/featureStore';
import LayerTree from './LayerTree';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text px={2} py={1} fontSize="20px" fontWeight={500} color="gray.800" letterSpacing="0.15px">
      {children}
    </Text>
  );
}

export default function LeftSidebar() {
  const dataSources = useEditorStore((s) => s.dataSources);
  const addElement = useEditorStore((s) => s.addElement);
  const groupSelection = useEditorStore((s) => s.groupSelection);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const enteredGroupId = useEditorStore((s) => s.enteredGroupId);
  const groups = useEditorStore((s) => s.groups);
  const exitGroup = useEditorStore((s) => s.exitGroup);
  const canEdit = usePhase('p1');
  const canGroup = usePhase('p2');

  return (
    <Flex
      direction="column"
      borderRightWidth="1px"
      borderColor="gray.200"
      minW="216px"
      maxW="216px"
      bg="white"
      flexShrink={0}
      overflowY="auto"
    >
      <Box pt={3} flex={1}>
        <HStack px={2} justify="space-between" align="center">
          <SectionHeading>Elements</SectionHeading>
          <HStack spacing={1} pr={1}>
            {canGroup && (
              <IconButton
                aria-label="Group selection"
                icon={<Icon as={LuFolderPlus} boxSize={4} />}
                size="xs"
                variant="ghost"
                color="gray.600"
                isDisabled={selectedIds.length < 1}
                onClick={() => groupSelection()}
              />
            )}
            {canEdit && (
              <Menu placement="bottom-end" isLazy>
                <MenuButton
                  as={IconButton}
                  aria-label="Add element"
                  icon={<Icon as={LuPlus} boxSize={4} />}
                  size="xs"
                  variant="ghost"
                  color="gray.600"
                />
                <MenuList minW="150px">
                  <MenuItem icon={<Icon as={LuType} />} fontSize="13px" onClick={() => addElement('TEXT')}>
                    Text
                  </MenuItem>
                  <MenuItem icon={<Icon as={LuImage} />} fontSize="13px" onClick={() => addElement('IMAGE')}>
                    Image
                  </MenuItem>
                  <MenuItem icon={<Icon as={PiBoundingBox} />} fontSize="13px" onClick={() => addElement('VECTOR')}>
                    Vector
                  </MenuItem>
                </MenuList>
              </Menu>
            )}
          </HStack>
        </HStack>
        <Divider />
        {canGroup && enteredGroupId && groups[enteredGroupId] && (
          <HStack
            mx={2}
            my={1}
            px={2}
            py={1}
            bg="mcBlue.50"
            borderRadius="6px"
            justify="space-between"
            fontSize="11px"
            color="mcBlue.700"
          >
            <Text noOfLines={1}>Inside: {groups[enteredGroupId].name}</Text>
            <Button size="xs" variant="ghost" leftIcon={<Icon as={LuX} boxSize={3} />} onClick={() => exitGroup()}>
              Exit
            </Button>
          </HStack>
        )}
        <LayerTree />
      </Box>

      <Box borderTopWidth="1px" borderColor="gray.200" pb={2}>
        <SectionHeading>Data Sources</SectionHeading>
        <Divider />
        {dataSources.map((ds) => {
          const icon = ds.market === 'market' ? IoTrophyOutline : IoCalendarClearOutline;
          return (
            <HStack key={ds.id} px={4} py={2} spacing={2} _hover={{ bg: 'mcBlue.50' }}>
              <Icon as={icon} boxSize={3.5} color="gray.500" />
              <Text fontSize="13px" color="gray.700">
                {ds.name}
              </Text>
              <Tag size="sm" colorScheme="green" borderRadius="full" fontWeight={700}>
                {ds.market}
              </Tag>
            </HStack>
          );
        })}
      </Box>
    </Flex>
  );
}
