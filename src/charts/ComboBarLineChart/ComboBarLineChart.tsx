import { useCallback, useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';

import {
    CHART_MARGIN,
    ChartFrame,
    ChartLegend,
    PlotAreaProbe,
    ResetZoomButton,
    SharedTooltipContent,
    ZoomSelection,
    buildRows,
    brighten,
    categoryAxisProps,
    defaultCategoryFormatter,
    defaultValueFormatter,
    gridProps,
    niceScale,
    resolveSeries,
    seriesExtent,
    tooltipProps,
    useContentStable,
    useSeriesHover,
    useSeriesVisibility,
    useStableCallback,
    useXZoom,
    valueAxisProps,
} from '../../core';
import type { NiceScale, SeriesInput } from '../../core';
import { useChartTheme } from '../../theme';
import type { ChartThemeOverrides } from '../../theme';

/** One series of a {@link ComboBarLineChart}. */
export interface ComboSeries extends SeriesInput {
    /** Series name, shown in the legend and tooltip. */
    name: string;
    /** Values aligned to `categories`; `null` = gap. */
    data: Array<number | null>;
    /** Series colour; default `theme.palette[i % n]`. */
    color?: string;
    /** `'column'` (default) draws bars; `'spline'` draws a smooth line above the columns. */
    type?: 'column' | 'spline';
}

/** Props of {@link ComboBarLineChart}. */
export interface ComboBarLineChartProps {
    /** Series to draw: columns and splines share the x and y axes. */
    series: ComboSeries[];
    /** Category labels of the x axis. */
    categories: Array<string | number>;
    /** Total height in px, legend included. Default 360. */
    height?: number;
    /** Show the legend below the plot (click toggles a series, hover highlights it). Default `false`. */
    showLegend?: boolean;
    /** Y-axis minimum. Default: automatic (0 is included while a column series is visible). */
    yAxisMin?: number;
    /** Y-axis maximum. Default: automatic. */
    yAxisMax?: number;
    /** Explicit y-axis ticks; the axis spans the first to the last tick unless `yAxisMin`/`yAxisMax` are set. */
    yAxisTickPositions?: number[];
    /** Y-axis label formatter. Default: the number as is. */
    yAxisFormatter?: (value: number) => string;
    /** Y-axis title (rotated, `theme.text.primary`). */
    yAxisTitle?: string;
    /** X-axis title (below the labels, `theme.axisLabel`). */
    xAxisTitle?: string;
    /** X-axis label formatter `(category, index)`; e.g. `retailWeekFormatter(2026)`. Default `String(category)`. */
    xAxisLabelFormatter?: (value: string | number, index: number) => string;
    /** Tooltip value formatter `(value, series)`. Default: the value, or `'—'` for null. */
    tooltipValueFormatter?: (value: number | null, series: ComboSeries) => string;
    /** Tooltip header formatter `(category, index)`. Default: `xAxisLabelFormatter`. */
    tooltipHeaderFormatter?: (category: string | number, index: number) => string;
    /**
     * Show the tooltip pinned at this category index (of the rendered rows) without hovering. For static display,
     * documentation and screenshots. Default: tooltip only on hover.
    */
    defaultTooltipIndex?: number;
    /** Background colour. Default `theme.componentBackground`; `'transparent'` is allowed. */
    backgroundColor?: string;
    /** Per-instance theme overrides, merged over the context theme. */
    theme?: ChartThemeOverrides;
    /** Class name on the outer element. */
    className?: string;
    /** Accessible name of the chart. Default `'Combo bar and line chart'`. */
    ariaLabel?: string;
}

/** Opacity of the other splines while one series is hovered in the legend (columns keep opacity 1). */
const SPLINE_INACTIVE_OPACITY = 0.2;
/** Group and point padding of the columns (shares of the band). */
const GROUP_PADDING = 0.1;
const POINT_PADDING = 0.05;
const ANIMATION_MS = 1000;

/**
 * Columns and smooth lines on one shared value axis. Columns use group padding 0.1,
 * point padding 0.05 and a 3px top radius; splines have no markers except a 5px dot on hover. Shared tooltip with a
 * dotted crosshair, drag-to-zoom on x with a "Reset zoom" button, and an optional legend (click toggles, hover dims
 * the other lines).
 */
export function ComboBarLineChart({
    series,
    categories,
    height = 360,
    showLegend = false,
    yAxisMin,
    yAxisMax,
    yAxisTickPositions,
    yAxisFormatter,
    yAxisTitle,
    xAxisTitle,
    xAxisLabelFormatter,
    tooltipValueFormatter,
    tooltipHeaderFormatter,
    defaultTooltipIndex,
    backgroundColor,
    theme: overrides,
    className,
    ariaLabel = 'Combo bar and line chart',
}: ComboBarLineChartProps) {
    const theme = useChartTheme(overrides);
    const stableSeries = useContentStable(series);
    const stableCats = useContentStable(categories);
    const stableTicks = useContentStable(yAxisTickPositions);
    const resolved = useMemo(() => resolveSeries(stableSeries, theme.palette), [stableSeries, theme.palette]);
    const allRows = useMemo(() => buildRows(stableCats, stableSeries), [stableCats, stableSeries]);

    const fmtLabel = useStableCallback((v: string | number, i: number) =>
        (xAxisLabelFormatter ?? defaultCategoryFormatter)(v, i),
    );
    const fmtHeader = useStableCallback((v: string | number, i: number) =>
        (tooltipHeaderFormatter ?? xAxisLabelFormatter ?? defaultCategoryFormatter)(v, i),
    );
    const fmtY = useStableCallback((v: number) => (yAxisFormatter ? yAxisFormatter(v) : String(v)));
    const fmtTooltip = useStableCallback((v: number | null, s: { key: string }) => {
        const input = resolved.find((r) => r.key === s.key)?.input as ComboSeries | undefined;
        return tooltipValueFormatter && input ? tooltipValueFormatter(v, input) : defaultValueFormatter(v);
    });

    const visibility = useSeriesVisibility(
        resolved.map((s) => s.key),
        resolved.map((s) => s.name),
    );
    // Legend hover sets `inactive` on the other series; only splines fade (columns keep opacity 1).
    const hover = useSeriesHover({
        dimOpacity: (key) => ((resolved.find((s) => s.key === key)?.input as ComboSeries | undefined)?.type === 'spline' ? SPLINE_INACTIVE_OPACITY : 1),
    });
    const zoom = useXZoom({ length: allRows.length, resetKey: allRows });
    const rows = useMemo(() => zoom.sliceRows(allRows), [zoom.sliceRows, allRows]);

    const [plotHeight, setPlotHeight] = useState<number | null>(null);
    const onPlotArea = useCallback((a: { height: number }) => setPlotHeight(Math.round(a.height)), []);

    const isSpline = (s: (typeof resolved)[number]) => (s.input as ComboSeries).type === 'spline';
    const columns = resolved.filter((s) => !isSpline(s));
    const splines = resolved.filter(isSpline);
    const visibleKeys = resolved.filter((s) => !visibility.isHidden(s.key)).map((s) => s.key);
    const hasVisibleColumn = columns.some((s) => !visibility.isHidden(s.key));
    const extent = seriesExtent(rows, visibleKeys);
    const pixelLength = plotHeight ?? height * 0.6;

    const scale = useMemo<NiceScale | undefined>(() => {
        if (stableTicks && stableTicks.length) {
            const sorted = [...stableTicks].sort((a, b) => a - b);
            const min = yAxisMin ?? sorted[0];
            const max = yAxisMax ?? sorted[sorted.length - 1];
            const ticks = sorted.filter((t) => t >= min && t <= max);
            return { min, max, ticks, interval: ticks.length > 1 ? ticks[1] - ticks[0] : 0, domain: [min, max] };
        }
        const lo = extent ? extent[0] : (yAxisMin ?? 0);
        const hi = extent ? extent[1] : (yAxisMax ?? 1);
        const s = niceScale(yAxisMin ?? lo, yAxisMax ?? hi, {
            pixelLength,
            includeZero: hasVisibleColumn && yAxisMin === undefined,
            fixedMin: yAxisMin,
            fixedMax: yAxisMax,
        });
        return s;
    }, [stableTicks, yAxisMin, yAxisMax, extent?.[0], extent?.[1], pixelLength, hasVisibleColumn]);

    const items = resolved.map((s) => ({
        key: s.key,
        name: s.name,
        color: s.color,
        hidden: visibility.isHidden(s.key),
        symbol: isSpline(s) ? ('line' as const) : ('square' as const),
    }));
    const tooltipSeries = useMemo(
        () => items.map((i) => ({ ...i, marker: i.symbol })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [JSON.stringify(items)],
    );

    const n = Math.max(1, columns.length);
    const pointSlot = (1 - 2 * GROUP_PADDING) / n; // share of the band per column
    const barCategoryGap = `${(GROUP_PADDING + POINT_PADDING * pointSlot) * 100}%`;
    const barGap = `${2 * POINT_PADDING * pointSlot * 100}%`;

    return (
        <ChartFrame
            height={height}
            theme={theme}
            backgroundColor={backgroundColor}
            ariaLabel={ariaLabel}
            className={className}
            legend={
                showLegend ? (
                    <ChartLegend items={items} onToggle={visibility.toggle} onItemHover={hover.setHovered} />
                ) : undefined
            }
        >
            <ComposedChart
                data={rows}
                margin={CHART_MARGIN}
                barCategoryGap={barCategoryGap}
                barGap={barGap}
                {...zoom.chartHandlers}
                style={{ userSelect: 'none' }}
            >
                <CartesianGrid {...gridProps(theme)} />
                <XAxis
                    {...categoryAxisProps(theme, {
                        categories: stableCats,
                        labelFormatter: fmtLabel,
                        rotateLabels: true,
                        title: xAxisTitle,
                    })}
                />
                <YAxis {...valueAxisProps(theme, { scale, formatter: fmtY, title: yAxisTitle, titleFontSize: 11 })} />
                <Tooltip
                    {...tooltipProps(theme)}
                    {...(defaultTooltipIndex !== undefined ? { defaultIndex: defaultTooltipIndex, active: true } : {})}
                    content={
                        <SharedTooltipContent
                            rows={rows}
                            series={tooltipSeries}
                            headerFormatter={fmtHeader}
                            valueFormatter={fmtTooltip}
                        />
                    }
                />
                {columns.map((s) => (
                    <Bar
                        key={s.key}
                        dataKey={s.key}
                        name={s.name}
                        fill={s.color}
                        radius={[3, 3, 0, 0]}
                        hide={visibility.isHidden(s.key)}
                        activeBar={{ fill: brighten(s.color, -0.1) }}
                        animationDuration={ANIMATION_MS}
                        animationEasing="ease-out"
                    />
                ))}
                {splines.map((s) => (
                    <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.name}
                        stroke={s.color}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, fill: s.color, stroke: 'none', strokeWidth: 0 }}
                        hide={visibility.isHidden(s.key)}
                        animationDuration={ANIMATION_MS}
                        animationEasing="ease-out"
                        {...hover.dimProps(s.key)}
                    />
                ))}
                <PlotAreaProbe onChange={onPlotArea} />
                <ZoomSelection selection={zoom.selection} />
                <ResetZoomButton visible={zoom.isZoomed} onClick={zoom.reset} fill={backgroundColor} />
            </ComposedChart>
        </ChartFrame>
    );
}
