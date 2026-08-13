import type { AdElement, Group } from '../types';

function tiebreaker(aId: string, bId: string, order: string[]): number {
  const ai = order.indexOf(aId);
  const bi = order.indexOf(bId);
  if (ai === -1 && bi === -1) return aId.localeCompare(bId);
  if (ai === -1) return -1;
  if (bi === -1) return 1;
  return ai - bi;
}

export function getRootGroups(groups: Record<string, Group>, rootOrder?: string[]): Group[] {
  if (rootOrder) {
    return rootOrder.map((id) => groups[id]).filter((g): g is Group => Boolean(g));
  }
  return Object.values(groups)
    .filter((g) => !g.parentId)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function buildInitialRootOrder(
  elements: AdElement[],
  groups: Record<string, Group>,
): string[] {
  const groupIds = Object.values(groups)
    .filter((g) => !g.parentId)
    .map((g) => g.id);
  const rootElements = elements.filter((e) => !e.parentId).map((e) => e.id);
  return [...groupIds, ...rootElements];
}

/** Resolve group children to elements, preserving stored layer order (front-first). */
export function elementsInGroupOrder(
  childIds: string[],
  byId: Map<string, AdElement>,
): AdElement[] {
  return childIds
    .map((id) => byId.get(id))
    .filter((e): e is AdElement => Boolean(e));
}

export function nodeParentId(
  nodeId: string,
  elements: AdElement[],
  groups: Record<string, Group>,
): string | null {
  if (groups[nodeId]) return groups[nodeId].parentId;
  return elements.find((e) => e.id === nodeId)?.parentId ?? null;
}

/** True if `nodeId` is `ancestorId` or nested under it. */
export function isInGroupSubtree(
  nodeId: string,
  ancestorId: string,
  groups: Record<string, Group>,
  elements: AdElement[],
): boolean {
  if (nodeId === ancestorId) return true;
  let current = nodeParentId(nodeId, elements, groups);
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    if (current === ancestorId) return true;
    seen.add(current);
    current = groups[current]?.parentId ?? null;
  }
  return false;
}

/** Dropping `movingId` into `newParentId` would nest a group inside itself. */
export function wouldCreateCycle(
  groups: Record<string, Group>,
  movingId: string,
  newParentId: string | null,
): boolean {
  if (!newParentId) return false;
  if (newParentId === movingId) return true;
  if (!groups[movingId]) return false;
  let current: string | null = newParentId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    if (current === movingId) return true;
    seen.add(current);
    current = groups[current]?.parentId ?? null;
  }
  return false;
}

export function isBackgroundNode(elements: AdElement[], nodeId: string): boolean {
  const el = elements.find((e) => e.id === nodeId);
  return Boolean(el && (el.type === 'SVG' || el.id === 'el.bg'));
}

function siblingList(
  parentId: string | null,
  groups: Record<string, Group>,
  rootOrder: string[],
): string[] {
  if (!parentId) return [...rootOrder];
  return [...(groups[parentId]?.children ?? [])];
}

function flattenElementIds(
  childIds: string[],
  groups: Record<string, Group>,
  byId: Map<string, AdElement>,
  out: string[],
): void {
  childIds.forEach((id) => {
    if (groups[id]) {
      flattenElementIds(groups[id].children, groups, byId, out);
      return;
    }
    const el = byId.get(id);
    if (el && !el.locked) out.push(id);
  });
}

/** Build a stable sibling order from group children + root element ids. */
export function buildSiblingOrder(
  elements: AdElement[],
  groups: Record<string, Group>,
  rootOrder?: string[],
): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  const byId = new Map(elements.map((e) => [e.id, e]));
  const roots = rootOrder ?? buildInitialRootOrder(elements, groups);
  flattenElementIds(roots, groups, byId, order);
  order.forEach((id) => seen.add(id));

  elements.forEach((e) => {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      order.push(e.id);
    }
  });

  return order;
}

