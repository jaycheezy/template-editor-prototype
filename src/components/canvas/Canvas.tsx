import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, HStack, Icon, IconButton, Text } from '@chakra-ui/react';
import { LuMinus, LuPlus } from 'react-icons/lu';
import { useEditorStore } from '../../store/editorStore';
import { usePhase } from '../../store/featureStore';
import { groupDescendantAabb, type Rect } from '../../lib/bounds';
import { isEffectivelyLocked, renderScene, type RenderedElement } from '../../lib/engine';
import { applyTextCase } from '../../lib/format';
import { buildFlatLayerListIds, buildSiblingOrder, sortElementsForPaint } from '../../lib/layers';
import {
  isInEnteredScope,
  selectableAtScope,
  shouldShowGroupBoundingBox,
} from '../../lib/selection';
import {
  LEGACY_SCALE,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
  centerPan,
  clampZoom,
  fitZoom,
  zoomAtPoint,
  type Pan,
} from '../../lib/viewport';
import { CANVAS } from '../../data/mockTemplate';
import type { AdElement } from '../../types';

const SELECTION_STROKE = '1.5px solid rgb(0, 92, 255)';
const SELECTION_FILL = 'rgba(51, 68, 238, 0.10)';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

type Corner = 'nw' | 'ne' | 'sw' | 'se';

