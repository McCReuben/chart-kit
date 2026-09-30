import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { CartesianGrid, Line, LineChart as RechartsLineChart, Tooltip, XAxis, YAxis, type PlotArea } from 'recharts';

import {
    CHART_MARGIN,
    ChartFrame,
    ChartLegend,
    NearestSeriesTracker,
    PlotAreaProbe,
    ResetZoomButton,
    SharedTooltipContent,
    ZoomSelection,
    buildRows,
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
    useUniqueId,
    useXZoom,
    valueAxisProps,
    type IndexRange,
    type SeriesInput,
    type TooltipSeriesItem,
} from '../../core';
import { useChartTheme, type ChartThemeOverrides } from '../../theme';
import { HoverTrail } from './HoverTrail';
import { dashArrayFor, defaultAxisNumber, isDashed, type LineDashStyle } from './lineStyle';
import { SweepClip, useSweep, type AnimateKey } from './sweep';

/** One line. */
export interface LineChartSeries extends SeriesInput {
    /** Display name (legend and tooltip). */
    name: string;
    /** Values aligned to `categories`; `null` leaves a gap in the line. */
    data: Array<number | null>;
    /** Line colour; default `theme.palette[i]`. */
    color?: string;
    /** Dash style (e.g. `'Dash'` for a forecast); default `'Solid'`. Dashed series get dashed legend and tooltip keys. */
    dashStyle?: LineDashStyle;
    /** Line width in px; default 2.5. */
    lineWidth?: number;
    /** Radius of the hover marker is `markerRadius + 1`; default `markerRadius` 5 (a 6px hover marker). */
    markerRadius?: number;
}

/** Crosshair override (`xAxisCrosshair`). */
export interface LineChartCrosshair {
    /** Line colour; default `theme.crosshair`. */
    color?: string;
    /** Line width in px; default 1. */
    width?: number;
    /** Dash style; default `'Solid'` (the built-in crosshair is `'Dot'`). */
    dashStyle?: LineDashStyle;
}

/** Props of {@link LineChart}. */
export interface LineChartProps {
    /** Lines to draw, in order. */
    series: LineChartSeries[];
    /** Category labels of the x axis (one per data point). */
    categories: Array<string | number>;
    /** Total height in px, legend included. Default 320. */
    height?: number;
    /** Show the legend below the chart (click toggles a series, hover highlights it). Default `false`. */
    showLegend?: boolean;
    /** X-axis label formatter `(category, index)`; default `String(category)`. Also the default tooltip header. */
    xAxisLabelFormatter?: (value: string | number, index: number) => string;
    /** Y-axis label formatter; default: plain numbers, with k/M/G suffixes for large tick intervals. */
    yAxisFormatter?: (value: number) => string;
    /** Tooltip value formatter; default: the number. Only points with a value are listed (gaps are skipped). */
    tooltipValueFormatter?: (value: number | null, series: LineChartSeries) => string;
    /** Tooltip header `(category, index)`; default `xAxisLabelFormatter`. */
    tooltipHeaderFormatter?: (category: string | number, index: number) => string;
    /** Background colour; default `theme.componentBackground`. `'transparent'` is allowed. */
    backgroundColor?: string;
    /** Per-instance theme overrides, merged over the context theme. */
    theme?: ChartThemeOverrides;
    /** Class name on the outer element. */
    className?: string;
    /** Accessible name of the chart. Default `'Line chart'`. */
    ariaLabel?: string;
    /** Show the y axis (labels, title and grid lines). Default `true`. Hidden, it still scales the lines. */
    yAxisVisible?: boolean;
    /** Y-axis title (rotated, left). */
    yAxisTitle?: string;
    /** X-axis title (below the labels). */
    xAxisTitle?: string;
    /** Category indices that get an x-axis label; default: every label that fits. */
    xAxisTickPositions?: number[];
    /**
     * Crosshair override: `false` hides it, an object sets colour, width and dash style. Default (and `true`): the
     * 1px dotted crosshair in `theme.crosshair`.
     */
    xAxisCrosshair?: boolean | LineChartCrosshair;
    /**
     * Hover trail (was `sparkPoint`): hovering a point sends a dot in the series colour from the series' first point
     * along the line to the hovered point, then a ring pulses around it until the next hover. Default `false`.
     */
    hoverTrail?: boolean;
    /**
     * When this value changes, the lines sweep in from left to right (1.4 s). It also sweeps on mount when not null.
     * `null` (default) = no animation. Re-renders with the same key never restart the sweep.
     */
    animateKey?: AnimateKey;
    /** Drag-to-zoom along x with a "Reset zoom" button. Default `true`. */
    zoomable?: boolean;
    /** Start zoomed into this inclusive category index range (read on mount; static demos). */
    initialZoom?: IndexRange;
    /** Show the tooltip at this category index until the pointer moves (static demos and screenshots). */
    defaultTooltipIndex?: number;
}

