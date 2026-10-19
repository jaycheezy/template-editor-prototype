import { useEditorStore } from '../store/editorStore';
import type { VectorShape } from '../types';
import { defaultCustom } from './imageSource';
import { pickImage } from './imagePicker';

/**
 * The ways to start adding an element. Shared by the Add menu and the keyboard
 * shortcuts so both behave identically.
 */
const state = useEditorStore.getState;

export function startText(): void {
  state().setPlacementTool({ kind: 'text' });
}

export function startVector(shape: VectorShape): void {
  state().setPlacementTool({ kind: 'vector', shape });
}

export function startTeamAsset(): void {
  state().setPlacementTool({
    kind: 'image',
    name: 'New Team Asset',
    width: 66,
    height: 76,
    source: { kind: 'team', team: 'home', asset: 'jersey' },
  });
}

export function startCustomImage(): void {
  state().setPlacementTool({
    kind: 'image',
    name: 'New Custom Image',
    width: 80,
    height: 80,
    source: defaultCustom('HOME'),
  });
}

/** Opens the file picker straight away (call from a click / key press); the file then rides the cursor. */
export async function startStaticImage(): Promise<void> {
  const picked = await pickImage();
  if (!picked) return;
  state().setPlacementTool({
    kind: 'image',
    name: picked.name,
    width: picked.width,
    height: picked.height,
    source: { kind: 'static', url: picked.url },
  });
}
