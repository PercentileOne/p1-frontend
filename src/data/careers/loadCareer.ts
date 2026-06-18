import type { Career } from "../models/Career";

// Dynamic import for a single career JSON file
export const loadCareerById = async (id: string): Promise<Career | null> => {
  try {
    const module = await import(`./${id}.json`);
    return module.default as Career;
  } catch (error) {
    console.error(`Career not found: ${id}`, error);
    return null;
  }
};
