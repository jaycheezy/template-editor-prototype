import { useCallback, useMemo, useRef } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { useEditorStore } from '../../store/editorStore';
import { renderScene, type RenderedElement } from '../../lib/engine';
import { applyTextCase } from '../../lib/format';
import { buildLayerRows, buildSiblingOrder, sortElementsForPaint } from '../../lib/layers';
import { expandSelectionToElementIds, layerListElementIds } from '../../lib/selection';
import { CANVAS } from '../../data/mockTemplate';
import type { AdElement } from '../../types';

const SCALE = 1.6;

function ElementView({
  rendered,
  selected,
  onPointerDown,
}: {
  rendered: RenderedElement;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent, el: AdElement) => void;
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
  const updateElementPosition = useEditorStore((s) => s.updateElementPosition);

  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const elementRangeOrder = useMemo(
    () => layerListElementIds(buildLayerRows(elements, groups)),
    [elements, groups],
  );

  const highlightedElements = useMemo(
    () => expandSelectionToElementIds(selectedIds, groups),
    [selectedIds, groups],
  );

  const rendered = useMemo(
    () => renderScene(elements, groups, animation, currentTime),
    [elements, groups, animation, currentTime],
  );

  const paintOrder = useMemo(() => {
    const siblingOrder = buildSiblingOrder(elements, groups);
    const byId = new Map(rendered.map((r) => [r.element.id, r]));
    return sortElementsForPaint(
      rendered.map((r) => r.element),
      siblingOrder,
    )
      .map((el) => byId.get(el.id))
      .filter((r): r is RenderedElement => Boolean(r));
  }, [rendered, elements, groups]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, el: AdElement) => {
      e.stopPropagation();
      select(el.id, {
        additive: e.metaKey || e.ctrlKey,
        range: e.shiftKey,
        rangeOrder: elementRangeOrder,
      });

      if (el.locked) return;
      dragRef.current = {
        id: el.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: el.position.x,
        origY: el.position.y,
      };
      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = (ev.clientX - d.startX) / SCALE;
        const dy = (ev.clientY - d.startY) / SCALE;
        updateElementPosition(d.id, Math.round(d.origX + dx), Math.round(d.origY + dy));
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [elementRangeOrder, select, updateElementPosition],
  );

  return (
    <Flex flex={1} align="center" justify="center" overflow="hidden" onPointerDown={() => select(null)}>
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
            />
          ))}
        </Box>
      </Box>
    </Flex>
  );
}
