import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    ZIndexLayer,
    useActiveTooltipDataPoints,
    useIsTooltipActive,
    usePlotArea,
    useYAxisScale,
} from 'recharts';

import type { ChartRow } from '../../core';

/** Travel time from the first point to the hovered one, in ms. */
const TRAVEL_MS = 1000;
/** Minimum time per step, in ms. */
const MIN_STEP_MS = 12;

/** A series the trail can follow. */
export interface HoverTrailSeries {
    /** Row key (`s0`, …). */
    key: string;
    /** Dot colour. */
    color: string;
    /** Hidden series are ignored. */
    hidden?: boolean;
}

/** Props of {@link HoverTrail}. */
export interface HoverTrailProps {
    /** Rows currently drawn (the zoomed slice). */
    rows: ReadonlyArray<ChartRow>;
    /** Candidate series. */
    series: ReadonlyArray<HoverTrailSeries>;
    /** Series nearest the pointer (from `useSeriesHover`), or `null`. */
    hovered: string | null;
}

interface Trail {
    gen: number;
    key: string;
    color: string;
    /** Row positions (in `rows`) of the series' non-null points, left to right. */
    path: number[];
    /** Index in `path` of the hovered point. */
    target: number;
}

/**
 * Hover trail: when the pointer moves to a new point of the nearest series, a dot in the series colour starts at the
 * series' first point and steps along each point to the hovered one (about one second in total), then a ring pulses
 * around it until the next hover starts a new trail. Render inside the chart.
 */
export function HoverTrail({ rows, series, hovered }: HoverTrailProps) {
    const active = useIsTooltipActive();
    const points = useActiveTooltipDataPoints<ChartRow>();
    const plot = usePlotArea();
    const yScale = useYAxisScale(0);
    const [trail, setTrail] = useState<Trail | null>(null);
    const [step, setStep] = useState(0);
    const genRef = useRef(0);
    const ringRef = useRef<SVGCircleElement>(null);
    const rowIndex = points?.[0]?.index;

    // A new data set or zoom invalidates the trail's positions.
    useEffect(() => setTrail(null), [rows]);

    // Start a trail when the hovered (series, point) pair changes.
    useEffect(() => {
        if (!active || hovered === null || typeof rowIndex !== 'number') return;
        const s = series.find((c) => c.key === hovered);
        if (!s || s.hidden) return;
        const path: number[] = [];
        let target = -1;
        rows.forEach((r, pos) => {
            const v = r[s.key];
            if (typeof v !== 'number' || !Number.isFinite(v)) return;
            if (r.index === rowIndex) target = path.length;
            path.push(pos);
        });
        if (target < 0) return;
        genRef.current += 1;
        setTrail({ gen: genRef.current, key: s.key, color: s.color, path, target });
        setStep(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, hovered, rowIndex]);

    // Step the dot along the path, one point per tick.
    useEffect(() => {
        if (!trail || step >= trail.target) return undefined;
        const stepMs = Math.max(MIN_STEP_MS, Math.floor(TRAVEL_MS / Math.max(trail.target, 1)));
        const timer = setTimeout(() => setStep((n) => n + 1), step === 0 ? 0 : stepMs);
        return () => clearTimeout(timer);
    }, [trail, step]);

    const pulsing = trail !== null && step >= trail.target;
    useLayoutEffect(() => {
        if (!pulsing) return;
        ringRef.current?.querySelectorAll('animate').forEach((a) => {
            const anim = a as SVGAnimationElement;
            if (typeof anim.beginElement === 'function') anim.beginElement();
        });
    }, [pulsing, trail]);

    if (!trail || !plot || !yScale || !rows.length) return null;
    const pos = trail.path[Math.min(step, trail.target)];
    const row = rows[pos];
    const value = row?.[trail.key];
    if (typeof value !== 'number') return null;
    const cx = plot.x + ((pos + 0.5) * plot.width) / rows.length;
    const cy = yScale(value);
    if (cy === undefined || !Number.isFinite(cy)) return null;

    return (
        <ZIndexLayer zIndex={1300}>
            <g pointerEvents="none" aria-hidden="true">
                <circle
                    key={`ring-${trail.gen}`}
                    ref={ringRef}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill="none"
                    stroke={trail.color}
                    strokeWidth={2}
                    opacity={0}
                >
                    {pulsing ? (
                        <>
                            {/* 900ms ease-out growth, then 100ms pause, repeated (a pulse). */}
                            <animate
                                attributeName="r"
                                values="5;16;5"
                                keyTimes="0;0.9;1"
                                calcMode="spline"
                                keySplines="0 0 0.58 1;0 0 1 1"
                                dur="1s"
                                begin="indefinite"
                                repeatCount="indefinite"
                            />
                            <animate
                                attributeName="opacity"
                                values="0.85;0;0"
                                keyTimes="0;0.9;1"
                                calcMode="spline"
                                keySplines="0 0 0.58 1;0 0 1 1"
                                dur="1s"
                                begin="indefinite"
                                repeatCount="indefinite"
                            />
                        </>
                    ) : null}
                </circle>
                <circle cx={cx} cy={cy} r={5} fill={trail.color} />
            </g>
        </ZIndexLayer>
    );
}
