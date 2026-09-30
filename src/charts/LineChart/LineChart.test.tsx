import { cleanup, render, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LineChart } from './LineChart';
import { dashArrayFor, defaultAxisNumber } from './lineStyle';
import { useSweep } from './sweep';

const seen = vi.hoisted(() => [] as unknown[]);

vi.mock('recharts', async (importOriginal) => {
    const mod = await importOriginal<typeof import('recharts')>();
    return {
        ...mod,
        LineChart: (props: Parameters<typeof mod.LineChart>[0]) => {
            seen.push(props.data);
            return createElement(mod.LineChart, props);
        },
    };
});

afterEach(() => {
    cleanup();
    seen.length = 0;
});

const categories = ['W1', 'W2', 'W3'];
const makeSeries = () => [
    { name: 'A', data: [1, 2, 3] },
    { name: 'B', data: [3, null, 1], dashStyle: 'Dash' as const },
];

describe('LineChart content stability', () => {
    it('passes the same rows to Recharts after an equal-content re-render with new formatters', () => {
        const { rerender } = render(
            <LineChart series={makeSeries()} categories={[...categories]} yAxisFormatter={(v) => `${v}`} />,
        );
        const first = seen[seen.length - 1];
        expect(Array.isArray(first)).toBe(true);
        rerender(<LineChart series={makeSeries()} categories={[...categories]} yAxisFormatter={(v) => `$${v}`} />);
        expect(seen.length).toBeGreaterThan(1);
        expect(seen[seen.length - 1]).toBe(first);
    });

    it('passes new rows when the content changes', () => {
        const { rerender } = render(<LineChart series={makeSeries()} categories={categories} />);
        const first = seen[seen.length - 1];
        rerender(<LineChart series={[{ name: 'A', data: [1, 2, 4] }]} categories={categories} />);
        expect(seen[seen.length - 1]).not.toBe(first);
    });
});

describe('useSweep', () => {
    it('does not sweep on mount without a key', () => {
        const { result } = renderHook(() => useSweep(null));
        expect(result.current).toMatchObject({ run: 0, active: false });
    });

    it('sweeps on mount with a key, and only restarts when the key changes', () => {
        const { result, rerender } = renderHook(({ k }) => useSweep(k), { initialProps: { k: 'a' as string | null } });
        expect(result.current).toMatchObject({ run: 1, active: true });
        result.current.finish(1);
        rerender({ k: 'a' });
        expect(result.current).toMatchObject({ run: 1, active: false });
        rerender({ k: 'b' });
        expect(result.current).toMatchObject({ run: 2, active: true });
        result.current.finish(1); // stale run: ignored
        rerender({ k: 'b' });
        expect(result.current.active).toBe(true);
        rerender({ k: null }); // switching the animation off unclips immediately
        expect(result.current).toMatchObject({ run: 2, active: false });
    });
});

describe('line style helpers', () => {
    it('scales dash patterns by the line width', () => {
        expect(dashArrayFor('Dash', 2.5)).toBe('10 7.5');
        expect(dashArrayFor('Solid', 2.5)).toBeUndefined();
        expect(dashArrayFor('Dot', 1)).toBe('1 3');
    });

    it('formats axis numbers like the original defaults', () => {
        expect(defaultAxisNumber(40, 5)).toBe('40');
        expect(defaultAxisNumber(40000, 10000)).toBe('40k');
        expect(defaultAxisNumber(2500000, 500000)).toBe('2 500k');
        expect(defaultAxisNumber(2000000, 1000000)).toBe('2M');
        expect(defaultAxisNumber(12500, 500)).toBe('12 500');
    });
});
