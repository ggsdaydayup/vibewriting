export interface WorldNote {
  id: string;
  projectId: string;
  category: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorldNoteInput {
  projectId: string;
  category?: string;
  title: string;
  content: string;
}
