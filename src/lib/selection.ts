import type { Group } from '../types';
import type { LayerRow } from './layers';

export interface SelectOptions {
  additive?: boolean;
  range?: boolean;
  rangeOrder?: string[];
}

/** Flat selectable ids from the layer tree (groups + elements, in display order). */
export function layerListSelectableIds(rows: LayerRow[]): string[] {
  return rows.map((row) => row.id);
}

/** Element ids in layer-tree order (for canvas shift-range). */
export function layerListElementIds(rows: LayerRow[]): string[] {
  return rows.filter((row) => row.kind === 'element').map((row) => row.id);
}

export function expandSelectionToElementIds(
  selectedIds: string[],
  groups: Record<string, Group>,
): Set<string> {
  const out = new Set<string>();
  selectedIds.forEach((id) => {
    const group = groups[id];
    if (group) {
      group.children.forEach((childId) => {
        if (!groups[childId]) out.add(childId);
      });
      return;
    }
    out.add(id);
  });
  return out;
}

export function resolveSelection(
  currentIds: string[],
  anchorId: string | null,
  id: string | null,
  options?: SelectOptions,
): { selectedIds: string[]; selectionAnchorId: string | null } {
  if (id === null) {
    return { selectedIds: [], selectionAnchorId: null };
  }

  if (options?.range && options.rangeOrder && anchorId) {
    const anchorIdx = options.rangeOrder.indexOf(anchorId);
    const clickIdx = options.rangeOrder.indexOf(id);
    if (anchorIdx >= 0 && clickIdx >= 0) {
      const lo = Math.min(anchorIdx, clickIdx);
      const hi = Math.max(anchorIdx, clickIdx);
      return {
        selectedIds: options.rangeOrder.slice(lo, hi + 1),
        selectionAnchorId: anchorId,
      };
    }
  }

  if (options?.additive) {
    const selectedIds = currentIds.includes(id)
      ? currentIds.filter((sid) => sid !== id)
      : [...currentIds, id];
    return { selectedIds, selectionAnchorId: id };
  }

  return { selectedIds: [id], selectionAnchorId: id };
}
