import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { ReferenceArea, ZIndexLayer, usePlotArea, type MouseHandlerDataParam } from 'recharts';

import { useChartTheme } from '../theme/ChartThemeProvider';
import type { ChartTheme } from '../theme/types';

/** Minimum drag distance in px before a drag becomes a zoom (the originals need about 10px). */
export const MIN_ZOOM_DRAG_PX = 10;

/** An inclusive range of original category indices. */
export interface IndexRange {
    /** First index (inclusive). */
    start: number;
    /** Last index (inclusive). */
    end: number;
}

/** Options of {@link useXZoom}. */
export interface XZoomOptions {
    /** Number of categories (full range). */
    length: number;
    /** Zoom resets whenever this changes by identity (pass content-stable rows, e.g. from `useContentStable`). */
    resetKey?: unknown;
    /** Disable zooming (handlers become no-ops). Default `true` = enabled. */
    enabled?: boolean;
    /** Drag threshold in px (default 10). */
    minDragPx?: number;
    /** Range to start zoomed into (static demos/tests). Read on mount only. */
    initialRange?: IndexRange | null;
}

/** Mouse handlers to spread on the Recharts chart root. */
export interface XZoomChartHandlers {
    /** Starts a potential drag. */
    onMouseDown: (state: MouseHandlerDataParam, event: ReactMouseEvent) => void;
    /** Updates the selection while dragging. */
    onMouseMove: (state: MouseHandlerDataParam, event: ReactMouseEvent) => void;
}

/** Result of {@link useXZoom}. */
export interface XZoom {
    /** Zoomed range (original indices), or `null` when showing everything. */
    range: IndexRange | null;
    /** `true` while zoomed in. */
    isZoomed: boolean;
    /** The rows to give the chart: `rows.slice(start, end + 1)` while zoomed (same reference when not zoomed). */
    sliceRows: <T>(rows: ReadonlyArray<T>) => T[];
    /** Current drag selection (original indices) while the drag is past the threshold, else `null`. */
    selection: IndexRange | null;
    /** Spread on the chart: `<LineChart {...zoom.chartHandlers}>` (compose if you need your own handlers). */
    chartHandlers: XZoomChartHandlers;
    /** Show the full range again. */
    reset: () => void;
    /**
     * `true` once right after a drag-zoom ends, so a chart can ignore the click event that follows mouse-up
     * (e.g. `onPointClick`). Reading it clears it.
     */
    consumeDragClick: () => boolean;
}

function toIndex(state: MouseHandlerDataParam | undefined): number | null {
    const raw = state?.activeTooltipIndex ?? state?.activeIndex;
    if (raw === undefined || raw === null) return null;
    const n = Number(raw);
    return Number.isInteger(n) ? n : null;
}

/**
 * Drag-to-zoom on a category x axis (the originals' `zoomType: 'x'`). Mouse down, drag at least `minDragPx`, release:
 * the chart shows only the selected categories (slice the rows with `sliceRows`, which works for bars too).
 * Clicks and tiny drags are ignored. The selection is committed on mouse-up anywhere in the window. The zoom resets
 * when `resetKey` or `length` changes. Draw the selection with {@link ZoomSelection} and offer
 * {@link ResetZoomButton}.
 */
export function useXZoom({
    length,
    resetKey,
    enabled = true,
    minDragPx = MIN_ZOOM_DRAG_PX,
    initialRange = null,
}: XZoomOptions): XZoom {
    // The zoom is stored with the data identity it was made for, so a data change resets it in the same render
    // (no frame with a stale slice).
    const [stored, setStored] = useState<{ range: IndexRange; resetKey: unknown; length: number } | null>(() =>
        initialRange ? { range: initialRange, resetKey, length } : null,
    );
    const range = stored && stored.resetKey === resetKey && stored.length === length ? stored.range : null;
    const [selection, setSelection] = useState<IndexRange | null>(null);
    const drag = useRef<{ startIndex: number; endIndex: number; startX: number; active: boolean } | null>(null);
    const suppressClick = useRef(false);
    const rangeRef = useRef(range);
    rangeRef.current = range;
    const dataRef = useRef({ resetKey, length });
    dataRef.current = { resetKey, length };
    const setRange = useCallback((r: IndexRange | null) => {
        setStored(r ? { range: r, ...dataRef.current } : null);
    }, []);

    // Drop an in-flight drag when the data changes.
    useLayoutEffect(() => {
        drag.current = null;
        setSelection(null);
    }, [resetKey, length]);

    const finish = useCallback(() => {
        const d = drag.current;
        drag.current = null;
        setSelection(null);
        if (!d || !d.active) return;
        const start = Math.min(d.startIndex, d.endIndex);
        const end = Math.max(d.startIndex, d.endIndex);
        if (end <= start) return; // a single category is not a useful zoom
        suppressClick.current = true;
        setRange({ start, end });
    }, [setRange]);

    useEffect(() => {
        if (!enabled) return undefined;
        const onUp = () => {
            if (drag.current) finish();
        };
        window.addEventListener('mouseup', onUp);
        return () => window.removeEventListener('mouseup', onUp);
    }, [enabled, finish]);

    const onMouseDown = useCallback(
        (state: MouseHandlerDataParam, event: ReactMouseEvent) => {
            if (!enabled || (event && 'button' in event && event.button !== 0)) return;
            const i = toIndex(state);
            if (i === null) return;
            const abs = (rangeRef.current?.start ?? 0) + i;
            drag.current = { startIndex: abs, endIndex: abs, startX: event?.clientX ?? 0, active: false };
            suppressClick.current = false;
            event?.preventDefault?.(); // no text selection while dragging
        },
        [enabled],
    );

    const onMouseMove = useCallback((state: MouseHandlerDataParam, event: ReactMouseEvent) => {
        const d = drag.current;
        if (!d) return;
        const i = toIndex(state);
        if (i !== null) d.endIndex = (rangeRef.current?.start ?? 0) + i;
        if (!d.active && Math.abs((event?.clientX ?? d.startX) - d.startX) >= minDragPx) d.active = true;
        if (d.active) {
            const next = { start: Math.min(d.startIndex, d.endIndex), end: Math.max(d.startIndex, d.endIndex) };
            setSelection((prev) => (prev && prev.start === next.start && prev.end === next.end ? prev : next));
        }
    }, [minDragPx]);

    const reset = useCallback(() => {
        setRange(null);
        setSelection(null);
    }, [setRange]);

    const consumeDragClick = useCallback(() => {
        const v = suppressClick.current;
        suppressClick.current = false;
        return v;
    }, []);

    const sliceRows = useCallback(
        <T,>(rows: ReadonlyArray<T>): T[] => (range ? rows.slice(range.start, range.end + 1) : (rows as T[])),
        [range],
    );

    const chartHandlers = useMemo(() => ({ onMouseDown, onMouseMove }), [onMouseDown, onMouseMove]);

    return { range, isZoomed: range !== null, sliceRows, selection, chartHandlers, reset, consumeDragClick };
}

