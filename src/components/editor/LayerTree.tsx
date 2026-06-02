import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, HStack, Icon, IconButton, Portal, Text } from '@chakra-ui/react';
import { FaShapes } from 'react-icons/fa';
import {
  LuChevronDown,
  LuChevronRight,
  LuFolder,
  LuGripVertical,
  LuImage,
  LuTrash2,
  LuType,
} from 'react-icons/lu';
import { PiBoundingBox } from 'react-icons/pi';
import type { IconType } from 'react-icons';
import {
  buildLayerRows,
  buildPreviewRows,
  dropTargetAtIndex,
  type LayerDropTarget,
  type LayerRow,
} from '../../lib/layers';
import { layerListSelectableIds } from '../../lib/selection';
import { useEditorStore } from '../../store/editorStore';
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

function ElementRow({
  el,
  depth,
  draggable,
  isPlaceholder,
  selected,
  onSelect,
  onDragStart,
}: {
  el: AdElement;
  depth: number;
  draggable: boolean;
  isPlaceholder: boolean;
  selected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDragStart: (elementId: string, e: React.PointerEvent) => void;
}) {
  const deleteElement = useEditorStore((s) => s.deleteElement);

  if (isPlaceholder) {
    return <DropPlaceholder depth={depth} />;
  }

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
      borderTopWidth="1px"
      borderBottomWidth="1px"
      borderColor="transparent"
      transition="background 0.12s ease, border-color 0.12s ease"
      _hover={{
        bg: mc.secondary,
        borderColor: 'mcBlue.100',
      }}
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
        <Icon
          as={LuGripVertical}
          boxSize={3.5}
          color="gray.400"
          cursor="grab"
          _active={{ cursor: 'grabbing' }}
        />
      </Box>
      <Icon as={elementIcon(el.type)} boxSize={3.5} opacity={0.85} flexShrink={0} />
      <Text fontSize="13px" noOfLines={1} flex={1}>
        {el.name}
      </Text>
      {draggable && (
        <IconButton
          aria-label={`Delete ${el.name}`}
          icon={<LuTrash2 size={14} />}
          size="xs"
          minW={6}
          h={6}
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

function DragGhost({
  el,
  depth,
  x,
  y,
  width,
}: {
  el: AdElement;
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
        <HStack
          pl={`${4 + depth * 16}px`}
          pr={1}
          py="5px"
          spacing={1}
          color="mcBlue.600"
          bg={mc.secondary}
        >
          <ElementRowContent el={el} />
        </HStack>
      </Box>
    </Portal>
  );
}

function GroupRow({
  row,
  selected,
  onSelect,
  onToggle,
  dropHighlight,
}: {
  row: Extract<LayerRow, { kind: 'group' }>;
  selected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onToggle: () => void;
  dropHighlight: boolean;
}) {
  return (
    <HStack
      pl="8px"
      pr={3}
      py="5px"
      spacing={1}
      cursor="pointer"
      transition="background 0.12s ease, outline 0.12s ease"
      bg={dropHighlight ? 'mcBlue.50' : selected ? 'mcBlue.50' : 'transparent'}
      color={selected ? 'mcBlue.600' : 'gray.700'}
      outline={dropHighlight ? '1px solid' : undefined}
      outlineColor={dropHighlight ? 'mcBlue.200' : undefined}
      _hover={{ bg: selected || dropHighlight ? 'mcBlue.50' : 'gray.50' }}
      onClick={(e) => onSelect(e)}
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
      <Text fontSize="13px" fontWeight={600} noOfLines={1}>
        {row.name}
      </Text>
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

  const listRef = useRef<HTMLDivElement>(null);
  const baseRowsRef = useRef<LayerRow[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [groupDropId, setGroupDropId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<DragGhostState | null>(null);

  const byId = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  const rows = useMemo(() => buildLayerRows(elements, groups), [elements, groups]);
  const selectableIds = useMemo(() => layerListSelectableIds(rows), [rows]);

  const handleSelect = useCallback(
    (id: string, e: React.MouseEvent) => {
      select(id, {
        additive: e.metaKey || e.ctrlKey,
        range: e.shiftKey,
        rangeOrder: selectableIds,
      });
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
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
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
      setGhost({
        elementId,
        offsetX,
        offsetY,
        width: rowRect.width,
        x: rowRect.left,
        y: rowRect.top,
      });

      const onMove = (ev: PointerEvent) => {
        const nextGroupDrop = resolveGroupDrop(ev.clientX, ev.clientY);
        setGroupDropId(nextGroupDrop);
        setDropIndex(resolveDropIndex(ev.clientY));
        setGhost((prev) =>
          prev
            ? {
                ...prev,
                x: ev.clientX - prev.offsetX,
                y: ev.clientY - prev.offsetY,
              }
            : null,
        );
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);

        const baseRows = baseRowsRef.current;
        const groupId = resolveGroupDrop(ev.clientX, ev.clientY);
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
    [byId, finishDrag, resolveDropIndex, resolveGroupDrop],
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
                  onSelect={(e) => handleSelect(row.id, e)}
                  onToggle={() => toggleGroupCollapsed(row.id)}
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
                      draggable={!el.locked && draggingId === null}
                      isPlaceholder={isPlaceholder}
                      selected={selectedIds.includes(el.id)}
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
        <DragGhost
          el={ghostElement}
          depth={ghostDepth}
          x={ghost.x}
          y={ghost.y}
          width={ghost.width}
        />
      )}
    </>
  );
}
