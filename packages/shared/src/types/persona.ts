export interface PersonaExtractedPatterns {
  avgSentenceLength?: number;
  punctuationStyle?: string;
  vocabularyLevel?: string;
  imageryTypes?: string[];
  syntaxPatterns?: string[];
}

export interface Persona {
  id: string;
  userId: string;
  name: string;
  description?: string;
  styleTags: string[];
  toneWords: string[];
  hardRules: string[];
  bannedWords: string[];
  sampleTexts: string[];
  extractedPatterns?: PersonaExtractedPatterns;
  systemPromptFragment: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePersonaInput {
  name: string;
  styleTags?: string[];
  toneWords?: string[];
  hardRules?: string[];
  bannedWords?: string[];
  sampleTexts?: string[];
}

export interface PersonaAnalysisResult {
  description: string;
  styleTags: string[];
  toneWords: string[];
  extractedPatterns: PersonaExtractedPatterns;
  suggestedRules: string[];
  suggestedBannedWords: string[];
}
