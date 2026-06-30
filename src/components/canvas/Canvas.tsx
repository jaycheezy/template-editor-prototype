import { useCallback, useMemo, useRef } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { useEditorStore } from '../../store/editorStore';
import { usePhase } from '../../store/featureStore';
import { isEffectivelyLocked, renderScene, type RenderedElement } from '../../lib/engine';
import { applyTextCase } from '../../lib/format';
import { buildLayerRows, buildSiblingOrder, sortElementsForPaint } from '../../lib/layers';
import { expandSelectionToElementIds, layerListElementIds } from '../../lib/selection';
import { CANVAS } from '../../data/mockTemplate';
import type { AdElement } from '../../types';

const SCALE = 1.6;

type Corner = 'nw' | 'ne' | 'sw' | 'se';

function ElementView({
  rendered,
  selected,
  onPointerDown,
  onDoubleClick,
}: {
  rendered: RenderedElement;
  selected: boolean;
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
    opacity: transform.opacity,
    cursor: element.locked ? 'default' : 'move',
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
            border: '1.5px solid rgb(0, 92, 255)',
            background: 'rgba(51, 68, 238, 0.10)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

export default function Canvas() {
  const elements = useEditorStore((s) => s.elements);
  const groups = useEditorStore((s) => s.groups);
  const animation = useEditorStore((s) => s.animation);
  const currentTime = useEditorStore((s) => s.currentTime);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const select = useEditorStore((s) => s.select);
  const moveSelectionBy = useEditorStore((s) => s.moveSelectionBy);
  const resizeElement = useEditorStore((s) => s.resizeElement);
  const enterGroup = useEditorStore((s) => s.enterGroup);
  const exitGroup = useEditorStore((s) => s.exitGroup);

  const canEdit = usePhase('p1');
  const canGroup = usePhase('p2');

  const dragRef = useRef<{ startX: number; startY: number } | null>(null);

  const elementRangeOrder = useMemo(
    () => layerListElementIds(buildLayerRows(elements, groups)),
    [elements, groups],
  );

  const highlightedElements = useMemo(
    () => expandSelectionToElementIds(selectedIds, groups),
    [selectedIds, groups],
  );

  const rendered = useMemo(
    () => renderScene(elements, groups, animation, currentTime, canGroup),
    [elements, groups, animation, currentTime, canGroup],
  );

  const paintOrder = useMemo(() => {
    const siblingOrder = buildSiblingOrder(elements, groups);
    const byId = new Map(rendered.map((r) => [r.element.id, r]));
    return sortElementsForPaint(
      rendered.map((r) => r.element),
      siblingOrder,
    )
      .map((el) => byId.get(el.id))
      .filter((r): r is RenderedElement => Boolean(r))
      .filter((r) => !r.hidden);
  }, [rendered, elements, groups]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, el: AdElement) => {
      e.stopPropagation();
      const alreadySelected = highlightedElements.has(el.id);
      if (!alreadySelected) {
        select(el.id, {
          additive: e.metaKey || e.ctrlKey,
          range: e.shiftKey,
          rangeOrder: elementRangeOrder,
        });
      }

      if (!canEdit || isEffectivelyLocked(el, groups)) return;

      // Drag the whole current selection (or just this element if it was not selected).
      const movingIds = alreadySelected && selectedIds.length > 0 ? selectedIds : [el.id];
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
    [canEdit, elementRangeOrder, groups, highlightedElements, moveSelectionBy, select, selectedIds],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, el: AdElement) => {
      e.stopPropagation();
      if (canGroup && el.parentId) enterGroup(el.parentId);
    },
    [canGroup, enterGroup],
  );

  // Resize: single non-locked element, Phase 1 only.
  const primaryId = selectedIds.length === 1 ? selectedIds[0] : null;
  const primary = primaryId ? elements.find((el) => el.id === primaryId) ?? null : null;
  const canResize =
    canEdit && primary != null && primary.type !== 'SVG' && !isEffectivelyLocked(primary, groups);

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
      border: '1.5px solid rgb(0, 92, 255)',
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
              selected={highlightedElements.has(r.element.id)}
              onPointerDown={handlePointerDown}
              onDoubleClick={handleDoubleClick}
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
