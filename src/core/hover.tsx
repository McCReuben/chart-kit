import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
    useActiveTooltipCoordinate,
    useActiveTooltipDataPoints,
    useIsTooltipActive,
    useXAxisScale,
    useYAxisScale,
    type ScaleFunction,
} from 'recharts';

/** Opacity of non-hovered series while one is hovered (LineChart.css in the originals). */
export const DIM_OPACITY = 0.4;
/** CSS transition of the dimming (LineChart.css in the originals). */
export const DIM_TRANSITION = 'opacity 120ms ease-out';

/** Options of {@link useSeriesHover}. */
export interface SeriesHoverOptions {
    /**
     * Opacity of the other series while one is hovered (default 0.4). Pass a function `(id) => opacity` to dim
     * series differently, or return 1 to keep a series undimmed (for example, only splines fade in a combo chart).
     * The latest function is always used, so an inline function is fine.
     */
    dimOpacity?: number | ((id: string) => number);
    /** Initially hovered series (for static demos/tests). */
    initial?: string | null;
}

/** Result of {@link useSeriesHover}. */
export interface SeriesHover {
    /** Id of the hovered series, or `null`. */
    hovered: string | null;
    /** Set (or clear with `null`) the hovered series. Stable identity. */
    setHovered: (id: string | null) => void;
    /** Clear the hovered series. Stable identity. */
    clear: () => void;
    /** `true` when another series is hovered (even if its `dimOpacity` is 1). */
    isDimmed: (id: string) => boolean;
    /** 1, or the series' `dimOpacity` when dimmed. */
    opacityOf: (id: string) => number;
    /**
     * Props to spread on a Recharts graphical item (`<Line>`, `<Bar>`, `<Area>`, `<Scatter>`): an inline `style`
     * with the opacity and a 120ms ease-out transition.
     */
    dimProps: (id: string) => { style: CSSProperties };
    /** Mouse handlers for items that are hovered directly (bars): `<Bar {...hover.bindItem(key)} />`. */
    bindItem: (id: string) => { onMouseEnter: () => void; onMouseLeave: () => void };
}

/**
 * Hover-dimming state: while a series is hovered, all others drop to 40% opacity with a 120ms ease-out transition.
 * Feed it from {@link NearestSeriesTracker} (line-like series, nearest to the pointer), `bindItem` (bars) and the
 * legend (`ChartLegend onItemHover`).
 */
export function useSeriesHover(opts: SeriesHoverOptions = {}): SeriesHover {
    const dimOption = opts.dimOpacity ?? DIM_OPACITY;
    const dimFnRef = useRef<((id: string) => number) | null>(null);
    dimFnRef.current = typeof dimOption === 'function' ? dimOption : null;
    // A function option is read through the ref, so a new inline function does not rebuild the result.
    const dim = typeof dimOption === 'function' ? -1 : dimOption;
    const [hovered, setHoveredState] = useState<string | null>(opts.initial ?? null);
    const setHovered = useCallback((id: string | null) => setHoveredState(id), []);
    const clear = useCallback(() => setHoveredState(null), []);
    return useMemo(() => {
        const isDimmed = (id: string) => hovered !== null && hovered !== id;
        const opacityOf = (id: string) => (isDimmed(id) ? (dimFnRef.current ? dimFnRef.current(id) : dim) : 1);
        return {
            hovered,
            setHovered,
            clear,
            isDimmed,
            opacityOf,
            dimProps: (id: string) => ({ style: { opacity: opacityOf(id), transition: DIM_TRANSITION } }),
            bindItem: (id: string) => ({ onMouseEnter: () => setHovered(id), onMouseLeave: () => setHovered(null) }),
        };
    }, [hovered, dim, setHovered, clear]);
}

/** A series as seen by {@link NearestSeriesTracker}. */
export interface TrackedSeries {
    /** Row key / series id. */
    key: string;
    /** Value axis id (default 0); needed for dual-axis charts. */
    axisId?: string | number;
    /** Hidden series are ignored. */
    hidden?: boolean;
}

/** Props of {@link NearestSeriesTracker}. */
export interface NearestSeriesTrackerProps {
    /** Candidate series (usually the line-like ones). */
    series: ReadonlyArray<TrackedSeries>;
    /** Called with the nearest series id when it changes, and `null` when the pointer leaves. */
    onChange: (id: string | null) => void;
    /** Chart layout. `'vertical'` (horizontal bars) measures along x instead of y. Default `'horizontal'`. */
    layout?: 'horizontal' | 'vertical';
}

type ScaleStore = Map<string | number, ScaleFunction | undefined>;

function ScaleProbe({ axisId, vertical, store }: { axisId: string | number; vertical: boolean; store: ScaleStore }) {
    const y = useYAxisScale(axisId);
    const x = useXAxisScale(axisId);
    store.set(axisId, vertical ? x : y);
    return null;
}

/**
 * Pure helper behind {@link NearestSeriesTracker}: returns the id of the series whose value in `row` is closest
 * (in px, via `scaleOf`) to `pointer`, ignoring hidden series and null values.
 */
export function findNearestSeries(
    row: Record<string, unknown> | undefined,
    series: ReadonlyArray<TrackedSeries>,
    pointer: number,
    scaleOf: (axisId: string | number) => ScaleFunction | undefined,
): string | null {
    if (!row) return null;
    let best: string | null = null;
    let bestDist = Infinity;
    for (const s of series) {
        if (s.hidden) continue;
        const v = row[s.key];
        if (typeof v !== 'number' || !Number.isFinite(v)) continue;
        const px = scaleOf(s.axisId ?? 0)?.(v);
        if (px === undefined || !Number.isFinite(px)) continue;
        const d = Math.abs(px - pointer);
        if (d < bestDist) {
            bestDist = d;
            best = s.key;
        }
    }
    return best;
}

/**
 * Render inside a Recharts chart. Reproduces the originals' hover series with a shared tooltip
 * (`findNearestPointBy: 'x'`): at the hovered category, the series whose point is nearest to the pointer is hovered,
 * even when the pointer is not on the thin line. Reports changes through `onChange`; `null` when the tooltip ends
 * (pointer left the plot).
 */
export function NearestSeriesTracker({ series, onChange, layout = 'horizontal' }: NearestSeriesTrackerProps) {
    const vertical = layout === 'vertical';
    const active = useIsTooltipActive();
    const coord = useActiveTooltipCoordinate();
    const points = useActiveTooltipDataPoints<Record<string, unknown>>();
    const storeRef = useRef<ScaleStore>(new Map());
    const lastRef = useRef<string | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const axisIds = Array.from(new Set(series.map((s) => s.axisId ?? 0)));
    const pointer = coord ? (vertical ? coord.x : coord.y) : undefined;
    const row = points?.[0];

    useEffect(() => {
        const next =
            active && pointer !== undefined
                ? findNearestSeries(row, series, pointer, (id) => storeRef.current.get(id))
                : null;
        if (next !== lastRef.current) {
            lastRef.current = next;
            onChangeRef.current(next);
        }
    });

    useEffect(
        () => () => {
            if (lastRef.current !== null) onChangeRef.current(null);
        },
        [],
    );

    return (
        <>
            {axisIds.map((id) => (
                <ScaleProbe key={String(id)} axisId={id} vertical={vertical} store={storeRef.current} />
            ))}
        </>
    );
}
