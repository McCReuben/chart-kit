import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ChartSegment } from './ChartSegment';
import { clampHeight, deriveCategories, hasChartSegment, planChartSegment, type ChartSpec } from './chartSegmentSpec';

afterEach(cleanup);

const rows = [
    { category: 'Jan', a: 1, b: 2 },
    { category: 'Feb', a: 3 },
];

describe('planChartSegment', () => {
    it('returns null for non-objects, unknown types and specs without series', () => {
        expect(planChartSegment(null)).toBeNull();
        expect(planChartSegment('line')).toBeNull();
        expect(planChartSegment({ type: 'pie', data: rows, series: [{ key: 'a' }] })).toBeNull();
        expect(planChartSegment({ type: 'line', data: rows, series: [] })).toBeNull();
        expect(planChartSegment({ type: 'line', data: rows })).toBeNull();
    });

    it('maps types, fills missing values with null and keeps colours optional', () => {
        const plan = planChartSegment({ type: 'stacked-bar', data: rows, series: [{ key: 'a', label: 'A' }, { key: 'b', color: '#123456' }] });
        expect(plan?.kind).toBe('bar');
        expect(plan?.barMode).toBe('stacked');
        expect(plan?.series[0]).toMatchObject({ name: 'A', data: [1, 3] });
        expect(plan?.series[0].color).toBeUndefined();
        expect(plan?.series[1]).toMatchObject({ name: 'b', data: [2, null], color: '#123456' });
    });

    it('shows the legend only for more than one series', () => {
        expect(planChartSegment({ type: 'line', data: rows, series: [{ key: 'a' }] })?.showLegend).toBe(false);
        expect(planChartSegment({ type: 'line', data: rows, series: [{ key: 'a' }, { key: 'b' }] })?.showLegend).toBe(true);
    });

    it('maps dual-axis axis and seriesType', () => {
        const plan = planChartSegment({
            type: 'dual-axis',
            data: rows,
            series: [{ key: 'a', seriesType: 'bar' }, { key: 'b', axis: 'right' }],
        });
        expect(plan?.series.map((s) => [s.axis, s.seriesType])).toEqual([
            ['left', 'column'],
            ['right', 'line'],
        ]);
    });
});

describe('deriveCategories', () => {
    it('uses x, then data[].category, then 1..n', () => {
        expect(deriveCategories({ x: ['Q1', 'Q2'], data: rows })).toEqual(['Q1', 'Q2']);
        expect(deriveCategories({ data: rows })).toEqual(['Jan', 'Feb']);
        expect(deriveCategories({ data: [{ category: 'Jan', a: 1 }, { a: 2 }] })).toEqual(['1', '2']);
        expect(deriveCategories({ data: [] })).toEqual([]);
    });
});

describe('clampHeight', () => {
    it('defaults to 260 and clamps to 170-500', () => {
        expect(clampHeight(undefined)).toBe(260);
        expect(clampHeight(100)).toBe(170);
        expect(clampHeight(900)).toBe(500);
        expect(clampHeight(320)).toBe(320);
        expect(clampHeight('abc')).toBe(170);
    });
});

describe('hasChartSegment', () => {
    it('detects chart segments', () => {
        expect(hasChartSegment(null)).toBe(false);
        expect(hasChartSegment({})).toBe(false);
        expect(hasChartSegment({ segments: [{ type: 'html' }] })).toBe(false);
        expect(hasChartSegment({ segments: [null, { type: 'html' }, { type: 'chart' }] })).toBe(true);
    });
});

describe('ChartSegment', () => {
    it('renders nothing for an invalid spec', () => {
        const { container } = render(<ChartSegment spec={{ type: 'pie' } as unknown as ChartSpec} />);
        expect(container.innerHTML).toBe('');
    });

    it('renders the title in a card', () => {
        const { getByText } = render(
            <ChartSegment spec={{ type: 'line', data: rows, series: [{ key: 'a' }], layout: { title: 'Hello' } }} />,
        );
        expect(getByText('Hello')).toBeTruthy();
    });
});
