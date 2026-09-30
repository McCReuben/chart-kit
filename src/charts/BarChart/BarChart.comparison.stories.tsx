import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentType, ReactNode } from 'react';

import { CHANNELS, QUARTERS, WEEKS, newBuyers, returningBuyers } from '../fixtures';
import { retailWeekFormatter } from '../../core';
import { useChartTheme } from '../../theme';
import OriginalBarChartJs from '../../originals/charts/BarChart/BarChart';
import { BarChart, type BarChartProps } from './BarChart';

// The original is untyped JSX; its inferred prop types (defaults of null) are too narrow.
const OriginalBarChart = OriginalBarChartJs as unknown as ComponentType<Record<string, unknown>>;

function Panel({ label, children }: { label: string; children: ReactNode }) {
    const theme = useChartTheme();
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ font: `600 12px ${theme.fontFamily}`, color: theme.text.secondary, margin: '0 0 4px' }}>{label}</div>
            {children}
        </div>
    );
}

type CompareProps = Omit<BarChartProps, 'series'> & { series: Array<{ name: string; data: number[] }>; retailWeeks?: boolean };

/** Renders the original and the rebuild with the same data; colours come from the generic theme palette (D8). */
function Compare({ series, retailWeeks, ...props }: CompareProps) {
    const theme = useChartTheme();
    const colored = series.map((s, i) => ({ ...s, color: theme.palette[i % theme.palette.length] }));
    return (
        <div>
            <Panel label="Original (Highcharts)">
                <OriginalBarChart {...props} series={colored} weekYear={retailWeeks ? 2026 : null} />
            </Panel>
            <Panel label="Rebuild (Recharts)">
                <BarChart
                    {...props}
                    series={colored}
                    xAxisLabelFormatter={retailWeeks ? retailWeekFormatter(2026) : undefined}
                />
            </Panel>
        </div>
    );
}

const meta = {
    title: 'Comparison/BarChart',
    component: Compare,
} satisfies Meta<typeof Compare>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Grouped: Story = {
    args: {
        mode: 'grouped',
        categories: QUARTERS,
        series: [
            { name: 'North', data: [18.2, 21.4, 19.8, 22.6] },
            { name: 'South', data: [14.1, 15.9, 16.3, 17.2] },
            { name: 'West', data: [9.7, 11.2, 10.8, 12.5] },
        ],
        showLegend: true,
        yAxisFormatter: (v: number) => `$${v}M`,
        tooltipValueFormatter: (v: number | null) => (v === null ? '—' : `$${v.toFixed(1)}M`),
    },
};

export const StackedWithTotalsAndLabels: Story = {
    args: {
        mode: 'stacked',
        categories: WEEKS,
        retailWeeks: true,
        series: [
            { name: 'New', data: newBuyers },
            { name: 'Returning', data: returningBuyers },
        ],
        showLegend: true,
        showStackTotals: true,
        showDataLabels: true,
        yAxisFormatter: (v: number) => `${Math.round(v)}K`,
        dataLabelFormatter: (v: number) => v.toFixed(0),
    },
};

export const Horizontal: Story = {
    args: {
        mode: 'horizontal',
        categories: CHANNELS,
        height: 380,
        series: [
            { name: 'Spend', data: [48, 31, 12, 22, 9, 4] },
            { name: 'Return', data: [132, 64, 41, 29, 23, 18] },
        ],
        showLegend: true,
        showDataLabels: true,
        dataLabelFormatter: (v: number) => `$${v}K`,
        yAxisFormatter: (v: number) => `$${v}K`,
        tooltipValueFormatter: (v: number | null) => `$${v}K`,
    },
};
