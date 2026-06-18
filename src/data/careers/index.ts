// This file will dynamically import all career JSON files.
// Later, this will be replaced by a backend API call.

export const loadAllCareers = async () => {
  const modules = import.meta.glob("./*.json", { eager: true });

  return Object.values(modules).map((m: any) => m.default);
};
