// Static, curated catalog for the Certifications & Exams picker — a "generally known UK/US
// list" (Francis, 2026-09-17), not a scraped/verified exhaustive one. Only Microsoft AZ-104 is
// `enabled: true` for v1 — everything else renders as "Coming soon" in the picker so the catalog
// reads as complete without every entry being a real, working exam yet. Same static-array +
// typed-lookup style as companyBank.ts, no external fetch.

export interface CertificationDomain {
  name: string;
  weightPct: number; // proportion of questions drawn from this domain — should sum to ~100
}

export interface CertificationBankEntry {
  id: string;
  name: string;
  vendor: string;
  examCode: string;
  category: 'certification' | 'gcse' | 'a-level';
  enabled: boolean;
  passScore: number;
  maxScore: number;
  domains: CertificationDomain[];
}

export const CERTIFICATION_BANK: CertificationBankEntry[] = [
  {
    id: 'az-104',
    name: 'Microsoft Certified: Azure Administrator Associate',
    vendor: 'Microsoft',
    examCode: 'AZ-104',
    category: 'certification',
    enabled: true,
    passScore: 700,
    maxScore: 1000,
    // Domain names/weightings are general knowledge from Microsoft's publicly documented
    // "skills measured" breakdown — Microsoft revises these periodically, so spot-check the
    // current AZ-104 exam page on Microsoft Learn before treating this as authoritative for a
    // real launch.
    domains: [
      { name: 'Manage Azure identities and governance', weightPct: 15 },
      { name: 'Implement and manage storage', weightPct: 15 },
      { name: 'Deploy and manage Azure compute resources', weightPct: 25 },
      { name: 'Configure and manage virtual networking', weightPct: 25 },
      { name: 'Monitor and maintain Azure resources', weightPct: 20 },
    ],
  },
  { id: 'az-305', name: 'Microsoft Certified: Azure Solutions Architect Expert', vendor: 'Microsoft', examCode: 'AZ-305', category: 'certification', enabled: false, passScore: 700, maxScore: 1000, domains: [] },
  { id: 'aws-saa-c03', name: 'AWS Certified Solutions Architect – Associate', vendor: 'Amazon Web Services', examCode: 'SAA-C03', category: 'certification', enabled: false, passScore: 720, maxScore: 1000, domains: [] },
  { id: 'comptia-security-plus', name: 'CompTIA Security+', vendor: 'CompTIA', examCode: 'SY0-701', category: 'certification', enabled: false, passScore: 750, maxScore: 900, domains: [] },
  { id: 'pmp', name: 'Project Management Professional', vendor: 'PMI', examCode: 'PMP', category: 'certification', enabled: false, passScore: 0, maxScore: 0, domains: [] },
  { id: 'ccna', name: 'Cisco Certified Network Associate', vendor: 'Cisco', examCode: 'CCNA 200-301', category: 'certification', enabled: false, passScore: 825, maxScore: 1000, domains: [] },
  { id: 'gcse-maths', name: 'GCSE Mathematics', vendor: 'UK Exam Boards', examCode: 'GCSE Maths', category: 'gcse', enabled: false, passScore: 0, maxScore: 0, domains: [] },
  { id: 'gcse-english-language', name: 'GCSE English Language', vendor: 'UK Exam Boards', examCode: 'GCSE English Language', category: 'gcse', enabled: false, passScore: 0, maxScore: 0, domains: [] },
  { id: 'gcse-computer-science', name: 'GCSE Computer Science', vendor: 'UK Exam Boards', examCode: 'GCSE Computer Science', category: 'gcse', enabled: false, passScore: 0, maxScore: 0, domains: [] },
  { id: 'a-level-maths', name: 'A-Level Mathematics', vendor: 'UK Exam Boards', examCode: 'A-Level Maths', category: 'a-level', enabled: false, passScore: 0, maxScore: 0, domains: [] },
  { id: 'a-level-computer-science', name: 'A-Level Computer Science', vendor: 'UK Exam Boards', examCode: 'A-Level Computer Science', category: 'a-level', enabled: false, passScore: 0, maxScore: 0, domains: [] },
];

export function getCertificationById(id: string): CertificationBankEntry | undefined {
  return CERTIFICATION_BANK.find(c => c.id === id);
}
