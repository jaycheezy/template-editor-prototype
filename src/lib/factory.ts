import type { ImageElement, TextElement, VectorElement, VectorShape } from '../types';
import { uid } from './clips';

export const VECTOR_SHAPES: { shape: VectorShape; label: string }[] = [
  { shape: 'rectangle', label: 'Rectangle' },
  { shape: 'ellipse', label: 'Ellipse' },
  { shape: 'triangle', label: 'Triangle' },
];

const DEFAULT_FILL = '#3367D6';
/** Size of a shape created by a plain click (no drag). */
const CLICK_SHAPE_SIZE = 80;
/** A drag smaller than this (in scene px) counts as a click. */
export const DRAG_THRESHOLD = 4;
const MIN_SIZE = 8;
/** Longest side of an uploaded image when it is first placed. */
export const MAX_PLACED_IMAGE_SIDE = 120;

export function shapeSvg(shape: VectorShape, fill: string): string {
  const body =
    shape === 'ellipse'
      ? `<ellipse cx="50" cy="50" rx="50" ry="50" fill="${fill}"/>`
      : shape === 'triangle'
        ? `<polygon points="50,0 100,100 0,100" fill="${fill}"/>`
        : `<rect width="100" height="100" fill="${fill}"/>`;
  // preserveAspectRatio="none" so the shape follows the box when it is resized
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${body}</svg>`;
}

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** An empty text box whose left edge sits at the clicked point, vertically centred on it. */
export function createText(x: number, y: number, z: number): TextElement {
  const width = 120;
  const height = 24;
  return {
    id: uid('el.text'),
    name: 'New Text',
    type: 'TEXT',
    parentId: null,
    rotation: 0,
    position: { x: Math.round(x), y: Math.round(y - height / 2), z },
    size: { width, height },
    content: '',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1.1,
    align: 'left',
    verticalAlign: 'top',
    textCase: 'none',
    fontFamily: 'Source Sans 3',
  };
}

const MIN_TEXT_WIDTH = 24;
const MIN_TEXT_HEIGHT = 24;

/**
 * A text box sized by dragging from one corner to the opposite one.
 * A plain click (no real drag) falls back to the default box anchored at the click.
 */
export function createTextBox(
  from: { x: number; y: number },
  to: { x: number; y: number },
  z: number,
): TextElement {
  const w = Math.abs(to.x - from.x);
  const h = Math.abs(to.y - from.y);
  if (w < DRAG_THRESHOLD && h < DRAG_THRESHOLD) return createText(from.x, from.y, z);
  const el = createText(0, 0, z);
  const width = Math.max(MIN_TEXT_WIDTH, w);
  const height = Math.max(MIN_TEXT_HEIGHT, h);
  return {
    ...el,
    position: { x: Math.round(Math.min(from.x, to.x)), y: Math.round(Math.min(from.y, to.y)), z },
    size: { width: Math.round(width), height: Math.round(height) },
  };
}

/** An image element centred on (cx, cy). */
export function createImage(
  cx: number,
  cy: number,
  z: number,
  spec: Pick<ImageElement, 'name' | 'source'> & { width: number; height: number },
): ImageElement {
  return {
    id: uid('el.image'),
    name: spec.name,
    type: 'IMAGE',
    parentId: null,
    rotation: 0,
    position: { x: Math.round(cx - spec.width / 2), y: Math.round(cy - spec.height / 2), z },
    size: { width: Math.round(spec.width), height: Math.round(spec.height) },
    source: spec.source,
  };
}

/**
 * A shape covering the rectangle dragged between two scene points.
 * A click (tiny drag) produces a default-sized shape anchored at the click.
 */
export function createVector(
  shape: VectorShape,
  from: { x: number; y: number },
  to: { x: number; y: number },
  z: number,
): VectorElement {
  const w = Math.abs(to.x - from.x);
  const h = Math.abs(to.y - from.y);
  const isClick = w < DRAG_THRESHOLD && h < DRAG_THRESHOLD;
  const width = isClick ? CLICK_SHAPE_SIZE : Math.max(MIN_SIZE, w);
  const height = isClick ? CLICK_SHAPE_SIZE : Math.max(MIN_SIZE, h);
  const x = isClick ? from.x : Math.min(from.x, to.x);
  const y = isClick ? from.y : Math.min(from.y, to.y);
  return {
    id: uid('el.vector'),
    name: label(shape),
    type: 'VECTOR',
    parentId: null,
    rotation: 0,
    position: { x: Math.round(x), y: Math.round(y), z },
    size: { width: Math.round(width), height: Math.round(height) },
    svg: shapeSvg(shape, DEFAULT_FILL),
    fill: DEFAULT_FILL,
    shape,
  };
}
