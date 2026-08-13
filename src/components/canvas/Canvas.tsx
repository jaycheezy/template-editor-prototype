import { useCallback, useMemo, useRef } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { useEditorStore } from '../../store/editorStore';
import { usePhase } from '../../store/featureStore';
import { groupDescendantAabb, type Rect } from '../../lib/bounds';
import { isEffectivelyLocked, renderScene, type RenderedElement } from '../../lib/engine';
import { applyTextCase } from '../../lib/format';
import { buildLayerRows, buildSiblingOrder, sortElementsForPaint } from '../../lib/layers';
import {
  isInEnteredScope,
  layerListElementIds,
  selectableAtScope,
  shouldShowGroupBoundingBox,
} from '../../lib/selection';
import { CANVAS } from '../../data/mockTemplate';
import type { AdElement } from '../../types';

const SCALE = 1.6;
const SELECTION_STROKE = '1.5px solid rgb(0, 92, 255)';
const SELECTION_FILL = 'rgba(51, 68, 238, 0.10)';

type Corner = 'nw' | 'ne' | 'sw' | 'se';

function ElementView({
  rendered,
  selected,
  canMove,
  inert,
  onPointerDown,
  onDoubleClick,
}: {
  rendered: RenderedElement;
  selected: boolean;
  canMove: boolean;
  inert?: boolean;
  onPointerDown: (e: React.PointerEvent, el: AdElement) => void;
  onDoubleClick: (e: React.MouseEvent, el: AdElement) => void;
}) {
  const { element, transform } = rendered;
  const common: React.CSSProperties = {
    position: 'absolute',
    left: transform.x,
    top: transform.y,
    width: element.size.width,
    height: element.size.height,
    zIndex: element.position.z,
    transform: `rotate(${transform.rotation}deg) scale(${transform.scaleX}, ${transform.scaleY})`,
    transformOrigin: 'center center',
    opacity: inert ? transform.opacity * 0.35 : transform.opacity,
    cursor: inert || element.locked || !canMove ? 'default' : 'move',
    pointerEvents: inert ? 'none' : 'auto',
  };

  let content: React.ReactNode;
  if (element.type === 'TEXT') {
    content = (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            element.align === 'left' ? 'flex-start' : element.align === 'right' ? 'flex-end' : 'center',
          color: element.color,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          lineHeight: element.lineHeight,
          letterSpacing: element.letterSpacing ?? 0,
          fontFamily: `'${element.fontFamily}', sans-serif`,
          background: element.boxColor ?? 'transparent',
          borderRadius: element.boxRadius ?? 0,
          padding: element.boxColor ? '0 4px' : 0,
          textAlign: element.align,
          whiteSpace: 'nowrap',
        }}
      >
        {applyTextCase(element.content, element.textCase)}
      </div>
    );
  } else {
    content = (
      <div
        style={{ width: '100%', height: '100%' }}
        dangerouslySetInnerHTML={{ __html: (element as { svg: string }).svg }}
      />
    );
  }

  return (
    <div
      style={common}
      onPointerDown={(e) => onPointerDown(e, element)}
      onDoubleClick={(e) => onDoubleClick(e, element)}
      data-element-id={element.id}
    >
      {content}
      {selected && (
        <div
          style={{
            position: 'absolute',
            inset: -2,
            border: SELECTION_STROKE,
            background: SELECTION_FILL,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

function GroupBounds({
  groupId,
  rect,
  canMove,
  locked,
  onPointerDown,
  onDoubleClick,
}: {
  groupId: string;
  rect: Rect;
  canMove: boolean;
  locked: boolean;
  onPointerDown: (e: React.PointerEvent, groupId: string) => void;
  onDoubleClick: (e: React.MouseEvent, groupId: string) => void;
}) {
  const edgeCursor = locked || !canMove ? 'default' : 'move';
  const edge: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'auto',
    cursor: edgeCursor,
  };
  return (
    <div
      data-group-bounds={groupId}
      onDoubleClick={(e) => onDoubleClick(e, groupId)}
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        border: SELECTION_STROKE,
        background: SELECTION_FILL,
        pointerEvents: 'none',
        zIndex: 10000,
      }}
    >
      <div style={{ ...edge, left: -4, right: -4, top: -4, height: 8 }} onPointerDown={(e) => onPointerDown(e, groupId)} />
      <div style={{ ...edge, left: -4, right: -4, bottom: -4, height: 8 }} onPointerDown={(e) => onPointerDown(e, groupId)} />
      <div style={{ ...edge, top: 4, bottom: 4, left: -4, width: 8 }} onPointerDown={(e) => onPointerDown(e, groupId)} />
      <div style={{ ...edge, top: 4, bottom: 4, right: -4, width: 8 }} onPointerDown={(e) => onPointerDown(e, groupId)} />
    </div>
  );
}

export default function Canvas() {
  const elements = useEditorStore((s) => s.elements);
  const groups = useEditorStore((s) => s.groups);
  const rootOrder = useEditorStore((s) => s.rootOrder);
  const animation = useEditorStore((s) => s.animation);
  const currentTime = useEditorStore((s) => s.currentTime);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const enteredGroupId = useEditorStore((s) => s.enteredGroupId);
  const select = useEditorStore((s) => s.select);
  const moveSelectionBy = useEditorStore((s) => s.moveSelectionBy);
  const resizeElement = useEditorStore((s) => s.resizeElement);
  const enterGroup = useEditorStore((s) => s.enterGroup);
  const exitGroup = useEditorStore((s) => s.exitGroup);

  const canLayout = usePhase('layout');
  const canAuthor = usePhase('author');
  const canGroup = usePhase('groups');

  const dragRef = useRef<{ startX: number; startY: number } | null>(null);

  const elementRangeOrder = useMemo(
    () => layerListElementIds(buildLayerRows(elements, groups, rootOrder)),
    [elements, groups, rootOrder],
  );

  const rendered = useMemo(
    () => renderScene(elements, groups, animation, currentTime, canGroup),
    [elements, groups, animation, currentTime, canGroup],
  );

  const paintOrder = useMemo(() => {
    const siblingOrder = buildSiblingOrder(elements, groups, rootOrder);
    const byId = new Map(rendered.map((r) => [r.element.id, r]));
    return sortElementsForPaint(
      rendered.map((r) => r.element),
      siblingOrder,
    )
      .map((el) => byId.get(el.id))
      .filter((r): r is RenderedElement => Boolean(r))
      .filter((r) => !r.hidden);
  }, [rendered, elements, groups, rootOrder]);

  const groupBoxes = useMemo(() => {
    if (!canGroup) return [];
    return selectedIds
      .filter((id) => shouldShowGroupBoundingBox(id, selectedIds, enteredGroupId, groups, elements))
      .map((id) => {
        const rect = groupDescendantAabb(id, rendered, groups);
        return rect ? { id, rect, locked: Boolean(groups[id]?.locked) } : null;
      })
      .filter((box): box is { id: string; rect: Rect; locked: boolean } => Boolean(box));
  }, [canGroup, selectedIds, enteredGroupId, groups, elements, rendered]);

  const startMoveDrag = useCallback(
    (movingIds: string[], e: React.PointerEvent) => {
      dragRef.current = { startX: e.clientX, startY: e.clientY };
      let lastX = e.clientX;
      let lastY = e.clientY;
      const onMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const dx = (ev.clientX - lastX) / SCALE;
        const dy = (ev.clientY - lastY) / SCALE;
        lastX = ev.clientX;
        lastY = ev.clientY;
        moveSelectionBy(movingIds, dx, dy);
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [moveSelectionBy],
  );

  const hitTargetId = useCallback(
    (el: AdElement) =>
      canGroup ? selectableAtScope(el.id, enteredGroupId, groups, elements) : el.id,
    [canGroup, enteredGroupId, groups, elements],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, el: AdElement) => {
      e.stopPropagation();
      if (canGroup && !isInEnteredScope(el.id, enteredGroupId, groups, elements)) return;

      const hitId = hitTargetId(el);
      const alreadySelected = selectedIds.includes(hitId);
      if (!alreadySelected) {
        select(hitId, {
          additive: canLayout && (e.metaKey || e.ctrlKey),
          range: canLayout && e.shiftKey,
          rangeOrder: elementRangeOrder,
        });
      }

      if (!canLayout) return;
      if (groups[hitId]?.locked) return;
      const hitEl = elements.find((item) => item.id === hitId);
      if (hitEl && isEffectivelyLocked(hitEl, groups)) return;

      const movingIds = alreadySelected && selectedIds.length > 0 ? selectedIds : [hitId];
      startMoveDrag(movingIds, e);
    },
    [
      canGroup,
      canLayout,
      elementRangeOrder,
      elements,
      enteredGroupId,
      groups,
      hitTargetId,
      select,
      selectedIds,
      startMoveDrag,
    ],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, el: AdElement) => {
      e.stopPropagation();
      if (!canGroup) return;
      const hitId = hitTargetId(el);
      if (!groups[hitId]) return;
      const innerId = selectableAtScope(el.id, hitId, groups, elements);
      enterGroup(hitId);
      select(innerId);
    },
    [canGroup, elements, enterGroup, groups, hitTargetId, select],
  );

  const handleGroupBoxPointerDown = useCallback(
    (e: React.PointerEvent, groupId: string) => {
      e.stopPropagation();
      const alreadySelected = selectedIds.includes(groupId);
      if (!alreadySelected) {
        select(groupId, {
          additive: canLayout && (e.metaKey || e.ctrlKey),
        });
      }
      if (!canLayout || groups[groupId]?.locked) return;
      const movingIds = alreadySelected && selectedIds.length > 0 ? selectedIds : [groupId];
      startMoveDrag(movingIds, e);
    },
    [canLayout, groups, select, selectedIds, startMoveDrag],
  );

  const handleGroupBoxDoubleClick = useCallback(
    (e: React.MouseEvent, groupId: string) => {
      e.stopPropagation();
      if (!canGroup) return;
      enterGroup(groupId);
    },
    [canGroup, enterGroup],
  );

  // Resize: single non-locked element, authoring epic only.
  const primaryId = selectedIds.length === 1 ? selectedIds[0] : null;
  const primary = primaryId ? elements.find((el) => el.id === primaryId) ?? null : null;
  const canResize =
    canAuthor && primary != null && primary.type !== 'SVG' && !isEffectivelyLocked(primary, groups);

  const startResize = useCallback(
    (corner: Corner) => (e: React.PointerEvent) => {
      if (!primary) return;
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const origin = { ...primary.position };
      const startSize = { ...primary.size };
      const ratio = startSize.width / Math.max(1, startSize.height);

      const onMove = (ev: PointerEvent) => {
        let dx = (ev.clientX - startX) / SCALE;
        let dy = (ev.clientY - startY) / SCALE;
        const left = corner === 'nw' || corner === 'sw';
        const top = corner === 'nw' || corner === 'ne';
        if (left) dx = -dx;
        if (top) dy = -dy;
        let width = Math.max(8, startSize.width + dx);
        let height = Math.max(8, startSize.height + dy);
        // images/vectors keep aspect ratio while Shift is held (per spec)
        if (primary.type !== 'TEXT' && ev.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) height = width / ratio;
          else width = height * ratio;
        }
        const x = left ? origin.x + (startSize.width - width) : origin.x;
        const y = top ? origin.y + (startSize.height - height) : origin.y;
        resizeElement(primary.id, { width, height }, { x, y });
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [primary, resizeElement],
  );

  const handleStyle = (corner: Corner): React.CSSProperties => {
    const map: Record<Corner, React.CSSProperties> = {
      nw: { left: -4, top: -4, cursor: 'nwse-resize' },
      ne: { right: -4, top: -4, cursor: 'nesw-resize' },
      sw: { left: -4, bottom: -4, cursor: 'nesw-resize' },
      se: { right: -4, bottom: -4, cursor: 'nwse-resize' },
    };
    return {
      position: 'absolute',
      width: 8,
      height: 8,
      background: 'white',
      border: SELECTION_STROKE,
      borderRadius: 2,
      ...map[corner],
    };
  };

  return (
    <Flex
      flex={1}
      align="center"
      justify="center"
      overflow="hidden"
      onPointerDown={() => select(null)}
      onDoubleClick={() => canGroup && exitGroup()}
    >
      <Box
        position="relative"
        boxShadow="0 8px 30px rgba(0,0,0,0.18)"
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: CANVAS.width * SCALE,
          height: CANVAS.height * SCALE,
        }}
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          style={{
            width: CANVAS.width,
            height: CANVAS.height,
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
          }}
        >
          {paintOrder.map((r) => (
            <ElementView
              key={r.element.id}
              rendered={r}
              selected={selectedIds.includes(r.element.id)}
              canMove={canLayout}
              inert={canGroup && !isInEnteredScope(r.element.id, enteredGroupId, groups, elements)}
              onPointerDown={handlePointerDown}
              onDoubleClick={handleDoubleClick}
            />
          ))}

          {groupBoxes.map((box) => (
            <GroupBounds
              key={box.id}
              groupId={box.id}
              rect={box.rect}
              canMove={canLayout}
              locked={box.locked}
              onPointerDown={handleGroupBoxPointerDown}
              onDoubleClick={handleGroupBoxDoubleClick}
            />
          ))}

          {canResize && primary && (
            <Box
              position="absolute"
              pointerEvents="none"
              style={{
                left: primary.position.x,
                top: primary.position.y,
                width: primary.size.width,
                height: primary.size.height,
              }}
            >
              {(['nw', 'ne', 'sw', 'se'] as Corner[]).map((c) => (
                <Box
                  key={c}
                  style={{ ...handleStyle(c), pointerEvents: 'auto' }}
                  onPointerDown={startResize(c)}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Flex>
  );
}
