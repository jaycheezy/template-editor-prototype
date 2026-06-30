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

The **"Preview features"** menu in the top bar toggles each roadmap phase on/off so you can
preview the product at different stages. Phases map to the ARENA spec:

| Phase | What it unlocks |
| --- | --- |
| **1 · Canvas editing** | Move / resize (corner handles) / add / rename / recolor / lock / hide / reorder elements; multi-element move; properties panel colour, size and position fields. |
| **2 · Grouping** | Create / ungroup / rename groups, nested layer tree, enter-group editing (double-click), group transforms; turning it off flattens the layer + timeline lists. |
| **3a.1 · Preset animations** | Apply IN / OUT presets to layers/groups and preview them playing in the rendered canvas via a slim transport bar (no track editor). Turning it off hides the Animate tab and playback. |
| **3a.2 · Timeline** | Per-layer track editor: ruler, draggable clips, retiming and scrubbing. Replaces the slim transport bar. |
| **3b · Extended effects** | DURING effects, extra presets (Spin), per-effect **intensity**, and effect duplication. |
| **3c · Custom keyframes** | CUSTOM tab, convert-to-custom (delayed-entrance preserved), keyframe duplicate / track-shift, timeline zoom and snapping. |

Dependencies: timeline (3a.2) and extended effects (3b) need preset animations (3a.1);
custom keyframes (3c) need the timeline (3a.2). Phases auto-disable when a prerequisite is turned off.

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
| `src/components/` | UI: `shell/`, `editor/`, `canvas/`, `timeline/`. |

## Notes

- The editor opens with the playhead at ~1.5s so the creative shows fully revealed; scrub back to `0:00` to watch the IN animations play.
- Everything is static/mock — there is no backend, persistence, or export.
