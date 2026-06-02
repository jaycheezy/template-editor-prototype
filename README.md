# Template Editor · Animation Timeline (Prototype)

A standalone, throwaway prototype that replicates the Marketing Cloud **Template Builder** UI and layers on a proposed **Animation Timeline** feature, per the [ARENA spec](https://sportradar.atlassian.net/wiki/spaces/ARENA/pages/275914661/Template+Editor+Animation+Timeline).

It exists purely to explore how the new animation functionality could look and feel inside the current product. It does **not** touch any production code and runs entirely on mock data (a 300x250 soccer "Full Time Result" creative).

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## What's in here

- **Faithful editor chrome** — host bar, template top bar, left module rail, Elements tree (with groups), Data Sources, and the right-hand Properties panel, themed with Marketing Cloud tokens and Source Sans 3.
- **Animation timeline** (the new part) — a bottom panel with playback controls, a time ruler, draggable playhead, and per-layer rows. Clips render as colored bars and keyframes as diamonds; both are draggable to retime.
- **Animate panel** — replaces the Properties panel via the `Animate` tab. Apply preset effects grouped by `IN` / `DURING` / `OUT`, or edit `CUSTOM` tracks and keyframes.
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
