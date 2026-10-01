import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChartThemeProvider, useChartTheme } from './ChartThemeProvider';
import { darkTheme, lightTheme, mergeTheme } from './themes';
import type { ChartTheme, ChartThemeOverrides } from './types';

afterEach(cleanup);

function Probe({ overrides, onTheme }: { overrides?: ChartThemeOverrides; onTheme: (t: ChartTheme) => void }) {
    onTheme(useChartTheme(overrides));
    return null;
}

describe('theme', () => {
    it('falls back to the light theme without a provider', () => {
        let t: ChartTheme | undefined;
        render(<Probe onTheme={(x) => (t = x)} />);
        expect(t).toBe(lightTheme);
    });
    it('merges per-instance overrides without a provider', () => {
        let t: ChartTheme | undefined;
        render(<Probe overrides={{ text: { primary: '#f00' } }} onTheme={(x) => (t = x)} />);
        expect(t?.text.primary).toBe('#f00');
        expect(t?.text.secondary).toBe(lightTheme.text.secondary);
        expect(lightTheme.text.primary).toBe('#191919');
    });
    it('nested providers merge inner over outer and inherit mode', () => {
        let t: ChartTheme | undefined;
        render(
            <ChartThemeProvider mode="dark" theme={{ accent: '#111', palette: ['#1'] }}>
                <ChartThemeProvider theme={{ accent: '#222' }}>
                    <Probe onTheme={(x) => (t = x)} />
                </ChartThemeProvider>
            </ChartThemeProvider>,
        );
        expect(t?.mode).toBe('dark');
        expect(t?.componentBackground).toBe(darkTheme.componentBackground);
        expect(t?.accent).toBe('#222');
        expect(t?.palette).toEqual(['#1']);
    });
    it('inner mode keeps outer overrides', () => {
        let t: ChartTheme | undefined;
        render(
            <ChartThemeProvider mode="dark" theme={{ accent: '#111' }}>
                <ChartThemeProvider mode="light">
                    <Probe onTheme={(x) => (t = x)} />
                </ChartThemeProvider>
            </ChartThemeProvider>,
        );
        expect(t?.mode).toBe('light');
        expect(t?.accent).toBe('#111');
    });
    it('system mode works without matchMedia (SSR-safe fallback to light)', () => {
        let t: ChartTheme | undefined;
        render(
            <ChartThemeProvider mode="system">
                <Probe onTheme={(x) => (t = x)} />
            </ChartThemeProvider>,
        );
        expect(t?.mode).toBe('light');
    });
    it('mergeTheme keeps mode, replaces arrays, ignores undefined', () => {
        const m = mergeTheme(darkTheme, { palette: ['#a'], fontSize: { axis: 13 }, border: undefined });
        expect(m.mode).toBe('dark');
        expect(m.palette).toEqual(['#a']);
        expect(m.fontSize).toEqual({ ...darkTheme.fontSize, axis: 13 });
        expect(m.border).toBe(darkTheme.border);
        expect(mergeTheme(lightTheme)).toBe(lightTheme);
    });
    it('does not touch document.body', () => {
        const before = document.body.className;
        render(<ChartThemeProvider mode="dark">x</ChartThemeProvider>);
        expect(document.body.className).toBe(before);
    });
    it('is memoised by content for inline overrides', () => {
        const seen: ChartTheme[] = [];
        const { rerender } = render(<Probe overrides={{ accent: '#abc' }} onTheme={(x) => seen.push(x)} />);
        rerender(<Probe overrides={{ accent: '#abc' }} onTheme={(x) => seen.push(x)} />);
        expect(seen[0]).toBe(seen[1]);
    });
    it('system mode follows prefers-color-scheme live', () => {
        let dark = false;
        const listeners = new Set<() => void>();
        vi.stubGlobal('matchMedia', (q: string) => ({
            get matches() {
                return q.includes('dark') && dark;
            },
            media: q,
            addEventListener: (_: string, l: () => void) => listeners.add(l),
            removeEventListener: (_: string, l: () => void) => listeners.delete(l),
        }));
        try {
            let t: ChartTheme | undefined;
            render(
                <ChartThemeProvider mode="system">
                    <Probe onTheme={(x) => (t = x)} />
                </ChartThemeProvider>,
            );
            expect(t?.mode).toBe('light');
            act(() => {
                dark = true;
                listeners.forEach((l) => l());
            });
            expect(t?.mode).toBe('dark');
            cleanup();
            expect(listeners.size).toBe(0);
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
