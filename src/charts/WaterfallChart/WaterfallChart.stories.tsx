import type { Meta, StoryObj } from '@storybook/react-vite';

import { TooltipFrame, TooltipRow, TooltipTitle } from '../../core';

import { WaterfallChart } from './WaterfallChart';
import { type WaterfallRow, toWaterfallRows } from './waterfallRows';

/** Invented bridge from last year's revenue to this year's. */
const bridge = toWaterfallRows(
    { name: 'Last year', value: 80 },
    [
        { name: 'New customers', value: 14.2, subLabel: '+14.2 pts', pillar: true },
        { name: 'Pricing', value: -3.6, subLabel: '-3.6 pts', pillar: true },
        { name: 'Promotions', value: 6.4, subLabel: '+6.4 pts', pillar: true },
        { name: 'Returns', value: -5.1, subLabel: '-5.1 pts' },
        { name: 'Other', value: 1.1, subLabel: '+1.1 pts' },
    ],
    { name: 'This year' },
);

/** Invented bridge that dips below zero. */
const negative = toWaterfallRows(
    { name: 'Opening', value: 6 },
    [
        { name: 'Write-off', value: -11 },
        { name: 'Recovery', value: 3 },
        { name: 'Fees', value: -2 },
    ],
    { name: 'Closing' },
);

const labelFormatter = (d: WaterfallRow) => {
    const text = d.value.toFixed(1);
    return d.value > 0 && d.kind !== 'total' ? `+${text}` : text;
};

const meta = {
    title: 'Charts/WaterfallChart',
    component: WaterfallChart,
    tags: ['autodocs'],
    args: {
        data: bridge,
        barSize: 64,
        height: 450,
        yAxisFormatter: (v: number) => v.toFixed(1),
        formatBarLabel: labelFormatter,
    },
    argTypes: {
        yAxisFormatter: { control: false },
        formatBarLabel: { control: false },
        renderBarLabel: { control: false },
        renderXTick: { control: false },
        renderTooltip: { control: false },
        tooltipValueFormatter: { control: false },
        tooltipHeaderFormatter: { control: false },
        xAxisLabelFormatter: { control: false },
    },
} satisfies Meta<typeof WaterfallChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithYAxisAndTooltip: Story = {
    args: { showYAxis: true, showDefaultTooltip: true },
};

/** Static tooltip on the "Pricing" bar (screenshots cannot hover). */
export const StaticTooltip: Story = {
    args: { showYAxis: true, showDefaultTooltip: true, defaultTooltipIndex: 2 },
};

/** Custom tooltip content built from the core tooltip parts. */
export const CustomTooltip: Story = {
    args: {
        defaultTooltipIndex: 1,
        renderTooltip: (row) => (
            <TooltipFrame variant="inverse">
                <TooltipTitle>{row.name}</TooltipTitle>
                <TooltipRow label={row.kind === 'total' ? 'Total' : 'Change'} value={row.value.toFixed(1)} />
            </TooltipFrame>
        ),
    },
};

/** `showYoY` adds a "YoY" line under the labels of rows marked `pillar`. */
export const YoY: Story = {
    args: { showYoY: true },
};

/** `formatBarLabel` for the text; `renderBarLabel` for a fully custom element (here a pill in the bar colour). */
export const CustomLabels: Story = {
    args: {
        renderBarLabel: ({ x, y, width, height, row, color, theme }) => {
            const top = Math.min(y, y + height) - 24;
            return (
                <g>
                    <rect x={x + width / 2 - 22} y={top} width={44} height={18} rx={9} fill={color} />
                    <text
                        x={x + width / 2}
                        y={top + 13}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize={theme.fontSize.dataLabel}
                        fontFamily={theme.fontFamily}
                        fontWeight={700}
                    >
                        {row.value.toFixed(1)}
                    </text>
                </g>
            );
        },
    },
};

/** `renderXTick` replaces the multi-line default tick. */
export const CustomTicks: Story = {
    args: {
        renderXTick: ({ x, y, row, theme }) => (
            <g transform={`translate(${x},${y})`}>
                <text
                    x={0}
                    y={10}
                    textAnchor="end"
                    transform="rotate(-30)"
                    fill={row.kind === 'total' ? theme.text.primary : theme.text.secondary}
                    fontSize={theme.fontSize.axis}
                    fontFamily={theme.fontFamily}
                    fontWeight={row.kind === 'total' ? 700 : 400}
                >
                    {row.name}
                </text>
            </g>
        ),
    },
};

/** Values crossing zero with a negative closing total and the zero line. */
export const ZeroLine: Story = {
    args: {
        data: negative,
        showYAxis: true,
        showZeroLine: true,
        formatBarLabel: (d: WaterfallRow) => `${d.value}`,
        yAxisFormatter: (v: number) => String(v),
    },
};

export const FixedDomain: Story = {
    args: { showYAxis: true, yDomain: [0, 120] },
};

export const TransparentBackground: Story = {
    args: { backgroundColor: 'transparent' },
};
