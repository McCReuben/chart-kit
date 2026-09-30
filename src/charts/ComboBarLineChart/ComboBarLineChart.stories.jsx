import { PALETTE, WEEKS, revenueForecast, revenueThisYear } from '../fixtures';

import ComboBarLineChart from './ComboBarLineChart';

export default {
    title: 'Charts/ComboBarLineChart',
    component: ComboBarLineChart,
    tags: ['autodocs'],
    args: {
        series: [
            { name: 'Actual', data: revenueThisYear, color: PALETTE.blue, type: 'column' },
            { name: 'Forecast', data: revenueForecast, color: PALETTE.amber, type: 'spline' },
        ],
        categories: WEEKS,
        height: 360,
        showLegend: true,
        yAxisFormatter: (v) => `$${v}M`,
        tooltipValueFormatter: (v) => `$${v.toFixed(1)}M`,
    },
    argTypes: {
        yAxisFormatter: { control: false },
        tooltipValueFormatter: { control: false },
    },
};

export const Default = {};

export const FixedAxis = {
    args: { yAxisMin: 30, yAxisMax: 60, yAxisTickPositions: [30, 40, 50, 60], yAxisTitle: 'Revenue ($M)' },
};
