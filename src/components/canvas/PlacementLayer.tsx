import { useEffect, useRef, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { useEditorStore } from '../../store/editorStore';
import { CANVAS } from '../../data/mockTemplate';
import { DRAG_THRESHOLD, createImage, createTextBox, createVector, shapeSvg } from '../../lib/factory';
import type { ImageElement, PlacementTool } from '../../types';
import ImageContent from './ImageContent';

interface Point {
  x: number;
  y: number;
}

/** Cursor position expressed in artboard (scene) units, plus the current screen scale. */
function toScene(e: { clientX: number; clientY: number }, artboard: HTMLElement): Point & { scale: number } {
  const r = artboard.getBoundingClientRect();
  const scale = r.width / CANVAS.width || 1;
  return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale, scale };
}

function toLocal(e: { clientX: number; clientY: number }, layer: HTMLElement): Point {
  const r = layer.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

/** Shift while dragging keeps the shape square, like Figma. */
function constrain(from: Point, to: Point, square: boolean): Point {
  if (!square) return to;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const side = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: from.x + Math.sign(dx || 1) * side, y: from.y + Math.sign(dy || 1) * side };
}

const HINTS: Record<PlacementTool['kind'], string> = {
  text: 'Click for a text box, or drag to set its size',
  image: 'Click to place the image',
  vector: 'Click and drag to draw (hold Shift for equal sides)',
};

interface DragState {
  startScene: Point;
  startLocal: Point;
  curScene: Point;
  scale: number;
  square: boolean;
}

/**
 * Transparent layer over the canvas while an Add-menu tool is armed. It owns the cursor
 * (I-beam for text, + for shapes), shows the image ghost, and turns the click / drag into an element.
 */
