import meta from "./metadata.json";

export type Subcategory = {
  id: string;
  name: string;
  categoryId: string;
  careers: string[];
};

const map = new Map<string, Subcategory>();

(meta as Array<{ id: string; categoryName: string; subcategoryName: string }>).forEach((item) => {
  const subId = item.subcategoryName.toLowerCase().replace(/\s+/g, "_");
  const catId = item.categoryName.toLowerCase().replace(/\s+/g, "_");

  if (!map.has(subId)) {
    map.set(subId, { id: subId, name: item.subcategoryName, categoryId: catId, careers: [] });
  }

  map.get(subId)!.careers.push(item.id);
});

export const subcategories = Array.from(map.values());
