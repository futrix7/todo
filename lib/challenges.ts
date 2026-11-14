export type ChallengeCategory =
  | "Fitness"
  | "Mind"
  | "Discipline"
  | "Productivity"
  | "Money";

export interface ChallengeDefinition {
  id: string;
  name: string;
  category: ChallengeCategory;
  targetDays: number;
  description: string;
  createdBy: string | null;
}

export const CHALLENGE_CATEGORIES: ChallengeCategory[] = [
  "Fitness",
  "Mind",
  "Discipline",
  "Productivity",
  "Money",
];
