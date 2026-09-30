import ChartSegment from './ChartSegment';

const rows = [
    { category: 'Jan', revenue: 42.1, lastYear: 39.4, conversion: 2.8 },
    { category: 'Feb', revenue: 43.8, lastYear: 40.2, conversion: 2.9 },
    { category: 'Mar', revenue: 41.5, lastYear: 40.9, conversion: 2.7 },
    { category: 'Apr', revenue: 45.2, lastYear: 41.3, conversion: 3.0 },
    { category: 'May', revenue: 47.9, lastYear: 42.8, conversion: 3.2 },
    { category: 'Jun', revenue: 46.3, lastYear: 43.5, conversion: 3.1 },
];

export default {
    title: 'Originals/ChartSegment',
    component: ChartSegment,
    tags: ['autodocs'],
};

export const Line = {
    args: {
        spec: {
            type: 'line',
            data: rows,
            series: [
                { key: 'revenue', label: 'Revenue ($M)' },
                { key: 'lastYear', label: 'Last Year ($M)', dashed: true },
            ],
            layout: { title: 'Revenue by month' },
        },
    },
};

export const DualAxis = {
    args: {
        spec: {
            type: 'dual-axis',
            data: rows,
            series: [
                { key: 'revenue', label: 'Revenue ($M)', seriesType: 'column' },
                { key: 'conversion', label: 'Conversion (%)', axis: 'right' },
            ],
            layout: { title: 'Revenue vs conversion', yLabel: 'Revenue ($M)', y2Label: 'Conversion (%)' },
        },
    },
};

export const StackedBar = {
    args: {
        spec: {
            type: 'stacked-bar',
            data: rows,
            series: [
                { key: 'revenue', label: 'This Year' },
                { key: 'lastYear', label: 'Last Year' },
            ],
            layout: { title: 'Stacked', height: 300 },
        },
    },
};

export const HorizontalBar = {
    args: {
        spec: {
            type: 'horizontal-bar',
            data: rows,
            series: [{ key: 'revenue', label: 'Revenue ($M)' }],
            layout: { title: 'Horizontal' },
        },
    },
};
