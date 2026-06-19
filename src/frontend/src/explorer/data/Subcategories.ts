import meta from "./metadata.json";

export type Subcategory = {
  id: string;
  name: string;
  categoryId: string;
  careers: string[];
};

type MetaCategory = { id: string; name: string; subcategories: { id: string; name: string; careers: string[] }[] };

export const subcategories: Subcategory[] = (meta as { categories: MetaCategory[] }).categories.flatMap((cat) =>
  cat.subcategories.map((sub) => ({
    id: sub.id,
    name: sub.name,
    categoryId: cat.id,
    careers: sub.careers,
  }))
);
