import { PALETTE, WEEKS, revenueForecast, revenueLastYear, revenueThisYear } from '../../../charts/fixtures';

import LineChart from './LineChart';

const series = [
    { name: 'This Year', data: revenueThisYear, color: PALETTE.blue },
    { name: 'Last Year', data: revenueLastYear, color: PALETTE.grey },
    { name: 'Forecast', data: revenueForecast, color: PALETTE.violet, dashStyle: 'Dash' },
];

export default {
    title: 'Originals/LineChart',
    component: LineChart,
    tags: ['autodocs'],
    args: {
        series,
        categories: WEEKS,
        height: 320,
        showLegend: true,
        yAxisFormatter: (v) => `$${v}M`,
        tooltipValueFormatter: (v) => `$${v.toFixed(1)}M`,
    },
    argTypes: {
        yAxisFormatter: { control: false },
        tooltipValueFormatter: { control: false },
        tooltipHeaderFormatter: { control: false },
        xAxisLabelFormatter: { control: false },
    },
};

export const Default = {};

export const SingleSeriesNoLegend = {
    args: { series: [series[0]], showLegend: false },
};

export const WithNullGap = {
    name: 'Missing data (null gap)',
    args: {
        series: [{ ...series[0], data: revenueThisYear.map((v, i) => (i === 5 || i === 6 ? null : v)) }],
    },
};

export const SweepAnimation = {
    name: 'Sweep on animateKey change',
    args: { animateKey: 'initial' },
};

export const SparkPoint = {
    name: 'sparkPoint hover trail',
    args: { sparkPoint: true },
};

export const CustomAxisLabels = {
    args: {
        categories: WEEKS.map((_, i) => `Week ${i + 1}`),
        xAxisLabelFormatter: (v) => v.replace('Week ', 'W'),
        yAxisTitle: 'Revenue ($M)',
    },
};
