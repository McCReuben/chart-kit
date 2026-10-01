import { describe, expect, it } from 'vitest';

import { alignedScales } from './alignTicks';
import { seriesKind, seriesSide } from './DualAxisChart';

describe('alignedScales', () => {
    it('aligns ticks for revenue + conversion (~190px plot)', () => {
        const [left, right] = alignedScales(
            [
                { min: 39.4, max: 55.6 },
                { min: 2.7, max: 3.6 },
            ],
            190,
        );
        expect(left.ticks).toEqual([30, 40, 50, 60]);
        expect(right.ticks).toEqual([2.5, 3, 3.5, 4]);
    });

    it('includes zero for column axes and keeps equal tick counts', () => {
        const [left, right] = alignedScales(
            [
                { min: 41.5, max: 55.6, includeZero: true },
                { min: 2.7, max: 3.6 },
            ],
            190,
        );
        expect(left.ticks).toEqual([0, 20, 40, 60]);
        expect(right.ticks.length).toBe(left.ticks.length);
    });

    it('returns the same object for equal inputs', () => {
        const a = alignedScales([{ min: 1, max: 9 }, { min: 0, max: 0.5 }], 200);
        const b = alignedScales([{ min: 1, max: 9 }, { min: 0, max: 0.5 }], 200);
        expect(a[0]).toBe(b[0]);
        expect(a[1]).toBe(b[1]);
    });
});

describe('series option normalisation', () => {
    it('defaults to a left-axis spline', () => {
        expect(seriesSide({ name: 'a', data: [], axis: 'right' })).toBe('right');
        expect(seriesSide({ name: 'a', data: [] })).toBe('left');
        expect(seriesKind({ name: 'a', data: [], type: 'column' })).toBe('column');
        expect(seriesKind({ name: 'a', data: [] })).toBe('spline');
    });
});
