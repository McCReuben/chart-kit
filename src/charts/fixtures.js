// Synthetic demo data shared by the stories. Numbers are invented; the retail-
// week labels exercise formatRetailWeek, which every Highcharts chart applies
// to its x-axis by default.

export const WEEKS = Array.from({ length: 12 }, (_, i) => `2026 RW${String(i + 1).padStart(2, '0')}`);

export const PALETTE = {
    blue: '#0064D2',
    green: '#00A651',
    amber: '#F5AF02',
    red: '#E53238',
    violet: '#8B5CF6',
    grey: '#9CA3AF',
};

export const revenueThisYear = [42.1, 43.8, 41.5, 45.2, 47.9, 46.3, 48.8, 51.2, 50.4, 52.7, 54.1, 55.6];
export const revenueLastYear = [39.4, 40.2, 40.9, 41.3, 42.8, 43.5, 44.1, 45.9, 46.2, 47.0, 48.3, 49.1];
export const revenueForecast = [41.0, 42.5, 43.1, 44.0, 45.6, 46.8, 47.5, 49.0, 50.2, 51.1, 52.4, 53.9];
export const conversionRate = [2.8, 2.9, 2.7, 3.0, 3.2, 3.1, 3.3, 3.4, 3.3, 3.5, 3.6, 3.6];
export const newBuyers = [12.4, 13.1, 11.8, 14.0, 15.2, 14.7, 15.9, 16.4, 16.0, 17.2, 17.8, 18.3];
export const returningBuyers = [28.6, 29.3, 28.9, 30.1, 31.4, 30.8, 31.6, 33.0, 32.7, 33.9, 34.6, 35.1];

export const QUARTERS = ['2025 Q3', '2025 Q4', '2026 Q1', '2026 Q2'];

export const regionSeries = [
    { name: 'North', data: [18.2, 21.4, 19.8, 22.6], color: PALETTE.blue },
    { name: 'South', data: [14.1, 15.9, 16.3, 17.2], color: PALETTE.green },
    { name: 'West', data: [9.7, 11.2, 10.8, 12.5], color: PALETTE.amber },
];

export const CHANNELS = ['Search', 'Social', 'Email', 'Display', 'Affiliate', 'Direct'];
export const channelSpend = [
    { name: 'Spend', data: [48, 31, 12, 22, 9, 4], color: PALETTE.blue },
    { name: 'Return', data: [132, 64, 41, 29, 23, 18], color: PALETTE.green },
];

/*
 * WaterfallChart takes pre-positioned bars: each row carries the invisible
 * `offset` it floats at and the visible `delta` height, plus its own `color`.
 * This builds those rows from a start total, signed steps and an end total.
 */
function buildWaterfall(start, steps, endLabel, colors) {
    const rows = [{ name: start.name, offset: 0, delta: start.value, value: start.value, color: colors.total }];
    let running = start.value;
    steps.forEach((step) => {
        const next = running + step.value;
        rows.push({
            name: step.name,
            offset: Math.min(running, next),
            delta: Math.abs(step.value),
            value: step.value,
            color: step.value >= 0 ? colors.up : colors.down,
            subLabel: step.subLabel,
        });
        running = next;
    });
    rows.push({ name: endLabel, offset: 0, delta: running, value: running, color: colors.total });
    return rows;
}

export const waterfallRows = buildWaterfall(
    { name: 'Last Year', value: 100 },
    [
        { name: 'New Buyers', value: 12.5, subLabel: '+12.5 pts' },
        { name: 'Price Mix', value: -4.2, subLabel: '-4.2 pts' },
        { name: 'Marketing', value: 7.8, subLabel: '+7.8 pts' },
        { name: 'Churn', value: -6.1, subLabel: '-6.1 pts' },
        { name: 'Other', value: 1.4, subLabel: '+1.4 pts' },
    ],
    'This Year',
    { total: PALETTE.blue, up: '#288034', down: '#D50B0B' },
);
