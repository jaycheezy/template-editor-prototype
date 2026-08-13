import type { AdElement, Group } from '../types';
import { isInGroupSubtree, nodeParentId, type LayerRow } from './layers';

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

function collectGroupElementIds(
  groupId: string,
  groups: Record<string, Group>,
  out: Set<string>,
): void {
  const group = groups[groupId];
  if (!group) return;
  group.children.forEach((childId) => {
    if (groups[childId]) collectGroupElementIds(childId, groups, out);
    else out.add(childId);
  });
}

export function expandSelectionToElementIds(
  selectedIds: string[],
  groups: Record<string, Group>,
): Set<string> {
  const out = new Set<string>();
  selectedIds.forEach((id) => {
    if (groups[id]) {
      collectGroupElementIds(id, groups, out);
      return;
    }
    out.add(id);
  });
  return out;
}

export function isInEnteredScope(
  nodeId: string,
  enteredGroupId: string | null,
  groups: Record<string, Group>,
  elements: AdElement[],
): boolean {
  if (!enteredGroupId) return true;
  return isInGroupSubtree(nodeId, enteredGroupId, groups, elements);
}

/**
 * The node a canvas hit should select at the current isolation scope.
 * At root, a click on grouped content selects the top-level group; after
 * entering, it selects the direct child (element or nested group).
 */
export function selectableAtScope(
  nodeId: string,
  scopeId: string | null,
  groups: Record<string, Group>,
  elements: AdElement[],
): string {
  let current = nodeId;
  let parent = nodeParentId(current, elements, groups);
  const seen = new Set<string>();
  while (parent && parent !== scopeId && !seen.has(parent)) {
    seen.add(parent);
    current = parent;
    parent = nodeParentId(current, elements, groups);
  }
  return current;
}

/** Group box shows only while that group is selected and not entered. */
export function shouldShowGroupBoundingBox(
  groupId: string,
  selectedIds: string[],
  enteredGroupId: string | null,
  groups: Record<string, Group>,
  elements: AdElement[],
): boolean {
  if (!selectedIds.includes(groupId) || !groups[groupId]) return false;
  if (!enteredGroupId) return true;
  if (enteredGroupId === groupId) return false;
  return !isInGroupSubtree(enteredGroupId, groupId, groups, elements);
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
