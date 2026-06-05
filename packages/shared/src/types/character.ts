export interface CharacterArcMilestone {
  chapter: number;
  event: string;
  stateChange: string;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  role: "protagonist" | "deuteragonist" | "antagonist" | "supporting";
  description?: string;
  currentState?: string;
  startState?: string;
  endState?: string;
  behaviorRules: string[];
  arcMilestones: CharacterArcMilestone[];
  relationships?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharacterInput {
  projectId: string;
  name: string;
  role: Character["role"];
  description?: string;
  startState?: string;
  endState?: string;
  behaviorRules?: string[];
}
