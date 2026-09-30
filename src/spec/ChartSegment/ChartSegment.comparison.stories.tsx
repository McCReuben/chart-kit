import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentType, ReactNode } from 'react';

import { LIGHT_PALETTE, useChartTheme } from '../../theme';
import OriginalChartSegmentJs from '../../originals/spec/ChartSegment';
import { ChartSegment } from './ChartSegment';
import type { ChartSpec } from './chartSegmentSpec';

const OriginalChartSegment = OriginalChartSegmentJs as unknown as ComponentType<{ spec: unknown }>;

function Panel({ label, children }: { label: string; children: ReactNode }) {
    const theme = useChartTheme();
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ font: `600 12px ${theme.fontFamily}`, color: theme.text.secondary, margin: '0 0 4px' }}>{label}</div>
            {children}
        </div>
    );
}

/** Same spec on both sides. Colours are explicit (LIGHT_PALETTE), or the original falls back to its brand palette. */
function Compare({ spec }: { spec: ChartSpec }) {
    return (
        <div>
            <Panel label="Original (Highcharts)">
                <OriginalChartSegment spec={spec} />
            </Panel>
            <Panel label="Rebuild (Recharts)">
                <ChartSegment spec={spec} />
            </Panel>
        </div>
    );
}

const meta = {
    title: 'Comparison/ChartSegment',
    component: Compare,
} satisfies Meta<typeof Compare>;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
    { category: 'Jan', revenue: 42.1, lastYear: 39.4, conversion: 2.8 },
    { category: 'Feb', revenue: 43.8, lastYear: 40.2, conversion: 2.9 },
    { category: 'Mar', revenue: 41.5, lastYear: 40.9, conversion: 2.7 },
    { category: 'Apr', revenue: 45.2, lastYear: 41.3, conversion: 3.0 },
    { category: 'May', revenue: 47.9, lastYear: 42.8, conversion: 3.2 },
    { category: 'Jun', revenue: 46.3, lastYear: 43.5, conversion: 3.1 },
];
const [c0, c1] = LIGHT_PALETTE;

export const Line: Story = {
    args: {
        spec: {
            type: 'line',
            data: rows,
            series: [
                { key: 'revenue', label: 'Revenue ($M)', color: c0 },
                { key: 'lastYear', label: 'Last year ($M)', dashed: true, color: c1 },
            ],
            layout: { title: 'Revenue by month' },
        },
    },
};

export const DualAxis: Story = {
    args: {
        spec: {
            type: 'dual-axis',
            data: rows,
            series: [
                { key: 'revenue', label: 'Revenue ($M)', seriesType: 'column', color: c0 },
                { key: 'conversion', label: 'Conversion (%)', axis: 'right', color: c1 },
            ],
            layout: { title: 'Revenue vs conversion', yLabel: 'Revenue ($M)', y2Label: 'Conversion (%)' },
        },
    },
};

export const StackedBar: Story = {
    args: {
        spec: {
            type: 'stacked-bar',
            data: rows,
            series: [
                { key: 'revenue', label: 'This year', color: c0 },
                { key: 'lastYear', label: 'Last year', color: c1 },
            ],
            layout: { title: 'Stacked', height: 300 },
        },
    },
};
