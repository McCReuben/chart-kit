import type { Meta, StoryObj } from '@storybook/react-vite';

import { useChartTheme } from '../../theme';
import { ChartSegment } from './ChartSegment';
import type { ChartSpec } from './chartSegmentSpec';

// Invented data.
const rows = [
    { category: 'Jan', revenue: 42.1, lastYear: 39.4, plan: 44, conversion: 2.8 },
    { category: 'Feb', revenue: 43.8, lastYear: 40.2, plan: 44, conversion: 2.9 },
    { category: 'Mar', revenue: 41.5, lastYear: 40.9, plan: 45, conversion: 2.7 },
    { category: 'Apr', revenue: 45.2, lastYear: 41.3, plan: 45, conversion: 3.0 },
    { category: 'May', revenue: 47.9, lastYear: 42.8, plan: 46, conversion: 3.2 },
    { category: 'Jun', revenue: 46.3, lastYear: 43.5, plan: 46, conversion: 3.1 },
];

const meta = {
    title: 'Charts/ChartSegment',
    component: ChartSegment,
    tags: ['autodocs'],
} satisfies Meta<typeof ChartSegment>;

export default meta;
type Story = StoryObj<typeof meta>;

const spec = (s: ChartSpec) => ({ args: { spec: s } });

export const Line: Story = spec({
    type: 'line',
    data: rows,
    series: [
        { key: 'revenue', label: 'Revenue ($M)' },
        { key: 'lastYear', label: 'Last year ($M)', dashed: true },
    ],
    layout: { title: 'Revenue by month', yLabel: 'Revenue ($M)', xLabel: 'Month' },
});

export const DualAxis: Story = spec({
    type: 'dual-axis',
    data: rows,
    series: [
        { key: 'revenue', label: 'Revenue ($M)', seriesType: 'column' },
        { key: 'conversion', label: 'Conversion (%)', axis: 'right' },
    ],
    layout: { title: 'Revenue vs conversion', yLabel: 'Revenue ($M)', y2Label: 'Conversion (%)' },
});

export const GroupedBar: Story = spec({
    type: 'grouped-bar',
    data: rows,
    series: [
        { key: 'revenue', label: 'This year' },
        { key: 'lastYear', label: 'Last year' },
        { key: 'plan', label: 'Plan' },
    ],
    layout: { title: 'Grouped', yLabel: 'Revenue ($M)' },
});

export const StackedBar: Story = spec({
    type: 'stacked-bar',
    data: rows,
    series: [
        { key: 'revenue', label: 'This year' },
        { key: 'lastYear', label: 'Last year' },
    ],
    layout: { title: 'Stacked', height: 300 },
});

export const HorizontalBar: Story = spec({
    type: 'horizontal-bar',
    data: rows,
    series: [{ key: 'revenue', label: 'Revenue ($M)' }],
    layout: { title: 'Horizontal' },
});

export const NoTitle: Story = spec({
    type: 'line',
    data: rows,
    series: [
        { key: 'revenue', label: 'Revenue ($M)' },
        { key: 'plan', label: 'Plan ($M)', dashed: true },
    ],
});

/** One series: no legend. */
export const SingleSeries: Story = spec({
    type: 'line',
    data: rows,
    series: [{ key: 'revenue', label: 'Revenue ($M)' }],
    layout: { title: 'Single series (no legend)' },
});

/** No `x`: categories come from `data[].category`; rows without one fall back to 1..n (second card). */
export const CategoryFromData: Story = {
    args: {
        spec: {
            type: 'grouped-bar',
            data: rows,
            series: [{ key: 'revenue', label: 'Revenue' }, { key: 'lastYear', label: 'Last year' }],
            layout: { title: 'Categories from data[].category' },
        },
    },
    render: (args) => (
        <div>
            <ChartSegment {...args} />
            <ChartSegment
                spec={{
                    type: 'grouped-bar',
                    data: rows.map(({ category: _c, ...r }) => r),
                    series: [{ key: 'revenue', label: 'Revenue' }, { key: 'lastYear', label: 'Last year' }],
                    layout: { title: 'No categories: 1..n' },
                }}
            />
        </div>
    ),
};

function InvalidDemo() {
    const theme = useChartTheme();
    return (
        <div style={{ fontFamily: theme.fontFamily, color: theme.text.secondary, fontSize: 12 }}>
            <p>
                Below: <code>{`<ChartSegment spec={{ type: 'pie', ... }} />`}</code>
            </p>
            <div style={{ border: `1px dashed ${theme.componentBorder}`, minHeight: 24 }}>
                <ChartSegment spec={{ type: 'pie', data: rows, series: [{ key: 'revenue' }] } as unknown as ChartSpec} />
            </div>
            <p>The component rendered nothing (unknown type), so the dashed box above is empty.</p>
        </div>
    );
}

/** An unknown type renders `null`. */
export const InvalidSpec: Story = {
    args: { spec: null },
    render: () => <InvalidDemo />,
};
