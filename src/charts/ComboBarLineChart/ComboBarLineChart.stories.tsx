import type { Meta, StoryObj } from '@storybook/react-vite';

import { retailWeekFormatter } from '../../core';
import { WEEKS, revenueForecast, revenueThisYear, revenueLastYear } from '../fixtures';
import { ComboBarLineChart } from './ComboBarLineChart';
import type { ComboSeries } from './ComboBarLineChart';

const WEEK_LABELS = WEEKS.map((w: string) => w.split(' ')[1]);

const series: ComboSeries[] = [
    { name: 'Actual', data: revenueThisYear, type: 'column' },
    { name: 'Forecast', data: revenueForecast, type: 'spline' },
];

const meta = {
    title: 'Charts/ComboBarLineChart',
    component: ComboBarLineChart,
    tags: ['autodocs'],
    args: {
        series,
        categories: WEEKS,
        height: 360,
        yAxisFormatter: (v: number) => `$${v}M`,
        tooltipValueFormatter: (v: number | null) => (v === null ? '—' : `$${v.toFixed(1)}M`),
    },
    argTypes: {
        yAxisFormatter: { control: false },
        tooltipValueFormatter: { control: false },
        xAxisLabelFormatter: { control: false },
        tooltipHeaderFormatter: { control: false },
    },
} satisfies Meta<typeof ComboBarLineChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Columns with a spline overlay. Drag across the plot to zoom; "Reset zoom" restores the full range. */
export const Default: Story = {};

/** Legend below the plot: squares for columns, lines for splines. Click toggles, hover fades the other lines. */
export const WithLegend: Story = { args: { showLegend: true } };

/** Fixed axis with explicit ticks (`yAxisMin`, `yAxisMax`, `yAxisTickPositions`). */
export const FixedAxis: Story = {
    args: { showLegend: true, yAxisMin: 30, yAxisMax: 60, yAxisTickPositions: [30, 40, 50, 60], yAxisTitle: 'Revenue ($M)' },
};

/** X and y axis titles. */
export const AxisTitles: Story = { args: { xAxisTitle: 'Retail week', yAxisTitle: 'Revenue ($M)' } };

/** Two column series and two splines. */
export const MultipleSeries: Story = {
    args: {
        showLegend: true,
        series: [
            { name: 'This year', data: revenueThisYear },
            { name: 'Last year', data: revenueLastYear },
            { name: 'Forecast', data: revenueForecast, type: 'spline' },
            { name: 'Plan', data: revenueForecast.map((v: number) => v + 3), type: 'spline' },
        ],
    },
};

/** Retail-week labels (`xAxisLabelFormatter={retailWeekFormatter(2026)}`); the tooltip header follows. */
export const RetailWeekLabels: Story = {
    args: { categories: WEEK_LABELS, xAxisLabelFormatter: retailWeekFormatter(2026), showLegend: true },
};

/** `backgroundColor="transparent"` shows the page behind the chart. */
export const TransparentBackground: Story = {
    args: { backgroundColor: 'transparent', showLegend: true },
    decorators: [
        (Story) => (
            <div style={{ padding: 16, background: 'repeating-linear-gradient(45deg, #8881 0 10px, #8883 10px 20px)' }}>
                <Story />
            </div>
        ),
    ],
};

/** Tooltip pinned at a category (`defaultTooltipIndex`), with the hover marker on the spline. */
export const StaticTooltip: Story = { args: { showLegend: true, defaultTooltipIndex: 5 } };
