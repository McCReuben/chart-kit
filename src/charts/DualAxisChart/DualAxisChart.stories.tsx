import type { Meta, StoryObj } from '@storybook/react-vite';

import { WEEKS, conversionRate, revenueLastYear, revenueThisYear } from '../fixtures';
import { retailWeekFormatter } from '../../core';
import { DualAxisChart } from './DualAxisChart';
import type { DualAxisSeries } from './DualAxisChart';

const WEEK_LABELS = WEEKS.map((w: string) => w.replace('2026 ', ''));

const columnsAndRate: DualAxisSeries[] = [
    { name: 'Revenue ($M)', data: revenueThisYear, type: 'column', axis: 'left' },
    { name: 'Conversion (%)', data: conversionRate, type: 'spline', axis: 'right' },
];

const meta = {
    title: 'Charts/DualAxisChart',
    component: DualAxisChart,
    tags: ['autodocs'],
    args: {
        series: columnsAndRate,
        categories: WEEK_LABELS,
        height: 320,
    },
    argTypes: {
        xAxisLabelFormatter: { control: false },
        yAxisFormatter: { control: false },
        y2AxisFormatter: { control: false },
        tooltipValueFormatter: { control: false },
        tooltipHeaderFormatter: { control: false },
    },
} satisfies Meta<typeof DualAxisChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Columns on the left axis, a rate line on the right axis. */
export const Default: Story = {};

/** Two splines on the left (last year dashed, without markers) and a rate on the right. */
export const DashedSecondary: Story = {
    args: {
        series: [
            { name: 'Revenue ($M)', data: revenueThisYear, axis: 'left' },
            { name: 'Last year ($M)', data: revenueLastYear, axis: 'left', dashStyle: 'Dash' },
            { name: 'Conversion (%)', data: conversionRate, axis: 'right' },
        ],
        showLegend: true,
    },
};

/** Titles on both value axes, plus tick formatters. */
export const AxisTitles: Story = {
    args: {
        yAxisTitle: 'Revenue ($M)',
        y2AxisTitle: 'Conversion (%)',
        yAxisFormatter: (v: number) => `$${v}M`,
        y2AxisFormatter: (v: number) => `${v}%`,
    },
};

/** Legend below the chart: squares for columns, line-and-marker for splines, a dash for dashed lines. Click to toggle. */
export const WithLegend: Story = {
    args: {
        series: [
            { name: 'Revenue ($M)', data: revenueThisYear, type: 'column', axis: 'left' },
            { name: 'Last year ($M)', data: revenueLastYear, type: 'column', axis: 'left' },
            { name: 'Conversion (%)', data: conversionRate, axis: 'right' },
        ],
        yAxisTitle: 'Revenue ($M)',
        y2AxisTitle: 'Conversion (%)',
        showLegend: true,
    },
};

/** `yAxisVisible={false}` hides both axes' labels, titles and grid lines; the scaling stays. */
export const HiddenAxes: Story = {
    args: { yAxisVisible: false, yAxisTitle: 'Revenue ($M)', y2AxisTitle: 'Conversion (%)', showLegend: true },
};

/** Raw retail-week categories formatted with the opt-in `retailWeekFormatter(2026)`. */
export const RetailWeekLabels: Story = {
    args: { categories: WEEKS, xAxisLabelFormatter: retailWeekFormatter(2026), showLegend: true },
};

/** `backgroundColor="transparent"` lets the page show through. */
export const TransparentBackground: Story = {
    args: { backgroundColor: 'transparent', showLegend: true },
    decorators: [
        (Story) => (
            <div style={{ padding: 16, background: 'repeating-linear-gradient(45deg, #8882 0 10px, transparent 10px 20px)' }}>
                <Story />
            </div>
        ),
    ],
};

/** Shared tooltip shown statically (with a formatter per series), for screenshots. */
export const StaticTooltip: Story = {
    args: {
        showLegend: true,
        defaultTooltipIndex: 6,
        tooltipValueFormatter: (v: number | null, s: DualAxisSeries) =>
            v === null ? '—' : s.axis === 'right' ? `${v.toFixed(1)}%` : `$${v.toFixed(1)}M`,
    },
};