/** Sync global z-index values from the layer tree (group children are front-first). */
export function reassignGlobalZ(
  elements: AdElement[],
  groups: Record<string, Group>,
  rootOrder?: string[],
): AdElement[] {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const frontFirst: string[] = [];
  flattenElementIds(rootOrder ?? buildInitialRootOrder(elements, groups), groups, byId, frontFirst);
  const paintOrder = [...frontFirst].reverse();

  const zMap = new Map<string, number>();
  paintOrder.forEach((id, i) => zMap.set(id, i + 1));

  return elements.map((e) => {
    if (e.locked) return e;
    const z = zMap.get(e.id);
    if (z === undefined) return e;
    return { ...e, position: { ...e.position, z } };
  });
}

/** Back-to-front paint order for the canvas (lower z first). */
export function sortElementsForPaint(
  elements: AdElement[],
  siblingOrder: string[],
): AdElement[] {
  return [...elements].sort((a, b) => {
    if (a.position.z !== b.position.z) return a.position.z - b.position.z;
    return tiebreaker(a.id, b.id, siblingOrder);
  });
}

/** Front-to-back order for layer lists (higher z first). */
export function sortElementsForLayerList(
  elements: AdElement[],
  siblingOrder: string[],
): AdElement[] {
  return sortElementsForPaint(elements, siblingOrder).reverse();
}

export function sortChildIdsByLayer(
  childIds: string[],
  byId: Map<string, AdElement>,
): AdElement[] {
  const found = childIds
    .map((id) => byId.get(id))
    .filter((e): e is AdElement => Boolean(e));
  return sortElementsForLayerList(found, childIds);
}

export interface LayerDropTarget {
  parentId: string | null;
  beforeId: string | null;
}

export type LayerRow =
  | {
      kind: 'group';
      id: string;
      name: string;
      collapsed: boolean;
      firstChildId: string | null;
      parentId: string | null;
      depth: number;
    }
  | { kind: 'element'; id: string; parentId: string | null; depth: number };

export function buildLayerRows(
  elements: AdElement[],
  groups: Record<string, Group>,
  rootOrder?: string[],
): LayerRow[] {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const rows: LayerRow[] = [];
  const roots = rootOrder ?? buildInitialRootOrder(elements, groups);
  const seen = new Set<string>();

  const emit = (childIds: string[], parentId: string | null, depth: number) => {
    childIds.forEach((id) => {
      if (seen.has(id)) return;
      const g = groups[id];
      if (g) {
        seen.add(id);
        rows.push({
          kind: 'group',
          id: g.id,
          name: g.name,
          collapsed: Boolean(g.collapsed),
          firstChildId: g.children[0] ?? null,
          parentId,
          depth,
        });
        if (!g.collapsed) emit(g.children, g.id, depth + 1);
        return;
      }
      const el = byId.get(id);
      if (el) {
        seen.add(id);
        rows.push({ kind: 'element', id: el.id, parentId, depth });
      }
    });
  };

  emit(roots, null, 0);

  elements.forEach((el) => {
    if (seen.has(el.id)) return;
    rows.push({ kind: 'element', id: el.id, parentId: el.parentId, depth: el.parentId ? 1 : 0 });
  });

  return rows;
}

export function subtreeRowRange(rows: LayerRow[], nodeId: string): { start: number; end: number } | null {
  const start = rows.findIndex((r) => r.id === nodeId);
  if (start < 0) return null;
  const depth = rows[start].depth;
  let end = start + 1;
  while (end < rows.length && rows[end].depth > depth) end += 1;
  return { start, end };
}

/**
 * Resolve a drop slot (the gap immediately before `rows[index]`) to a layer target.
 * The item becomes a sibling of that row, inserted before it. Nesting uses hover-on-group.
 */
export function dropTargetAtIndex(rows: LayerRow[], index: number): LayerDropTarget {
  if (rows.length === 0) return { parentId: null, beforeId: null };

  if (index >= rows.length) {
    const last = rows[rows.length - 1];
    return { parentId: last.parentId, beforeId: null };
  }

  const row = rows[index];
  return { parentId: row.parentId, beforeId: row.id };
}

