import type { ChartRow } from '../../core';

/** Layout mode of {@link BarChart}. */
export type BarChartMode = 'grouped' | 'stacked' | 'horizontal';

/** Original column paddings (`groupPadding`, `pointPadding`) per mode, as the original sets them. */
const PADDING: Record<BarChartMode, { group: number; point: number; maxBarSize?: number }> = {
    grouped: { group: 0.2, point: 0.1 },
    horizontal: { group: 0.2, point: 0.1 },
    stacked: { group: 0.06, point: 0.02, maxBarSize: 48 },
};

/**
 * Converts the original's `groupPadding`/`pointPadding` to Recharts' `barCategoryGap`/`barGap` (both a share of the band).
 * Original: group = band * (1 - 2 * groupPadding), slot = group / n, bar = slot * (1 - 2 * pointPadding).
 * Recharts: bars sit between two `barCategoryGap` offsets with `barGap` between neighbours.
 */
export function barGaps(mode: BarChartMode, visibleSeries: number): { barCategoryGap: string; barGap: string; maxBarSize?: number } {
    const { group, point, maxBarSize } = PADDING[mode];
    const n = mode === 'stacked' ? 1 : Math.max(1, visibleSeries);
    const slot = (1 - 2 * group) / n;
    const pct = (v: number) => `${Number((v * 100).toFixed(4))}%`;
    return { barCategoryGap: pct(group + point * slot), barGap: pct(2 * point * slot), maxBarSize };
}

function num(v: unknown): number | null {
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Sum of the values in `row` that share the sign of `sign` (the original keeps positive and negative stacks apart). */
export function stackTotal(row: ChartRow, keys: ReadonlyArray<string>, sign: 1 | -1 = 1): number {
    let total = 0;
    for (const k of keys) {
        const v = num(row[k]);
        if (v === null) continue;
        if ((sign > 0 && v >= 0) || (sign < 0 && v < 0)) total += v;
    }
    return total;
}

/** The original's `point.percentage` for a stacked point: its share (0-100) of its own-sign stack. */
export function stackPercentage(row: ChartRow, keys: ReadonlyArray<string>, key: string): number | null {
    const v = num(row[key]);
    if (v === null) return null;
    const total = stackTotal(row, keys, v >= 0 ? 1 : -1);
    return total === 0 ? null : (v / total) * 100;
}

/** Value where the segment of `key` ends in its own-sign stack (the original's `plotY` of a stacked point). */
export function stackEnd(row: ChartRow, keys: ReadonlyArray<string>, key: string): number | null {
    const v = num(row[key]);
    if (v === null) return null;
    let end = 0;
    for (const k of keys) {
        const w = num(row[k]);
        if (w !== null && (w >= 0) === (v >= 0)) end += w;
        if (k === key) break;
    }
    return end;
}

/** Key of the series that tops the positive stack in `row` (where the stack total goes), or `null`. */
export function topOfStack(row: ChartRow, keys: ReadonlyArray<string>): string | null {
    let top: string | null = null;
    for (const k of keys) {
        const v = num(row[k]);
        if (v !== null && v > 0) top = k;
    }
    return top;
}

/**
 * Data-label text rule of the original: nothing for null/zero, and in stacked mode nothing for a segment under 4% of
 * its stack.
 */
export function dataLabelText(
    row: ChartRow,
    key: string,
    stackedKeys: ReadonlyArray<string> | null,
    format: (v: number) => string,
): string {
    const v = num(row[key]);
    if (v === null || v === 0) return '';
    if (stackedKeys) {
        const pct = stackPercentage(row, stackedKeys, key);
        if (pct !== null && Math.abs(pct) < 4) return '';
    }
    return format(v);
}

/** `true` when a category looks like `2026 Q1`; the original then keeps x labels horizontal. */
export function isQuarterAxis(categories: ReadonlyArray<string | number>): boolean {
    return categories.some((c) => /^\d{4}\s*Q[1-4]$/i.test(String(c)));
}

/** Input of {@link tooltipAwayFromCursor}. All values are px in chart coordinates. */
export interface AwayPositionInput {
    /** Anchor x (category centre, or the mean bar end for horizontal bars). */
    anchorX: number;
    /** Anchor y (mean bar top, or the category centre for horizontal bars). */
    anchorY: number;
    /** Tooltip box size. */
    width: number;
    height: number;
    /** Chart size. */
    chartWidth: number;
    chartHeight: number;
}

/**
 * The original's `tooltipAwayFromCursor` positioner: the box goes 8 px (half the assumed 16 px bar) + 20 px gap to
 * the right of the anchor, flips to the left when it would overflow, is vertically centred on the anchor, and is kept
 * 8 px inside the chart.
 */
export function tooltipAwayFromCursor({ anchorX, anchorY, width, height, chartWidth, chartHeight }: AwayPositionInput): {
    x: number;
    y: number;
} {
    const gap = 20;
    // The original reads `point.shapeArgs.width`, which is never passed to a positioner, so it is always 16 / 2.
    const barHalf = 8;
    let x = anchorX + barHalf + gap;
    if (x + width > chartWidth - 8) x = anchorX - barHalf - width - gap;
    if (x < 8) x = 8;
    let y = anchorY - height / 2;
    if (y < 8) y = 8;
    if (y + height > chartHeight - 8) y = Math.max(8, chartHeight - height - 8);
    return { x, y };
}

/** Rounds away float noise (`41.000000001` → `41`) for totals shown without a formatter. */
export function cleanNumber(v: number): string {
    return String(Number(v.toPrecision(12)));
}
