export type ForeshadowingStatus = "planted" | "due_soon" | "collected" | "abandoned";

export interface Foreshadowing {
  id: string;
  projectId: string;
  description: string;
  plantedChapter: number;
  plannedCollection?: number;
  collectedChapter?: number;
  status: ForeshadowingStatus;
  relatedCharacters: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateForeshadowingInput {
  projectId: string;
  description: string;
  plantedChapter: number;
  plannedCollection?: number;
  relatedCharacters?: string[];
}