/** Build a live preview of the layer list while dragging an element or group. */
export function buildPreviewRows(
  rows: LayerRow[],
  draggingId: string,
  dropIndex: number,
  groupDropId: string | null,
): LayerRow[] {
  const range = subtreeRowRange(rows, draggingId);
  if (!range) return rows;

  const block = rows.slice(range.start, range.end);
  const next = rows.filter((_, i) => i < range.start || i >= range.end);
  const header = block[0];
  if (!header) return rows;

  if (groupDropId && groupDropId !== draggingId) {
    const groupIdx = next.findIndex((r) => r.kind === 'group' && r.id === groupDropId);
    if (groupIdx >= 0) {
      const depth = next[groupIdx].depth + 1;
      const shifted = block.map((row, i) =>
        i === 0
          ? { ...row, parentId: groupDropId, depth }
          : { ...row, depth: row.depth - header.depth + depth },
      );
      next.splice(groupIdx + 1, 0, ...shifted);
    }
    return next;
  }

  let slot = dropIndex;
  if (range.start < dropIndex) slot -= range.end - range.start;
  slot = Math.max(0, Math.min(slot, next.length));

  const target = dropTargetAtIndex(next, slot);
  const depth = target.parentId
    ? (next.find((r) => r.kind === 'group' && r.id === target.parentId)?.depth ?? 0) + 1
    : 0;
  const shifted = block.map((row, i) =>
    i === 0
      ? { ...row, parentId: target.parentId, depth }
      : { ...row, depth: row.depth - header.depth + depth },
  );
  next.splice(slot, 0, ...shifted);
  return next;
}

export function computeRootElementOrder(
  elements: AdElement[],
  elementId: string,
  beforeId: string | null,
): string[] {
  const order = elements
    .filter((e) => !e.parentId && !e.locked && e.id !== elementId)
    .sort((a, b) => b.position.z - a.position.z)
    .map((e) => e.id);

  const insertAt = beforeId ? order.indexOf(beforeId) : order.length;
  const idx = insertAt < 0 ? order.length : insertAt;
  order.splice(idx, 0, elementId);
  return order;
}

/**
 * Front-first order of every unlocked element, ignoring group membership.
 * Used when grouping is off so the flattened layer list can still be reordered.
 */
export function computeFlatElementOrder(
  elements: AdElement[],
  elementId: string,
  beforeId: string | null,
): string[] {
  const order = elements
    .filter((e) => !e.locked && e.id !== elementId)
    .sort((a, b) => b.position.z - a.position.z)
    .map((e) => e.id);

  const insertAt = beforeId ? order.indexOf(beforeId) : order.length;
  const idx = insertAt < 0 ? order.length : insertAt;
  order.splice(idx, 0, elementId);
  return order;
}

/** Assign unique z values from a front-first id list. Locked elements keep their z. */
export function assignZFromFrontFirstOrder(
  elements: AdElement[],
  frontFirstIds: string[],
): AdElement[] {
  const zMap = new Map<string, number>();
  [...frontFirstIds].reverse().forEach((id, i) => zMap.set(id, i + 1));
  return elements.map((e) => {
    const z = zMap.get(e.id);
    if (z === undefined) return e;
    return { ...e, position: { ...e.position, z } };
  });
}

/**
 * Reorder in the flattened layer list without changing group membership.
 * `beforeId` is the layer-list neighbour that should sit below the moved item (front-first).
 */
export function applyFlatLayerMove(
  elements: AdElement[],
  elementId: string,
  beforeId: string | null,
): AdElement[] | null {
  const el = elements.find((e) => e.id === elementId);
  if (!el || el.locked) return null;
  if (beforeId === elementId) return null;
  return assignZFromFrontFirstOrder(elements, computeFlatElementOrder(elements, elementId, beforeId));
}

export type NodeMoveResult = {
  elements: AdElement[];
  groups: Record<string, Group>;
  rootOrder: string[];
  error?: string;
};

