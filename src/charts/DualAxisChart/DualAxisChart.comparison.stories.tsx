import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentType, ReactNode } from 'react';

import { WEEKS, conversionRate, revenueLastYear, revenueThisYear } from '../fixtures';
import { retailWeekFormatter } from '../../core';
import { useChartTheme } from '../../theme';
import OriginalDualAxisChartJs from '../../originals/charts/DualAxisChart/DualAxisChart';
import { DualAxisChart } from './DualAxisChart';
import type { DualAxisSeries } from './DualAxisChart';

// The original is untyped JSX; its inferred prop types (defaults of null) are too narrow.
const OriginalDualAxisChart = OriginalDualAxisChartJs as unknown as ComponentType<Record<string, unknown>>;

// Generic, non-client colours (D8), passed to both so the two render identically.
const BLUE = '#2F6FDB';
const AMBER = '#E09A1A';
const GREY = '#8A94A6';

function Panel({ label, children }: { label: string; children: ReactNode }) {
    const theme = useChartTheme();
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ font: `600 12px ${theme.fontFamily}`, color: theme.text.secondary, margin: '0 0 4px' }}>{label}</div>
            {children}
        </div>
    );
}

interface CompareProps {
    series: DualAxisSeries[];
    yAxisTitle?: string;
    y2AxisTitle?: string;
    showLegend?: boolean;
}

function Compare({ series, yAxisTitle, y2AxisTitle, showLegend }: CompareProps) {
    // The original takes the numeric `axis` and `seriesType`; the rebuild still accepts both.
    const originalSeries = series.map((s) => ({
        ...s,
        axis: s.axis === 'right' || s.axis === 1 ? 1 : 0,
        seriesType: s.type === 'column' ? 'column' : 'line',
    }));
    return (
        <div>
            <Panel label="Original (Highcharts)">
                <OriginalDualAxisChart
                    series={originalSeries}
                    categories={WEEKS}
                    weekYear={2026}
                    yAxisTitle={yAxisTitle}
                    y2AxisTitle={y2AxisTitle}
                    showLegend={showLegend}
                />
            </Panel>
            <Panel label="Rebuild (Recharts)">
                <DualAxisChart
                    series={series}
                    categories={WEEKS}
                    xAxisLabelFormatter={retailWeekFormatter(2026)}
                    yAxisTitle={yAxisTitle}
                    y2AxisTitle={y2AxisTitle}
                    showLegend={showLegend}
                />
            </Panel>
        </div>
    );
}

const meta = {
    title: 'Comparison/DualAxisChart',
    component: Compare,
} satisfies Meta<typeof Compare>;

export default meta;
type Story = StoryObj<typeof meta>;

const columnAndRate: DualAxisSeries[] = [
    { name: 'Revenue ($M)', data: revenueThisYear, color: BLUE, type: 'column', axis: 'left' },
    { name: 'Conversion (%)', data: conversionRate, color: AMBER, axis: 'right' },
];

/** Columns left, rate spline right, no legend or titles. */
export const Default: Story = { args: { series: columnAndRate } };

/** Two splines (one dashed) left, a rate right, with legend and titles (the original's TwoLines story). */
export const WithLegend: Story = {
    args: {
        series: [
            { name: 'Revenue ($M)', data: revenueThisYear, color: BLUE, axis: 'left' },
            { name: 'Last year ($M)', data: revenueLastYear, color: GREY, axis: 'left', dashStyle: 'Dash' },
            { name: 'Conversion (%)', data: conversionRate, color: AMBER, axis: 'right' },
        ],
        yAxisTitle: 'Revenue ($M)',
        y2AxisTitle: 'Conversion (%)',
        showLegend: true,
    },
};

/** Columns and rate with both axis titles and the legend (the original's ColumnAndLine story). */
export const AxisTitles: Story = {
    args: { series: columnAndRate, yAxisTitle: 'Revenue ($M)', y2AxisTitle: 'Conversion (%)', showLegend: true },
};
