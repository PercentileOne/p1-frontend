export interface Career {
  id: string;
  name: string;

  categoryName: string;
  subcategoryName: string;

  tags: string[];

  heroImageUrl: string;

  salary: {
    average: number;
    starting: number;
    senior: number;
  };

  difficulty: number;

  lifestyle: {
    description: string;
    environment: string;
    energy: string;
    collaboration: string;
    stress: string;
    videoUrl?: string;
  };

  identity: {
    summary: string;
    traits: string[];
    strengths: string[];
    weaknesses: string[];
  };

  pathway: {
    entryRequirements: string[];
    skills: string[];
    qualifications: string[];
    timeToJunior: string;
    timeToMid: string;
    timeToSenior: string;
    timeToExpert: string;
    learningPath: string[];
  };

  ctaMessage?: string;
}
