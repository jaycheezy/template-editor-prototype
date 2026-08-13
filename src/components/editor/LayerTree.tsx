import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  HStack,
  Icon,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
  Text,
  useToast,
} from '@chakra-ui/react';
import { FaShapes } from 'react-icons/fa';
import {
  LuChevronDown,
  LuChevronRight,
  LuEye,
  LuEyeOff,
  LuFolder,
  LuFolderMinus,
  LuGripVertical,
  LuImage,
  LuLayers,
  LuLock,
  LuLockOpen,
  LuTrash2,
  LuType,
} from 'react-icons/lu';
import { PiBoundingBox } from 'react-icons/pi';
import type { IconType } from 'react-icons';
import {
  buildLayerRows,
  buildPreviewRows,
  dropTargetAtIndex,
  sortElementsForLayerList,
  buildSiblingOrder,
  wouldCreateCycle,
  type LayerDropTarget,
  type LayerRow,
} from '../../lib/layers';
import { layerListSelectableIds } from '../../lib/selection';
import { useEditorStore, type ZOrderOp } from '../../store/editorStore';
import { usePhase } from '../../store/featureStore';
import type { AdElement, ElementType } from '../../types';
import { mc } from '../../theme';

function elementIcon(type: ElementType): IconType {
  switch (type) {
    case 'SVG':
      return FaShapes;
    case 'IMAGE':
      return LuImage;
    case 'VECTOR':
      return PiBoundingBox;
    default:
      return LuType;
  }
}

const Z_ACTIONS: { op: ZOrderOp; label: string }[] = [
  { op: 'front', label: 'Bring to front' },
  { op: 'forward', label: 'Bring forward' },
  { op: 'backward', label: 'Send backward' },
  { op: 'back', label: 'Send to back' },
];

function DropPlaceholder({ depth }: { depth: number }) {
  return (
    <Box
      ml={`${4 + depth * 16}px`}
      mr={1}
      my="3px"
      height="28px"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="mcBlue.300"
      borderRadius="4px"
      bg="mcBlue.50"
    />
  );
}

function VisibilityLockActions({
  hidden,
  locked,
  canEdit,
  onToggleHidden,
  onToggleLocked,
  alwaysShow,
}: {
  hidden?: boolean;
  locked?: boolean;
  canEdit: boolean;
  onToggleHidden: () => void;
  onToggleLocked: () => void;
  alwaysShow?: boolean;
}) {
  if (!canEdit) return null;
  return (
    <>
      <IconButton
        aria-label="Toggle visibility"
        icon={<Icon as={hidden ? LuEyeOff : LuEye} boxSize={3.5} />}
        size="xs"
        minW={5}
        h={5}
        variant="ghost"
        color={hidden ? 'mcBlue.500' : 'gray.400'}
        display={alwaysShow || hidden ? 'inline-flex' : 'none'}
        _groupHover={{ display: 'inline-flex' }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleHidden();
        }}
      />
      <IconButton
        aria-label="Toggle lock"
        icon={<Icon as={locked ? LuLock : LuLockOpen} boxSize={3.5} />}
        size="xs"
        minW={5}
        h={5}
        variant="ghost"
        color={locked ? 'mcBlue.500' : 'gray.400'}
        display={alwaysShow || locked ? 'inline-flex' : 'none'}
        _groupHover={{ display: 'inline-flex' }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleLocked();
        }}
      />
    </>
  );
}

