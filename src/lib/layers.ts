import type { AdElement, Group } from '../types';

function tiebreaker(aId: string, bId: string, order: string[]): number {
  const ai = order.indexOf(aId);
  const bi = order.indexOf(bId);
  if (ai === -1 && bi === -1) return aId.localeCompare(bId);
  if (ai === -1) return -1;
  if (bi === -1) return 1;
  return ai - bi;
}

export function getRootGroups(groups: Record<string, Group>): Group[] {
  return Object.values(groups)
    .filter((g) => !g.parentId)
    .sort((a, b) => a.id.localeCompare(b.id));
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

/** Build a stable sibling order from group children + root element ids. */
export function buildSiblingOrder(
  elements: AdElement[],
  groups: Record<string, Group>,
): string[] {
  const order: string[] = [];
  const seen = new Set<string>();

  getRootGroups(groups).forEach((g) => {
    g.children.forEach((id) => {
      if (!seen.has(id)) {
        seen.add(id);
        order.push(id);
      }
    });
  });

  elements
    .filter((e) => !e.parentId && !e.locked)
    .forEach((e) => {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        order.push(e.id);
      }
    });

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
  rootElementOrder?: string[],
): AdElement[] {
  const paintOrder: string[] = [];

  getRootGroups(groups).forEach((g) => {
    [...g.children].reverse().forEach((id) => paintOrder.push(id));
  });

  const roots =
    rootElementOrder ??
    elements
      .filter((e) => !e.parentId && !e.locked)
      .sort((a, b) => a.position.z - b.position.z)
      .map((e) => e.id);

  [...roots].reverse().forEach((id) => paintOrder.push(id));

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
  const elements = childIds
    .map((id) => byId.get(id))
    .filter((e): e is AdElement => Boolean(e));
  return sortElementsForLayerList(elements, childIds);
}

export interface LayerDropTarget {
  parentId: string | null;
  beforeId: string | null;
}

export type LayerRow =
  | { kind: 'group'; id: string; name: string; collapsed: boolean; firstChildId: string | null }
  | { kind: 'element'; id: string; parentId: string | null; depth: number };

export function buildLayerRows(
  elements: AdElement[],
  groups: Record<string, Group>,
): LayerRow[] {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const rows: LayerRow[] = [];

  getRootGroups(groups).forEach((g) => {
    rows.push({
      kind: 'group',
      id: g.id,
      name: g.name,
      collapsed: Boolean(g.collapsed),
      firstChildId: g.children[0] ?? null,
    });
    if (!g.collapsed) {
      elementsInGroupOrder(g.children, byId).forEach((el) => {
        rows.push({ kind: 'element', id: el.id, parentId: g.id, depth: 1 });
      });
    }
  });

  elements
    .filter((e) => !e.parentId)
    .forEach((el) => {
      rows.push({ kind: 'element', id: el.id, parentId: null, depth: 0 });
    });

  return rows;
}

/**
 * Resolve a drop slot (the gap immediately before `rows[index]`) to a layer target.
 * A slot before a group header appends to the preceding group, not into the group below.
 */
export function dropTargetAtIndex(rows: LayerRow[], index: number): LayerDropTarget {
  if (rows.length === 0) return { parentId: null, beforeId: null };

  if (index >= rows.length) {
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const row = rows[i];
      if (row.kind === 'element') return { parentId: row.parentId, beforeId: null };
      if (row.kind === 'group') return { parentId: row.id, beforeId: null };
    }
    return { parentId: null, beforeId: null };
  }

  const row = rows[index];
  if (row.kind === 'group') {
    const prev = rows[index - 1];
    if (!prev) return { parentId: null, beforeId: null };
    if (prev.kind === 'element') return { parentId: prev.parentId, beforeId: null };
    return { parentId: prev.id, beforeId: null };
  }
  return { parentId: row.parentId, beforeId: row.id };
}

/** Build a live preview of the layer list while dragging. */
export function buildPreviewRows(
  rows: LayerRow[],
  draggingId: string,
  dropIndex: number,
  groupDropId: string | null,
): LayerRow[] {
  const sourceIndex = rows.findIndex((r) => r.kind === 'element' && r.id === draggingId);
  if (sourceIndex < 0) return rows;

  const next = rows.filter((_, i) => i !== sourceIndex);

  if (groupDropId) {
    const groupIdx = next.findIndex((r) => r.kind === 'group' && r.id === groupDropId);
    if (groupIdx >= 0) {
      next.splice(groupIdx + 1, 0, {
        kind: 'element',
        id: draggingId,
        parentId: groupDropId,
        depth: 1,
      });
    }
    return next;
  }

  let slot = dropIndex;
  if (sourceIndex < dropIndex) slot -= 1;
  slot = Math.max(0, Math.min(slot, next.length));

  const target = dropTargetAtIndex(next, slot);
  next.splice(slot, 0, {
    kind: 'element',
    id: draggingId,
    parentId: target.parentId,
    depth: target.parentId ? 1 : 0,
  });

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

export function applyLayerMove(
  elements: AdElement[],
  groups: Record<string, Group>,
  elementId: string,
  target: LayerDropTarget,
): { elements: AdElement[]; groups: Record<string, Group> } | null {
  const el = elements.find((e) => e.id === elementId);
  if (!el || el.locked) return null;
  if (target.parentId && !groups[target.parentId]) return null;
  if (target.beforeId === elementId) return null;

  const nextGroups: Record<string, Group> = {};
  Object.entries(groups).forEach(([gid, g]) => {
    nextGroups[gid] = { ...g, children: g.children.filter((id) => id !== elementId) };
  });

  let rootElementOrder: string[] | undefined;

  if (target.parentId) {
    const group = nextGroups[target.parentId];
    const children = [...group.children];
    let insertAt = target.beforeId ? children.indexOf(target.beforeId) : children.length;
    if (insertAt < 0) insertAt = children.length;
    children.splice(insertAt, 0, elementId);
    nextGroups[target.parentId] = { ...group, children, collapsed: false };
  } else {
    rootElementOrder = computeRootElementOrder(elements, elementId, target.beforeId);
  }

  let nextElements = elements.map((e) =>
    e.id === elementId ? { ...e, parentId: target.parentId } : e,
  );
  nextElements = reassignGlobalZ(nextElements, nextGroups, rootElementOrder);

  return { elements: nextElements, groups: nextGroups };
}
