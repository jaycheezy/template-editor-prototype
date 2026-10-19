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
  Portal,
  Tag,
  Text,
} from '@chakra-ui/react';
import { IoTrophyOutline, IoCalendarClearOutline } from 'react-icons/io5';
import {
  LuChevronRight,
  LuCircle,
  LuFolderPlus,
  LuImage,
  LuLink,
  LuPlus,
  LuShirt,
  LuSquare,
  LuTriangle,
  LuType,
  LuX,
} from 'react-icons/lu';
import { PiBoundingBox } from 'react-icons/pi';
import type { IconType } from 'react-icons';
import { useState } from 'react';
import type { VectorShape } from '../../types';
import { VECTOR_SHAPES } from '../../lib/factory';
import {
  startCustomImage,
  startStaticImage,
  startTeamAsset,
  startText,
  startVector,
} from '../../lib/addTools';
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

const SHAPE_ICONS: Record<VectorShape, IconType> = {
  rectangle: LuSquare,
  ellipse: LuCircle,
  triangle: LuTriangle,
};

interface SubmenuItem {
  key: string;
  label: string;
  icon: IconType;
  /** keyboard shortcut hint */
  command?: string;
  onPick: () => void;
}

/** Menu entry that opens a flyout of choices on hover (or click / right arrow). */
function Submenu({ label, icon, items }: { label: string; icon: IconType; items: SubmenuItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Box
      position="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <MenuItem
        icon={<Icon as={icon} />}
        fontSize="13px"
        closeOnSelect={false}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Flex align="center" justify="space-between">
          {label}
          <Icon as={LuChevronRight} boxSize={3.5} color="gray.500" />
        </Flex>
      </MenuItem>
      {open && (
        <Box
          position="absolute"
          left="100%"
          top="-5px"
          ml="-2px"
          minW="180px"
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="lg"
          py={2}
          zIndex={2}
          role="menu"
        >
          {items.map((item) => (
            <MenuItem
              key={item.key}
              icon={<Icon as={item.icon} />}
              command={item.command}
              fontSize="13px"
              onClick={item.onPick}
            >
              {item.label}
            </MenuItem>
          ))}
        </Box>
      )}
    </Box>
  );
}

const IMAGE_ITEMS: SubmenuItem[] = [
  { key: 'static', label: 'Static image', icon: LuImage, command: 'I', onPick: () => void startStaticImage() },
  { key: 'team', label: 'Team asset', icon: LuShirt, onPick: startTeamAsset },
  { key: 'custom', label: 'Custom URL', icon: LuLink, onPick: startCustomImage },
];

const VECTOR_COMMANDS: Partial<Record<VectorShape, string>> = { rectangle: 'R', ellipse: 'O' };

const VECTOR_ITEMS: SubmenuItem[] = VECTOR_SHAPES.map(({ shape, label }) => ({
  key: shape,
  label,
  icon: SHAPE_ICONS[shape],
  command: VECTOR_COMMANDS[shape],
  onPick: () => startVector(shape),
}));

export default function LeftSidebar() {
  const dataSources = useEditorStore((s) => s.dataSources);
  const groupSelection = useEditorStore((s) => s.groupSelection);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const enteredGroupId = useEditorStore((s) => s.enteredGroupId);
  const groups = useEditorStore((s) => s.groups);
  const exitGroup = useEditorStore((s) => s.exitGroup);
  const canAuthor = usePhase('author');
  const canGroup = usePhase('groups');

  return (
    <Flex
      direction="column"
      borderRightWidth="1px"
      borderColor="gray.200"
      minW="280px"
      maxW="280px"
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
                title="Group selection (⌘G)"
                onClick={() => groupSelection()}
              />
            )}
            {canAuthor && (
              <Menu placement="bottom-end" isLazy>
                <MenuButton
                  as={IconButton}
                  aria-label="Add element"
                  icon={<Icon as={LuPlus} boxSize={4} />}
                  size="xs"
                  variant="ghost"
                  color="gray.600"
                />
                <Portal>
                  <MenuList minW="170px">
                    <MenuItem icon={<Icon as={LuType} />} command="T" fontSize="13px" onClick={startText}>
                      Text
                    </MenuItem>
                    <Submenu label="Image" icon={LuImage} items={IMAGE_ITEMS} />
                    <Submenu label="Vector" icon={PiBoundingBox} items={VECTOR_ITEMS} />
                  </MenuList>
                </Portal>
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
            <Text noOfLines={1}>Inside: {groups[enteredGroupId].name} (Esc to exit)</Text>
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
