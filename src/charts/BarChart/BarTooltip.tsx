import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useActiveTooltipCoordinate, useChartHeight, useChartWidth, useXAxisScale, useYAxisScale } from 'recharts';

import { TooltipFrame, TooltipMarker, TooltipRow, TooltipTitle, type ChartRow, type SeriesInput } from '../../core';
import { stackEnd, stackTotal, tooltipAwayFromCursor } from './barLayout';

/** One point in the tooltip. */
export interface BarTooltipPoint<S extends SeriesInput = SeriesInput> {
    /** Row key of the series (`s0`, `s1`, ...). */
    key: string;
    /** Series name. */
    name: string;
    /** Resolved series colour. */
    color: string;
    /** Value (never `null`: null points are left out, as in the original). */
    value: number;
    /** Value after `tooltipValueFormatter`. */
    formattedValue: string;
    /** Stacked mode: share (0-100) of the stack; otherwise `undefined`. */
    percentage?: number;
    /** The caller's series object. */
    series: S;
}

/** What `renderTooltip` receives (the replacement for the `this` of `tooltipHtmlFormatter`). */
export interface BarTooltipContext<S extends SeriesInput = SeriesInput> {
    /** Raw category value (original `this.x` / `this.key`). */
    category: string | number;
    /** Category index. */
    index: number;
    /** Header text after `tooltipHeaderFormatter` / `xAxisLabelFormatter`. */
    header: string;
    /** Points shown: every visible series with a value (shared), or the hovered one (not shared). Was `this.points`. */
    points: ReadonlyArray<BarTooltipPoint<S>>;
    /** Whether the tooltip is shared. */
    shared: boolean;
    /** Stacked mode: sum of the visible positive values (original `this.total`); otherwise `undefined`. */
    total?: number;
}

/** A series as the tooltip sees it. */
export interface BarTooltipSeries<S extends SeriesInput = SeriesInput> {
    key: string;
    name: string;
    color: string;
    hidden: boolean;
    input: S;
}

interface BarTooltipContentProps<S extends SeriesInput> {
    rows: ReadonlyArray<ChartRow>;
    series: ReadonlyArray<BarTooltipSeries<S>>;
    stacked: boolean;
    horizontal: boolean;
    shared: boolean;
    headerFormatter: (category: string | number, index: number) => string;
    valueFormatter: (value: number, series: S) => string;
    renderTooltip?: (context: BarTooltipContext<S>) => ReactNode;
    // Injected by Recharts.
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: unknown; dataKey?: unknown }>;
    activeIndex?: number | string | null;
}

/**
 * Tooltip content that places itself like the original's `tooltipAwayFromCursor` positioner. Render it through
 * `<Tooltip position={{ x: 0, y: 0 }} content={<BarTooltipContent … />} />`: the Recharts wrapper stays at the plot
 * origin and this component translates itself, using the chart's scales for the anchor and its own measured size.
 */
export function BarTooltipContent<S extends SeriesInput>({
    rows,
    series,
    stacked,
    horizontal,
    shared,
    headerFormatter,
    valueFormatter,
    renderTooltip,
    active,
    payload,
    activeIndex,
}: BarTooltipContentProps<S>) {
    const xScale = useXAxisScale(0);
    const yScale = useYAxisScale(0);
    const coord = useActiveTooltipCoordinate();
    const chartWidth = useChartWidth() ?? 0;
    const chartHeight = useChartHeight() ?? 0;
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<{ w: number; h: number } | null>(null);

    const idx = activeIndex === undefined || activeIndex === null ? NaN : Number(activeIndex);
    const row = ((payload?.[0]?.payload as ChartRow | undefined) ??
        (Number.isInteger(idx) ? rows[idx] : undefined)) as ChartRow | undefined;
    const visible = series.filter((s) => !s.hidden);
    const visibleKeys = visible.map((s) => s.key);
    const hoveredKey = !shared ? String(payload?.[0]?.dataKey ?? '') : null;
    const candidates = shared ? visible : visible.filter((s) => s.key === hoveredKey);
    const points: BarTooltipPoint<S>[] = [];
    if (row) {
        for (const s of candidates) {
            const v = row[s.key];
            if (typeof v !== 'number' || !Number.isFinite(v)) continue;
            const total = stacked ? stackTotal(row, visibleKeys, v >= 0 ? 1 : -1) : 0;
            points.push({
                key: s.key,
                name: s.name,
                color: s.color,
                value: v,
                formattedValue: valueFormatter(v, s.input),
                percentage: stacked && total !== 0 ? (v / total) * 100 : undefined,
                series: s.input,
            });
        }
    }
    const show = Boolean(active && row && points.length);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (!size || size.w !== w || size.h !== h) setSize({ w, h });
    });

    if (!show || !row) return null;

    // Anchor as the original computes it: along the category axis the category centre (shared) or the hovered bar's
    // centre (not shared); along the value axis the mean end of the shown bars (stack segment tops when stacked).
    const catScale = horizontal ? yScale : xScale;
    const valScale = horizontal ? xScale : yScale;
    const catPx = shared
        ? catScale?.(row.index, { position: 'middle' })
        : horizontal
          ? coord?.y
          : coord?.x;
    let valSum = 0;
    let valCount = 0;
    for (const p of points) {
        const end = stacked ? stackEnd(row, visibleKeys, p.key) : p.value;
        const px = end === null ? undefined : valScale?.(end);
        if (px !== undefined && Number.isFinite(px)) {
            valSum += px;
            valCount++;
        }
    }
    const valPx = valCount ? valSum / valCount : undefined;
    const anchorX = (horizontal ? valPx : catPx) ?? coord?.x ?? 0;
    const anchorY = (horizontal ? catPx : valPx) ?? coord?.y ?? 0;
    const pos = size
        ? tooltipAwayFromCursor({ anchorX, anchorY, width: size.w, height: size.h, chartWidth, chartHeight })
        : { x: 0, y: 0 };

    const header = headerFormatter(row.category, row.index);
    const context: BarTooltipContext<S> = {
        category: row.category,
        index: row.index,
        header,
        points,
        shared,
        total: stacked ? stackTotal(row, visibleKeys) : undefined,
    };

    return (
        <div
            ref={ref}
            style={{
                transform: `translate(${Math.round(pos.x)}px, ${Math.round(pos.y)}px)`,
                visibility: size ? 'visible' : 'hidden',
            }}
        >
            {renderTooltip ? (
                // The original's HTML formatter output sat in a tooltip label with `padding: 10`.
                <TooltipFrame style={{ padding: 10 }}>{renderTooltip(context)}</TooltipFrame>
            ) : (
                // Original: label padding 10 + the formatter's own `padding: 4px 6px`.
                <TooltipFrame style={{ padding: '14px 16px' }}>
                    <TooltipTitle>{header}</TooltipTitle>
                    {points.map((p) => (
                        <TooltipRow
                            key={p.key}
                            marker={<TooltipMarker kind="square" color={p.color} />}
                            label={p.name}
                            value={p.formattedValue}
                        />
                    ))}
                </TooltipFrame>
            )}
        </div>
    );
}
