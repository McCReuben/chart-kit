import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { ChartRow } from '../../core';
import { BarChart } from './BarChart';
import {
    barGaps,
    cleanNumber,
    dataLabelText,
    isQuarterAxis,
    stackEnd,
    stackPercentage,
    stackTotal,
    tooltipAwayFromCursor,
    topOfStack,
} from './barLayout';

afterEach(cleanup);

const row: ChartRow = { index: 0, category: 'A', s0: 12, s1: 29, s2: 1, s3: null };
const keys = ['s0', 's1', 's2', 's3'];

describe('barGaps', () => {
    it('converts group and point paddings to Recharts gaps', () => {
        // 3 series, groupPadding 0.2, pointPadding 0.1: slot = 0.2 of the band.
        expect(barGaps('grouped', 3)).toEqual({ barCategoryGap: '22%', barGap: '4%', maxBarSize: undefined });
        expect(barGaps('stacked', 3)).toEqual({ barCategoryGap: '7.76%', barGap: '3.52%', maxBarSize: 48 });
        expect(barGaps('horizontal', 0).barCategoryGap).toBe('26%');
    });
});

describe('stack helpers', () => {
    it('computes totals, shares, segment ends and the top segment', () => {
        expect(stackTotal(row, keys)).toBe(42);
        expect(stackPercentage(row, keys, 's2')).toBeCloseTo(2.38, 2);
        expect(stackEnd(row, keys, 's1')).toBe(41);
        expect(topOfStack(row, keys)).toBe('s2');
        const mixed: ChartRow = { index: 0, category: 'B', s0: 5, s1: -3, s2: 4 };
        expect(stackTotal(mixed, ['s0', 's1', 's2'], -1)).toBe(-3);
        expect(stackEnd(mixed, ['s0', 's1', 's2'], 's2')).toBe(9);
    });

    it('hides null, zero and (stacked) under-4% labels', () => {
        const f = (v: number) => v.toFixed(0);
        expect(dataLabelText(row, 's0', keys, f)).toBe('12');
        expect(dataLabelText(row, 's2', keys, f)).toBe('');
        expect(dataLabelText(row, 's2', null, f)).toBe('1');
        expect(dataLabelText(row, 's3', null, f)).toBe('');
        expect(dataLabelText({ ...row, s0: 0 }, 's0', null, f)).toBe('');
    });

    it('cleans float noise', () => {
        expect(cleanNumber(0.1 + 0.2)).toBe('0.3');
    });
});

describe('tooltipAwayFromCursor', () => {
    const base = { width: 100, height: 60, chartWidth: 500, chartHeight: 300 };
    it('places the box right of the anchor, centred vertically', () => {
        expect(tooltipAwayFromCursor({ ...base, anchorX: 100, anchorY: 150 })).toEqual({ x: 128, y: 120 });
    });
    it('flips left near the right edge and clamps inside the chart', () => {
        expect(tooltipAwayFromCursor({ ...base, anchorX: 400, anchorY: 10 })).toEqual({ x: 272, y: 8 });
        expect(tooltipAwayFromCursor({ ...base, anchorX: 400, anchorY: 295 })).toEqual({ x: 272, y: 232 });
    });
});

describe('isQuarterAxis', () => {
    it('detects quarter labels', () => {
        expect(isQuarterAxis(['2026 Q1'])).toBe(true);
        expect(isQuarterAxis(['2026 RW01'])).toBe(false);
    });
});

describe('BarChart', () => {
    it('renders in every mode without errors', () => {
        for (const mode of ['grouped', 'stacked', 'horizontal'] as const) {
            const { container } = render(
                <BarChart
                    mode={mode}
                    categories={['A', 'B']}
                    series={[{ name: 'One', data: [1, 2] }]}
                    showLegend
                    showDataLabels
                    showStackTotals
                />,
            );
            expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Bar chart');
            expect(container.textContent).toContain('One');
            cleanup();
        }
    });

    it('renders nothing breaking with empty series', () => {
        const { container } = render(<BarChart categories={[]} series={[]} />);
        expect(container.firstChild).not.toBeNull();
    });
});
