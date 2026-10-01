import { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';

import {
    CHART_MARGIN,
    ChartFrame,
    ChartLegend,
    NearestSeriesTracker,
    PlotAreaProbe,
    SharedTooltipContent,
    buildRows,
    categoryAxisProps,
    defaultCategoryFormatter,
    defaultValueFormatter,
    gridProps,
    resolveSeries,
    seriesExtent,
    tooltipProps,
    useContentStable,
    useSeriesHover,
    useSeriesVisibility,
    useStableCallback,
    valueAxisProps,
} from '../../core';
import type { LegendItem, NiceScale, ResolvedSeries, SeriesInput, TooltipSeriesItem } from '../../core';
import type { ChartThemeOverrides } from '../../theme';
import { useChartTheme } from '../../theme';
import { alignedScales } from './alignTicks';
import type { AxisRange } from './alignTicks';

/** Which value axis a series is plotted against. */
export type DualAxisSide = 'left' | 'right';

/** Mark type of a series. */
export type DualAxisSeriesType = 'spline' | 'column';

/** One series of a {@link DualAxisChart}. */
export interface DualAxisSeries extends SeriesInput {
    /** Series name (legend and tooltip). */
    name: string;
    /** Values aligned to `categories`; `null` = gap. */
    data: Array<number | null>;
    /** Colour; default `theme.palette[i]`. */
    color?: string;
    /** Mark type: `'spline'` (default, a smooth line with white-filled circle markers) or `'column'`. */
    type?: DualAxisSeriesType;
    /** Value axis: `'left'` (primary, default) or `'right'` (secondary). */
    axis?: DualAxisSide;
    /** Line dash style; `'Dash'` draws a dashed line without markers. Ignored for columns. Default `'Solid'`. */
    dashStyle?: 'Solid' | 'Dash' | 'dash';
    /** Line width in px (default 2). Ignored for columns. */
    lineWidth?: number;
}

/** Props of {@link DualAxisChart}. */
export interface DualAxisChartProps {
    /** Series (columns and/or splines), each on the left or right value axis. */
    series: DualAxisSeries[];
    /** X-axis categories, aligned with each series' `data`. */
    categories: Array<string | number>;
    /** Chart height in px, legend included (default 320). */
    height?: number;
    /** Title of the left (primary) value axis; state the units here. */
    yAxisTitle?: string | null;
    /** Title of the right (secondary) value axis. */
    y2AxisTitle?: string | null;
    /** Show both value axes (labels, titles and grid lines). `false` hides them but keeps the scaling (default `true`). */
    yAxisVisible?: boolean;
    /** Show the legend below the chart; clicking an item toggles its series (default `false`). */
    showLegend?: boolean;
    /** X-axis label formatter `(category, index)`; default `String(category)`. Use `retailWeekFormatter(year)` for retail weeks. */
    xAxisLabelFormatter?: (value: string | number, index: number) => string;
    /** Left value-axis tick formatter; default the plain number. */
    yAxisFormatter?: (value: number) => string;
    /** Right value-axis tick formatter; default the plain number. */
    y2AxisFormatter?: (value: number) => string;
    /** Tooltip value formatter `(value, series)`; default the value, or `'—'` for null. */
    tooltipValueFormatter?: (value: number | null, series: DualAxisSeries) => string;
    /** Tooltip header formatter `(category, index)`; default `xAxisLabelFormatter`. */
    tooltipHeaderFormatter?: (category: string | number, index: number) => string;
    /** Background colour; default `theme.componentBackground`. `'transparent'` is allowed. */
    backgroundColor?: string | null;
    /** Per-instance theme overrides, merged over the context theme. */
    theme?: ChartThemeOverrides;
    /** Class name on the outer container. */
    className?: string;
    /** Accessible name of the chart (default "Dual-axis chart"). */
    ariaLabel?: string;
    /** Category index whose tooltip is shown on first render, before any hover (static demos and screenshots). */
    defaultTooltipIndex?: number;
}

const LEFT = 'left';
const RIGHT = 'right';

/** Normalised series type: `'column'` or `'spline'`. */
export function seriesKind(s: DualAxisSeries): DualAxisSeriesType {
    return s.type === 'column' ? 'column' : 'spline';
}

/** Normalised axis side: `'right'` or `'left'` (default). */
export function seriesSide(s: DualAxisSeries): DualAxisSide {
    return s.axis === 'right' ? RIGHT : LEFT;
}

function isDashed(s: DualAxisSeries): boolean {
    return seriesKind(s) === 'spline' && (s.dashStyle === 'Dash' || s.dashStyle === 'dash');
}

const COLUMN_RADIUS: [number, number, number, number] = [3, 3, 0, 0];
const MARKER_FILL = '#FFFFFF';

/**
 * Columns and splines against a left (primary) and a right (secondary) value axis, so metrics with very different
 * magnitudes or units read clearly on one chart. Each axis gets its own nice scale from its visible series, with
 * aligned tick counts so the grid lines coincide. Shared tooltip with a dotted crosshair, legend
 * with toggling, and hover dimming.
 */
export function DualAxisChart({
    series,
    categories,
    height = 320,
    yAxisTitle = null,
    y2AxisTitle = null,
    yAxisVisible = true,
    showLegend = false,
    xAxisLabelFormatter,
    yAxisFormatter,
    y2AxisFormatter,
    tooltipValueFormatter,
    tooltipHeaderFormatter,
    backgroundColor,
    theme: overrides,
    className,
    ariaLabel = 'Dual-axis chart',
    defaultTooltipIndex,
}: DualAxisChartProps) {
    const theme = useChartTheme(overrides);
    const stableSeries = useContentStable(series ?? []);
    const stableCats = useContentStable(categories ?? []);
    const resolved = useMemo(() => resolveSeries(stableSeries, theme.palette), [stableSeries, theme.palette]);
    const rows = useMemo(() => buildRows(stableCats, stableSeries), [stableCats, stableSeries]);

    const fmtLabel = useStableCallback((v: string | number, i: number) =>
        (xAxisLabelFormatter ?? defaultCategoryFormatter)(v, i),
    );
    const fmtHeader = useStableCallback((v: string | number, i: number) =>
        (tooltipHeaderFormatter ?? xAxisLabelFormatter ?? defaultCategoryFormatter)(v, i),
    );
    const fmtLeft = useStableCallback((v: number) => (yAxisFormatter ? yAxisFormatter(v) : String(v)));
    const fmtRight = useStableCallback((v: number) => (y2AxisFormatter ? y2AxisFormatter(v) : String(v)));
    const fmtTooltip = useStableCallback((v: number | null, item: TooltipSeriesItem) => {
        const s = resolved.find((r) => r.key === item.key);
        return tooltipValueFormatter && s ? tooltipValueFormatter(v, s.input) : defaultValueFormatter(v);
    });

    const keys = useMemo(() => resolved.map((s) => s.key), [resolved]);
    const names = useMemo(() => resolved.map((s) => s.name), [resolved]);
    const visibility = useSeriesVisibility(keys, names);
    const hover = useSeriesHover();

    // Plot height drives the tick density (72px per tick); estimated until measured.
    const [plotHeight, setPlotHeight] = useState<number | null>(null);
    const plotLen = plotHeight ?? Math.round(height * 0.6);

    const { leftScale, rightScale } = useMemo(() => {
        const rangeOf = (side: DualAxisSide): AxisRange | null => {
            const onSide = resolved.filter((s) => seriesSide(s.input) === side && !visibility.hidden.has(s.key));
            const extent = seriesExtent(rows, onSide.map((s) => s.key));
            if (!extent) return null;
            return { min: extent[0], max: extent[1], includeZero: onSide.some((s) => seriesKind(s.input) === 'column') };
        };
        const l = rangeOf(LEFT);
        const r = rangeOf(RIGHT);
        const present = [l, r].filter((x): x is AxisRange => x !== null);
        const scales = alignedScales(present, plotLen);
        return {
            leftScale: l ? scales[0] : undefined,
            rightScale: r ? scales[present.length - 1] : undefined,
        } as { leftScale?: NiceScale; rightScale?: NiceScale };
    }, [resolved, rows, visibility.hidden, plotLen]);

    // Visible columns are grouped: groupPadding 0.2, pointPadding 0.1 (percentages of the category band).
    const columnCount = resolved.filter((s) => seriesKind(s.input) === 'column' && !visibility.hidden.has(s.key)).length;
    const n = Math.max(1, columnCount);
    const barCategoryGap = `${20 + 6 / n}%`;
    const barGap = `${12 / n}%`;

    const legendItems: LegendItem[] = resolved.map((s) => ({
        key: s.key,
        name: s.name,
        color: s.color,
        symbol: seriesKind(s.input) === 'column' ? 'square' : isDashed(s.input) ? 'dashed' : 'marker',
        hidden: visibility.isHidden(s.key),
    }));
    const tooltipItems: TooltipSeriesItem[] = resolved.map((s) => ({
        key: s.key,
        name: s.name,
        color: s.color,
        marker: 'square',
        hidden: visibility.isHidden(s.key),
    }));
    const tracked = resolved
        .filter((s) => seriesKind(s.input) === 'spline')
        .map((s) => ({ key: s.key, axisId: seriesSide(s.input), hidden: visibility.isHidden(s.key) }));

    // The grid follows the first axis that has data (with aligned ticks both axes share the same lines).
    const gridAxis = leftScale ? LEFT : rightScale ? RIGHT : LEFT;

    if (!resolved.length) return null;

    return (
        <ChartFrame
            height={height}
            theme={theme}
            backgroundColor={backgroundColor ?? undefined}
            ariaLabel={ariaLabel}
            className={className}
            legend={
                showLegend ? (
                    <ChartLegend
                        items={legendItems}
                        onToggle={visibility.toggle}
                        onItemHover={hover.setHovered}
                        symbolSize={12}
                        symbolRadius={2}
                    />
                ) : undefined
            }
        >
            <ComposedChart
                data={rows}
                margin={CHART_MARGIN}
                onMouseLeave={hover.clear}
                barCategoryGap={barCategoryGap}
                barGap={barGap}
                style={{ userSelect: 'none' }}
            >
                {yAxisVisible ? <CartesianGrid {...gridProps(theme, { yAxisId: gridAxis })} /> : null}
                <XAxis {...categoryAxisProps(theme, { categories: stableCats, labelFormatter: fmtLabel, rotateLabels: true })} />
                <YAxis
                    {...valueAxisProps(theme, {
                        position: 'left',
                        axisId: LEFT,
                        scale: leftScale,
                        formatter: fmtLeft,
                        title: yAxisTitle ?? undefined,
                        hide: !yAxisVisible || !leftScale,
                    })}
                />
                <YAxis
                    {...valueAxisProps(theme, {
                        position: 'right',
                        axisId: RIGHT,
                        scale: rightScale,
                        formatter: fmtRight,
                        title: y2AxisTitle ?? undefined,
                        hide: !yAxisVisible || !rightScale,
                    })}
                />
                <Tooltip
                    {...tooltipProps(theme)}
                    defaultIndex={defaultTooltipIndex}
                    content={
                        <SharedTooltipContent
                            rows={rows}
                            series={tooltipItems}
                            headerFormatter={fmtHeader}
                            valueFormatter={fmtTooltip}
                        />
                    }
                />
                {resolved.map((s) => renderSeries(s, visibility.isHidden(s.key), hover))}
                <NearestSeriesTracker series={tracked} onChange={hover.setHovered} />
                <PlotAreaProbe onChange={(a) => setPlotHeight(Math.round(a.height))} />
            </ComposedChart>
        </ChartFrame>
    );
}

function renderSeries(
    s: ResolvedSeries<DualAxisSeries>,
    hidden: boolean,
    hover: ReturnType<typeof useSeriesHover>,
) {
    const axisId = seriesSide(s.input);
    if (seriesKind(s.input) === 'column') {
        return (
            <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                yAxisId={axisId}
                fill={s.color}
                radius={COLUMN_RADIUS}
                hide={hidden}
                isAnimationActive
                animationDuration={1000}
                animationEasing="ease-out"
                activeBar={false}
                {...hover.bindItem(s.key)}
                {...hover.dimProps(s.key)}
            />
        );
    }
    const dashed = isDashed(s.input);
    const width = s.input.lineWidth ?? 2;
    return (
        <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            yAxisId={axisId}
            stroke={s.color}
            strokeWidth={width}
            strokeDasharray={dashed ? `${4 * width} ${3 * width}` : undefined}
            dot={dashed ? false : { r: 5, fill: MARKER_FILL, stroke: s.color, strokeWidth: 2, strokeDasharray: '' }}
            activeDot={
                dashed
                    ? { r: 4, fill: s.color, stroke: s.color, strokeWidth: 0 }
                    : { r: 6, fill: MARKER_FILL, stroke: s.color, strokeWidth: 2 }
            }
            connectNulls={false}
            hide={hidden}
            isAnimationActive
            animationDuration={1000}
            animationEasing="ease-out"
            {...hover.dimProps(s.key)}
        />
    );
}