function ElementView({
  rendered,
  selected,
  canMove,
  inert,
  cursor,
  onPointerDown,
  onDoubleClick,
}: {
  rendered: RenderedElement;
  selected: boolean;
  canMove: boolean;
  inert?: boolean;
  cursor?: string;
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
    cursor: cursor ?? (inert || element.locked || !canMove ? 'default' : 'move'),
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

function ZoomHud({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  return (
    <HStack
      position="absolute"
      bottom="12px"
      right="12px"
      spacing={0}
      bg="white"
      borderRadius="8px"
      boxShadow="0 2px 10px rgba(0,0,0,0.12)"
      borderWidth="1px"
      borderColor="gray.200"
      px={1}
      py={0.5}
      zIndex={20}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <IconButton
        aria-label="Zoom out"
        icon={<Icon as={LuMinus} boxSize={3.5} />}
        size="xs"
        variant="ghost"
        isDisabled={zoom <= MIN_ZOOM}
        onClick={onZoomOut}
      />
      <Text
        fontSize="11px"
        fontWeight={700}
        color="gray.700"
        minW="42px"
        textAlign="center"
        cursor="pointer"
        title="Fit to frame"
        onClick={onFit}
      >
        {Math.round(zoom * 100)}%
      </Text>
      <IconButton
        aria-label="Zoom in"
        icon={<Icon as={LuPlus} boxSize={3.5} />}
        size="xs"
        variant="ghost"
        isDisabled={zoom >= MAX_ZOOM}
        onClick={onZoomIn}
      />
    </HStack>
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

  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(LEGACY_SCALE);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const viewScale = canLayout ? zoom : LEGACY_SCALE;

  const centerAtZoom = useCallback((nextZoom: number) => {
    const el = viewportRef.current;
    if (!el) {
      setZoom(nextZoom);
      return;
    }
    setZoom(nextZoom);
    setPan(centerPan(el.clientWidth, el.clientHeight, CANVAS.width, CANVAS.height, nextZoom));
  }, []);

  const fitToFrame = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const nextZoom = fitZoom(el.clientWidth, el.clientHeight, CANVAS.width, CANVAS.height);
    centerAtZoom(nextZoom);
  }, [centerAtZoom]);

  const zoomTowardCenter = useCallback((nextZoom: number) => {
    const el = viewportRef.current;
    if (!el) {
      setZoom(clampZoom(nextZoom));
      return;
    }
    const next = zoomAtPoint(zoomRef.current, panRef.current, nextZoom, {
      x: el.clientWidth / 2,
      y: el.clientHeight / 2,
    });
    setZoom(next.zoom);
    setPan(next.pan);
  }, []);

  useLayoutEffect(() => {
    if (!canLayout) return;
    centerAtZoom(LEGACY_SCALE);
  }, [canLayout, centerAtZoom]);

  useEffect(() => {
    if (!canLayout) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setSpaceHeld(true);
        return;
      }
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey) return;
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomTowardCenter(zoomRef.current + ZOOM_STEP);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomTowardCenter(zoomRef.current - ZOOM_STEP);
      } else if (e.key === '0') {
        e.preventDefault();
        fitToFrame();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [canLayout, fitToFrame, zoomTowardCenter]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !canLayout) return undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const next = zoomAtPoint(
        zoomRef.current,
        panRef.current,
        zoomRef.current * (e.deltaY > 0 ? 0.92 : 1.08),
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
      );
      setZoom(next.zoom);
      setPan(next.pan);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [canLayout]);

  const startPan = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setPanning(true);
    const origin = { x: e.clientX, y: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
    const onMove = (ev: PointerEvent) => {
      setPan({ x: origin.panX + (ev.clientX - origin.x), y: origin.panY + (ev.clientY - origin.y) });
    };
    const onUp = () => {
      setPanning(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  const dragRef = useRef<{ startX: number; startY: number } | null>(null);

  const rendered = useMemo(
    () => renderScene(elements, groups, animation, currentTime, canGroup),
    [elements, groups, animation, currentTime, canGroup],
  );

  const paintOrder = useMemo(() => {
    const siblingOrder = canGroup
      ? buildSiblingOrder(elements, groups, rootOrder)
      : [...buildFlatLayerListIds(elements)].reverse();
    const byId = new Map(rendered.map((r) => [r.element.id, r]));
    return sortElementsForPaint(
      rendered.map((r) => r.element),
      siblingOrder,
    )
      .map((el) => byId.get(el.id))
      .filter((r): r is RenderedElement => Boolean(r))
      .filter((r) => !r.hidden);
  }, [rendered, elements, groups, rootOrder, canGroup]);

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
        const dx = (ev.clientX - lastX) / viewScale;
        const dy = (ev.clientY - lastY) / viewScale;
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
    [moveSelectionBy, viewScale],
  );

  const hitTargetId = useCallback(
    (el: AdElement) =>
      canGroup ? selectableAtScope(el.id, enteredGroupId, groups, elements) : el.id,
    [canGroup, enteredGroupId, groups, elements],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, el: AdElement) => {
      e.stopPropagation();
      if (canLayout && (spaceHeld || e.button === 1)) {
        startPan(e);
        return;
      }
      if (canGroup && !isInEnteredScope(el.id, enteredGroupId, groups, elements)) return;

      const hitId = hitTargetId(el);
      const alreadySelected = selectedIds.includes(hitId);
      if (!alreadySelected) {
        select(hitId, {
          additive: canLayout && (e.metaKey || e.ctrlKey || e.shiftKey),
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
      elements,
      enteredGroupId,
      groups,
      hitTargetId,
      select,
      selectedIds,
      spaceHeld,
      startMoveDrag,
      startPan,
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
      if (canLayout && (spaceHeld || e.button === 1)) {
        startPan(e);
        return;
      }
      const alreadySelected = selectedIds.includes(groupId);
      if (!alreadySelected) {
        select(groupId, {
          additive: canLayout && (e.metaKey || e.ctrlKey || e.shiftKey),
        });
      }
      if (!canLayout || groups[groupId]?.locked) return;
      const movingIds = alreadySelected && selectedIds.length > 0 ? selectedIds : [groupId];
      startMoveDrag(movingIds, e);
    },
    [canLayout, groups, select, selectedIds, spaceHeld, startMoveDrag, startPan],
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
        let dx = (ev.clientX - startX) / viewScale;
        let dy = (ev.clientY - startY) / viewScale;
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
    [primary, resizeElement, viewScale],
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

  const scene = (
    <>
      {paintOrder.map((r) => (
        <ElementView
          key={r.element.id}
          rendered={r}
          selected={selectedIds.includes(r.element.id)}
          canMove={canLayout && !spaceHeld}
          cursor={spaceHeld || panning ? (panning ? 'grabbing' : 'grab') : undefined}
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
          canMove={canLayout && !spaceHeld}
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
    </>
  );

  if (!canLayout) {
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
            width: CANVAS.width * LEGACY_SCALE,
            height: CANVAS.height * LEGACY_SCALE,
          }}
        >
          <Box
            position="absolute"
            top={0}
            left={0}
            overflow="hidden"
            style={{
              width: CANVAS.width,
              height: CANVAS.height,
              transform: `scale(${LEGACY_SCALE})`,
              transformOrigin: 'top left',
            }}
          >
            {scene}
          </Box>
        </Box>
      </Flex>
    );
  }

  return (
    <Flex
      ref={viewportRef}
      flex={1}
      overflow="hidden"
      position="relative"
      bg="#d8dce3"
      cursor={spaceHeld || panning ? (panning ? 'grabbing' : 'grab') : 'default'}
      onPointerDown={(e) => {
        if (spaceHeld || e.button === 1 || e.target === e.currentTarget) {
          startPan(e);
          if (e.target === e.currentTarget) select(null);
          return;
        }
        select(null);
      }}
      onDoubleClick={() => canGroup && exitGroup()}
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        <Box
          position="relative"
          width={`${CANVAS.width}px`}
          height={`${CANVAS.height}px`}
          overflow="visible"
          bg="white"
          boxShadow="0 0 0 1px rgba(0,0,0,0.22), 0 8px 30px rgba(0,0,0,0.18)"
          onPointerDown={(e) => {
            if (spaceHeld || e.button === 1) return;
            e.stopPropagation();
          }}
        >
          {scene}
        </Box>
      </Box>
      <ZoomHud
        zoom={zoom}
        onZoomIn={() => zoomTowardCenter(zoom + ZOOM_STEP)}
        onZoomOut={() => zoomTowardCenter(zoom - ZOOM_STEP)}
        onFit={fitToFrame}
      />
    </Flex>
  );
}
