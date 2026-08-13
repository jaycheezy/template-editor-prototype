export const LEGACY_SCALE = 1.6;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 0.25;
export const FIT_PADDING = 48;

export interface Pan {
  x: number;
  y: number;
}

export function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));
}

export function fitZoom(viewportWidth: number, viewportHeight: number, frameWidth: number, frameHeight: number): number {
  return clampZoom(
    Math.min(
      (viewportWidth - FIT_PADDING * 2) / frameWidth,
      (viewportHeight - FIT_PADDING * 2) / frameHeight,
    ),
  );
}

export function centerPan(
  viewportWidth: number,
  viewportHeight: number,
  frameWidth: number,
  frameHeight: number,
  zoom: number,
): Pan {
  return {
    x: (viewportWidth - frameWidth * zoom) / 2,
    y: (viewportHeight - frameHeight * zoom) / 2,
  };
}

/** Keep the world point under `point` (viewport coords) stable while zooming. */
export function zoomAtPoint(zoom: number, pan: Pan, nextZoom: number, point: Pan): { zoom: number; pan: Pan } {
  const z = clampZoom(nextZoom);
  const worldX = (point.x - pan.x) / zoom;
  const worldY = (point.y - pan.y) / zoom;
  return {
    zoom: z,
    pan: { x: point.x - worldX * z, y: point.y - worldY * z },
  };
}