function removeFromAllParents(
  nodeId: string,
  groups: Record<string, Group>,
  rootOrder: string[],
): { groups: Record<string, Group>; rootOrder: string[] } {
  const nextGroups: Record<string, Group> = {};
  Object.entries(groups).forEach(([gid, g]) => {
    nextGroups[gid] = { ...g, children: g.children.filter((id) => id !== nodeId) };
  });
  return {
    groups: nextGroups,
    rootOrder: rootOrder.filter((id) => id !== nodeId),
  };
}

function insertSibling(
  list: string[],
  nodeId: string,
  beforeId: string | null,
): string[] {
  const next = list.filter((id) => id !== nodeId);
  let insertAt = beforeId ? next.indexOf(beforeId) : next.length;
  if (insertAt < 0) insertAt = next.length;
  next.splice(insertAt, 0, nodeId);
  return next;
}

/** Move an element or group to a new parent / sibling slot. */
export function applyNodeMove(
  elements: AdElement[],
  groups: Record<string, Group>,
  rootOrder: string[],
  nodeId: string,
  target: LayerDropTarget,
): NodeMoveResult | null {
  if (isBackgroundNode(elements, nodeId)) {
    return { elements, groups, rootOrder, error: 'Background cannot be grouped or reparented' };
  }

  const el = elements.find((e) => e.id === nodeId);
  const group = groups[nodeId];
  if (!el && !group) return null;
  if (el?.locked || group?.locked) return null;
  if (target.beforeId === nodeId) return null;
  if (target.parentId && !groups[target.parentId]) return null;
  if (groups[target.parentId ?? '']?.locked) {
    return { elements, groups, rootOrder, error: 'Cannot drop into a locked group' };
  }
  if (wouldCreateCycle(groups, nodeId, target.parentId)) {
    return { elements, groups, rootOrder, error: 'A group cannot contain itself' };
  }

  const stripped = removeFromAllParents(nodeId, groups, rootOrder);
  let nextGroups = stripped.groups;
  let nextRoot = stripped.rootOrder;

  if (target.parentId) {
    const parent = nextGroups[target.parentId];
    nextGroups = {
      ...nextGroups,
      [target.parentId]: {
        ...parent,
        children: insertSibling(parent.children, nodeId, target.beforeId),
        collapsed: false,
      },
    };
  } else {
    nextRoot = insertSibling(nextRoot, nodeId, target.beforeId);
  }

  if (group) {
    nextGroups = {
      ...nextGroups,
      [nodeId]: { ...nextGroups[nodeId], parentId: target.parentId },
    };
  }

  let nextElements = elements.map((e) =>
    e.id === nodeId ? { ...e, parentId: target.parentId } : e,
  );
  nextElements = reassignGlobalZ(nextElements, nextGroups, nextRoot);

  return { elements: nextElements, groups: nextGroups, rootOrder: nextRoot };
}

export function applyLayerMove(
  elements: AdElement[],
  groups: Record<string, Group>,
  elementId: string,
  target: LayerDropTarget,
  rootOrder?: string[],
): { elements: AdElement[]; groups: Record<string, Group>; rootOrder: string[] } | null {
  const result = applyNodeMove(
    elements,
    groups,
    rootOrder ?? buildInitialRootOrder(elements, groups),
    elementId,
    target,
  );
  if (!result || result.error) return null;
  return result;
}

export function insertNodeInParent(
  groups: Record<string, Group>,
  rootOrder: string[],
  parentId: string | null,
  nodeId: string,
  beforeId: string | null,
): { groups: Record<string, Group>; rootOrder: string[] } {
  const stripped = removeFromAllParents(nodeId, groups, rootOrder);
  if (parentId && stripped.groups[parentId]) {
    const parent = stripped.groups[parentId];
    return {
      groups: {
        ...stripped.groups,
        [parentId]: { ...parent, children: insertSibling(parent.children, nodeId, beforeId) },
      },
      rootOrder: stripped.rootOrder,
    };
  }
  return {
    groups: stripped.groups,
    rootOrder: insertSibling(stripped.rootOrder, nodeId, beforeId),
  };
}

export function siblingIdsForParent(
  parentId: string | null,
  groups: Record<string, Group>,
  rootOrder: string[],
): string[] {
  return siblingList(parentId, groups, rootOrder);
}
