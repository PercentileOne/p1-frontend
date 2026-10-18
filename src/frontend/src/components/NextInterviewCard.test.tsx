import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { NextInterviewCard } from './NextInterviewCard';
import type { NextInterview } from '../api/nextInterviewApi';
import { localDate } from '../api/routinesApi';

const plus = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return localDate(d); };
const iv = (over: Partial<NextInterview> = {}): NextInterview => ({ id: 'a', date: plus(3), role: 'Software Engineer', company: 'Acme', source: 'self', ...over });

beforeEach(() => { try { localStorage.clear(); } catch { /* fine */ } });
afterEach(() => cleanup());

describe('NextInterviewCard', () => {
  it('shows nothing until the interviews have loaded', () => {
    const { container } = render(<NextInterviewCard items={[]} loaded={false} onAdd={vi.fn()} onRemove={vi.fn()} />);
    expect(container.textContent).toBe('');
  });

  it('asks the question when nothing is listed, and Not now hides it for the day', () => {
    render(<NextInterviewCard items={[]} loaded onAdd={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('Do you have an interview coming up?')).toBeTruthy();
    fireEvent.click(screen.getByText('Not now'));
    expect(screen.queryByText('Do you have an interview coming up?')).toBeNull();
  });

  it('adds an interview with a date, a role and a company', async () => {
    const onAdd = vi.fn(async () => {});
    render(<NextInterviewCard items={[]} loaded onAdd={onAdd} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByText('Yes, add it'));
    fireEvent.change(screen.getByLabelText('DATE'), { target: { value: plus(5) } });
    fireEvent.change(screen.getByLabelText('ROLE (OPTIONAL)'), { target: { value: 'Cloud Engineer' } });
    fireEvent.change(screen.getByLabelText('COMPANY (OPTIONAL)'), { target: { value: 'Contoso' } });
    fireEvent.click(screen.getByText('Save interview'));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith({ date: plus(5), role: 'Cloud Engineer', company: 'Contoso' }));
  });

  it('needs a date, and refuses one in the past', async () => {
    const onAdd = vi.fn(async () => {});
    render(<NextInterviewCard items={[]} loaded onAdd={onAdd} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByText('Yes, add it'));
    fireEvent.click(screen.getByText('Save interview'));
    expect(screen.getByText('Choose the date of the interview.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('DATE'), { target: { value: plus(-2) } });
    fireEvent.click(screen.getByText('Save interview'));
    expect(screen.getByText('That date has already passed.')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows the soonest interview with a countdown, and the next two smaller', () => {
    render(<NextInterviewCard items={[iv({ id: 'b', date: plus(10), role: 'Analyst', company: '' }), iv(), iv({ id: 'c', date: plus(20), role: 'Tester', company: '' })]} loaded onAdd={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('Software Engineer at Acme')).toBeTruthy();
    expect(screen.getByText('in 3 days')).toBeTruthy();
    expect(screen.getByText('Analyst')).toBeTruthy();
    expect(screen.getByText('Tester')).toBeTruthy();
  });

  it('says who sent a recruiter\'s prep, and offers no remove for it', () => {
    render(<NextInterviewCard items={[iv({ id: 'prep:1', source: 'recruiter', from: 'Sam', company: '' })]} loaded onAdd={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText(/sent by Sam/)).toBeTruthy();
    expect(screen.queryByText('Remove this one')).toBeNull();
  });

  it('removes the person\'s own interview', async () => {
    const onRemove = vi.fn(async () => {});
    render(<NextInterviewCard items={[iv()]} loaded onAdd={vi.fn()} onRemove={onRemove} />);
    fireEvent.click(screen.getByText('Remove this one'));
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith('a'));
  });
});
