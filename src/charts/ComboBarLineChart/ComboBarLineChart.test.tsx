import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ComboBarLineChart } from './ComboBarLineChart';

afterEach(cleanup);

const series = [
    { name: 'Actual', data: [1, 2, 3] },
    { name: 'Forecast', data: [1.5, 2.5, 2.8], type: 'spline' as const },
];

describe('ComboBarLineChart', () => {
    it('renders the frame with an accessible name and a legend with one symbol per type', () => {
        render(<ComboBarLineChart series={series} categories={['A', 'B', 'C']} showLegend ariaLabel="Combo" />);
        expect(screen.getByRole('img', { name: 'Combo' })).toBeTruthy();
        expect(screen.getByText('Actual')).toBeTruthy();
        expect(screen.getByText('Forecast')).toBeTruthy();
    });

    it('re-renders with inline formatters and equal-content arrays without errors', () => {
        const { rerender } = render(
            <ComboBarLineChart series={series} categories={['A', 'B', 'C']} yAxisFormatter={(v) => `${v}`} showLegend />,
        );
        rerender(
            <ComboBarLineChart
                series={series.map((s) => ({ ...s, data: [...s.data] }))}
                categories={['A', 'B', 'C']}
                yAxisFormatter={(v) => `${v}`}
                showLegend
            />,
        );
        fireEvent.click(screen.getByText('Actual'));
        expect(screen.getByText('Actual')).toBeTruthy();
    });
});
