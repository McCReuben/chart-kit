import { PALETTE, WEEKS, conversionRate, revenueLastYear, revenueThisYear } from '../fixtures';

import DualAxisChart from './DualAxisChart';

export default {
    title: 'Charts/DualAxisChart',
    component: DualAxisChart,
    tags: ['autodocs'],
    args: {
        series: [
            { name: 'Revenue ($M)', data: revenueThisYear, color: PALETTE.blue, axis: 0, seriesType: 'column' },
            { name: 'Conversion (%)', data: conversionRate, color: PALETTE.amber, axis: 1 },
        ],
        categories: WEEKS,
        height: 320,
        yAxisTitle: 'Revenue ($M)',
        y2AxisTitle: 'Conversion (%)',
        showLegend: true,
    },
    argTypes: {
        tooltipValueFormatter: { control: false },
    },
};

export const ColumnAndLine = {};

export const TwoLines = {
    args: {
        series: [
            { name: 'Revenue ($M)', data: revenueThisYear, color: PALETTE.blue, axis: 0 },
            { name: 'Revenue LY ($M)', data: revenueLastYear, color: PALETTE.grey, axis: 0, dashStyle: 'Dash' },
            { name: 'Conversion (%)', data: conversionRate, color: PALETTE.amber, axis: 1 },
        ],
    },
};
