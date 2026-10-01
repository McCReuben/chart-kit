import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { darkTheme, lightTheme } from '../../theme';

import { WaterfallChart } from './WaterfallChart';
import { resolveWaterfallColor, toWaterfallRows } from './waterfallRows';

afterEach(cleanup);

describe('toWaterfallRows', () => {
    const rows = toWaterfallRows(
        { name: 'Start', value: 10 },
        [
            { name: 'Up', value: 5, subLabel: '+5', pillar: true },
            { name: 'Down', value: -8 },
        ],
        { name: 'End' },
    );

    it('builds totals on zero and floating steps', () => {
        expect(rows).toEqual([
            { name: 'Start', offset: 0, delta: 10, value: 10, kind: 'total' },
            { name: 'Up', offset: 10, delta: 5, value: 5, kind: 'increase', subLabel: '+5', pillar: true },
            { name: 'Down', offset: 7, delta: 8, value: -8, kind: 'decrease' },
            { name: 'End', offset: 0, delta: 7, value: 7, kind: 'total' },
        ]);
    });

    it('handles steps crossing zero and negative totals', () => {
        const r = toWaterfallRows({ name: 'A', value: 4 }, [{ name: 'B', value: -7 }], { name: 'C' });
        expect(r[1]).toMatchObject({ offset: -3, delta: 7, value: -7 });
        expect(r[2]).toMatchObject({ offset: -3, delta: 3, value: -3, kind: 'total' });
    });

    it('uses an explicit end value, fixed colours and treats non-finite values as 0', () => {
        const r = toWaterfallRows(
            { name: 'A', value: 1, color: '#111' },
            [
                { name: 'B', value: Number.NaN },
                { name: 'C', value: -1 },
            ],
            { name: 'D', value: 9 },
            { colors: { total: '#000', increase: '#0f0', decrease: '#f00' } },
        );
        expect(r.map((x) => x.color)).toEqual(['#111', '#0f0', '#f00', '#000']);
        expect(r[1]).toMatchObject({ delta: 0, value: 0 });
        expect(r[3]).toMatchObject({ value: 9, delta: 9 });
    });

    it('resolves colours from the theme', () => {
        expect(rows.map((r) => resolveWaterfallColor(r, darkTheme))).toEqual([
            darkTheme.palette[0],
            darkTheme.positive,
            darkTheme.negative,
            darkTheme.palette[0],
        ]);
        expect(resolveWaterfallColor({ name: 'x', offset: 0, delta: 1, value: 1 }, lightTheme, '#abc')).toBe('#abc');
    });
});

describe('WaterfallChart', () => {
    it('renders with an accessible name', () => {
        const rows = toWaterfallRows({ name: 'A', value: 3 }, [{ name: 'B', value: 1 }], { name: 'C' });
        const { getByRole } = render(<WaterfallChart data={rows} ariaLabel="Bridge" />);
        expect(getByRole('img').getAttribute('aria-label')).toBe('Bridge');
    });
});