const DEFAULT_LINE_WIDTH = 2.5;
const DEFAULT_MARKER_RADIUS = 5;

interface LineTooltipItem extends TooltipSeriesItem {
    dashed: boolean;
    hidden: boolean;
    input: LineChartSeries;
}

/**
 * Smooth (monotone) line chart for weekly or monthly series: per-series width and dash style, gaps for missing
 * values, hover markers, shared tooltip with crosshair, hover highlighting of the nearest series, drag-to-zoom,
 * optional legend, a left-to-right sweep on `animateKey` changes and an optional hover trail.
 */
export function LineChart({
    series,
    categories,
    height = 320,
    showLegend = false,
    xAxisLabelFormatter,
    yAxisFormatter,
    tooltipValueFormatter,
    tooltipHeaderFormatter,
    backgroundColor,
    theme: overrides,
    className,
    ariaLabel = 'Line chart',
    yAxisVisible = true,
    yAxisTitle,
    xAxisTitle,
    xAxisTickPositions,
    xAxisCrosshair,
    hoverTrail = false,
    animateKey = null,
    zoomable = true,
    initialZoom,
    defaultTooltipIndex,
}: LineChartProps): ReactElement | null {
    const theme = useChartTheme(overrides);
    const stableSeries = useContentStable(series);
    const stableCats = useContentStable(categories);
    const tickPositions = useContentStable(xAxisTickPositions);
    const crosshair = useContentStable(xAxisCrosshair);

    const resolved = useMemo(() => resolveSeries(stableSeries, theme.palette), [stableSeries, theme.palette]);
    const allRows = useMemo(() => buildRows(stableCats, stableSeries), [stableCats, stableSeries]);

    const fmtLabel = useStableCallback((v: string | number, i: number) =>
        (xAxisLabelFormatter ?? defaultCategoryFormatter)(v, i),
    );
    const fmtHeader = useStableCallback((v: string | number, i: number) =>
        (tooltipHeaderFormatter ?? xAxisLabelFormatter ?? defaultCategoryFormatter)(v, i),
    );
    const fmtTooltipValue = useStableCallback((v: number | null, s: LineChartSeries) =>
        tooltipValueFormatter ? tooltipValueFormatter(v, s) : defaultValueFormatter(v),
    );
    const fmtTooltipSeriesValue = useStableCallback((v: number | null, s: TooltipSeriesItem) =>
        fmtTooltipValue(v, (s as LineTooltipItem).input),
    );

    const visibility = useSeriesVisibility(
        resolved.map((s) => s.key),
        resolved.map((s) => s.name),
    );
    const hover = useSeriesHover();
    const zoom = useXZoom({ length: allRows.length, resetKey: allRows, enabled: zoomable, initialRange: initialZoom });
    const rows = useMemo(() => zoom.sliceRows(allRows), [zoom.sliceRows, allRows]);

    const [plotHeight, setPlotHeight] = useState<number | null>(null);
    const onPlot = useCallback((area: PlotArea) => setPlotHeight(Math.round(area.height)), []);
    const visibleKeys = resolved.filter((s) => !visibility.isHidden(s.key)).map((s) => s.key);
    const extent = seriesExtent(rows, visibleKeys);
    const scale = extent ? niceScale(extent[0], extent[1], { pixelLength: plotHeight ?? height * 0.6 }) : undefined;
    const tickInterval = scale?.interval ?? 1;
    const fmtY = useStableCallback((v: number) => (yAxisFormatter ? yAxisFormatter(v) : defaultAxisNumber(v, tickInterval)));

    const sweep = useSweep(animateKey);
    const clipId = useUniqueId('line-sweep');

    const items = useMemo<LineTooltipItem[]>(
        () =>
            resolved.map((s) => ({
                key: s.key,
                name: s.name,
                color: s.color,
                dashed: isDashed((s.input as LineChartSeries).dashStyle),
                marker: isDashed((s.input as LineChartSeries).dashStyle) ? ('dashed' as const) : ('square' as const),
                hidden: visibility.isHidden(s.key),
                input: s.input as LineChartSeries,
            })),
        [resolved, visibility],
    );

    const ticks = useMemo(() => {
        if (!tickPositions) return undefined;
        const first = rows[0]?.index ?? 0;
        const last = rows[rows.length - 1]?.index ?? -1;
        return tickPositions.filter((i) => Number.isInteger(i) && i >= first && i <= last);
    }, [tickPositions, rows]);

    const cursorOption = useMemo(() => {
        if (crosshair === undefined || typeof crosshair === 'boolean') return crosshair;
        const w = crosshair.width ?? 1;
        return { color: crosshair.color, width: w, dashArray: dashArrayFor(crosshair.dashStyle, w) ?? 'none' };
    }, [crosshair]);

    if (!stableSeries.length) return null;

    const legend = showLegend ? (
        <ChartLegend
            items={items.map((i) => ({
                key: i.key,
                name: i.name,
                color: i.color,
                hidden: i.hidden,
                symbol: i.dashed ? ('dashed' as const) : ('line' as const),
            }))}
            onToggle={visibility.toggle}
            onItemHover={hover.setHovered}
        />
    ) : undefined;

    const xAxis = categoryAxisProps(theme, {
        categories: stableCats,
        labelFormatter: fmtLabel,
        rotateLabels: true,
        title: xAxisTitle,
        interval: ticks ? 0 : undefined,
    });

    return (
        <ChartFrame
            height={height}
            theme={theme}
            backgroundColor={backgroundColor}
            ariaLabel={ariaLabel}
            className={className}
            legend={legend}
        >
            <RechartsLineChart
                data={rows}
                margin={CHART_MARGIN}
                {...zoom.chartHandlers}
                onMouseLeave={hover.clear}
                style={{ userSelect: 'none' }}
            >
                {yAxisVisible ? <CartesianGrid {...gridProps(theme)} /> : null}
                <XAxis {...xAxis} ticks={ticks} />
                <YAxis
                    {...valueAxisProps(theme, { scale, formatter: fmtY, title: yAxisTitle, hide: !yAxisVisible })}
                />
                <Tooltip
                    {...tooltipProps(theme, { crosshair: cursorOption })}
                    defaultIndex={defaultTooltipIndex}
                    content={
                        <SharedTooltipContent
                            series={items}
                            rows={rows}
                            headerFormatter={fmtHeader}
                            valueFormatter={fmtTooltipSeriesValue}
                            skipNull
                        />
                    }
                />
                {resolved.map((s) => {
                    const input = s.input as LineChartSeries;
                    const width = input.lineWidth ?? DEFAULT_LINE_WIDTH;
                    const dashed = isDashed(input.dashStyle);
                    const dim = hover.dimProps(s.key).style;
                    return (
                        <Line
                            key={s.key}
                            type="monotone"
                            dataKey={s.key}
                            name={s.name}
                            stroke={s.color}
                            strokeWidth={width}
                            strokeDasharray={dashArrayFor(input.dashStyle, width)}
                            strokeLinecap={dashed ? 'butt' : 'round'}
                            strokeLinejoin="round"
                            dot={false}
                            activeDot={{
                                r: (input.markerRadius ?? DEFAULT_MARKER_RADIUS) + 1,
                                fill: s.color,
                                stroke: 'none',
                                strokeWidth: 0,
                                style: dim,
                            }}
                            connectNulls={false}
                            hide={visibility.isHidden(s.key)}
                            isAnimationActive={false}
                            style={sweep.active ? { ...dim, clipPath: `url(#${clipId})` } : dim}
                        />
                    );
                })}
                {sweep.active ? <SweepClip id={clipId} run={sweep.run} onDone={sweep.finish} /> : null}
                <NearestSeriesTracker series={items} onChange={hover.setHovered} />
                {hoverTrail ? <HoverTrail rows={rows} series={items} hovered={hover.hovered} /> : null}
                <ZoomSelection selection={zoom.selection} />
                <ResetZoomButton visible={zoom.isZoomed} onClick={zoom.reset} fill={backgroundColor} />
                <PlotAreaProbe onChange={onPlot} />
            </RechartsLineChart>
        </ChartFrame>
    );
}
