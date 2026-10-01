import { describe, expect, it } from 'vitest';

import { buildRows, paletteColor, resolveSeries, seriesExtent, seriesKey } from './data';
import { niceScale, normalizeTickInterval } from './niceScale';

const series = [
    { name: 'A', data: [1, null, 3] },
    { name: 'A', data: [4, 5], color: '#123456' },
];

describe('data helpers', () => {
    it('keys series safely and resolves colours', () => {
        const r = resolveSeries(series, ['#aaa', '#bbb']);
        expect(r.map((s) => s.key)).toEqual(['s0', 's1']);
        expect(r[0].color).toBe('#aaa');
        expect(r[1].color).toBe('#123456');
        expect(r[1].input).toBe(series[1]);
        expect(seriesKey(3)).toBe('s3');
        expect(paletteColor(['#1', '#2'], 3)).toBe('#2');
    });
    it('builds rows aligned to categories, with null gaps', () => {
        const rows = buildRows(['x', 'y', 'x'], series);
        expect(rows).toEqual([
            { index: 0, category: 'x', s0: 1, s1: 4 },
            { index: 1, category: 'y', s0: null, s1: 5 },
            { index: 2, category: 'x', s0: 3, s1: null },
        ]);
        expect(buildRows(['a'], [{ data: [NaN] }])[0].s0).toBeNull();
    });
    it('computes extents', () => {
        const rows = buildRows(['x', 'y', 'z'], [
            { data: [1, -2, 3] },
            { data: [4, 5, -6] },
        ]);
        expect(seriesExtent(rows, ['s0', 's1'])).toEqual([-6, 5]);
        expect(seriesExtent(rows, ['s0'])).toEqual([-2, 3]);
        expect(seriesExtent(rows, ['s0', 's1'], { stacked: true })).toEqual([-6, 5]);
        expect(seriesExtent(rows, [])).toBeNull();
    });
});

describe('niceScale', () => {
    it('normalises intervals to 1/2/2.5/5 × 10^n', () => {
        expect(normalizeTickInterval(6.14)).toBe(5);
        expect(normalizeTickInterval(0.3)).toBe(0.25);
        expect(normalizeTickInterval(1400)).toBe(1000);
        expect(normalizeTickInterval(1600)).toBe(2000);
    });
    it('gives 35..60 step 5 for revenue data on a short axis', () => {
        const s = niceScale(39.4, 55.6, { pixelLength: 190 });
        expect(s.ticks).toEqual([35, 40, 45, 50, 55, 60]);
        expect(s.domain).toEqual([35, 60]);
    });
    it('includes zero for bars', () => {
        const s = niceScale(9.7, 22.6, { includeZero: true, tickCount: 4 });
        expect(s.min).toBe(0);
        expect(s.ticks[s.ticks.length - 1]).toBeGreaterThanOrEqual(22.6);
    });
    it('handles flat and decimal data', () => {
        expect(niceScale(0, 0).ticks.length).toBeGreaterThan(1);
        const s = niceScale(0.1, 0.3);
        expect(s.ticks.every((t) => Number(t.toPrecision(12)) === t)).toBe(true);
    });
});
