import meta from "./metadata.json";

export type Career = {
  id: string;
  slug?: string;
  category?: string;
  subcategory?: string;
  identity?: {
    title: string;
    summary: string;
  };
  [key: string]: unknown;
};

type MetaCategory = { id: string; name: string; subcategories: { id: string; name: string; careers: string[] }[] };

export const careers: Career[] = (meta as { categories: MetaCategory[] }).categories.flatMap((cat) =>
  cat.subcategories.flatMap((sub) =>
    sub.careers.map((id) => ({
      id,
      slug: id,
      category: cat.id,
      subcategory: sub.id,
      identity: {
        title: id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        summary: "",
      },
    }))
  )
);
