import BarChart from '../charts/BarChart/BarChart.jsx';
import DualAxisChart from '../charts/DualAxisChart/DualAxisChart.jsx';
import LineChart from '../charts/LineChart/LineChart.jsx';

import './ChartSegment.css';

// Wire contract: `msg.segments` = ordered [{ type: 'html' | 'chart' }]. Chart spec =
// { type, x?, data, series: [{ key, label?, color?, dashed?, axis?, seriesType? }],
// layout: { title?, xLabel?, yLabel?, y2Label?, height? } }; axis/seriesType dual-axis only.
// Backend scales numbers and states units in labels; values render as-is.

export function hasChartSegment(msg) {
    return Boolean(msg) && Array.isArray(msg.segments) && msg.segments.some((seg) => seg?.type === 'chart');
}

export const DEFAULT_PALETTE = ['#0064D2', '#00A651', '#F5AF02', '#E53238', '#8B5CF6', '#F97316', '#10B981', '#6B7AFF'];

function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
}

function deriveCategories(spec) {
    if (Array.isArray(spec.x)) return spec.x;
    const rows = Array.isArray(spec.data) ? spec.data : [];
    if (rows.length && rows.every((row) => row && row.category != null)) {
        return rows.map((row) => row.category);
    }
    return rows.map((_, i) => String(i + 1));
}

// `includeDash` off for bars: dashStyle is meaningless there.
function normalizeSeries(spec, { includeDash = true } = {}) {
    const rows = Array.isArray(spec.data) ? spec.data : [];
    const series = Array.isArray(spec.series) ? spec.series : [];
    return series.map((s, i) => {
        const out = {
            name: s.label ?? s.key,
            data: rows.map((row) => row?.[s.key] ?? null),
            color: s.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
        };
        if (includeDash) out.dashStyle = s.dashed ? 'Dash' : 'Solid';
        return out;
    });
}

// DualAxisChart wants `axis` as 0 left / 1 right.
function normalizeDualSeries(spec) {
    return normalizeSeries(spec).map((out, i) => {
        const s = spec.series[i];
        return {
            ...out,
            axis: s.axis === 'right' ? 1 : 0,
            seriesType: s.seriesType === 'column' || s.seriesType === 'bar' ? 'column' : 'line',
        };
    });
}

const BAR_MODES = {
    'grouped-bar': 'grouped',
    'stacked-bar': 'stacked',
    'horizontal-bar': 'horizontal',
};

// Transparent so the message-bubble background shows through instead of the
// chart's default opaque surface.
const EMBED_BG = 'transparent';

function renderChart(spec) {
    const height = clamp(spec.layout?.height ?? 260, 170, 500);

    if (spec.type === 'line') {
        const categories = deriveCategories(spec);
        const series = normalizeSeries(spec);
        if (!series.length) return null;
        return (
            <LineChart
                series={series}
                categories={categories}
                height={height}
                showLegend={series.length > 1}
                backgroundColor={EMBED_BG}
            />
        );
    }

    if (spec.type === 'dual-axis') {
        const categories = deriveCategories(spec);
        const series = normalizeDualSeries(spec);
        if (!series.length) return null;
        return (
            <DualAxisChart
                series={series}
                categories={categories}
                height={height}
                yAxisTitle={spec.layout?.yLabel ?? null}
                y2AxisTitle={spec.layout?.y2Label ?? null}
                showLegend={series.length > 1}
                backgroundColor={EMBED_BG}
            />
        );
    }

    const barMode = BAR_MODES[spec.type];
    if (barMode) {
        const categories = deriveCategories(spec);
        const series = normalizeSeries(spec, { includeDash: false });
        if (!series.length) return null;
        return (
            <BarChart
                series={series}
                categories={categories}
                mode={barMode}
                height={height}
                showLegend={series.length > 1}
                backgroundColor={EMBED_BG}
            />
        );
    }

    return null;
}

export default function ChartSegment({ spec }) {
    if (!spec || typeof spec !== 'object') return null;

    const chart = renderChart(spec);
    if (!chart) return null;

    const title = spec.layout?.title;
    return (
        <div className="chat-chart-segment">
            {title && <div className="chat-chart-title">{title}</div>}
            {chart}
        </div>
    );
}
