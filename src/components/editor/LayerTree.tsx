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

function ElementRowContent({ el }: { el: AdElement }) {
  return (
    <>
      <Box w="14px" flexShrink={0} />
      <Icon as={elementIcon(el.type)} boxSize={3.5} opacity={0.85} flexShrink={0} />
      <Text fontSize="13px" noOfLines={1} flex={1}>
        {el.name}
      </Text>
      <Box w={6} flexShrink={0} />
    </>
  );
}

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
        visibility={alwaysShow || hidden ? 'visible' : 'hidden'}
        _groupHover={{ visibility: 'visible' }}
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
        visibility={alwaysShow || locked ? 'visible' : 'hidden'}
        _groupHover={{ visibility: 'visible' }}
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
  canEdit,
  onSelect,
  onDragStart,
}: {
  el: AdElement;
  depth: number;
  draggable: boolean;
  isPlaceholder: boolean;
  selected: boolean;
  canEdit: boolean;
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

  if (isPlaceholder) {
    return <DropPlaceholder depth={depth} />;
  }

  const commit = () => {
    setEditing(false);
    if (draft.trim()) renameElement(el.id, draft.trim());
    else setDraft(el.name);
  };

  return (
    <HStack
      role="group"
      pl={`${4 + depth * 16}px`}
      pr={1}
      py="5px"
      spacing={1}
      cursor="pointer"
      bg={selected ? 'mcBlue.50' : 'white'}
      color={selected ? 'mcBlue.600' : 'gray.700'}
      opacity={el.hidden ? 0.45 : 1}
      borderTopWidth="1px"
      borderBottomWidth="1px"
      borderColor="transparent"
      transition="background 0.12s ease, border-color 0.12s ease"
      _hover={{ bg: mc.secondary, borderColor: 'mcBlue.100' }}
      onClick={(e) => onSelect(e)}
    >
      <Box
        w="14px"
        flexShrink={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        visibility="hidden"
        _groupHover={{ visibility: draggable ? 'visible' : 'hidden' }}
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
          onDoubleClick={(e) => {
            if (!canEdit) return;
            e.stopPropagation();
            setDraft(el.name);
            setEditing(true);
          }}
        >
          {el.name}
        </Text>
      )}

      {canEdit && (
        <Menu placement="bottom-end" isLazy>
          <MenuButton
            as={IconButton}
            aria-label="Layer order"
            icon={<Icon as={LuLayers} boxSize={3.5} />}
            size="xs"
            minW={5}
            h={5}
            variant="ghost"
            color="gray.400"
            visibility="hidden"
            _groupHover={{ visibility: 'visible' }}
            onClick={(e) => e.stopPropagation()}
          />
          <Portal>
            <MenuList minW="160px">
              {Z_ACTIONS.map((a) => (
                <MenuItem key={a.op} fontSize="13px" onClick={() => reorderElementZ(el.id, a.op)}>
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
        canEdit={canEdit}
        onToggleHidden={() => toggleElementHidden(el.id)}
        onToggleLocked={() => toggleElementLocked(el.id)}
      />

      {canEdit && (
        <IconButton
          aria-label={`Delete ${el.name}`}
          icon={<LuTrash2 size={14} />}
          size="xs"
          minW={5}
          h={5}
          variant="ghost"
          color={mc.error}
          visibility="hidden"
          _hover={{ bg: 'transparent', color: mc.error }}
          _groupHover={{ visibility: 'visible' }}
          onClick={(e) => {
            e.stopPropagation();
            deleteElement(el.id);
          }}
        />
      )}
    </HStack>
  );
}

function DragGhost({ el, depth, x, y, width }: { el: AdElement; depth: number; x: number; y: number; width: number }) {
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
          <ElementRowContent el={el} />
        </HStack>
      </Box>
    </Portal>
  );
}

function GroupRow({
  row,
  selected,
  canEdit,
  onSelect,
  onToggle,
  onEnter,
  dropHighlight,
}: {
  row: Extract<LayerRow, { kind: 'group' }>;
  selected: boolean;
  canEdit: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onToggle: () => void;
  onEnter: () => void;
  dropHighlight: boolean;
}) {
  const groups = useEditorStore((s) => s.groups);
  const renameGroup = useEditorStore((s) => s.renameGroup);
  const toggleGroupHidden = useEditorStore((s) => s.toggleGroupHidden);
  const toggleGroupLocked = useEditorStore((s) => s.toggleGroupLocked);
  const ungroup = useEditorStore((s) => s.ungroup);
  const group = groups[row.id];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.name);

  const commit = () => {
    setEditing(false);
    if (draft.trim()) renameGroup(row.id, draft.trim());
    else setDraft(row.name);
  };

  return (
    <HStack
      role="group"
      pl="8px"
      pr={1}
      py="5px"
      spacing={1}
      cursor="pointer"
      transition="background 0.12s ease, outline 0.12s ease"
      bg={dropHighlight ? 'mcBlue.50' : selected ? 'mcBlue.50' : 'transparent'}
      color={selected ? 'mcBlue.600' : 'gray.700'}
      opacity={group?.hidden ? 0.45 : 1}
      outline={dropHighlight ? '1px solid' : undefined}
      outlineColor={dropHighlight ? 'mcBlue.200' : undefined}
      _hover={{ bg: selected || dropHighlight ? 'mcBlue.50' : 'gray.50' }}
      onClick={(e) => onSelect(e)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEnter();
      }}
    >
      <Box w="14px" flexShrink={0} />
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
          visibility="hidden"
          _groupHover={{ visibility: 'visible' }}
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
  elementId: string;
  offsetX: number;
  offsetY: number;
  width: number;
  x: number;
  y: number;
}

export default function LayerTree() {
  const elements = useEditorStore((s) => s.elements);
  const groups = useEditorStore((s) => s.groups);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const select = useEditorStore((s) => s.select);
  const toggleGroupCollapsed = useEditorStore((s) => s.toggleGroupCollapsed);
  const moveElementLayer = useEditorStore((s) => s.moveElementLayer);
  const enterGroup = useEditorStore((s) => s.enterGroup);
  const canEdit = usePhase('p1');
  const canGroup = usePhase('p2');

  const listRef = useRef<HTMLDivElement>(null);
  const baseRowsRef = useRef<LayerRow[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [groupDropId, setGroupDropId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<DragGhostState | null>(null);

  const byId = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);

  // When grouping is off, present a flat list of all elements (groups flattened away).
  const rows = useMemo<LayerRow[]>(() => {
    if (canGroup) return buildLayerRows(elements, groups);
    const order = buildSiblingOrder(elements, groups);
    return sortElementsForLayerList(elements, order).map((el) => ({
      kind: 'element' as const,
      id: el.id,
      parentId: null,
      depth: 0,
    }));
  }, [elements, groups, canGroup]);

  const selectableIds = useMemo(() => layerListSelectableIds(rows), [rows]);

  const handleSelect = useCallback(
    (id: string, e: React.MouseEvent) => {
      select(id, { additive: e.metaKey || e.ctrlKey, range: e.shiftKey, rangeOrder: selectableIds });
    },
    [select, selectableIds],
  );

  useEffect(() => {
    baseRowsRef.current = rows;
  }, [rows]);

  const displayRows = useMemo(() => {
    if (!draggingId || dropIndex === null) return rows;
    return buildPreviewRows(rows, draggingId, dropIndex, groupDropId);
  }, [rows, draggingId, dropIndex, groupDropId]);

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
    (elementId: string, target: LayerDropTarget) => {
      moveElementLayer(elementId, target);
      setDraggingId(null);
      setDropIndex(null);
      setGroupDropId(null);
      setGhost(null);
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
    },
    [moveElementLayer],
  );

  const startDrag = useCallback(
    (elementId: string, e: React.PointerEvent) => {
      const el = byId.get(elementId);
      if (!el || el.locked) return;
      const rowNode = (e.currentTarget as HTMLElement).closest('[data-layer-row]') as HTMLElement | null;
      const rowRect = rowNode?.getBoundingClientRect();
      if (!rowRect) return;

      e.preventDefault();
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';

      const offsetX = e.clientX - rowRect.left;
      const offsetY = e.clientY - rowRect.top;
      const initialIndex = resolveDropIndex(e.clientY);

      setDraggingId(elementId);
      setDropIndex(initialIndex);
      setGroupDropId(null);
      setGhost({ elementId, offsetX, offsetY, width: rowRect.width, x: rowRect.left, y: rowRect.top });

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
        const groupId = canGroup ? resolveGroupDrop(ev.clientX, ev.clientY) : null;
        if (groupId) {
          const groupRow = baseRows.find((r) => r.kind === 'group' && r.id === groupId);
          finishDrag(elementId, {
            parentId: groupId,
            beforeId: groupRow?.kind === 'group' ? groupRow.firstChildId : null,
          });
          return;
        }
        const index = resolveDropIndex(ev.clientY);
        finishDrag(elementId, dropTargetAtIndex(baseRows, index));
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [byId, canGroup, finishDrag, resolveDropIndex, resolveGroupDrop],
  );

  const ghostElement = ghost ? byId.get(ghost.elementId) : null;
  const ghostDepth = useMemo(() => {
    if (!draggingId) return 0;
    const previewRow = displayRows.find((r) => r.kind === 'element' && r.id === draggingId);
    return previewRow?.kind === 'element' ? previewRow.depth : 0;
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
                  onSelect={(e) => handleSelect(row.id, e)}
                  onToggle={() => toggleGroupCollapsed(row.id)}
                  onEnter={() => enterGroup(row.id)}
                  dropHighlight={draggingId !== null && groupDropId === row.id}
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
                      draggable={canEdit && !el.locked && draggingId === null}
                      isPlaceholder={isPlaceholder}
                      selected={selectedIds.includes(el.id)}
                      canEdit={canEdit}
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

      {ghost && ghostElement && (
        <DragGhost el={ghostElement} depth={ghostDepth} x={ghost.x} y={ghost.y} width={ghost.width} />
      )}
    </>
  );
}