function ElementRow({
  el,
  depth,
  draggable,
  isPlaceholder,
  selected,
  canLayout,
  canAuthor,
  flatReorder,
  onSelect,
  onDragStart,
}: {
  el: AdElement;
  depth: number;
  draggable: boolean;
  isPlaceholder: boolean;
  selected: boolean;
  canLayout: boolean;
  canAuthor: boolean;
  flatReorder: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDragStart: (elementId: string, e: React.PointerEvent) => void;
}) {
  const deleteElement = useEditorStore((s) => s.deleteElement);
  const renameElement = useEditorStore((s) => s.renameElement);
  const toggleElementHidden = useEditorStore((s) => s.toggleElementHidden);
  const toggleElementLocked = useEditorStore((s) => s.toggleElementLocked);
  const reorderElementZ = useEditorStore((s) => s.reorderElementZ);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(el.name);
  const [orderMenuOpen, setOrderMenuOpen] = useState(false);

  if (isPlaceholder) {
    return <DropPlaceholder depth={depth} />;
  }

  const commit = () => {
    setEditing(false);
    if (draft.trim()) renameElement(el.id, draft.trim());
    else setDraft(el.name);
  };

  const chromeW = draggable ? '14px' : 0;

  return (
    <HStack
      role="group"
      pl={`${4 + depth * 16}px`}
      pr={1}
      py="5px"
      spacing={1}
      cursor="pointer"
      bg={selected ? 'mcBlue.50' : orderMenuOpen ? mc.secondary : 'white'}
      color={selected ? 'mcBlue.600' : 'gray.700'}
      opacity={el.hidden ? 0.45 : 1}
      borderTopWidth="1px"
      borderBottomWidth="1px"
      borderColor={orderMenuOpen ? 'mcBlue.100' : 'transparent'}
      transition="background 0.12s ease, border-color 0.12s ease"
      _hover={{ bg: mc.secondary, borderColor: 'mcBlue.100' }}
      onClick={(e) => onSelect(e)}
    >
      <Box
        w={orderMenuOpen ? chromeW : 0}
        minW={orderMenuOpen ? chromeW : 0}
        overflow="hidden"
        flexShrink={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        _groupHover={{ w: chromeW, minW: chromeW }}
        onPointerDown={(e) => {
          if (!draggable) return;
          e.stopPropagation();
          onDragStart(el.id, e);
        }}
      >
        <Icon as={LuGripVertical} boxSize={3.5} color="gray.400" cursor="grab" _active={{ cursor: 'grabbing' }} />
      </Box>
      <Icon as={elementIcon(el.type)} boxSize={3.5} opacity={0.85} flexShrink={0} />
      {editing ? (
        <Input
          size="xs"
          flex={1}
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(el.name);
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <Text
          fontSize="13px"
          noOfLines={1}
          flex={1}
          minW={0}
          onDoubleClick={(e) => {
            if (!canAuthor) return;
            e.stopPropagation();
            setDraft(el.name);
            setEditing(true);
          }}
        >
          {el.name}
        </Text>
      )}

      {canLayout && (
        <Menu
          placement="bottom-end"
          isLazy
          onOpen={() => setOrderMenuOpen(true)}
          onClose={() => setOrderMenuOpen(false)}
        >
          <MenuButton
            as={IconButton}
            aria-label="Layer order"
            icon={<Icon as={LuLayers} boxSize={3.5} />}
            size="xs"
            minW={5}
            h={5}
            variant="ghost"
            color="gray.400"
            display={orderMenuOpen ? 'inline-flex' : 'none'}
            _groupHover={{ display: 'inline-flex' }}
            onClick={(e) => e.stopPropagation()}
          />
          <Portal>
            <MenuList minW="160px">
              {Z_ACTIONS.map((a) => (
                <MenuItem key={a.op} fontSize="13px" onClick={() => reorderElementZ(el.id, a.op, { flat: flatReorder })}>
                  {a.label}
                </MenuItem>
              ))}
            </MenuList>
          </Portal>
        </Menu>
      )}

      <VisibilityLockActions
        hidden={el.hidden}
        locked={el.locked}
        canEdit={canLayout}
        alwaysShow={orderMenuOpen}
        onToggleHidden={() => toggleElementHidden(el.id)}
        onToggleLocked={() => toggleElementLocked(el.id)}
      />

      {!el.locked && (
        <IconButton
          aria-label={`Delete ${el.name}`}
          icon={<LuTrash2 size={14} />}
          size="xs"
          minW={5}
          h={5}
          variant="ghost"
          color={mc.error}
          display={orderMenuOpen ? 'inline-flex' : 'none'}
          _hover={{ bg: 'transparent', color: mc.error }}
          _groupHover={{ display: 'inline-flex' }}
          onClick={(e) => {
            e.stopPropagation();
            deleteElement(el.id);
          }}
        />
      )}
    </HStack>
  );
}

function DragGhost({
  name,
  icon,
  depth,
  x,
  y,
  width,
}: {
  name: string;
  icon: IconType;
  depth: number;
  x: number;
  y: number;
  width: number;
}) {
  return (
    <Portal>
      <Box
        position="fixed"
        top={`${y}px`}
        left={`${x}px`}
        width={`${width}px`}
        zIndex={2000}
        pointerEvents="none"
        boxShadow="0 8px 24px rgba(0,0,0,0.14)"
        borderRadius="4px"
        borderWidth="1px"
        borderColor="mcBlue.200"
        bg="white"
      >
        <HStack pl={`${4 + depth * 16}px`} pr={1} py="5px" spacing={1} color="mcBlue.600" bg={mc.secondary}>
          <Box w="14px" flexShrink={0} />
          <Icon as={icon} boxSize={3.5} opacity={0.85} flexShrink={0} />
          <Text fontSize="13px" noOfLines={1} flex={1}>
            {name}
          </Text>
          <Box w={6} flexShrink={0} />
        </HStack>
      </Box>
    </Portal>
  );
}

function GroupRow({
  row,
  selected,
  canEdit,
  draggable,
  onSelect,
  onToggle,
  onEnter,
  onDragStart,
  dropHighlight,
  dropInvalid,
}: {
  row: Extract<LayerRow, { kind: 'group' }>;
  selected: boolean;
  canEdit: boolean;
  draggable: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onToggle: () => void;
  onEnter: () => void;
  onDragStart: (groupId: string, e: React.PointerEvent) => void;
  dropHighlight: boolean;
  dropInvalid: boolean;
}) {
  const groups = useEditorStore((s) => s.groups);
  const renameGroup = useEditorStore((s) => s.renameGroup);
  const toggleGroupHidden = useEditorStore((s) => s.toggleGroupHidden);
  const toggleGroupLocked = useEditorStore((s) => s.toggleGroupLocked);
  const ungroup = useEditorStore((s) => s.ungroup);
  const group = groups[row.id];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.name);
  const chromeW = draggable ? '14px' : 0;

  const commit = () => {
    setEditing(false);
    if (draft.trim()) renameGroup(row.id, draft.trim());
    else setDraft(row.name);
  };

  return (
    <HStack
      role="group"
      pl={`${4 + row.depth * 16}px`}
      pr={1}
      py="5px"
      spacing={1}
      cursor="pointer"
      transition="background 0.12s ease, outline 0.12s ease"
      bg={dropInvalid ? 'red.50' : dropHighlight ? 'mcBlue.50' : selected ? 'mcBlue.50' : 'transparent'}
      color={selected ? 'mcBlue.600' : 'gray.700'}
      opacity={group?.hidden ? 0.45 : 1}
      outline={dropInvalid ? '1px solid' : dropHighlight ? '1px solid' : undefined}
      outlineColor={dropInvalid ? 'red.300' : dropHighlight ? 'mcBlue.200' : undefined}
      _hover={{ bg: selected || dropHighlight || dropInvalid ? undefined : 'gray.50' }}
      onClick={(e) => onSelect(e)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEnter();
      }}
    >
      <Box
        w={0}
        minW={0}
        overflow="hidden"
        flexShrink={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        _groupHover={{ w: chromeW, minW: chromeW }}
        onPointerDown={(e) => {
          if (!draggable) return;
          e.stopPropagation();
          onDragStart(row.id, e);
        }}
      >
        <Icon as={LuGripVertical} boxSize={3.5} color="gray.400" cursor="grab" _active={{ cursor: 'grabbing' }} />
      </Box>
      <Icon
        as={row.collapsed ? LuChevronRight : LuChevronDown}
        boxSize={3.5}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      />
      <Icon as={LuFolder} boxSize={3.5} opacity={0.85} />
      {editing ? (
        <Input
          size="xs"
          flex={1}
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(row.name);
              setEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <Text
          fontSize="13px"
          fontWeight={600}
          noOfLines={1}
          flex={1}
          minW={0}
          onDoubleClick={(e) => {
            if (!canEdit) return;
            e.stopPropagation();
            setDraft(row.name);
            setEditing(true);
          }}
        >
          {row.name}
        </Text>
      )}
      {canEdit && (
        <IconButton
          aria-label="Ungroup"
          icon={<Icon as={LuFolderMinus} boxSize={3.5} />}
          size="xs"
          minW={5}
          h={5}
          variant="ghost"
          color="gray.400"
          display="none"
          _groupHover={{ display: 'inline-flex' }}
          onClick={(e) => {
            e.stopPropagation();
            ungroup(row.id);
          }}
        />
      )}
      <VisibilityLockActions
        hidden={group?.hidden}
        locked={group?.locked}
        canEdit={canEdit}
        onToggleHidden={() => toggleGroupHidden(row.id)}
        onToggleLocked={() => toggleGroupLocked(row.id)}
      />
    </HStack>
  );
}

