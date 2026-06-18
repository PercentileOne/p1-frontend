import meta from "./careers/metadata.json";

export type Category = {
  id: string;
  name: string;
};

const map = new Map<string, Category>();

(meta as any[]).forEach((item) => {
  const id = item.categoryName.toLowerCase().replace(/\s+/g, "_");

  if (!map.has(id)) {
    map.set(id, {
      id,
      name: item.categoryName,
    });
  }
});

export const categories = Array.from(map.values());
