import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

const json = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

afterEach(() => vi.unstubAllGlobals());

describe('browser-only mode (no API)', () => {
  it('field crew revises a requirement; it shows in history and alerts the controller', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    render(<App />);

    // Role picker, not a sign-in form, and it says nothing is saved.
    fireEvent.click(await screen.findByRole('radio', { name: /Ground Operations/ }));
    expect(screen.getByText(/stay in this browser tab/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Requirements' }));
    const duration = await screen.findByRole('spinbutton', { name: /Duration needed/ });
    fireEvent.change(duration, { target: { value: '240' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit requirement' }));
    await screen.findByText(/Submitted/);

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(await screen.findByText(/Requirement: 240 min/)).toBeTruthy();

    // Switch to the controller: the revision arrives as an alert.
    fireEvent.click(screen.getByRole('button', { name: /^Authority$/i }));
    const bell = await screen.findByRole('button', { name: /Alerts, 1 unread/ });
    fireEvent.click(bell);
    expect(await screen.findByText(/Revised requirement for TASK-/)).toBeTruthy();
  });
});

describe('API mode', () => {
  it('role selection opens a department session; no username or password', async () => {
    const calls = [];
    const trd = { username: 'sse_trd', name: 'Senior Section Engineer', role: 'Ground Operations', department: 'Electrical / TRD' };
    vi.stubGlobal('fetch', vi.fn((url, opts = {}) => {
      calls.push([url, opts.method || 'GET', opts.body]);
      if (url.endsWith('/api/health')) return json(200, { ok: true, service: 'rmo-api' });
      if (url.endsWith('/api/session')) return json(200, trd);
      if (url.includes('/api/events')) return json(200, []);
      if (url.endsWith('/api/alerts/seen')) return json(200, { last_event_id: 0 });
      return json(404, { detail: 'Not found' });
    }));
    render(<App />);

    fireEvent.click(await screen.findByRole('radio', { name: /Ground Operations/ }));
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(screen.getByText(/each Ground Operations department is only ever sent its own work/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await screen.findByText(/Saved · shared log/);
    const session = calls.find(([u]) => u.endsWith('/api/session'));
    expect(JSON.parse(session[2])).toEqual({ role: 'Ground Operations', department: 'Electrical / TRD' });
    // The role switch stays available.
    expect(screen.getByRole('group', { name: /role/i })).toBeTruthy();
  });
});
