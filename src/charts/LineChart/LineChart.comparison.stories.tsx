import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps, ComponentType } from 'react';

import OriginalLineChartJsx from '../../originals/charts/LineChart/LineChart';
import { LIGHT_PALETTE, useChartTheme } from '../../theme';
import { WEEKS, revenueForecast, revenueLastYear, revenueThisYear } from '../fixtures';
import { LineChart, type LineChartSeries } from './LineChart';

/** The JSX original has no prop types (its optional props are inferred as required). */
const OriginalLineChart = OriginalLineChartJsx as unknown as ComponentType<Record<string, unknown>>;

/** Generic colours for both sides (the original needs explicit colours). */
const series: LineChartSeries[] = [
    { name: 'This year', data: revenueThisYear, color: LIGHT_PALETTE[0] },
    { name: 'Last year', data: revenueLastYear, color: LIGHT_PALETTE[1] },
    { name: 'Forecast', data: revenueForecast, color: LIGHT_PALETTE[2], dashStyle: 'Dash' },
];

const yAxisFormatter = (v: number) => `$${v}M`;
const tooltipValueFormatter = (v: number | null) => (v === null ? '—' : `$${v.toFixed(1)}M`);

const label = { fontSize: 12, fontWeight: 700, margin: '8px 0' } as const;

function Pair(props: Partial<ComponentProps<typeof LineChart>>) {
    const common = { series, categories: WEEKS, yAxisFormatter, tooltipValueFormatter, ...props };
    const theme = useChartTheme();
    const labelStyle = { ...label, color: theme.text.primary };
    return (
        <div>
            <div style={labelStyle}>Original (Highcharts)</div>
            <OriginalLineChart {...common} />
            <div style={labelStyle}>Rebuild (Recharts)</div>
            <LineChart {...common} />
        </div>
    );
}

const meta = {
    title: 'Comparison/LineChart',
    component: Pair,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Pair>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLegend: Story = { args: { showLegend: true } };

export const AxisTitlesAndGap: Story = {
    args: {
        showLegend: true,
        yAxisTitle: 'Revenue ($M)',
        series: [
            { ...series[0], data: revenueThisYear.map((v, i) => (i === 5 || i === 6 ? null : v)) },
            series[2],
        ],
    },
};
