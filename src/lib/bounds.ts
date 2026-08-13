import type { Group } from '../types';
import type { RenderedElement } from './engine';
import { expandSelectionToElementIds } from './selection';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Axis-aligned box of a rendered element, including rotation and scale about center. */
export function renderedElementAabb(rendered: RenderedElement): Rect {
  const { element, transform } = rendered;
  const w = element.size.width;
  const h = element.size.height;
  const cx = transform.x + w / 2;
  const cy = transform.y + h / 2;
  const hw = (w * Math.abs(transform.scaleX)) / 2;
  const hh = (h * Math.abs(transform.scaleY)) / 2;
  const rad = (transform.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([dx, dy]) => ({
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }));
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

export function unionAabb(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  rects.forEach((r) => {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  });
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function groupDescendantAabb(
  groupId: string,
  rendered: RenderedElement[],
  groups: Record<string, Group>,
): Rect | null {
  const ids = expandSelectionToElementIds([groupId], groups);
  return unionAabb(
    rendered.filter((r) => ids.has(r.element.id) && !r.hidden).map(renderedElementAabb),
  );
}
