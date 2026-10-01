/** Result of {@link niceScale}. */
export interface NiceScale {
    /** Axis minimum (first tick). */
    min: number;
    /** Axis maximum (last tick). */
    max: number;
    /** Tick values from `min` to `max`. */
    ticks: number[];
    /** Distance between ticks. */
    interval: number;
    /** `[min, max]`, ready for a Recharts `domain` prop. */
    domain: [number, number];
}

/** Options of {@link niceScale}. */
export interface NiceScaleOptions {
    /** Axis length in px. With it, the tick count follows `tickPixelInterval` (72px). */
    pixelLength?: number;
    /** Target pixels between ticks when `pixelLength` is set (default 72). */
    tickPixelInterval?: number;
    /** Approximate number of ticks when `pixelLength` is unknown (default 5). */
    tickCount?: number;
    /** Extend the range to include 0 (bars and columns start at 0). */
    includeZero?: boolean;
    /** Only integer ticks (default `false`). */
    integersOnly?: boolean;
    /** Force a minimum (the maximum is still snapped to a tick). */
    fixedMin?: number;
    /** Force a maximum (the minimum is still snapped to a tick). */
    fixedMax?: number;
}

const MULTIPLES = [1, 2, 2.5, 5, 10];

function clean(n: number): number {
    return Number(n.toPrecision(12));
}

/** Snaps a raw interval to 1, 2, 2.5, 5 or 10 × 10^n. */
export function normalizeTickInterval(raw: number, integersOnly = false): number {
    if (!(raw > 0) || !Number.isFinite(raw)) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const normalized = raw / magnitude;
    let multiples = MULTIPLES;
    if (integersOnly && magnitude < 1) return 1;
    if (integersOnly && magnitude === 1) multiples = [1, 2, 5, 10];
    let chosen = multiples[multiples.length - 1];
    for (let i = 0; i < multiples.length; i++) {
        const next = multiples[i + 1];
        if (normalized <= (next !== undefined ? (multiples[i] + next) / 2 : multiples[i])) {
            chosen = multiples[i];
            break;
        }
    }
    return clean(chosen * magnitude);
}

const CACHE_LIMIT = 256;
const cache = new Map<string, NiceScale>();

/**
 * "Nice" linear scale: ticks at 1/2/2.5/5 × 10^n, and the axis starts and ends on a tick
 * (`startOnTick`/`endOnTick`). E.g. data 39.4–55.6 on a ~190px axis gives 35, 40, ... 60.
 * Pass the result's `domain` and `ticks` to a value axis (see `valueAxisProps`). Results are cached: equal inputs
 * return the same (frozen) object, so it is safe to call during render.
 */
export function niceScale(dataMin: number, dataMax: number, opts: NiceScaleOptions = {}): NiceScale {
    // Results are cached by input so repeated calls return the *same* object: Recharts re-registers an axis whenever
    // its `domain`/`ticks` arrays change identity, and with `width="auto"` that can loop.
    const key = JSON.stringify([dataMin, dataMax, opts.pixelLength !== undefined ? Math.round(opts.pixelLength) : null, opts.tickPixelInterval, opts.tickCount, opts.includeZero, opts.integersOnly, opts.fixedMin, opts.fixedMax]);
    const hit = cache.get(key);
    if (hit) return hit;
    const result = computeNiceScale(dataMin, dataMax, {
        ...opts,
        pixelLength: opts.pixelLength !== undefined ? Math.round(opts.pixelLength) : undefined,
    });
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    cache.set(key, result);
    return result;
}

function computeNiceScale(dataMin: number, dataMax: number, opts: NiceScaleOptions): NiceScale {
    let lo = Number.isFinite(dataMin) ? dataMin : 0;
    let hi = Number.isFinite(dataMax) ? dataMax : lo;
    if (lo > hi) [lo, hi] = [hi, lo];
    if (opts.includeZero) {
        lo = Math.min(lo, 0);
        hi = Math.max(hi, 0);
    }
    if (opts.fixedMin !== undefined) lo = opts.fixedMin;
    if (opts.fixedMax !== undefined) hi = opts.fixedMax;
    if (lo === hi) {
        const pad = lo === 0 ? 1 : Math.abs(lo) * 0.1;
        if (lo >= 0 && opts.includeZero) hi = lo + pad;
        else {
            lo -= pad;
            hi += pad;
        }
    }
    const intervals =
        opts.pixelLength && opts.pixelLength > 0
            ? Math.max(1, opts.pixelLength / (opts.tickPixelInterval ?? 72))
            : Math.max(1, (opts.tickCount ?? 5) - 1);
    const interval = normalizeTickInterval((hi - lo) / intervals, opts.integersOnly);
    const min = opts.fixedMin ?? clean(Math.floor(clean(lo / interval)) * interval);
    let max = opts.fixedMax ?? clean(Math.ceil(clean(hi / interval)) * interval);
    if (max <= min) max = clean(min + interval);
    const ticks: number[] = [];
    const first = opts.fixedMin !== undefined ? clean(Math.ceil(clean(min / interval)) * interval) : min;
    for (let t = first, i = 0; t <= max + interval * 1e-9 && i < 1000; i++, t = clean(first + i * interval)) {
        ticks.push(t);
    }
    if (opts.fixedMin !== undefined && ticks[0] !== min) ticks.unshift(min);
    if (opts.fixedMax !== undefined && ticks[ticks.length - 1] !== max) ticks.push(max);
    return Object.freeze({ min, max, ticks: Object.freeze(ticks) as number[], interval, domain: Object.freeze([min, max]) as [number, number] });
}
