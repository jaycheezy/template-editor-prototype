import { create } from 'zustand';
import { PHASE_BY_ID, PHASES, type PhaseId } from '../lib/phases';

type FlagMap = Record<PhaseId, boolean>;

const ALL_ON: FlagMap = PHASES.reduce((acc, p) => {
  acc[p.id] = true;
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
 * Resolve raw flags into effective flags, honouring phase dependencies
 * (e.g. 3b/3c are inert unless 3a is on).
 */
export function resolveEffective(flags: FlagMap): FlagMap {
  const out = { ...flags };
  PHASES.forEach((p) => {
    if (out[p.id] && p.requires.some((req) => !flags[req])) {
      out[p.id] = false;
    }
  });
  return out;
}

export const useFeatureStore = create<FeatureState>((set) => ({
  flags: { ...ALL_ON },
  setFlag: (id, value) =>
    set((s) => {
      const flags = { ...s.flags, [id]: value };
      // turning a phase off also disables phases that depend on it
      if (!value) {
        PHASES.forEach((p) => {
          if (p.requires.includes(id)) flags[p.id] = false;
        });
      }
      // turning a phase on re-enables its prerequisites
      if (value) {
        PHASE_BY_ID[id].requires.forEach((req) => {
          flags[req] = true;
        });
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
  reset: () => set(() => ({ flags: { ...ALL_ON } })),
}));

/** Hook: is a given phase effectively enabled (after dependency resolution)? */
export function usePhase(id: PhaseId): boolean {
  return useFeatureStore((s) => resolveEffective(s.flags)[id]);
}
