import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';

import { retailWeekFormatter } from '../../core';
import { WEEKS, revenueForecast, revenueLastYear, revenueThisYear } from '../fixtures';
import { LineChart, type LineChartSeries } from './LineChart';

const series: LineChartSeries[] = [
    { name: 'This year', data: revenueThisYear },
    { name: 'Last year', data: revenueLastYear },
    { name: 'Forecast', data: revenueForecast, dashStyle: 'Dash' },
];

const money = (v: number) => `$${v}M`;
const moneyTooltip = (v: number | null) => (v === null ? '—' : `$${v.toFixed(1)}M`);

const meta = {
    title: 'Charts/LineChart',
    component: LineChart,
    tags: ['autodocs'],
    args: {
        series,
        categories: WEEKS,
        height: 320,
        yAxisFormatter: money,
        tooltipValueFormatter: moneyTooltip,
    },
    argTypes: {
        yAxisFormatter: { control: false },
        tooltipValueFormatter: { control: false },
        tooltipHeaderFormatter: { control: false },
        xAxisLabelFormatter: { control: false },
    },
} satisfies Meta<typeof LineChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLegend: Story = {
    args: { showLegend: true },
};

/** Categories are bare week numbers; `retailWeekFormatter(2026)` turns them into `2026 RW05` labels and headers. */
export const RetailWeekLabels: Story = {
    args: {
        categories: WEEKS.map((_, i) => `W${i + 1}`),
        xAxisLabelFormatter: retailWeekFormatter(2026),
        showLegend: true,
    },
};

/** Actuals stop at week 8 (nulls) and a dashed forecast continues; a missing week leaves a gap. */
export const DashedForecast: Story = {
    args: {
        showLegend: true,
        series: [
            { name: 'Actual', data: revenueThisYear.map((v, i) => (i === 3 || i > 7 ? null : v)) },
            { name: 'Forecast', data: revenueForecast.map((v, i) => (i < 7 ? null : v)), dashStyle: 'Dash' },
            { name: 'Plan', data: revenueLastYear, dashStyle: 'ShortDot', lineWidth: 1.5 },
        ],
        defaultTooltipIndex: 7,
    },
};

export const HiddenYAxis: Story = {
    args: { yAxisVisible: false, series: [series[0]] },
};

export const AxisTitles: Story = {
    args: {
        categories: WEEKS.map((_, i) => `Week ${i + 1}`),
        xAxisLabelFormatter: (v: string | number) => String(v).replace('Week ', 'W'),
        yAxisTitle: 'Revenue ($M)',
        xAxisTitle: 'Retail week',
        xAxisTickPositions: [0, 3, 6, 9, 11],
        showLegend: true,
    },
};

/** Drag across the plot to zoom into a range of weeks; "Reset zoom" shows everything again. Starts zoomed here. */
export const Zoomed: Story = {
    args: { showLegend: true, initialZoom: { start: 3, end: 8 } },
};

/** The tooltip rendered statically at week 6 (screenshots cannot hover). */
export const StaticTooltip: Story = {
    args: { showLegend: true, defaultTooltipIndex: 5 },
};

/** Custom crosshair: 2px solid line in the accent colour. */
export const CustomCrosshair: Story = {
    args: { xAxisCrosshair: { width: 2, color: '#0968F6' }, defaultTooltipIndex: 7 },
};

function SweepDemo(args: Story['args']) {
    const [key, setKey] = useState(0);
    return (
        <div>
            <button type="button" onClick={() => setKey((k) => k + 1)} style={{ marginBottom: 8 }}>
                Replay sweep (animateKey = {key + 1})
            </button>
            <LineChart {...(args as ComponentProps<typeof LineChart>)} animateKey={key} />
        </div>
    );
}

/** The lines sweep in from left to right on mount and every time `animateKey` changes. */
export const SweepAnimation: Story = {
    args: { showLegend: true },
    render: (args) => <SweepDemo {...args} />,
};

/** Hover a point: a dot runs along the nearest line to it, then pulses. */
export const HoverTrail: Story = {
    args: { hoverTrail: true, series: [series[0], series[1]], showLegend: true },
};

export const TransparentBackground: Story = {
    args: { backgroundColor: 'transparent', showLegend: true },
    decorators: [
        (Story) => (
            <div style={{ background: 'repeating-linear-gradient(45deg, #8882 0 10px, transparent 10px 20px)' }}>
                <Story />
            </div>
        ),
    ],
};
