// Auto‑generated careers registry

// Import all JSON files in the careers folder
const modules = import.meta.glob("../careers/*.json", { eager: true });

export type Career = {
  id: string;
  slug: string;
  category: string;
  essence?: string;

  identity?: {
    title: string;
    summary: string;
  };

  salary?: any;
  qualifications?: string[];
  curves?: any;
  lifestyle?: any;
  habits?: string[];
  tags?: string[];
  hero?: any;

  [key: string]: any;
};

export const careers: Career[] = Object.values(modules).map((mod: any) => {
  return {
    ...mod.default,
  };
});
