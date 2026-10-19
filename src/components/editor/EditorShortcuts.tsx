import { useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { usePhase } from '../../store/featureStore';
import { startStaticImage, startText, startVector } from '../../lib/addTools';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/** Letters pressed while an open menu has focus should drive the menu, not the editor. */
function isInsideMenu(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('[role="menu"]') != null;
}

/**
 * Editor-wide keyboard shortcuts (undo / redo and group shortcuts live elsewhere):
 *
 *   Backspace / Delete   delete selection          (Add & restyle elements)
 *   T  I  R  O           text · image upload · rectangle · ellipse
 *   V                    back to select (cancels an armed tool)
 *   Arrow keys           nudge 1px, Shift = 10px   (Fix existing layout)
 *   ⌘/Ctrl + ] / [       bring forward / send backward, with Shift = front / back
 *   Esc                  clear the selection
 */
export default function EditorShortcuts() {
  const canAuthor = usePhase('author');
  const canLayout = usePhase('layout');
  const canGroup = usePhase('groups');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTypingTarget(e.target) || isInsideMenu(e.target)) return;
      const state = useEditorStore.getState();
      const mod = e.metaKey || e.ctrlKey;

      // delete
      if ((e.key === 'Backspace' || e.key === 'Delete') && !mod && canAuthor) {
        if (state.selectedIds.length === 0) return;
        e.preventDefault();
        state.deleteSelection();
        return;
      }

      // layer order
      if (mod && (e.key === ']' || e.key === '[') && canLayout) {
        const id = state.selectedIds.length === 1 ? state.selectedIds[0] : null;
        if (!id || state.groups[id]) return;
        e.preventDefault();
        const forward = e.key === ']';
        const op = e.shiftKey ? (forward ? 'front' : 'back') : forward ? 'forward' : 'backward';
        state.reorderElementZ(id, op, { flat: !canGroup });
        return;
      }

      if (mod || e.altKey) return;

      // nudge
      if (e.key.startsWith('Arrow') && canLayout && state.selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        state.moveSelectionBy(state.selectedIds, dx, dy);
        return;
      }

      // Esc: the placement tool handles its own Esc (capture phase); otherwise clear the selection
      if (e.key === 'Escape') {
        if (state.placementTool || state.enteredGroupId) return;
        if (state.selectedIds.length > 0) state.select(null);
        return;
      }

      // tools
      const key = e.key.toLowerCase();
      if (key === 'v') {
        if (state.placementTool) state.setPlacementTool(null);
        return;
      }
      if (!canAuthor) return;
      if (key === 't') {
        e.preventDefault();
        startText();
      } else if (key === 'i') {
        e.preventDefault();
        void startStaticImage();
      } else if (key === 'r') {
        e.preventDefault();
        startVector('rectangle');
      } else if (key === 'o') {
        e.preventDefault();
        startVector('ellipse');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canAuthor, canGroup, canLayout]);

  return null;
}
