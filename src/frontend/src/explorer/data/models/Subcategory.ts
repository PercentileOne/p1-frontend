export type Subcategory = {
  id: string;
  categoryId: string;
  name: string;
  heroImageUrl: string;
  overview: string[];
  topRoles: string[];
  growthGraph: {
    year: number;
    value: number;
  }[];
  industryStats: {
    totalJobsLastYear: number;
    totalJobsThisYear: number;
    projectedJobsNextYear: number;
    growthRate10yr: number;
  };
  emotionalNotes: string[];
};

export const Subcategories: Subcategory[] = [
  {
    id: "finance",
    categoryId: "business",
    name: "Finance",
    heroImageUrl: "/images/subcategories/finance.jpg",
    overview: [
      "Finance is the backbone of every organisation, ensuring stability, compliance, and strategic decision‑making.",
      "Professionals in this field analyse data, manage budgets, and guide long‑term financial planning.",
    ],
    topRoles: ["accountant"],
    growthGraph: [
      { year: 2020, value: 70 },
      { year: 2021, value: 74 },
      { year: 2022, value: 78 },
      { year: 2023, value: 82 },
    ],
    industryStats: {
      totalJobsLastYear: 950000,
      totalJobsThisYear: 980000,
      projectedJobsNextYear: 1020000,
      growthRate10yr: 12,
    },
    emotionalNotes: ["Structured", "Analytical", "Stable"],
  },

  {
    id: "sound_engineering",
    categoryId: "engineering",
    name: "Sound Engineering",
    heroImageUrl: "/images/subcategories/sound-engineering.jpg",
    overview: [
      "Sound engineering blends physics, creativity, and technology to shape how environments and products sound.",
      "Professionals analyse acoustics, reduce noise pollution, and design soundscapes for buildings and infrastructure.",
    ],
    topRoles: ["acoustic_consultant"],
    growthGraph: [
      { year: 2020, value: 60 },
      { year: 2021, value: 65 },
      { year: 2022, value: 70 },
      { year: 2023, value: 76 },
    ],
    industryStats: {
      totalJobsLastYear: 120000,
      totalJobsThisYear: 130000,
      projectedJobsNextYear: 140000,
      growthRate10yr: 18,
    },
    emotionalNotes: ["Technical", "Precise", "Environmental Impact"],
  },

  {
    id: "artificial_intelligence",
    categoryId: "it",
    name: "Artificial Intelligence",
    heroImageUrl: "/images/subcategories/artificial-intelligence.jpg",
    overview: [
      "Artificial Intelligence is transforming industries through automation, prediction, and intelligent decision‑making.",
      "AI professionals build models, design intelligent systems, and push the boundaries of what machines can do.",
    ],
    topRoles: ["ai_automation_engineer", "ai_research_scientist"],
    growthGraph: [
      { year: 2020, value: 85 },
      { year: 2021, value: 92 },
      { year: 2022, value: 100 },
      { year: 2023, value: 115 },
    ],
    industryStats: {
      totalJobsLastYear: 450000,
      totalJobsThisYear: 520000,
      projectedJobsNextYear: 600000,
      growthRate10yr: 38,
    },
    emotionalNotes: ["Innovative", "Fast‑paced", "High‑impact"],
  },

  {
    id: "environmental_science",
    categoryId: "science",
    name: "Environmental Science",
    heroImageUrl: "/images/subcategories/environmental-science.jpg",
    overview: [
      "Environmental science focuses on understanding and protecting the natural world.",
      "Professionals analyse air quality, ecosystems, and environmental risks to support public health and sustainability.",
    ],
    topRoles: ["air_quality_scientist"],
    growthGraph: [
      { year: 2020, value: 72 },
      { year: 2021, value: 75 },
      { year: 2022, value: 80 },
      { year: 2023, value: 88 },
    ],
    industryStats: {
      totalJobsLastYear: 300000,
      totalJobsThisYear: 320000,
      projectedJobsNextYear: 340000,
      growthRate10yr: 20,
    },
    emotionalNotes: ["Purpose‑driven", "Scientific", "Societal Impact"],
  },

  {
    id: "software_development",
    categoryId: "it",
    name: "Software Development",
    heroImageUrl: "/images/subcategories/software-development.jpg",
    overview: [
      "Software development powers the digital world, from apps to enterprise systems.",
      "Developers design, build, and maintain the software that drives modern life.",
    ],
    topRoles: ["software_engineer"],
    growthGraph: [
      { year: 2020, value: 90 },
      { year: 2021, value: 95 },
      { year: 2022, value: 105 },
      { year: 2023, value: 118 },
    ],
    industryStats: {
      totalJobsLastYear: 1500000,
      totalJobsThisYear: 1600000,
      projectedJobsNextYear: 1700000,
      growthRate10yr: 25,
    },
    emotionalNotes: ["Creative", "Logical", "High‑growth"],
  },

  {
    id: "data",
    categoryId: "it",
    name: "Data",
    heroImageUrl: "/images/subcategories/data.jpg",
    overview: [
      "Data professionals turn raw information into insights that drive decisions.",
      "This field blends statistics, programming, and business understanding.",
    ],
    topRoles: ["data_analyst"],
    growthGraph: [
      { year: 2020, value: 78 },
      { year: 2021, value: 84 },
      { year: 2022, value: 92 },
      { year: 2023, value: 101 },
    ],
    industryStats: {
      totalJobsLastYear: 800000,
      totalJobsThisYear: 860000,
      projectedJobsNextYear: 920000,
      growthRate10yr: 28,
    },
    emotionalNotes: ["Analytical", "Insight‑driven", "Strategic"],
  },

  {
    id: "cyber_security",
    categoryId: "it",
    name: "Cyber Security",
    heroImageUrl: "/images/subcategories/cyber-security.jpg",
    overview: [
      "Cyber security protects systems, data, and organisations from digital threats.",
      "Professionals in this field defend against attacks and build secure systems.",
    ],
    topRoles: ["cyber_security_analyst"],
    growthGraph: [
      { year: 2020, value: 82 },
      { year: 2021, value: 90 },
      { year: 2022, value: 102 },
      { year: 2023, value: 115 },
    ],
    industryStats: {
      totalJobsLastYear: 600000,
      totalJobsThisYear: 680000,
      projectedJobsNextYear: 760000,
      growthRate10yr: 32,
    },
    emotionalNotes: ["Protective", "High‑stakes", "Mission‑critical"],
  },

  {
    id: "nursing",
    categoryId: "healthcare",
    name: "Nursing",
    heroImageUrl: "/images/subcategories/nursing.jpg",
    overview: [
      "Nursing is a compassionate and hands‑on profession focused on patient care.",
      "Nurses support treatment, recovery, and long‑term wellbeing across healthcare settings.",
    ],
    topRoles: ["dialysis_nurse"],
    growthGraph: [
      { year: 2020, value: 88 },
      { year: 2021, value: 92 },
      { year: 2022, value: 97 },
      { year: 2023, value: 103 },
    ],
    industryStats: {
      totalJobsLastYear: 2000000,
      totalJobsThisYear: 2100000,
      projectedJobsNextYear: 2200000,
      growthRate10yr: 15,
    },
    emotionalNotes: ["Compassionate", "Resilient", "People‑focused"],
  },

  {
    id: "medicine",
    categoryId: "healthcare",
    name: "Medicine",
    heroImageUrl: "/images/subcategories/medicine.jpg",
    overview: [
      "Medicine is the science and practice of diagnosing, treating, and preventing illness.",
      "Medical professionals combine deep scientific knowledge with patient‑centred care.",
    ],
    topRoles: ["renal_consultant"],
    growthGraph: [
      { year: 2020, value: 95 },
      { year: 2021, value: 98 },
      { year: 2022, value: 102 },
      { year: 2023, value: 108 },
    ],
    industryStats: {
      totalJobsLastYear: 1800000,
      totalJobsThisYear: 1850000,
      projectedJobsNextYear: 1900000,
      growthRate10yr: 10,
    },
    emotionalNotes: ["Scientific", "Purpose‑driven", "Life‑changing"],
  },
];
