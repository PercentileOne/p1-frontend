import meta from "./metadata.json";

export type Category = {
  id: string;
  name: string;
};

export const categories: Category[] = (meta as { categories: { id: string; name: string }[] }).categories.map((c) => ({
  id: c.id,
  name: c.name,
}));
