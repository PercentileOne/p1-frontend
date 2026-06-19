import meta from "./metadata.json";

export type Career = {
  id: string;
  slug?: string;
  category?: string;
  essence?: string;
  identity?: {
    title: string;
    summary: string;
  };
  salary?: unknown;
  qualifications?: string[];
  curves?: unknown;
  lifestyle?: unknown;
  habits?: string[];
  tags?: string[];
  hero?: unknown;
  [key: string]: unknown;
};

export const careers: Career[] = (meta as Array<{ id: string; name: string; categoryName: string; subcategoryName: string }>).map((item) => ({
  id: item.id,
  slug: item.id,
  category: item.categoryName,
  identity: {
    title: item.name,
    summary: "",
  },
}));