interface DragGhostState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
  width: number;
  x: number;
  y: number;
}

export default function LayerTree() {
  const elements = useEditorStore((s) => s.elements);
  const groups = useEditorStore((s) => s.groups);
  const rootOrder = useEditorStore((s) => s.rootOrder);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const select = useEditorStore((s) => s.select);
  const toggleGroupCollapsed = useEditorStore((s) => s.toggleGroupCollapsed);
  const moveElementLayer = useEditorStore((s) => s.moveElementLayer);
  const enterGroup = useEditorStore((s) => s.enterGroup);
  const canLayout = usePhase('layout');
  const canAuthor = usePhase('author');
  const canGroup = usePhase('groups');
  const toast = useToast();

  const listRef = useRef<HTMLDivElement>(null);
  const baseRowsRef = useRef<LayerRow[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [groupDropId, setGroupDropId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<DragGhostState | null>(null);

  const byId = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);

  const rows = useMemo<LayerRow[]>(() => {
    if (canGroup) return buildLayerRows(elements, groups, rootOrder);
    const order = buildSiblingOrder(elements, groups, rootOrder);
    return sortElementsForLayerList(elements, order).map((el) => ({
      kind: 'element' as const,
      id: el.id,
      parentId: null,
      depth: 0,
    }));
  }, [elements, groups, rootOrder, canGroup]);

  const selectableIds = useMemo(() => layerListSelectableIds(rows), [rows]);

  const handleSelect = useCallback(
    (id: string, e: React.MouseEvent) => {
      select(id, {
        additive: canLayout && (e.metaKey || e.ctrlKey),
        range: canLayout && e.shiftKey,
        rangeOrder: selectableIds,
      });
    },
    [canLayout, select, selectableIds],
  );

  useEffect(() => {
    baseRowsRef.current = rows;
  }, [rows]);

  const invalidGroupDrop = Boolean(
    draggingId && groupDropId && wouldCreateCycle(groups, draggingId, groupDropId),
  );

  const displayRows = useMemo(() => {
    if (!draggingId || dropIndex === null) return rows;
    return buildPreviewRows(rows, draggingId, dropIndex, invalidGroupDrop ? null : groupDropId);
  }, [rows, draggingId, dropIndex, groupDropId, invalidGroupDrop]);

  const resolveDropIndex = useCallback((clientY: number): number => {
    const container = listRef.current;
    if (!container) return 0;
    const slots = container.querySelectorAll<HTMLElement>('[data-layer-slot]');
    for (let i = 0; i < slots.length; i += 1) {
      const rect = slots[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return slots.length;
  }, []);

  const resolveGroupDrop = useCallback((clientX: number, clientY: number): string | null => {
    const container = listRef.current;
    if (!container) return null;
    const groupRows = container.querySelectorAll<HTMLElement>('[data-group-row]');
    for (const node of groupRows) {
      const rect = node.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return node.dataset.groupRowId ?? null;
      }
    }
    return null;
  }, []);

  const finishDrag = useCallback(
    (nodeId: string, target: LayerDropTarget) => {
      const error = moveElementLayer(nodeId, target, { flat: !canGroup });
      if (error) {
        toast({ status: 'warning', title: error, duration: 2500, isClosable: true });
      }
      setDraggingId(null);
      setDropIndex(null);
      setGroupDropId(null);
      setGhost(null);
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
    },
    [canGroup, moveElementLayer, toast],
  );

  const startDrag = useCallback(
    (nodeId: string, e: React.PointerEvent) => {
      const el = byId.get(nodeId);
      const group = groups[nodeId];
      if (el?.locked || group?.locked) return;
      const rowNode = (e.currentTarget as HTMLElement).closest('[data-layer-row]') as HTMLElement | null;
      const rowRect = rowNode?.getBoundingClientRect();
      if (!rowRect) return;

      e.preventDefault();
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';

      const offsetX = e.clientX - rowRect.left;
      const offsetY = e.clientY - rowRect.top;
      const initialIndex = resolveDropIndex(e.clientY);

      setDraggingId(nodeId);
      setDropIndex(initialIndex);
      setGroupDropId(null);
      setGhost({ nodeId, offsetX, offsetY, width: rowRect.width, x: rowRect.left, y: rowRect.top });

      const onMove = (ev: PointerEvent) => {
        const nextGroupDrop = canGroup ? resolveGroupDrop(ev.clientX, ev.clientY) : null;
        setGroupDropId(nextGroupDrop);
        setDropIndex(resolveDropIndex(ev.clientY));
        setGhost((prev) => (prev ? { ...prev, x: ev.clientX - prev.offsetX, y: ev.clientY - prev.offsetY } : null));
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        const baseRows = baseRowsRef.current;
        const hoverGroupId = canGroup ? resolveGroupDrop(ev.clientX, ev.clientY) : null;
        if (hoverGroupId && hoverGroupId !== nodeId && !wouldCreateCycle(groups, nodeId, hoverGroupId)) {
          const groupRow = baseRows.find((r) => r.kind === 'group' && r.id === hoverGroupId);
          finishDrag(nodeId, {
            parentId: hoverGroupId,
            beforeId: groupRow?.kind === 'group' ? groupRow.firstChildId : null,
          });
          return;
        }
        if (hoverGroupId && wouldCreateCycle(groups, nodeId, hoverGroupId)) {
          toast({
            status: 'warning',
            title: 'A group cannot contain itself',
            duration: 2500,
            isClosable: true,
          });
          setDraggingId(null);
          setDropIndex(null);
          setGroupDropId(null);
          setGhost(null);
          document.body.style.removeProperty('user-select');
          document.body.style.removeProperty('cursor');
          return;
        }
        const index = resolveDropIndex(ev.clientY);
        finishDrag(nodeId, dropTargetAtIndex(baseRows, index));
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [byId, canGroup, finishDrag, groups, resolveDropIndex, resolveGroupDrop, toast],
  );

  const ghostNode = ghost
    ? byId.get(ghost.nodeId) ?? groups[ghost.nodeId]
    : null;
  const ghostDepth = useMemo(() => {
    if (!draggingId) return 0;
    const previewRow = displayRows.find((r) => r.id === draggingId);
    return previewRow?.depth ?? 0;
  }, [displayRows, draggingId]);

  return (
    <>
      <Box ref={listRef} py={1}>
        {displayRows.map((row, index) => (
          <Fragment key={row.kind === 'group' ? `group-${row.id}` : row.id}>
            <Box data-layer-slot data-drop-index={index} height="2px" />
            {row.kind === 'group' ? (
              <Box data-layer-row data-group-row data-group-row-id={row.id}>
                <GroupRow
                  row={row}
                  selected={selectedIds.includes(row.id)}
                  canEdit={canGroup}
                  draggable={canLayout && !groups[row.id]?.locked && draggingId === null}
                  onSelect={(e) => handleSelect(row.id, e)}
                  onToggle={() => toggleGroupCollapsed(row.id)}
                  onEnter={() => enterGroup(row.id)}
                  onDragStart={startDrag}
                  dropHighlight={draggingId !== null && groupDropId === row.id && !invalidGroupDrop}
                  dropInvalid={draggingId !== null && groupDropId === row.id && invalidGroupDrop}
                />
              </Box>
            ) : (
              (() => {
                const el = byId.get(row.id);
                if (!el) return null;
                const isPlaceholder = draggingId === row.id;
                return (
                  <Box data-layer-row data-element-row={row.id}>
                    <ElementRow
                      el={el}
                      depth={row.depth}
                      draggable={canLayout && !el.locked && draggingId === null}
                      isPlaceholder={isPlaceholder}
                      selected={selectedIds.includes(el.id)}
                      canLayout={canLayout}
                      canAuthor={canAuthor}
                      flatReorder={!canGroup}
                      onSelect={(e) => handleSelect(el.id, e)}
                      onDragStart={startDrag}
                    />
                  </Box>
                );
              })()
            )}
          </Fragment>
        ))}
        <Box data-layer-slot data-drop-index={displayRows.length} height="2px" />
      </Box>

      {ghost && ghostNode && (
        <DragGhost
          name={ghostNode.name}
          icon={'type' in ghostNode ? elementIcon(ghostNode.type) : LuFolder}
          depth={ghostDepth}
          x={ghost.x}
          y={ghost.y}
          width={ghost.width}
        />
      )}
    </>
  );
}