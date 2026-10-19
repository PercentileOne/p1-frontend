import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SharedCvAnalysisPage from './SharedCvAnalysisPage';
import { fetchSharedCvAnalysis } from '../api/cvAnalysisApi';
import type { SharedCvView } from '../api/cvAnalysisApi';

vi.mock('../api/cvAnalysisApi', async () => {
  const actual = await vi.importActual<typeof import('../api/cvAnalysisApi')>('../api/cvAnalysisApi');
  return { ...actual, fetchSharedCvAnalysis: vi.fn() };
});
vi.mock('../api/flowLogger', () => ({ logEvent: vi.fn() }));
vi.mock('../components/CvAnalysisVoiceOverlay', () => ({ CvAnalysisVoiceOverlay: () => null }));
const fetchShared = vi.mocked(fetchSharedCvAnalysis);

const view = (over: Partial<SharedCvView> = {}, analysis: Partial<SharedCvView['analysis']> = {}): SharedCvView => ({
  candidateName: 'Sam Jones',
  createdAt: '2026-10-19T09:00:00Z',
  analysis: {
    candidateName: 'Sam Jones',
    skills: [{ name: 'C# and .NET development', level: 9, yearsNote: 'Up to 15 years' }],
    suggestedRoles: ['Software Architect'],
    strengths: [], weaknesses: [], inconsistencies: [], narrativeScript: '',
    ...analysis,
  },
  roleMatches: [{ title: 'Software Architect', careerId: 'c1', careerTitle: 'Software Architect', salaryUkStarting: 65000, salaryUkExpert: 140000 }],
  hotTopics: { role: 'Software Architect', topics: [{ name: 'Event-Driven Architecture', reason: 'Asked about in architect interviews.' }] },
  portal: 'public',
  positivesOnly: true,
  ...over,
});

const open = () => render(<MemoryRouter initialEntries={['/shared/cv-analysis/tok']}><Routes><Route path="/shared/cv-analysis/:token" element={<SharedCvAnalysisPage />} /></Routes></MemoryRouter>);

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('SharedCvAnalysisPage', () => {
  it('shows the positives: name, skills, roles with pay, and what is hot', async () => {
    fetchShared.mockResolvedValue(view());
    open();
    expect(await screen.findByText('CV Analysis for Sam Jones')).toBeTruthy();
    expect(screen.getByText('C# and .NET development')).toBeTruthy();
    expect(screen.getByText('Software Architect')).toBeTruthy();
    expect(screen.getByText('£65k – £140k')).toBeTruthy();
    expect(screen.getByText("What's Hot for Software Architect")).toBeTruthy();
    expect(screen.getByText('Event-Driven Architecture')).toBeTruthy();
    expect(screen.getByText(/Courses for any gaps here are available on our Learn platform/)).toBeTruthy();
  });

  it('shows no weaknesses, inconsistencies or strengths headings, and no spoken walkthrough, on a positives-only share', async () => {
    fetchShared.mockResolvedValue(view());
    open();
    await screen.findByText('CV Analysis for Sam Jones');
    expect(screen.queryByText('Weaknesses')).toBeNull();
    expect(screen.queryByText(/Inconsistencies/)).toBeNull();
    expect(screen.queryByText('Strengths')).toBeNull();
    expect(screen.queryByText(/Talk Me Through This CV/)).toBeNull();
  });

  it('keeps the full analysis and the walkthrough on a recruiter share (a hiring assessment for colleagues)', async () => {
    fetchShared.mockResolvedValue(view({ portal: 'recruiter', positivesOnly: false, hotTopics: null }, {
      strengths: ['Deep commercial experience.'], weaknesses: ['Little recent cloud work.'], inconsistencies: ['Dates overlap.'], narrativeScript: 'A spoken script.',
    }));
    open();
    await screen.findByText('CV Analysis for Sam Jones');
    expect(screen.getByText('Weaknesses')).toBeTruthy();
    expect(screen.getByText('Little recent cloud work.')).toBeTruthy();
    expect(screen.getByText(/Talk Me Through This CV/)).toBeTruthy();
    expect(screen.queryByText(/What's Hot/)).toBeNull();
  });

  it('invites every visitor to get their own free analysis, with a tagged link', async () => {
    fetchShared.mockResolvedValue(view());
    open();
    const cta = await screen.findByText('Analyse my CV free');
    const href = cta.getAttribute('href') ?? '';
    expect(href).toContain('https://www.theinterviewchair.com/cv-salary.html');
    expect(href).toContain('utm_source=share');
    expect(href).toContain('utm_campaign=cv-analysis');
    expect(screen.getByText('Get your own free CV analysis')).toBeTruthy();
  });

  it('says so when the link is not available', async () => {
    fetchShared.mockRejectedValue(new Error('This shared analysis link is no longer available.'));
    open();
    await waitFor(() => expect(screen.getByText("This link isn't available")).toBeTruthy());
  });

  it('shows no what-is-hot section for an older share that has none saved', async () => {
    fetchShared.mockResolvedValue(view({ hotTopics: null }));
    open();
    await screen.findByText('CV Analysis for Sam Jones');
    expect(screen.queryByText(/What's Hot/)).toBeNull();
  });
});