/** Props of {@link ZoomSelection}. */
export interface ZoomSelectionProps {
    /** `zoom.selection`. Nothing is drawn when `null`. */
    selection: IndexRange | null;
    /**
     * Maps an original category index to the x-axis value. Default: the index itself, which is right when the
     * category axis `dataKey` is `'index'` (the `categoryAxisProps` default).
     */
    toAxisValue?: (index: number) => unknown;
    /** Fill; default `theme.selectionFill`. */
    fill?: string;
    /** Axis ids (default 0). */
    xAxisId?: string | number;
    /** See `xAxisId`. */
    yAxisId?: string | number;
}

/** Draws the drag-zoom selection as a `ReferenceArea` in `theme.selectionFill`. Render inside the chart. */
export function ZoomSelection({ selection, toAxisValue, fill, xAxisId = 0, yAxisId = 0 }: ZoomSelectionProps) {
    const theme = useChartTheme();
    if (!selection) return null;
    const map = toAxisValue ?? ((i: number) => i);
    return (
        <ReferenceArea
            x1={map(selection.start) as number}
            x2={map(selection.end) as number}
            xAxisId={xAxisId}
            yAxisId={yAxisId}
            fill={fill ?? theme.selectionFill}
            fillOpacity={1}
            stroke="none"
            ifOverflow="hidden"
        />
    );
}

/** Props of {@link ResetZoomButton}. */
export interface ResetZoomButtonProps {
    /** Called on click / Enter / Space. */
    onClick: () => void;
    /** Show the button (usually `zoom.isZoomed`). Default `true`. */
    visible?: boolean;
    /** Label (default `'Reset zoom'`). */
    label?: string;
    /** Button fill; default the chart background (`theme.componentBackground`). Pass the chart's `backgroundColor`. */
    fill?: string;
    /** Theme; default the context theme. */
    theme?: ChartTheme;
}

/**
 * The originals' `resetZoomButton`, drawn in SVG inside the chart: top-right of the plot area (x -10, y 10), fill =
 * chart background, 1px `componentBorder` stroke, radius 6, 11px `text.primary`, hover fill `componentBorder`,
 * pointer cursor, keyboard-accessible. Render inside the chart: `<ResetZoomButton visible={zoom.isZoomed} onClick={zoom.reset} />`.
 */
export function ResetZoomButton({ onClick, visible = true, label = 'Reset zoom', fill, theme: themeProp }: ResetZoomButtonProps) {
    const contextTheme = useChartTheme();
    const theme = themeProp ?? contextTheme;
    const plot = usePlotArea();
    const [hover, setHover] = useState(false);
    const textRef = useRef<SVGTextElement>(null);
    const fontSize = theme.fontSize.axis;
    const [textWidth, setTextWidth] = useState(() => label.length * fontSize * 0.55);
    useLayoutEffect(() => {
        const el = textRef.current;
        if (!el || typeof el.getComputedTextLength !== 'function') return;
        const w = el.getComputedTextLength();
        if (w > 0 && Math.abs(w - textWidth) > 0.5) setTextWidth(w);
    });
    if (!visible || !plot) return null;
    const padX = 8;
    const h = fontSize + 12;
    const w = Math.ceil(textWidth + padX * 2);
    const x = plot.x + plot.width - 10 - w;
    const y = plot.y + 10;
    const bg = fill && fill !== 'transparent' ? fill : theme.componentBackground;
    return (
        <ZIndexLayer zIndex={3000}>
            <g
                className="ck-reset-zoom"
                role="button"
                tabIndex={0}
                aria-label={label}
                transform={`translate(${x},${y})`}
                style={{ cursor: 'pointer' }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick();
                    }
                }}
            >
                <rect
                    x={0.5}
                    y={0.5}
                    width={w}
                    height={h}
                    rx={6}
                    ry={6}
                    fill={hover ? theme.componentBorder : bg}
                    stroke={theme.componentBorder}
                    strokeWidth={1}
                />
                <text
                    ref={textRef}
                    x={0.5 + w / 2}
                    y={0.5 + h / 2}
                    dy="0.355em"
                    textAnchor="middle"
                    fontSize={fontSize}
                    fontFamily={theme.fontFamily}
                    fill={theme.text.primary}
                    style={{ userSelect: 'none' }}
                >
                    {label}
                </text>
            </g>
        </ZIndexLayer>
    );
}
