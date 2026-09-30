import type { BarChartMode } from '../../charts/BarChart';

/** Chart types a {@link ChartSpec} can ask for. */
export type ChartSpecType = 'line' | 'dual-axis' | 'grouped-bar' | 'stacked-bar' | 'horizontal-bar';

/** One series of a {@link ChartSpec}: a column of `data` picked by `key`. */
export interface ChartSpecSeries {
    /** Field of each `data` row that holds this series' value. Missing values become `null` (a gap). */
    key: string;
    /** Display name (legend, tooltip). Default: `key`. */
    label?: string;
    /** Series colour. Default: the theme palette colour for the series' position. */
    color?: string;
    /** Dashed line (line and dual-axis line series only; ignored for bars). */
    dashed?: boolean;
    /** Dual-axis only: which y axis the series is plotted against. Default `'left'`. */
    axis?: 'left' | 'right';
    /** Dual-axis only: `'column'`/`'bar'` draw columns, anything else draws a smooth line. Default `'line'`. */
    seriesType?: 'column' | 'bar' | 'line';
}

/** Optional presentation hints of a {@link ChartSpec}. */
export interface ChartSpecLayout {
    /** Card title shown above the chart. */
    title?: string;
    /** X-axis title (line charts only; the bar and dual-axis charts have no x-axis title). */
    xLabel?: string;
    /** Left / value-axis title. */
    yLabel?: string;
    /** Right-axis title (dual-axis only). */
    y2Label?: string;
    /** Chart height in px, clamped to 170–500. Default 260. */
    height?: number;
}

/**
 * Declarative chart spec, as sent by a backend or an LLM. Values render as-is: the sender scales numbers and states
 * units in labels.
 */
export interface ChartSpec {
    /** Which chart to draw. An unknown type renders nothing. */
    type: ChartSpecType;
    /** Category labels. Default: `data[].category` when every row has one, else `'1'..'n'`. */
    x?: Array<string | number>;
    /** Rows; each series reads its value from `row[series.key]`. */
    data: Array<Record<string, unknown>>;
    /** Series to draw, in order. No series renders nothing. */
    series: ChartSpecSeries[];
    /** Title, axis titles and height. */
    layout?: ChartSpecLayout;
}

/** A chat message whose `segments` may contain chart segments. */
export interface ChartSegmentMessage {
    /** Ordered message segments, e.g. `{ type: 'html' }` or `{ type: 'chart' }`. */
    segments?: Array<{ type?: string } | null | undefined>;
}

/** True when `msg.segments` contains at least one `{ type: 'chart' }` segment. */
export function hasChartSegment(msg: unknown): boolean {
    if (!msg || typeof msg !== 'object') return false;
    const segments = (msg as ChartSegmentMessage).segments;
    return Array.isArray(segments) && segments.some((seg) => seg?.type === 'chart');
}

export const DEFAULT_HEIGHT = 260;
export const MIN_HEIGHT = 170;
export const MAX_HEIGHT = 500;

/** Clamps a spec height to 170–500; a missing value gives 260, a non-numeric one 170 (as in the original). */
export function clampHeight(value: unknown): number {
    const n = Number(value ?? DEFAULT_HEIGHT);
    if (!Number.isFinite(n)) return MIN_HEIGHT;
    return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, n));
}

function rowsOf(spec: Partial<ChartSpec>): Array<Record<string, unknown> | null | undefined> {
    return Array.isArray(spec.data) ? spec.data : [];
}

/** Categories from `spec.x`, else `data[].category` when every row has one, else `'1'..'n'`. */
export function deriveCategories(spec: Partial<ChartSpec>): Array<string | number> {
    if (Array.isArray(spec.x)) return spec.x;
    const rows = rowsOf(spec);
    if (rows.length && rows.every((row) => row && row.category != null)) {
        return rows.map((row) => row!.category as string | number);
    }
    return rows.map((_, i) => String(i + 1));
}

/** Series normalised to the charts' `{ name, data, color? }` shape (colour left out when the spec has none). */
export interface NormalizedSeries {
    name: string;
    data: Array<number | null>;
    color?: string;
    dashed: boolean;
    axis: 'left' | 'right';
    seriesType: 'column' | 'line';
}

function toValue(v: unknown): number | null {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

/** Reads every series' column from `data`; missing values become `null`. */
export function normalizeSeries(spec: Partial<ChartSpec>): NormalizedSeries[] {
    const rows = rowsOf(spec);
    const series = Array.isArray(spec.series) ? spec.series : [];
    return series
        .filter((s): s is ChartSpecSeries => Boolean(s) && typeof s === 'object')
        .map((s) => ({
            name: String(s.label ?? s.key),
            data: rows.map((row) => toValue(row?.[s.key])),
            ...(s.color ? { color: s.color } : {}),
            dashed: Boolean(s.dashed),
            axis: s.axis === 'right' ? 'right' : 'left',
            seriesType: s.seriesType === 'column' || s.seriesType === 'bar' ? 'column' : 'line',
        }));
}

/** Maps the spec bar types to BarChart modes. */
export const BAR_MODES: Readonly<Record<string, BarChartMode>> = {
    'grouped-bar': 'grouped',
    'stacked-bar': 'stacked',
    'horizontal-bar': 'horizontal',
};

/** The resolved render plan of a spec, or `null` when the spec renders nothing. */
export interface ChartSegmentPlan {
    kind: 'line' | 'dual-axis' | 'bar';
    barMode?: BarChartMode;
    categories: Array<string | number>;
    series: NormalizedSeries[];
    height: number;
    showLegend: boolean;
    title?: string;
    xLabel?: string;
    yLabel?: string;
    y2Label?: string;
}

function label(v: unknown): string | undefined {
    return v == null || v === '' ? undefined : String(v);
}

/**
 * Validates a spec and resolves everything the component renders. Returns `null` for a non-object spec, an unknown
 * type or a spec without series.
 */
export function planChartSegment(spec: unknown): ChartSegmentPlan | null {
    if (!spec || typeof spec !== 'object') return null;
    const s = spec as Partial<ChartSpec>;
    const type = s.type as string | undefined;
    const kind = type === 'line' ? 'line' : type === 'dual-axis' ? 'dual-axis' : type && BAR_MODES[type] ? 'bar' : null;
    if (!kind) return null;
    const series = normalizeSeries(s);
    if (!series.length) return null;
    const layout = s.layout && typeof s.layout === 'object' ? s.layout : {};
    return {
        kind,
        barMode: kind === 'bar' ? BAR_MODES[type!] : undefined,
        categories: deriveCategories(s),
        series,
        height: clampHeight(layout.height),
        showLegend: series.length > 1,
        title: label(layout.title),
        xLabel: label(layout.xLabel),
        yLabel: label(layout.yLabel),
        y2Label: label(layout.y2Label),
    };
}
