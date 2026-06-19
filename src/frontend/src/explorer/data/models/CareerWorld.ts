export type CareerWorld = {
  id: string;
  heroImageUrl: string;
  overview: string[];
  lifestyle: string[];
  emotionalNotes: string[];
  growth: {
    demand: number;
    automationRisk: number;
    futureScore: number;
  };
};
