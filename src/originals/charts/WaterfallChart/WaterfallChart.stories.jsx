import { waterfallRows } from '../../../charts/fixtures';

import WaterfallChart from './WaterfallChart';

export default {
    title: 'Originals/WaterfallChart',
    component: WaterfallChart,
    tags: ['autodocs'],
    args: {
        chartData: waterfallRows,
        barSize: 64,
        height: 450,
        yAxisFormatter: (v) => `${v.toFixed(1)}`,
        formatBarLabel: (d) => {
            const text = d.value.toFixed(1);
            return d.value > 0 && d.offset !== 0 ? `+${text}` : text;
        },
    },
    argTypes: {
        yAxisFormatter: { control: false },
        formatBarLabel: { control: false },
        renderBarLabel: { control: false },
        renderXTick: { control: false },
        TooltipContent: { control: false },
    },
};

export const Default = {};

export const WithYAxisAndTooltip = {
    args: { showYAxis: true, showDefaultTooltip: true },
};

export const MixedSignsWithZeroLine = {
    name: 'Mixed signs + zero line',
    args: {
        chartData: [
            { name: 'Start', offset: 0, delta: 4, value: 4, color: '#0064D2' },
            { name: 'Drop', offset: -3, delta: 7, value: -7, color: '#D50B0B' },
            { name: 'Recover', offset: -3, delta: 5, value: 5, color: '#288034' },
            { name: 'End', offset: 0, delta: 2, value: 2, color: '#0064D2' },
        ],
        showYAxis: true,
        showZeroLine: true,
        formatBarLabel: (d) => `${d.value}`,
    },
};
