export interface Company {
  id: string;
  name: string;
  sector: string;
  hq: string;
  size: string;
  keyFacts: string[];
  mikeLines: string;
  companyKnowledgeKeywords: string[];
}

export const COMPANY_BANK: Company[] = [
  {
    id: 'marks-spencer',
    name: 'Marks & Spencer',
    sector: 'Retail / Technology',
    hq: 'London, UK',
    size: '~80,000 employees',
    keyFacts: [
      'Running a major digital transformation — migrating from legacy COBOL systems to cloud-native microservices',
      'Sparks loyalty programme has over 20 million active members',
      'Joint venture with Ocado for online grocery, worth over £750 million',
      'CEO Stuart Machin made technology a board-level priority from day one',
      'Azure is the cloud platform of choice for their modernisation programme',
    ],
    mikeLines: "M&S are right in the middle of a serious technology transformation. They've been running on legacy COBOL systems for decades and they're now moving to cloud-native microservices on Azure. The CEO, Stuart Machin, has made tech a board-level priority — so the person in this role has real executive air cover. Their Sparks loyalty programme has over twenty million members and is central to their data strategy. If they ask what you know about the company, mention the COBOL to microservices migration and the Ocado joint venture — that signals you've done your homework.",
    companyKnowledgeKeywords: ['cobol', 'sparks', 'ocado', 'stuart machin', 'azure', 'microservice', 'loyalty', 'transformation'],
  },
  {
    id: 'barclays',
    name: 'Barclays',
    sector: 'Financial Services / Banking',
    hq: 'London, UK',
    size: '~85,000 employees',
    keyFacts: [
      'One of the largest investment and retail banks in the world, operating in 40+ countries',
      'Running a significant cloud migration to AWS and Google Cloud',
      'Barclays Ventures funds internal fintech innovation and startup partnerships',
      'CTO Sadeea Qureshi is driving a shift from waterfall to product-led engineering',
      'Operates strict FCA and PRA regulated environments — compliance is non-negotiable',
    ],
    mikeLines: "Barclays is one of the big four UK banks but they think of themselves as a technology company with a banking licence — that's their internal language. They're deep into a multi-year cloud migration across AWS and Google Cloud, and the engineering culture is shifting from waterfall to product-led. The CTO is pushing hard on that. One thing to be aware of: this is an FCA and PRA regulated environment, so you'll be asked about how you manage compliance in engineering decisions. Mention the cloud migration and the regulatory context if the company knowledge question comes up.",
    companyKnowledgeKeywords: ['fca', 'pra', 'aws', 'google cloud', 'cloud', 'regulated', 'fintech', 'barclays ventures', 'investment bank'],
  },
  {
    id: 'tesco',
    name: 'Tesco',
    sector: 'Retail / Technology',
    hq: 'Welwyn Garden City, UK',
    size: '~330,000 employees',
    keyFacts: [
      'Largest UK supermarket with over 27% market share',
      'Tesco Technology employs over 5,000 engineers and data scientists globally',
      'Clubcard data platform processes billions of transactions and powers personalised pricing',
      'Moving core retail systems to a microservices architecture on Google Cloud',
      'dunnhumby, their data science subsidiary, is a world leader in retail analytics',
    ],
    mikeLines: "Tesco is the largest UK supermarket but their technology operation is genuinely world-class — they employ over five thousand engineers globally. The Clubcard data platform is at the centre of everything: billions of transactions, personalised pricing, and it feeds dunnhumby, their retail analytics subsidiary. They're moving their core systems to Google Cloud on a microservices architecture, so there's serious engineering complexity here. If the company knowledge question comes up, mention Clubcard, dunnhumby, and the Google Cloud migration — those three show you understand how the tech and the business are connected.",
    companyKnowledgeKeywords: ['clubcard', 'dunnhumby', 'google cloud', 'microservice', 'market share', 'retail analytics', '5000 engineers', 'personalised'],
  },
  {
    id: 'hsbc',
    name: 'HSBC',
    sector: 'Financial Services / Global Banking',
    hq: 'London, UK',
    size: '~220,000 employees',
    keyFacts: [
      'One of the largest banks in the world by total assets, operating in 62 countries',
      'Running a £3.5 billion technology investment programme over five years',
      'Migrating core banking from on-premise mainframes to a hybrid cloud on AWS',
      'Their "Digital First" strategy aims to reduce cost-to-income ratio through automation',
      'Acquired Silicon Valley Bank UK in 2023 for £1 — a significant tech talent acquisition',
    ],
    mikeLines: "HSBC operates in sixty-two countries which means you're dealing with engineering complexity at a truly global scale — different regulatory regimes, data residency rules, the works. They're running a three-and-a-half billion pound technology investment programme right now, focused on moving core banking from mainframes to AWS hybrid cloud. They also acquired Silicon Valley Bank UK in 2023 for a pound — largely for the tech talent and the startup client base. If they ask what you know about the company, lead with the cloud migration programme and the global regulatory complexity. That shows you understand the real engineering challenge.",
    companyKnowledgeKeywords: ['mainframe', 'aws', 'hybrid cloud', 'svb', 'silicon valley bank', '62 countries', 'digital first', 'cost-to-income', '3.5 billion'],
  },
  {
    id: 'asos',
    name: 'ASOS',
    sector: 'E-commerce / Fashion Technology',
    hq: 'London, UK',
    size: '~3,500 employees',
    keyFacts: [
      'Pure-play online fashion retailer with over 26 million active customers globally',
      'Operates one of the most technically sophisticated fashion logistics platforms in Europe',
      'Tech stack is primarily AWS with a microservices architecture processing millions of daily requests',
      'Launched "ASOS Responsible Edit" — AI-powered fashion trend forecasting and sustainability tracking',
      'Went through significant cost restructuring in 2023-24, reducing headcount and tech spend',
    ],
    mikeLines: "ASOS is a pure-play online retailer — no physical stores, so technology is literally the entire business. They operate at scale: twenty-six million active customers globally, millions of daily requests hitting a microservices architecture on AWS. They've been through a tough restructuring period in 2023 and 2024, cutting costs and headcount, so the culture is focused on engineering efficiency and doing more with less. They're also investing in AI for trend forecasting. If the company knowledge question comes up, mention the AWS microservices platform, the scale, and the efficiency focus — that shows you understand the moment they're in.",
    companyKnowledgeKeywords: ['aws', 'microservice', 'pure-play', '26 million', 'fashion', 'logistics', 'ai', 'trend', 'restructur'],
  },
  {
    id: 'arm-holdings',
    name: 'Arm Holdings',
    sector: 'Semiconductor / Technology',
    hq: 'Cambridge, UK',
    size: '~6,000 employees',
    keyFacts: [
      'Designs the processor architecture used in over 95% of the world\'s smartphones',
      'Business model is pure IP licensing — Arm designs chips but never manufactures them',
      'Re-listed on NASDAQ in September 2023 at a $54 billion valuation — one of the biggest tech IPOs in years',
      'CEO Rene Haas is pushing into AI infrastructure — Arm architecture now powering data centre AI chips',
      'SoftBank owns ~90% following a failed acquisition attempt by NVIDIA in 2022',
    ],
    mikeLines: "Arm is a genuinely unique company — they design the chip architecture used in over ninety-five percent of smartphones but they don't manufacture anything. Pure IP licensing. That business model means their engineering culture is intensely focused on the quality of the architecture specification itself, not running production systems. They re-listed on NASDAQ in 2023 and Rene Haas, the CEO, is making a big push into AI infrastructure — Arm chips are now powering data centre AI workloads which is a major strategic expansion. If the company knowledge question comes up, mention the IP licensing model, the AI infrastructure push, and the NASDAQ IPO. That shows you understand the business.",
    companyKnowledgeKeywords: ['ip licensing', 'nasdaq', 'rene haas', 'softbank', 'nvidia', 'smartphone', '95%', 'ai', 'semiconductor', 'architecture'],
  },
];

/** Pick a random company from the bank. Optionally exclude by id. */
export function pickRandomCompany(excludeId?: string): Company {
  const pool = excludeId ? COMPANY_BANK.filter(c => c.id !== excludeId) : COMPANY_BANK;
  return pool[Math.floor(Math.random() * pool.length)];
}
