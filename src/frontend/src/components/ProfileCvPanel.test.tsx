import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfileCvPanel } from './ProfileCvPanel';
import { fetchProfileCv, setProfileCv } from '../api/cvAnalysisApi';
import type { ProfileCvReply, SharedCvView } from '../api/cvAnalysisApi';
import { useAuthStore } from '../auth/authStore';

vi.mock('../api/cvAnalysisApi', async () => {
  const actual = await vi.importActual<typeof import('../api/cvAnalysisApi')>('../api/cvAnalysisApi');
  return { ...actual, fetchProfileCv: vi.fn(), setProfileCv: vi.fn() };
});
vi.mock('../api/flowLogger', () => ({ logEvent: vi.fn() }));
const getCv = vi.mocked(fetchProfileCv);
const setCv = vi.mocked(setProfileCv);

const view = (): SharedCvView => ({
  candidateName: 'Sam Jones', createdAt: '2026-10-19T09:00:00Z',
  analysis: { candidateName: 'Sam Jones', skills: [{ name: 'C# and .NET development', level: 9, yearsNote: null }], suggestedRoles: [], strengths: [], weaknesses: [], inconsistencies: [], narrativeScript: '' },
  roleMatches: [{ title: 'Software Architect', careerId: 'c1', careerTitle: 'Software Architect', salaryUkStarting: 65000, salaryUkExpert: 140000 }],
  hotTopics: { role: 'Software Architect', topics: [{ name: 'Event-Driven Architecture', reason: 'Asked about in interviews.' }] },
  portal: 'candidate', positivesOnly: true,
});
const reply = (over: Partial<ProfileCvReply> = {}): ProfileCvReply => ({ enabled: false, visible: false, view: null, recordId: null, ...over });

const open = (props: { isOwn: boolean }) => render(<MemoryRouter><ProfileCvPanel userId="u1" name={props.isOwn ? 'You' : 'Sam'} isOwn={props.isOwn} /></MemoryRouter>);

beforeEach(() => { vi.clearAllMocks(); useAuthStore.setState({ token: 'tok' }); });
afterEach(() => cleanup());

describe('ProfileCvPanel on someone else\'s profile', () => {
  it('shows the analysis with a call to action when they have switched it on', async () => {
    getCv.mockResolvedValue(reply({ enabled: true, visible: true, view: view(), recordId: 'r1' }));
    open({ isOwn: false });
    expect(await screen.findByText('C# and .NET development')).toBeTruthy();
    expect(screen.getByText("What's Hot for Software Architect")).toBeTruthy();
    expect(screen.getByText('Analyse my CV free').getAttribute('href')).toContain('utm_medium=cv-profile');
    expect(screen.queryByText('Weaknesses')).toBeNull();
  });

  it('gives the same plain line whether they have no analysis or have kept it private', async () => {
    getCv.mockResolvedValue(reply());
    open({ isOwn: false });
    expect(await screen.findByText('Sam has not added a CV analysis to their profile.')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});

describe('ProfileCvPanel on your own profile', () => {
  it('is off by default, says what it will show, and previews your newest analysis', async () => {
    getCv.mockResolvedValue(reply({ enabled: false, visible: true, view: view(), recordId: 'r1' }));
    open({ isOwn: true });
    const sw = await screen.findByRole('switch') as HTMLInputElement;
    expect(sw.checked).toBe(false);
    expect(screen.getByText(/Nobody else can see your analysis until you switch this on/)).toBeTruthy();
    expect(screen.getByText(/Your weaknesses stay with you/)).toBeTruthy();
    expect(screen.getByText('C# and .NET development')).toBeTruthy();
  });

  it('switches it on, then asks again so the screen matches the server', async () => {
    getCv.mockResolvedValueOnce(reply({ enabled: false, visible: true, view: view(), recordId: 'r1' }));
    setCv.mockResolvedValue({ enabled: true, recordId: 'r1' });
    getCv.mockResolvedValueOnce(reply({ enabled: true, visible: true, view: view(), recordId: 'r1' }));
    open({ isOwn: true });
    fireEvent.click(await screen.findByRole('switch'));
    await waitFor(() => expect(setCv).toHaveBeenCalledWith(true, 'tok'));
    expect(await screen.findByText(/Anyone who views your profile can see the analysis below/)).toBeTruthy();
    expect((screen.getByRole('switch') as HTMLInputElement).checked).toBe(true);
  });

  it('shows the server\'s own message if it cannot be switched on', async () => {
    getCv.mockResolvedValue(reply({ enabled: false, visible: true, view: view(), recordId: 'r1' }));
    setCv.mockRejectedValue(new Error('Analyse your CV and press Share first, then you can show it on your profile.'));
    open({ isOwn: true });
    fireEvent.click(await screen.findByRole('switch'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Analyse your CV and press Share first/);
    expect((screen.getByRole('switch') as HTMLInputElement).checked).toBe(false);
  });

  it('with nothing saved yet, cannot be switched on and points to the CV analysis', async () => {
    getCv.mockResolvedValue(reply());
    open({ isOwn: true });
    expect(await screen.findByText(/You have not saved an analysis yet/)).toBeTruthy();
    expect((screen.getByRole('switch') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('Analyse my CV')).toBeTruthy();
  });

  it('can be switched off again', async () => {
    getCv.mockResolvedValueOnce(reply({ enabled: true, visible: true, view: view(), recordId: 'r1' }));
    setCv.mockResolvedValue({ enabled: false, recordId: 'r1' });
    getCv.mockResolvedValueOnce(reply({ enabled: false, visible: true, view: view(), recordId: 'r1' }));
    open({ isOwn: true });
    fireEvent.click(await screen.findByRole('switch'));
    await waitFor(() => expect(setCv).toHaveBeenCalledWith(false, 'tok'));
    expect(await screen.findByText(/Nobody else can see your analysis until you switch this on/)).toBeTruthy();
  });
});
