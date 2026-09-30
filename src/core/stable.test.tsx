import { cleanup, render } from '@testing-library/react';
import { useMemo } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { buildRows, type ChartRow } from './data';
import { useContentStable, useStableCallback } from './stable';

afterEach(cleanup);

function RowsProbe({
    series,
    categories,
    onRows,
}: {
    series: { name: string; data: number[] }[];
    categories: string[];
    onRows: (rows: ChartRow[]) => void;
}) {
    const s = useContentStable(series);
    const c = useContentStable(categories);
    const rows = useMemo(() => buildRows(c, s), [c, s]);
    onRows(rows);
    return null;
}

describe('stable props', () => {
    it('keeps row identity across re-renders with equal-content new arrays', () => {
        const seen: ChartRow[][] = [];
        const make = () => ({ series: [{ name: 'A', data: [1, 2] }], categories: ['x', 'y'] });
        const { rerender } = render(<RowsProbe {...make()} onRows={(r) => seen.push(r)} />);
        rerender(<RowsProbe {...make()} onRows={(r) => seen.push(r)} />);
        rerender(<RowsProbe {...make()} onRows={(r) => seen.push(r)} />);
        expect(seen).toHaveLength(3);
        expect(seen[1]).toBe(seen[0]);
        expect(seen[2]).toBe(seen[0]);
        rerender(<RowsProbe series={[{ name: 'A', data: [1, 3] }]} categories={['x', 'y']} onRows={(r) => seen.push(r)} />);
        expect(seen[3]).not.toBe(seen[0]);
        expect(seen[3][1].s0).toBe(3);
    });

    it('useStableCallback keeps identity and calls the latest function', () => {
        const fns: Array<(v: number) => string> = [];
        function P({ suffix }: { suffix: string }) {
            fns.push(useStableCallback((v: number) => `${v}${suffix}`));
            return null;
        }
        const { rerender } = render(<P suffix="a" />);
        rerender(<P suffix="b" />);
        expect(fns[0]).toBe(fns[1]);
        expect(fns[0](1)).toBe('1b');
    });
});
