import {
    CHANNELS,
    PALETTE,
    QUARTERS,
    WEEKS,
    channelSpend,
    newBuyers,
    regionSeries,
    returningBuyers,
} from '../../../charts/fixtures';

import BarChart from './BarChart';

export default {
    title: 'Originals/BarChart',
    component: BarChart,
    tags: ['autodocs'],
    args: {
        series: regionSeries,
        categories: QUARTERS,
        mode: 'grouped',
        height: 320,
        showLegend: true,
        yAxisFormatter: (v) => `$${v}M`,
        tooltipValueFormatter: (v) => `$${v.toFixed(1)}M`,
    },
    argTypes: {
        mode: { control: 'inline-radio', options: ['grouped', 'stacked', 'horizontal'] },
        yAxisFormatter: { control: false },
        tooltipValueFormatter: { control: false },
        tooltipHtmlFormatter: { control: false },
        dataLabelFormatter: { control: false },
        onPointClick: { control: false },
        onLegendClick: { control: false },
    },
};

export const Grouped = {};

export const Stacked = {
    args: {
        mode: 'stacked',
        series: [
            { name: 'New', data: newBuyers, color: PALETTE.green },
            { name: 'Returning', data: returningBuyers, color: PALETTE.blue },
        ],
        categories: WEEKS,
        showStackTotals: true,
        showDataLabels: true,
        yAxisFormatter: (v) => `${Math.round(v)}K`,
        dataLabelFormatter: (v) => v.toFixed(0),
    },
};

export const Horizontal = {
    args: {
        mode: 'horizontal',
        series: channelSpend,
        categories: CHANNELS,
        height: 380,
        showDataLabels: true,
        dataLabelFormatter: (v) => `$${v}K`,
        yAxisFormatter: (v) => `$${v}K`,
        tooltipValueFormatter: (v) => `$${v}K`,
    },
};

export const ClickHandlers = {
    args: {
        onPointClick: (seriesName, point) => console.log('point click', seriesName, point.category, point.y),
        onLegendClick: (seriesName) => console.log('legend click', seriesName),
    },
};
