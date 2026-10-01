import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { CHANNELS, QUARTERS, WEEKS, newBuyers, returningBuyers } from '../fixtures';
import { TooltipMarker, TooltipRow, TooltipTitle, retailWeekFormatter } from '../../core';
import { useChartTheme } from '../../theme';
import { BarChart, type BarChartProps } from './BarChart';

/** Invented regional sales ($M) per quarter. */
const regions = [
    { name: 'North', data: [18.2, 21.4, 19.8, 22.6] },
    { name: 'South', data: [14.1, 15.9, 16.3, 17.2] },
    { name: 'West', data: [9.7, 11.2, 10.8, 12.5] },
];

/** Invented orders (K) per retail week, split by customer type. */
const buyers = [
    { name: 'New', data: newBuyers },
    { name: 'Returning', data: returningBuyers },
];

/** Invented channel spend and return ($K). */
const channels = [
    { name: 'Spend', data: [48, 31, 12, 22, 9, 4] },
    { name: 'Return', data: [132, 64, 41, 29, 23, 18] },
];

const money = (v: number | null) => (v === null ? '—' : `$${v.toFixed(1)}M`);

const meta = {
    title: 'Charts/BarChart',
    component: BarChart,
    tags: ['autodocs'],
    args: {
        series: regions,
        categories: QUARTERS,
        mode: 'grouped',
        height: 320,
        yAxisFormatter: (v: number) => `$${v}M`,
        tooltipValueFormatter: money,
    },
    argTypes: {
        mode: { control: 'inline-radio', options: ['grouped', 'stacked', 'horizontal'] },
        yAxisFormatter: { control: false },
        xAxisLabelFormatter: { control: false },
        tooltipValueFormatter: { control: false },
        tooltipHeaderFormatter: { control: false },
        dataLabelFormatter: { control: false },
        renderTooltip: { control: false },
        onPointClick: { control: false },
        onLegendClick: { control: false },
    },
} satisfies Meta<typeof BarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Side-by-side columns per quarter. */
export const Grouped: Story = {};

/** Columns stacked in series order (first series at the bottom), with rounded stack tops. */
export const Stacked: Story = {
    args: {
        mode: 'stacked',
        series: buyers,
        categories: WEEKS,
        xAxisLabelFormatter: retailWeekFormatter(2026),
        yAxisFormatter: (v: number) => `${Math.round(v)}K`,
        tooltipValueFormatter: (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}K`),
    },
};

/** Stack totals above each column and segment labels inside (segments under 4% of the stack stay unlabelled). */
export const StackedWithTotalsAndLabels: Story = {
    args: {
        ...Stacked.args,
        series: [...buyers, { name: 'Reactivated', data: [1.2, 0.9, 1.4, 1.1, 2.6, 2.4, 1.0, 0.8, 2.9, 3.1, 1.3, 1.2] }],
        showStackTotals: true,
        showDataLabels: true,
        showLegend: true,
        dataLabelFormatter: (v: number) => v.toFixed(0),
    },
};

/** Horizontal bars with value labels at the bar ends. */
export const Horizontal: Story = {
    args: {
        mode: 'horizontal',
        series: channels,
        categories: CHANNELS,
        height: 380,
        showLegend: true,
        showDataLabels: true,
        dataLabelFormatter: (v: number) => `$${v}K`,
        yAxisFormatter: (v: number) => `$${v}K`,
        tooltipValueFormatter: (v: number | null) => `$${v}K`,
    },
};

/** Value labels above grouped columns. */
export const DataLabels: Story = {
    args: { showDataLabels: true, dataLabelFormatter: (v: number) => `$${v.toFixed(1)}M` },
};

/** Legend below the plot: click to hide/show a series, hover to dim the others. */
export const WithLegend: Story = {
    args: { showLegend: true },
};

function ClickLog(props: BarChartProps & { kind: 'legend' | 'point' }) {
    const theme = useChartTheme();
    const [message, setMessage] = useState('Nothing clicked yet');
    const { kind, ...rest } = props;
    return (
        <div>
            <BarChart
                {...rest}
                onLegendClick={kind === 'legend' ? (name) => setMessage(`Legend clicked: ${name}`) : undefined}
                onPointClick={
                    kind === 'point'
                        ? (name, p) => setMessage(`Bar clicked: ${name}, ${String(p.category)}, ${p.value ?? '—'}`)
                        : undefined
                }
            />
            <div style={{ font: `12px ${theme.fontFamily}`, color: theme.text.primary, padding: '8px 10px' }}>{message}</div>
        </div>
    );
}

/** `onLegendClick` replaces the show/hide toggle; the clicked name is shown below. */
export const LegendClickOverride: Story = {
    args: { showLegend: true },
    render: (args) => <ClickLog {...args} kind="legend" />,
};

/** `onPointClick(seriesName, point)`; bars get a pointer cursor. */
export const PointClick: Story = {
    args: { showLegend: true },
    render: (args) => <ClickLog {...args} kind="point" />,
};

/** Value axis and its grid lines hidden. */
export const HiddenYAxis: Story = {
    args: { yAxisVisible: false, showDataLabels: true, dataLabelFormatter: (v: number) => `$${v.toFixed(1)}M` },
};

/** Value-axis title. */
export const YAxisTitle: Story = {
    args: { yAxisTitle: 'Sales ($M)', showLegend: true },
};

/** Transparent background over a tinted panel. */
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

/** Shared tooltip shown without hovering, placed beside the bars, away from the cursor. */
export const StaticTooltip: Story = {
    args: { showLegend: true, defaultTooltipIndex: 1 },
};

/** Static tooltip on horizontal bars: it sits to the right of the bar ends. */
export const StaticTooltipHorizontal: Story = {
    args: { ...Horizontal.args, defaultTooltipIndex: 2 },
};

/** `tooltipShared={false}`: hovering a bar shows only that series. */
export const PerSeriesTooltip: Story = {
    args: { tooltipShared: false, showLegend: true },
};

/** `renderTooltip` render prop for a custom tooltip body, with the stack total. */
export const CustomTooltip: Story = {
    args: {
        ...Stacked.args,
        showLegend: true,
        defaultTooltipIndex: 4,
        renderTooltip: (ctx) => (
            <div>
                <TooltipTitle>{ctx.header}</TooltipTitle>
                {ctx.points.map((p) => (
                    <TooltipRow
                        key={p.key}
                        marker={<TooltipMarker kind="circle" color={p.color} />}
                        label={p.name}
                        value={`${p.formattedValue} (${(p.percentage ?? 0).toFixed(0)}%)`}
                    />
                ))}
                <div style={{ marginTop: 6, fontWeight: 600 }}>Total: {ctx.total?.toFixed(1)}K</div>
            </div>
        ),
    },
};
