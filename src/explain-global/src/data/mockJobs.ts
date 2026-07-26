export interface Job {
  id: string;
  title: string;
  company: string;
  sector: string;
  location: string;
  salary: string;
  type: 'Permanent' | 'Contract' | 'Interim';
  posted: string;
  logo: string;
  tags: string[];
  featured?: boolean;
}

export const MOCK_JOBS: Job[] = [
  {
    id: 'j1',
    title: 'Head of Engineering – Digital Transformation',
    company: 'Vallum Associates',
    sector: 'Technology',
    location: 'London (Hybrid)',
    salary: '£150,000–£200,000',
    type: 'Permanent',
    posted: '2026-07-20',
    logo: 'VA',
    tags: ['Engineering Leadership', 'Cloud Migration', 'Azure'],
    featured: true,
  },
  {
    id: 'j2',
    title: 'Senior Software Engineer — Payments Platform',
    company: 'Barclays',
    sector: 'Finance',
    location: 'London',
    salary: '£90,000–£120,000',
    type: 'Permanent',
    posted: '2026-07-22',
    logo: 'B',
    tags: ['Java', 'Microservices', 'Payments'],
  },
  {
    id: 'j3',
    title: 'Product Manager — Consumer App',
    company: 'ASOS',
    sector: 'Retail / Tech',
    location: 'London',
    salary: '£75,000–£95,000',
    type: 'Permanent',
    posted: '2026-07-21',
    logo: 'AS',
    tags: ['Product Strategy', 'App', 'Consumer'],
  },
  {
    id: 'j4',
    title: 'Data Engineer — Real-Time Analytics',
    company: 'Vodafone UK',
    sector: 'Telecoms',
    location: 'Newbury (Hybrid)',
    salary: '£70,000–£90,000',
    type: 'Permanent',
    posted: '2026-07-19',
    logo: 'V',
    tags: ['Spark', 'Kafka', 'Python'],
  },
  {
    id: 'j5',
    title: 'Risk & Compliance Manager',
    company: 'Lloyds Banking Group',
    sector: 'Finance',
    location: 'Edinburgh / London',
    salary: '£80,000–£100,000',
    type: 'Permanent',
    posted: '2026-07-23',
    logo: 'LB',
    tags: ['Risk', 'FCA', 'Basel III'],
  },
  {
    id: 'j6',
    title: 'Cloud Infrastructure Architect',
    company: 'National Grid',
    sector: 'Energy / Utilities',
    location: 'Warwick (Hybrid)',
    salary: '£95,000–£130,000',
    type: 'Permanent',
    posted: '2026-07-18',
    logo: 'NG',
    tags: ['Azure', 'Terraform', 'Infrastructure'],
  },
  {
    id: 'j7',
    title: 'UX Design Lead',
    company: 'BBC',
    sector: 'Media',
    location: 'London',
    salary: '£65,000–£80,000',
    type: 'Permanent',
    posted: '2026-07-24',
    logo: 'BBC',
    tags: ['UX', 'Design Systems', 'Figma'],
  },
  {
    id: 'j8',
    title: 'Finance Business Partner',
    company: 'Marks & Spencer',
    sector: 'Retail',
    location: 'London',
    salary: '£60,000–£75,000',
    type: 'Permanent',
    posted: '2026-07-22',
    logo: 'M&S',
    tags: ['FP&A', 'Retail Finance', 'Partnering'],
  },
];

export const SECTOR_COLORS: Record<string, { bg: string; text: string }> = {
  Technology: { bg: '#1e3a5f', text: '#7eb8f7' },
  Finance: { bg: '#1a3d2e', text: '#5ecb8e' },
  'Retail / Tech': { bg: '#3a1e4f', text: '#c47ef7' },
  Telecoms: { bg: '#3a2a10', text: '#f7b55e' },
  'Energy / Utilities': { bg: '#1e3a30', text: '#5ef7c4' },
  Media: { bg: '#3a1e1e', text: '#f77e7e' },
  Retail: { bg: '#2a2a1e', text: '#d4c45e' },
};
