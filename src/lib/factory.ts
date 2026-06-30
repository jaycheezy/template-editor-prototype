import type { AdElement } from '../types';
import { uid } from './clips';

export type NewElementType = 'TEXT' | 'IMAGE' | 'VECTOR';

const PLACEHOLDER_IMAGE = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100" height="100" rx="6" fill="#d6e2f7"/>
  <path d="M20 70 L42 46 L58 62 L70 50 L84 70 Z" fill="#7095E2"/>
  <circle cx="68" cy="32" r="8" fill="#7095E2"/>
</svg>`;

const PLACEHOLDER_VECTOR = (fill: string) =>
  `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100" height="60" rx="6" fill="${fill}"/>
</svg>`;

/** Create a fresh element of the given type, centred at (x, y) with a sensible default size. */
export function createElement(
  type: NewElementType,
  x: number,
  y: number,
  z: number,
): AdElement {
  const id = uid(`el.${type.toLowerCase()}`);
  const base = {
    id,
    name: `New ${type.charAt(0) + type.slice(1).toLowerCase()}`,
    parentId: null as string | null,
    rotation: 0,
  };

  if (type === 'TEXT') {
    const width = 120;
    const height = 24;
    return {
      ...base,
      type: 'TEXT',
      position: { x: Math.round(x - width / 2), y: Math.round(y - height / 2), z },
      size: { width, height },
      content: 'New text',
      color: '#ffffff',
      fontSize: 16,
      fontWeight: 700,
      lineHeight: 1.1,
      align: 'center',
      textCase: 'none',
      fontFamily: 'Source Sans 3',
    };
  }

  if (type === 'IMAGE') {
    const size = 80;
    return {
      ...base,
      type: 'IMAGE',
      position: { x: Math.round(x - size / 2), y: Math.round(y - size / 2), z },
      size: { width: size, height: size },
      svg: PLACEHOLDER_IMAGE,
    };
  }

  const width = 100;
  const height = 60;
  const fill = '#3367D6';
  return {
    ...base,
    type: 'VECTOR',
    position: { x: Math.round(x - width / 2), y: Math.round(y - height / 2), z },
    size: { width, height },
    svg: PLACEHOLDER_VECTOR(fill),
    fill,
  };
}

export function vectorSvg(width: number, height: number, fill: string): string {
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="${width}" height="${height}" rx="6" fill="${fill}"/>
</svg>`;
}
