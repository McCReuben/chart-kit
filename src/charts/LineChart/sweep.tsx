import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { usePlotArea } from 'recharts';

import { useLatestRef } from '../../core';

/** Duration of the left-to-right sweep in ms (as in the original). */
export const SWEEP_DURATION = 1400;

/** Extra room around the plot area inside the clip, so thick lines and markers at the edges are not cut. */
const CLIP_PAD = 12;

/** Value that restarts the sweep when it changes. `null`/`undefined` = no animation. */
export type AnimateKey = string | number | null | undefined;

/** State of the sweep, from {@link useSweep}. */
export interface SweepState {
    /** Increases by one each time a sweep starts; 0 = never swept. */
    run: number;
    /** `true` while a sweep is running (the lines are clipped). */
    active: boolean;
    /** Ends sweep `run` (ignored if a newer sweep has started). Stable identity. */
    finish: (run: number) => void;
}

/**
 * Tracks `animateKey`: a sweep starts on mount when the key is not null, and whenever the key changes to a new
 * non-null value (compared with `Object.is`, so re-renders with the same key, new formatters or equal-content data
 * never restart it). Changing the key to null stops a running sweep.
 */
export function useSweep(animateKey: AnimateKey): SweepState {
    const key = animateKey ?? null;
    const [state, setState] = useState(() => ({ key, run: key !== null ? 1 : 0, active: key !== null }));
    let current = state;
    if (!Object.is(state.key, key)) {
        // Derived state: update during render so the first frame after a key change is already clipped.
        current = { key, run: key !== null ? state.run + 1 : state.run, active: key !== null };
        setState(current);
    }
    const finish = useCallback((run: number) => {
        setState((s) => (s.run === run && s.active ? { ...s, active: false } : s));
    }, []);
    return { run: current.run, active: current.active, finish };
}

function easeInOutSine(t: number): number {
    return -(Math.cos(Math.PI * t) - 1) / 2;
}

/** Props of {@link SweepClip}. */
export interface SweepClipProps {
    /** Clip path id (from `useUniqueId`). */
    id: string;
    /** Sweep run from {@link useSweep}; a new value restarts the animation. */
    run: number;
    /** Called when the sweep has finished (or its safety timer fired). */
    onDone: (run: number) => void;
    /** Duration in ms. */
    duration?: number;
}

/**
 * Render inside the chart while a sweep is active. Defines `<clipPath id>` whose rect grows from zero to the full plot
 * width, and animates it directly on the DOM (no React re-render per frame). Lines opt in with
 * `style={{ clipPath: url(#id) }}` only while the sweep is active, so an interrupted sweep never leaves them clipped:
 * a safety timer ends the sweep even if animation frames are throttled (background tab).
 */
export function SweepClip({ id, run, onDone, duration = SWEEP_DURATION }: SweepClipProps) {
    const plot = usePlotArea();
    const plotRef = useLatestRef(plot);
    const onDoneRef = useLatestRef(onDone);
    const rectRef = useRef<SVGRectElement>(null);
    const widthRef = useRef(0);

    useLayoutEffect(() => {
        widthRef.current = 0;
        rectRef.current?.setAttribute('width', '0');
        let raf = 0;
        let start: number | null = null;
        const step = (now: number) => {
            if (start === null) start = now;
            const t = Math.min(1, (now - start) / duration);
            const p = plotRef.current;
            if (p) {
                widthRef.current = (p.width + CLIP_PAD * 2) * easeInOutSine(t);
                rectRef.current?.setAttribute('width', String(widthRef.current));
            }
            if (t < 1) raf = requestAnimationFrame(step);
            else onDoneRef.current(run);
        };
        raf = requestAnimationFrame(step);
        const safety = setTimeout(() => onDoneRef.current(run), duration + 300);
        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(safety);
        };
    }, [run, duration, plotRef, onDoneRef]);

    return (
        <defs>
            <clipPath id={id} clipPathUnits="userSpaceOnUse">
                <rect
                    ref={rectRef}
                    x={(plot?.x ?? 0) - CLIP_PAD}
                    y={(plot?.y ?? 0) - CLIP_PAD}
                    width={widthRef.current}
                    height={(plot?.height ?? 0) + CLIP_PAD * 2}
                />
            </clipPath>
        </defs>
    );
}
