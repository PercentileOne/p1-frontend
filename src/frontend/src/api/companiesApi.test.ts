import { describe, it, expect } from 'vitest';
import { roleFamilyForTitle, defaultsFor, buildCompanyDigest, searchCompanies, groupForSector, type CompanyProfile } from './companiesApi';

const profile: CompanyProfile = {
  id: 'acme', name: 'Acme', aliases: [], sector: 'Retail', region: 'uk', rank: 1, status: 'ai-draft',
  about: 'A retailer.', values: [{ name: 'Service', meaning: 'customers first' }], facts: ['Founded long ago'],
  interview: {
    overview: 'Structured.', stages: [{ name: 'Screen' }, { name: 'Interview', format: 'panel' }], tone: 'friendly',
    styles: {
      commercial: { focus: ['customer insight'], questionTypes: ['case study'], bar: 'Pro', typicalQuestions: 10 },
      operations: { focus: ['service'], questionTypes: ['situational'], bar: 'Standard', typicalQuestions: 5 },
    },
  },
};

describe('roleFamilyForTitle', () => {
  it('sends non-technical titles to non-technical families (the M&S marketing case)', () => {
    expect(roleFamilyForTitle('Marketing Manager')).toBe('commercial');
    expect(roleFamilyForTitle('Brand Executive')).toBe('commercial');
    expect(roleFamilyForTitle('Store Colleague')).toBe('operations');
    expect(roleFamilyForTitle('HR Business Partner')).toBe('corporate');
  });
  it('recognises technical titles and gives up on unknown ones', () => {
    expect(roleFamilyForTitle('Senior Software Engineer')).toBe('technical');
    expect(roleFamilyForTitle('Lion Tamer')).toBeNull();
  });
});

describe('defaultsFor', () => {
  it("uses the matching role family's bar and nearest allowed question count", () => {
    expect(defaultsFor(profile, 'Marketing Manager')).toEqual({ difficulty: 'Pro', questionCount: 10 });
    expect(defaultsFor(profile, 'Store Colleague')).toEqual({ difficulty: 'Standard', questionCount: 5 });
  });
  it('falls back to the first available style for an unrecognised title', () => {
    expect(defaultsFor(profile, 'Lion Tamer').difficulty).toBeDefined();
  });
});

describe('buildCompanyDigest', () => {
  it('leads with the style for this role and does not dump every family', () => {
    const d = buildCompanyDigest(profile, 'Marketing Manager');
    expect(d).toContain("STYLE FOR THIS CANDIDATE'S ROLE");
    expect(d).toContain('customer insight');
    expect(d).not.toContain('situational');
    expect(d).toContain('Service (customers first)');
  });
  it('offers every style when the title is unrecognised', () => {
    const d = buildCompanyDigest(profile, 'Lion Tamer');
    expect(d).toContain('use whichever best matches');
    expect(d).toContain('situational');
  });
});

describe('searchCompanies', () => {
  const list = [
    { id: 'meta', name: 'Meta', aliases: ['Facebook', 'Instagram', 'WhatsApp'], sector: 'Technology', region: 'global', rank: 5, status: 'ai-draft' },
    { id: 'x', name: 'X', aliases: ['Twitter'], sector: 'Technology & Media', region: 'global', rank: 9, status: 'ai-draft' },
    { id: 'netflix', name: 'Netflix', aliases: [], sector: 'Technology & Media', region: 'global', rank: 6, status: 'ai-draft' },
    { id: 'marks-and-spencer', name: 'Marks & Spencer', aliases: ['M&S'], sector: 'Retail', region: 'uk', rank: 40, status: 'ai-draft' },
  ];
  it('finds Meta by its brands and X by Twitter, and says why', () => {
    expect(searchCompanies(list, 'facebook')[0]).toMatchObject({ company: { id: 'meta' }, via: 'Facebook' });
    expect(searchCompanies(list, 'insta')[0]).toMatchObject({ company: { id: 'meta' }, via: 'Instagram' });
    expect(searchCompanies(list, 'twitter')[0]).toMatchObject({ company: { id: 'x' }, via: 'Twitter' });
  });
  it('finds by name, ignoring case and punctuation', () => {
    expect(searchCompanies(list, 'NETFLIX')[0].company.id).toBe('netflix');
    expect(searchCompanies(list, 'm&s')[0].company.id).toBe('marks-and-spencer');
    expect(searchCompanies(list, 'marks and')[0].company.id).toBe('marks-and-spencer');
  });
  it('returns nothing for an empty query', () => {
    expect(searchCompanies(list, '  ')).toEqual([]);
  });
});

describe('groupForSector', () => {
  it('groups sensibly', () => {
    expect(groupForSector('Technology')).toBe('Technology');
    expect(groupForSector('Technology & Retail')).toBe('Technology');
    expect(groupForSector('Investment Banking')).toBe('Banking & Finance');
    expect(groupForSector('Retail')).toBe('Retail, Consumer & Food');
    expect(groupForSector('Airlines & Travel')).toBe('Travel & Hospitality');
    expect(groupForSector('Pharmaceuticals')).toBe('Healthcare & Pharma');
    expect(groupForSector('Automotive')).toBe('Energy, Auto & Industry');
    expect(groupForSector('Media & Broadcasting')).toBe('Media & Telecoms');
  });
});
