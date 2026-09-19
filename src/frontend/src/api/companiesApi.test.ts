import { describe, it, expect } from 'vitest';
import { roleFamilyForTitle, defaultsFor, buildCompanyDigest, type CompanyProfile } from './companiesApi';

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