export default function PlacementLayer({
  tool,
  artboardRef,
}: {
  tool: PlacementTool;
  artboardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const placeElement = useEditorStore((s) => s.placeElement);
  const setPlacementTool = useEditorStore((s) => s.setPlacementTool);
  const [hover, setHover] = useState<(Point & { scale: number }) | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  // text boxes are created on the click that follows pointerup, so focus isn't stolen by that click
  const textBox = useRef<{ from: Point; to: Point } | null>(null);

  // Esc cancels the tool. Capture + stopImmediatePropagation so it doesn't also exit an entered group.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setPlacementTool(null);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [setPlacementTool]);

  const sceneAt = (e: React.PointerEvent | React.MouseEvent) => {
    const artboard = artboardRef.current;
    return artboard ? toScene(e, artboard) : null;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const scene = sceneAt(e);
    if (!scene) return;
    const local = toLocal(e, e.currentTarget);
    if (drag) {
      setDrag({ ...drag, curScene: { x: scene.x, y: scene.y }, scale: scene.scale, square: e.shiftKey });
    } else {
      setHover({ x: local.x, y: local.y, scale: scene.scale });
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // keep the canvas behind from deselecting; middle-click / Space+drag panning still bubbles
    e.stopPropagation();
    if (tool.kind !== 'vector' && tool.kind !== 'text') return;
    textBox.current = null;
    const scene = sceneAt(e);
    if (!scene) return;
    e.preventDefault();
    try {
      // keep receiving moves when the drag leaves the canvas
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // not an active pointer (e.g. synthetic event) - dragging still works within the layer
    }
    setDrag({
      startScene: { x: scene.x, y: scene.y },
      startLocal: toLocal(e, e.currentTarget),
      curScene: { x: scene.x, y: scene.y },
      scale: scene.scale,
      square: e.shiftKey,
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    if (tool.kind === 'text') {
      textBox.current = { from: drag.startScene, to: { x: drag.curScene.x, y: drag.curScene.y } };
      setDrag(null);
      return;
    }
    if (tool.kind !== 'vector') return;
    const end = constrain(drag.startScene, drag.curScene, e.shiftKey || drag.square);
    setDrag(null);
    placeElement(createVector(tool.shape, drag.startScene, end, 0));
  };

  // text + image are placed with a plain click
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool.kind === 'vector' || e.button !== 0) return;
    const scene = sceneAt(e);
    if (!scene) return;
    if (tool.kind === 'text') {
      const box = textBox.current;
      textBox.current = null;
      const el = box ? createTextBox(box.from, box.to, 0) : createTextBox(scene, scene, 0);
      placeElement(el, { editText: true });
    } else {
      placeElement(createImage(scene.x, scene.y, 0, tool));
    }
  };

  const cursor = tool.kind === 'text' ? 'text' : tool.kind === 'vector' ? 'crosshair' : 'default';

  // ghost for images: same size the element will get, following the cursor
  let ghost: React.ReactNode = null;
  if (tool.kind === 'image' && hover) {
    const w = tool.width * hover.scale;
    const h = tool.height * hover.scale;
    const ghostElement: ImageElement = {
      id: 'ghost',
      name: tool.name,
      type: 'IMAGE',
      parentId: null,
      rotation: 0,
      position: { x: 0, y: 0, z: 0 },
      size: { width: tool.width, height: tool.height },
      // don't hit the network while hovering a custom-URL tool
      source: tool.source.kind === 'custom' ? { kind: 'unset' } : tool.source,
    };
    ghost = (
      <Box
        position="absolute"
        pointerEvents="none"
        opacity={0.65}
        outline="1px dashed"
        outlineColor="mcBlue.400"
        style={{ left: hover.x - w / 2, top: hover.y - h / 2, width: w, height: h }}
      >
        <ImageContent element={ghostElement} />
      </Box>
    );
  }

  // live outline while dragging out a shape or text box
  let preview: React.ReactNode = null;
  if (tool.kind === 'text' && drag) {
    const dx = (drag.curScene.x - drag.startScene.x) * drag.scale;
    const dy = (drag.curScene.y - drag.startScene.y) * drag.scale;
    if (Math.abs(dx) >= DRAG_THRESHOLD || Math.abs(dy) >= DRAG_THRESHOLD) {
      preview = (
        <Box
          position="absolute"
          pointerEvents="none"
          outline="1.5px solid rgb(0, 92, 255)"
          bg="rgba(0, 92, 255, 0.08)"
          style={{
            left: drag.startLocal.x + Math.min(0, dx),
            top: drag.startLocal.y + Math.min(0, dy),
            width: Math.abs(dx),
            height: Math.abs(dy),
          }}
        />
      );
    }
  }
  if (tool.kind === 'vector' && drag) {
    const end = constrain(drag.startScene, drag.curScene, drag.square);
    const dx = (end.x - drag.startScene.x) * drag.scale;
    const dy = (end.y - drag.startScene.y) * drag.scale;
    preview = (
      <Box
        position="absolute"
        pointerEvents="none"
        outline="1.5px solid rgb(0, 92, 255)"
        style={{
          left: drag.startLocal.x + Math.min(0, dx),
          top: drag.startLocal.y + Math.min(0, dy),
          width: Math.abs(dx),
          height: Math.abs(dy),
        }}
        dangerouslySetInnerHTML={{ __html: shapeSvg(tool.shape, 'rgba(51, 103, 214, 0.55)') }}
      />
    );
  }

  return (
    <Box
      position="absolute"
      inset={0}
      zIndex={15}
      style={{ cursor, touchAction: 'none' }}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={() => setHover(null)}
      onClick={onClick}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {ghost}
      {preview}
      <Box
        position="absolute"
        bottom="12px"
        left="50%"
        transform="translateX(-50%)"
        bg="gray.800"
        color="white"
        borderRadius="full"
        px={3}
        py={1}
        pointerEvents="none"
      >
        <Text fontSize="12px">{HINTS[tool.kind]} · Esc to cancel</Text>
      </Box>
    </Box>
  );
}
