/** Minimum series shape shared by every chart (`series: [{ name, data, color }]`). */
export interface SeriesInput {
    /** Display name (legend, tooltip). Names may repeat; rows use safe keys instead. */
    name: string;
    /** Values aligned to `categories`; `null` = gap. */
    data: ReadonlyArray<number | null | undefined>;
    /** Explicit colour; default `theme.palette[i % palette.length]`. */
    color?: string;
}

/** A series with its row key and resolved colour. */
export interface ResolvedSeries<S extends SeriesInput = SeriesInput> {
    /** Safe row key (`s0`, `s1`, ...). Use as the Recharts `dataKey` and as the id for visibility/hover state. */
    key: string;
    /** Display name. */
    name: string;
    /** Resolved colour. */
    color: string;
    /** Position in the input array. */
    index: number;
    /** The caller's original series object (for chart-specific fields such as `dashStyle` or `axis`). */
    input: S;
}

/** Row key holding the original category index. Use as the category axis `dataKey`. */
export const ROW_INDEX_KEY = 'index';
/** Row key holding the raw category value. */
export const ROW_CATEGORY_KEY = 'category';

/** One Recharts data row: `{ index, category, s0, s1, ... }`. */
export interface ChartRow {
    /** Original (unzoomed) category index. */
    index: number;
    /** Raw category value. */
    category: string | number;
    /** Series values by series key; `null` = gap. */
    [seriesKey: string]: number | string | null;
}

/** Row key of the series at position `i`: `s0`, `s1`, ... */
export function seriesKey(i: number): string {
    return `s${i}`;
}

/** Colour of slot `i` in a palette (wraps around). */
export function paletteColor(palette: ReadonlyArray<string>, i: number): string {
    return palette.length ? palette[i % palette.length] : '#888888';
}

/** Assigns row keys and colours (explicit `color`, else the palette slot) to each series. */
export function resolveSeries<S extends SeriesInput>(
    series: ReadonlyArray<S>,
    palette: ReadonlyArray<string>,
): ResolvedSeries<S>[] {
    return series.map((s, i) => ({
        key: seriesKey(i),
        name: s.name,
        color: s.color ?? paletteColor(palette, i),
        index: i,
        input: s,
    }));
}

function toValue(v: unknown): number | null {
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Converts `series` + `categories` into Recharts rows. Row count = `categories.length`; missing or non-finite values
 * become `null`. Series are keyed `s0`, `s1`, ... (see {@link seriesKey}), never by name.
 */
export function buildRows(
    categories: ReadonlyArray<string | number>,
    series: ReadonlyArray<Pick<SeriesInput, 'data'>>,
): ChartRow[] {
    return categories.map((category, index) => {
        const row: ChartRow = { index, category };
        series.forEach((s, i) => {
            row[seriesKey(i)] = toValue(s.data?.[index]);
        });
        return row;
    });
}

/** Options of {@link seriesExtent}. */
export interface SeriesExtentOptions {
    /** Sum values per row (positive and negative stacks separately), as for stacked bars. */
    stacked?: boolean;
}

/**
 * Min and max of the given series keys over the rows (ignoring nulls), or `null` when there is no value.
 * Pass only visible series so hidden ones do not stretch the axis (the originals rescale on hide).
 */
export function seriesExtent(
    rows: ReadonlyArray<ChartRow>,
    keys: ReadonlyArray<string>,
    opts: SeriesExtentOptions = {},
): [number, number] | null {
    let min = Infinity;
    let max = -Infinity;
    for (const row of rows) {
        if (opts.stacked) {
            let pos = 0;
            let neg = 0;
            let any = false;
            for (const k of keys) {
                const v = toValue(row[k]);
                if (v === null) continue;
                any = true;
                if (v >= 0) pos += v;
                else neg += v;
            }
            if (any) {
                min = Math.min(min, neg, pos);
                max = Math.max(max, pos, neg);
            }
        } else {
            for (const k of keys) {
                const v = toValue(row[k]);
                if (v === null) continue;
                if (v < min) min = v;
                if (v > max) max = v;
            }
        }
    }
    return min === Infinity ? null : [min, max];
}
