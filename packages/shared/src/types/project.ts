export interface Project {
  id: string;
  userId: string;
  title: string;
  description?: string;
  genre?: string;
  coverUrl?: string;
  personaId?: string;
  coreTheme?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  title: string;
  description?: string;
  genre?: string;
  coreTheme?: string;
  personaId?: string;
}
