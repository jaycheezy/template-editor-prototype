import { create } from 'zustand';
import { PHASE_BY_ID, PHASES, type PhaseId } from '../lib/phases';

type FlagMap = Record<PhaseId, boolean>;

const ALL_OFF: FlagMap = PHASES.reduce((acc, p) => {
  acc[p.id] = false;
  return acc;
}, {} as FlagMap);

interface FeatureState {
  flags: FlagMap;
  setFlag: (id: PhaseId, value: boolean) => void;
  toggleFlag: (id: PhaseId) => void;
  setAll: (value: boolean) => void;
  reset: () => void;
}

/**
 * Resolve raw flags into effective flags, honouring phase dependencies.
 * PHASES is ordered so prerequisites come first, so we can cascade against the
 * already-resolved `out` map (handles multi-level chains like 3c → timeline → presets).
 */
export function resolveEffective(flags: FlagMap): FlagMap {
  const out = { ...flags };
  PHASES.forEach((p) => {
    if (out[p.id] && p.requires.some((req) => !out[req])) {
      out[p.id] = false;
    }
  });
  return out;
}

export const useFeatureStore = create<FeatureState>((set) => ({
  flags: { ...ALL_OFF },
  setFlag: (id, value) =>
    set((s) => {
      const flags = { ...s.flags, [id]: value };
      if (!value) {
        // turning a phase off also disables anything that (transitively) depends on it
        let changed = true;
        while (changed) {
          changed = false;
          PHASES.forEach((p) => {
            if (flags[p.id] && p.requires.some((req) => !flags[req])) {
              flags[p.id] = false;
              changed = true;
            }
          });
        }
      } else {
        // turning a phase on re-enables all of its (transitive) prerequisites
        const enable = (pid: PhaseId) => {
          PHASE_BY_ID[pid].requires.forEach((req) => {
            if (!flags[req]) {
              flags[req] = true;
              enable(req);
            }
          });
        };
        enable(id);
      }
      return { flags };
    }),
  toggleFlag: (id) =>
    set((s) => ({ flags: { ...s.flags, [id]: !s.flags[id] } })),
  setAll: (value) =>
    set(() => ({
      flags: PHASES.reduce((acc, p) => {
        acc[p.id] = value;
        return acc;
      }, {} as FlagMap),
    })),
  reset: () => set(() => ({ flags: { ...ALL_OFF } })),
}));

/** Hook: is a given phase effectively enabled (after dependency resolution)? */
export function usePhase(id: PhaseId): boolean {
  return useFeatureStore((s) => resolveEffective(s.flags)[id]);
}
