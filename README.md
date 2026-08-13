# Template Editor · Animation Timeline (Prototype)

A standalone, throwaway prototype that replicates the Marketing Cloud **Template Builder** UI and layers on a proposed **Animation Timeline** feature, per the [ARENA spec](https://sportradar.atlassian.net/wiki/spaces/ARENA/pages/275914661/Template+Editor+Animation+Timeline).

It exists purely to explore how the new animation functionality could look and feel inside the current product. It does **not** touch any production code and runs entirely on mock data (a 300x250 soccer "Full Time Result" creative).

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Preview features menu

The **"Preview features"** menu in the top bar is aligned to the five Template Editor epics
(see [Epic one-pagers](https://sportradar.atlassian.net/wiki/spaces/ARENA/pages/398296040/Epic+one-pagers+PO+showcase+drafts)).
Turn switches on one at a time to preview that epic's outcome.

Deep links use `?epic=ADSCM-1371` (or `1380` / `1386` / `1392` / `1401`). That turns on the named epic **and every epic scheduled before it**. Hosted at [template-editor-prototype.netlify.app](https://template-editor-prototype.netlify.app/).

| Link | What's on |
| --- | --- |
| [`?epic=ADSCM-1371`](https://template-editor-prototype.netlify.app/?epic=ADSCM-1371) | Apply & play animations |
| [`?epic=ADSCM-1380`](https://template-editor-prototype.netlify.app/?epic=ADSCM-1380) | + Fix existing layout |
| [`?epic=ADSCM-1386`](https://template-editor-prototype.netlify.app/?epic=ADSCM-1386) | + Add & restyle elements |
| [`?epic=ADSCM-1392`](https://template-editor-prototype.netlify.app/?epic=ADSCM-1392) | + Groups |
| [`?epic=ADSCM-1401`](https://template-editor-prototype.netlify.app/?epic=ADSCM-1401) | + Timeline |

| Switch | Epic | What it unlocks |
| --- | --- | --- |
| **Apply & play animations** | [ADSCM-1371](https://sportradar.atlassian.net/browse/ADSCM-1371) | Apply IN / OUT presets and preview them playing via a slim transport bar (no track editor). Live HTML / Ad Tag delivery is **not** in this prototype. |
| **Fix existing layout** | [ADSCM-1380](https://sportradar.atlassian.net/browse/ADSCM-1380) | Move, lock/hide, reorder, multi-select and move together. |
| **Add & restyle elements** | [ADSCM-1386](https://sportradar.atlassian.net/browse/ADSCM-1386) | Add, rename, resize, recolor, and delete layers. |
| **Groups** | [ADSCM-1392](https://sportradar.atlassian.net/browse/ADSCM-1392) | Create / ungroup / rename groups, nested layer tree, enter-group editing, group transforms. |
| **Timeline** | [ADSCM-1401](https://sportradar.atlassian.net/browse/ADSCM-1401) | Per-layer track editor: ruler, draggable clips, retiming and scrubbing. |

**Later** (collapsed in the menu) keeps ARENA Phase 3b / 3c for engineering: extended effects and custom keyframes.

Dependencies: Timeline and Later → Extended effects need Apply & play animations; custom keyframes need Timeline. Flags auto-disable when a prerequisite is turned off.

## What's in here

- **Faithful editor chrome** — host bar, template top bar, left module rail, Elements tree (with groups), Data Sources, and the right-hand Properties panel, themed with Marketing Cloud tokens and Source Sans 3.
- **Canvas editing** — drag to move, corner handles to resize (Shift keeps ratio for images/vectors), add/rename/recolor/lock/hide, and z-order quick actions.
- **Animation timeline** — a bottom panel with playback controls, a time ruler, draggable playhead, and per-layer rows. Clips render as colored bars and keyframes as diamonds; both are draggable to retime; optional zoom + snap.
- **Animate panel** — replaces the Properties panel via the `Animate` tab. Apply preset effects grouped by `IN` / `DURING` / `OUT` (to one or many selected layers), tune intensity, or edit `CUSTOM` tracks and keyframes.
- **Animation engine** — easing functions, keyframe sampling, group-transform composition, and delayed-IN visibility, modeled on the Extension v1 spec.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/types.ts` | Data model (`AdElement`, `Group`, `Track`, `Clip`, `AnimationModel`). |
| `src/lib/` | `easing`, `engine` (scene resolution), `effects` (preset catalog), `clips`, `format`. |
| `src/data/mockTemplate.ts` | The soccer creative: elements, groups, data sources, seeded animations. |
| `src/store/editorStore.ts` | Zustand store for editor + playback state. |
| `src/store/featureStore.ts` | Epic-aligned preview flags. |
| `src/lib/phases.ts` | Flag metadata and epic menu order. |
| `src/components/` | UI: `shell/`, `editor/`, `canvas/`, `timeline/`. |

## Notes

- The editor opens with the playhead at ~1.5s so the creative shows fully revealed; scrub back to `0:00` to watch the IN animations play.
- Everything is static/mock — there is no backend, persistence, or export.
