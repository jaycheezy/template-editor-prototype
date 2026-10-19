export type Stage = 'pre' | 'live' | 'post';
export type Trigger = 'baseline' | 'goal' | 'substitution' | 'winner';
export type Team = 'any' | 'home' | 'away';
export type Option = 'stages' | 'rules' | 'flow';
export type Scenario = 'pre' | 'live' | 'home-goal' | 'away-goal' | 'substitution' | 'winner' | 'draw' | 'unavailable';

export interface CreativeRule {
  id: string;
  name: string;
  stage: Stage;
  trigger: Trigger;
  team: Team;
  duration: number;
  setId: string;
  enabled: boolean;
}

export interface TemplateSet {
  id: string;
  name: string;
  description: string;
  treatment: 'pre' | 'live' | 'goal' | 'post' | 'winner' | 'substitution';
  sizes: string[];
  variants: number;
  requires?: Trigger;
}

export const sets: TemplateSet[] = [
  { id: 'matchday', name: 'Match announcement', description: 'Fixture, team badges and kickoff', treatment: 'pre', sizes: ['522 × 928', '300 × 250', '1080 × 1920'], variants: 3 },
  { id: 'countdown', name: 'Kickoff countdown', description: 'A countdown to the next match', treatment: 'pre', sizes: ['522 × 928', '300 × 250', '1080 × 1920'], variants: 3 },
  { id: 'live', name: 'Live scoreboard', description: 'Match clock and current score', treatment: 'live', sizes: ['522 × 928', '300 × 250', '1080 × 1920'], variants: 3 },
  { id: 'goal', name: 'Goal celebration', description: 'Scoring team, scorer and new score', treatment: 'goal', sizes: ['522 × 928', '300 × 250', '1080 × 1920'], variants: 3, requires: 'goal' },
  { id: 'score', name: 'Score flash', description: 'A bold treatment for a new goal', treatment: 'goal', sizes: ['522 × 928', '300 × 250'], variants: 2, requires: 'goal' },
  { id: 'recap', name: 'Full-time recap', description: 'Final score for every outcome', treatment: 'post', sizes: ['522 × 928', '300 × 250', '1080 × 1920'], variants: 3 },
  { id: 'winner', name: 'Winner celebration', description: 'Highlight the winning team', treatment: 'winner', sizes: ['522 × 928', '300 × 250', '1080 × 1920'], variants: 3, requires: 'winner' },
  { id: 'lineup', name: 'Fresh legs', description: 'Player in, player out and match clock', treatment: 'substitution', sizes: ['522 × 928', '300 × 250', '1080 × 1920'], variants: 3, requires: 'substitution' },
  { id: 'social', name: 'Social matchday', description: 'A square match announcement', treatment: 'pre', sizes: ['1080 × 1080'], variants: 1 },
];

export const initialRules: CreativeRule[] = [
  { id: 'pre', name: 'Before the match', stage: 'pre', trigger: 'baseline', team: 'any', duration: 48, setId: 'matchday', enabled: true },
  { id: 'live', name: 'Match in progress', stage: 'live', trigger: 'baseline', team: 'any', duration: 0, setId: 'live', enabled: true },
  { id: 'goal', name: 'A goal is scored', stage: 'live', trigger: 'goal', team: 'any', duration: 10, setId: 'goal', enabled: true },
  { id: 'post', name: 'After the match', stage: 'post', trigger: 'baseline', team: 'any', duration: 24, setId: 'recap', enabled: true },
  { id: 'winner', name: 'There is a winner', stage: 'post', trigger: 'winner', team: 'any', duration: 24, setId: 'winner', enabled: true },
];

