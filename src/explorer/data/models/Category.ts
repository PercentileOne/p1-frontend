export type Category = {
  id: string;
  name: string;
  heroImageUrl: string;
  overview: string[];
  emotionalNotes: string[];
};

export const Categories: Category[] = [
  {
    id: "business",
    name: "Business",
    heroImageUrl: "/images/categories/business.jpg",
    overview: [
      "Business is the engine of global commerce, strategy, and organisational growth.",
      "It spans finance, operations, leadership, and innovation across every industry.",
    ],
    emotionalNotes: ["Strategic", "Structured", "Growth‑oriented"],
  },

  {
    id: "engineering",
    name: "Engineering",
    heroImageUrl: "/images/categories/engineering.jpg",
    overview: [
      "Engineering shapes the physical and digital world through design, precision, and problem‑solving.",
      "From infrastructure to acoustics, engineers turn ideas into reality.",
    ],
    emotionalNotes: ["Technical", "Inventive", "Impactful"],
  },

  {
    id: "it",
    name: "IT",
    heroImageUrl: "/images/categories/it.jpg",
    overview: [
      "Information Technology powers modern life through software, networks, and intelligent systems.",
      "IT professionals build, secure, and optimise the digital foundations of the world.",
    ],
    emotionalNotes: ["Fast‑paced", "Innovative", "High‑growth"],
  },

  {
    id: "science",
    name: "Science",
    heroImageUrl: "/images/categories/science.jpg",
    overview: [
      "Science explores the natural world through evidence, experimentation, and discovery.",
      "Environmental science, biology, chemistry, and physics all contribute to global understanding.",
    ],
    emotionalNotes: ["Curious", "Analytical", "Purpose‑driven"],
  },

  {
    id: "healthcare",
    name: "Healthcare",
    heroImageUrl: "/images/categories/healthcare.jpg",
    overview: [
      "Healthcare is dedicated to improving lives through treatment, prevention, and compassionate care.",
      "It spans nursing, medicine, diagnostics, and specialised clinical roles.",
    ],
    emotionalNotes: ["Compassionate", "Resilient", "Human‑centred"],
  },
];
