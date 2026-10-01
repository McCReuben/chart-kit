import type { ChartTheme } from '../../theme';

/** Role of a waterfall bar: a total that stands on zero, or a floating step up or down. */
export type WaterfallRowKind = 'total' | 'increase' | 'decrease';

/**
 * One bar of a {@link WaterfallChart}. The bar floats from `offset` to `offset + delta`: it is drawn as an
 * invisible base bar of height `offset` with the visible bar of height `delta` stacked on it.
 */
export interface WaterfallRow {
    /** Category label under the bar (the default tick breaks it into one word per line). */
    name: string;
    /** Bottom of the visible bar (the invisible base). */
    offset: number;
    /** Height of the visible bar (normally non-negative). */
    delta: number;
    /** Signed value the bar stands for (a total, or the step's change); used by labels and the tooltip. */
    value: number;
    /** Role of the bar; picks its default colour. Rows without `kind` and `color` use the total colour. */
    kind?: WaterfallRowKind;
    /** Explicit bar colour; overrides the theme colour for `kind`. */
    color?: string;
    /** Extra small line(s) under the label (split on `\n`). */
    subLabel?: string;
    /** Marks a driver row: with `showYoY` the default tick adds a "YoY" line under its label. */
    pillar?: boolean;
}

/** Start or end total passed to {@link toWaterfallRows}. */
export interface WaterfallTotal {
    /** Category label. */
    name: string;
    /** Total value. For the end total it defaults to the start plus all steps. */
    value?: number;
    /** Optional sub-label under the category label. */
    subLabel?: string;
    /** Optional explicit colour (overrides `options.colors.total` and the theme). */
    color?: string;
}

/** A signed change between the start and end totals. */
export interface WaterfallStep {
    /** Category label. */
    name: string;
    /** Signed change: positive draws an increase, negative a decrease. */
    value: number;
    /** Optional sub-label under the category label (for example `"+12.5 pts"`). */
    subLabel?: string;
    /** Marks the step as a driver ("YoY" line with `showYoY`). */
    pillar?: boolean;
    /** Optional explicit colour (overrides `options.colors` and the theme). */
    color?: string;
}

/** Optional settings of {@link toWaterfallRows}. */
export interface ToWaterfallRowsOptions {
    /**
     * Fixed colours written into the rows. Leave them out (the default) so the chart colours bars from its theme
     * (`positive`, `negative` and the total colour) and follows light and dark mode.
     */
    colors?: { total?: string; increase?: string; decrease?: string };
}

const finite = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function totalRow(t: WaterfallTotal, value: number, color: string | undefined): WaterfallRow {
    const row: WaterfallRow = {
        name: t.name,
        offset: Math.min(0, value),
        delta: Math.abs(value),
        value,
        kind: 'total',
    };
    if (t.subLabel !== undefined) row.subLabel = t.subLabel;
    const c = t.color ?? color;
    if (c !== undefined) row.color = c;
    return row;
}

/**
 * Builds {@link WaterfallChart} rows from a start total, signed steps and an end total.
 *
 * - Totals stand on zero (`offset = min(0, value)`, `delta = |value|`), so negative totals hang below zero.
 * - Each step floats between the running total before and after it (`offset = min(before, after)`,
 *   `delta = |value|`) and is an `'increase'` (value >= 0) or a `'decrease'`.
 * - `end.value` defaults to the running total; pass it to show a reported total (any gap is not drawn as a step).
 * - Non-finite numbers count as 0.
 *
 * @example
 * toWaterfallRows({ name: 'Last year', value: 100 }, [{ name: 'Price', value: -4 }], { name: 'This year' })
 */
export function toWaterfallRows(
    start: WaterfallTotal,
    steps: readonly WaterfallStep[],
    end: WaterfallTotal,
    options: ToWaterfallRowsOptions = {},
): WaterfallRow[] {
    const colors = options.colors ?? {};
    const startValue = finite(start.value);
    const rows: WaterfallRow[] = [totalRow(start, startValue, colors.total)];
    let running = startValue;
    for (const step of steps) {
        const value = finite(step.value);
        const next = running + value;
        const kind: WaterfallRowKind = value >= 0 ? 'increase' : 'decrease';
        const row: WaterfallRow = {
            name: step.name,
            offset: Math.min(running, next),
            delta: Math.abs(value),
            value,
            kind,
        };
        if (step.subLabel !== undefined) row.subLabel = step.subLabel;
        if (step.pillar !== undefined) row.pillar = step.pillar;
        const c = step.color ?? (kind === 'increase' ? colors.increase : colors.decrease);
        if (c !== undefined) row.color = c;
        rows.push(row);
        running = next;
    }
    rows.push(totalRow(end, end.value === undefined ? running : finite(end.value), colors.total));
    return rows;
}

/**
 * Colour of a row: its own `color`, else the theme's `positive` (increase), `negative` (decrease) or `totalColor`
 * (totals and rows without `kind`; default `theme.neutral`, which is `palette[0]` of the base theme).
 */
export function resolveWaterfallColor(row: WaterfallRow, theme: ChartTheme, totalColor?: string): string {
    if (row.color) return row.color;
    if (row.kind === 'increase') return theme.positive;
    if (row.kind === 'decrease') return theme.negative;
    return totalColor ?? theme.neutral ?? theme.palette[0] ?? theme.text.secondary;
}