export const stageLabels: Record<Stage, string> = { pre: 'Pre-game', live: 'Live', post: 'Post-game' };
export const teamLabels: Record<Team, string> = { any: 'Any team', home: 'Austria Wien', away: 'Rapid Wien' };
export const triggerLabels: Record<Trigger, string> = { baseline: 'Stage starts', goal: 'Goal scored', substitution: 'Substitution', winner: 'Match won' };
export const scenarios: { id: Scenario; label: string; short: string }[] = [
  { id: 'pre', label: 'Before kickoff', short: 'Pre-game' },
  { id: 'live', label: 'Match in progress', short: 'Live' },
  { id: 'home-goal', label: 'Austria Wien score', short: 'Home goal' },
  { id: 'away-goal', label: 'Rapid Wien score', short: 'Away goal' },
  { id: 'substitution', label: 'Austria Wien substitution', short: 'Substitution' },
  { id: 'winner', label: 'Full time · Austria Wien win', short: 'Home win' },
  { id: 'draw', label: 'Full time · draw', short: 'Draw' },
  { id: 'unavailable', label: 'Match data unavailable', short: 'No data' },
];

export function conditionText(rule: CreativeRule) {
  if (rule.trigger === 'baseline') return rule.stage === 'pre' ? `${rule.duration} hours before kickoff` : rule.stage === 'live' ? 'When the match starts' : 'When the match ends';
  return rule.trigger === 'goal' ? 'When a goal is scored' : rule.trigger === 'winner' ? 'When the match has a winner' : 'When a substitution happens';
}

export function expiryText(rule: CreativeRule) {
  if (rule.trigger === 'goal' || rule.trigger === 'substitution') return `${rule.duration} min or match end`;
  return rule.stage === 'pre' ? 'Until kickoff' : rule.stage === 'live' ? 'Until full time' : `${rule.duration} hours after full time`;
}

export function compatibility(set: TemplateSet, rule: CreativeRule, size: string): string | null {
  if (!set.sizes.includes(size)) return `No ${size} variant`;
  if (set.requires && set.requires !== rule.trigger) return `Requires ${triggerLabels[set.requires].toLowerCase()} context`;
  return null;
}

export function resolveCreative(rules: CreativeRule[], scenario: Scenario, elapsed: number, size: string) {
  if (scenario === 'unavailable') return { rule: null, reason: 'Match data is unavailable. The fallback image keeps this Ad Tag covered.' };
  const stage: Stage = scenario === 'pre' ? 'pre' : scenario === 'winner' || scenario === 'draw' ? 'post' : 'live';
  const moment: Trigger | null = scenario.includes('goal') ? 'goal' : scenario === 'substitution' ? 'substitution' : scenario === 'winner' ? 'winner' : null;
  const team: Team = scenario === 'away-goal' ? 'away' : 'home';
  const candidates = rules.filter((r) => r.enabled && r.stage === stage && (stage !== 'post' || elapsed < r.duration));
  const match = candidates.find((r) => r.trigger === moment && (r.team === 'any' || r.team === team) && (r.trigger === 'winner' || elapsed < r.duration));
  const rule = match ?? candidates.find((r) => r.trigger === 'baseline') ?? null;
  if (!rule) return { rule: null, reason: `No enabled rule covers this ${stageLabels[stage].toLowerCase()} scenario. The fallback image is used.` };
  const set = sets.find((s) => s.id === rule.setId);
  if (!set || compatibility(set, rule, size)) return { rule: null, reason: 'The selected set has no compatible template for this rule and size. The fallback image is used.' };
  const reason = match
    ? `${triggerLabels[match.trigger]} matches ${match.team === 'any' ? 'any team' : teamLabels[match.team]}. ${match.trigger === 'winner' ? 'The winner treatment replaces the post-game default.' : `This creative stays active for ${match.duration} minutes, then returns to the live default.`}`
    : moment && stage === 'live'
      ? 'The moment has expired, is disabled, or does not match the selected team. The live default is active.'
      : `The ${stageLabels[stage].toLowerCase()} default is active${scenario === 'draw' ? ' because the match ended in a draw' : ''}.`;
  return { rule, reason };
}
