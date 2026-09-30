import { niceScale } from '../../core';
import type { NiceScale } from '../../core';

/** Data range of one value axis. */
export interface AxisRange {
    /** Smallest visible value. */
    min: number;
    /** Largest visible value. */
    max: number;
    /** Extend the axis to 0 (the axis carries columns, whose threshold is 0). */
    includeZero?: boolean;
}

const TICK_PIXEL_INTERVAL = 72;
const cache = new Map<string, NiceScale>();

function clean(n: number): number {
    return Number(n.toPrecision(12));
}

function frozen(min: number, max: number, interval: number, count: number): NiceScale {
    const ticks: number[] = [];
    for (let i = 0; i < count; i++) ticks.push(clean(min + i * interval));
    return Object.freeze({
        min,
        max,
        ticks: Object.freeze(ticks) as number[],
        interval,
        domain: Object.freeze([min, max]) as [number, number],
    });
}

/**
 * The original's `alignTicks` behaviour (the original library's default whenever a chart has two y axes): every axis gets its own
 * nice interval, but all axes share the same number of ticks, `ceil(plotHeight / 72) + 1`, so the grid lines of both
 * axes coincide. An axis with too many ticks doubles its interval until it fits; one with too few adds ticks at the
 * top. Results are cached, so equal inputs return the same frozen object (Recharts re-registers an axis whenever its
 * `domain`/`ticks` change identity).
 */
export function alignedScales(ranges: ReadonlyArray<AxisRange>, plotHeight: number): NiceScale[] {
    const len = Math.max(1, Math.round(plotHeight));
    if (ranges.length < 2) {
        return ranges.map((r) => niceScale(r.min, r.max, { pixelLength: len, includeZero: r.includeZero }));
    }
    const amount = Math.max(2, Math.ceil(len / TICK_PIXEL_INTERVAL) + 1);
    return ranges.map((r) => {
        const key = JSON.stringify([r.min, r.max, Boolean(r.includeZero), len]);
        const hit = cache.get(key);
        if (hit) return hit;
        const base = niceScale(r.min, r.max, { pixelLength: len, includeZero: r.includeZero });
        let interval = base.interval;
        let lo = base.min;
        let hi = base.max;
        const dataLo = r.includeZero ? Math.min(0, r.min) : r.min;
        const dataHi = r.includeZero ? Math.max(0, r.max) : r.max;
        let count = base.ticks.length;
        for (let guard = 0; count > amount && guard < 50; guard++) {
            interval = clean(interval * 2);
            lo = clean(Math.floor(clean(dataLo / interval)) * interval);
            hi = clean(Math.ceil(clean(dataHi / interval)) * interval);
            if (hi <= lo) hi = clean(lo + interval);
            count = Math.round((hi - lo) / interval) + 1;
        }
        if (count < amount) hi = clean(lo + (amount - 1) * interval);
        const result = frozen(lo, hi, interval, Math.max(count, amount));
        if (cache.size >= 256) cache.delete(cache.keys().next().value as string);
        cache.set(key, result);
        return result;
    });
}
