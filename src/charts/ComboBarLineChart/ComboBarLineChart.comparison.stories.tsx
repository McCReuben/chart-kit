import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentType, ReactNode } from 'react';

import ComboBarLineChartOriginalJs from '../../originals/charts/ComboBarLineChart/ComboBarLineChart';
import { WEEKS, revenueForecast, revenueThisYear } from '../fixtures';
import { ComboBarLineChart } from './ComboBarLineChart';
import type { ComboBarLineChartProps, ComboSeries } from './ComboBarLineChart';

// The original is untyped JSX; its inferred prop types (defaults of null) are too narrow.
const ComboBarLineChartOriginal = ComboBarLineChartOriginalJs as unknown as ComponentType<Record<string, unknown>>;

const COLORS = { blue: '#2B6CB0', amber: '#D69E2E' };

const series: ComboSeries[] = [
    { name: 'Actual', data: revenueThisYear, color: COLORS.blue, type: 'column' },
    { name: 'Forecast', data: revenueForecast, color: COLORS.amber, type: 'spline' },
];

const common = {
    series,
    categories: WEEKS,
    height: 360,
    yAxisFormatter: (v: number) => `$${v}M`,
};

function Label({ children }: { children: ReactNode }) {
    return <div style={{ font: '600 12px sans-serif', margin: '12px 0 4px', color: '#888888' }}>{children}</div>;
}

function Pair(props: Partial<ComboBarLineChartProps>) {
    const merged = { ...common, ...props };
    return (
        <div>
            <Label>Original (Highcharts)</Label>
            <ComboBarLineChartOriginal
                {...merged}
                tooltipValueFormatter={(v: number) => `$${v.toFixed(1)}M`}
            />
            <Label>Rebuild (Recharts)</Label>
            <ComboBarLineChart
                {...merged}
                tooltipValueFormatter={(v) => (v === null ? '—' : `$${v.toFixed(1)}M`)}
            />
        </div>
    );
}

const meta = {
    title: 'Comparison/ComboBarLineChart',
    component: Pair,
} satisfies Meta<typeof Pair>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithLegend: Story = { args: { showLegend: true } };
export const FixedAxis: Story = {
    args: { showLegend: true, yAxisMin: 30, yAxisMax: 60, yAxisTickPositions: [30, 40, 50, 60], yAxisTitle: 'Revenue ($M)' },
};
