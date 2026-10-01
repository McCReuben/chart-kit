import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
    Bar,
    BarChart as RechartsBarChart,
    BarStack,
    CartesianGrid,
    LabelList,
    Tooltip,
    XAxis,
    YAxis,
    type PlotArea,
} from 'recharts';

import {
    CHART_MARGIN,
    ChartFrame,
    ChartLegend,
    PlotAreaProbe,
    buildRows,
    categoryAxisProps,
    defaultCategoryFormatter,
    gridProps,
    niceScale,
    resolveSeries,
    seriesExtent,
    tooltipProps,
    useContentStable,
    useSeriesHover,
    useSeriesVisibility,
    useStableCallback,
    valueAxisProps,
    type ChartRow,
    type LegendItem,
    type ResolvedSeries,
    type SeriesInput,
} from '../../core';
import { useChartTheme, type ChartThemeOverrides } from '../../theme';
import {
    barGaps,
    cleanNumber,
    dataLabelText,
    isQuarterAxis,
    stackTotal,
    topOfStack,
    type BarChartMode,
} from './barLayout';
import { BarTooltipContent, type BarTooltipContext } from './BarTooltip';

export type { BarChartMode } from './barLayout';
export type { BarTooltipContext, BarTooltipPoint } from './BarTooltip';

/** One bar series. */
export type BarSeries = SeriesInput;

/** What `onPointClick` receives about the clicked bar. */
export interface BarPointClick<S extends SeriesInput = BarSeries> {
    /** Series name. */
    seriesName: string;
    /** Position of the series in `series`. */
    seriesIndex: number;
    /** Raw category value. */
    category: string | number;
    /** Category index. */
    index: number;
    /** Bar value. */
    value: number | null;
    /** Resolved bar colour. */
    color: string;
    /** The caller's series object. */
    series: S;
}

/** Props of {@link BarChart}. */
export interface BarChartProps<S extends BarSeries = BarSeries> {
    /** Series `{ name, data, color? }`; `data` is aligned to `categories`, `null` leaves a gap. */
    series: S[];
    /** Category labels: the x axis (grouped/stacked) or the y axis (horizontal). */
    categories: Array<string | number>;
    /**
     * `'grouped'`: side-by-side columns. `'stacked'`: columns stacked in series order (first series at the bottom),
     * wider bars (max 48 px) with rounded stack tops. `'horizontal'`: grouped horizontal bars. Default `'grouped'`.
    */
    mode?: BarChartMode;
    /** Total height in px, legend included. Default 320. */
    height?: number;
    /** Show the value axis and its grid lines. Default `true`. */
    yAxisVisible?: boolean;
    /** Value-axis tick formatter; also formats the stack totals. */
    yAxisFormatter?: (value: number) => string;
    /** Value-axis title. */
    yAxisTitle?: string;
    /** Category-axis label formatter, e.g. `retailWeekFormatter(2026)`. Default `String(value)`. */
    xAxisLabelFormatter?: (value: string | number, index: number) => string;
    /**
     * Rotate category labels by -45°. Default: rotated for vertical columns unless a category looks like `2026 Q1`;
     * never for horizontal bars.
    */
    rotateXAxisLabels?: boolean;
    /** Show the legend below the plot. Default `false`. */
    showLegend?: boolean;
    /** Tooltip value formatter. Default: the raw value. */
    tooltipValueFormatter?: (value: number | null, series: S) => string;
    /** Tooltip header formatter. Default: `xAxisLabelFormatter`. */
    tooltipHeaderFormatter?: (category: string | number, index: number) => string;
    /** Shared tooltip listing every series at the category (`true`), or only the hovered bar's series. Default `true`. */
    tooltipShared?: boolean;
    /**
     * Custom tooltip body, rendered inside the standard tooltip box (which keeps the away-from-cursor placement).
     * `context` holds the hovered category, the formatted header, the visible points and (stacked) the stack total.
    */
    renderTooltip?: (context: BarTooltipContext<S>) => ReactNode;
    /** Show the tooltip at this category index without hovering (static docs and screenshots). */
    defaultTooltipIndex?: number;
    /** Called when a bar is clicked; bars get a pointer cursor. */
    onPointClick?: (seriesName: string, point: BarPointClick<S>) => void;
    /** Called with the series name when a legend item is clicked. Replaces the default show/hide toggle. */
    onLegendClick?: (seriesName: string) => void;
    /** Value labels on the bars (inside stacked segments, hidden under 4% of the stack; at the bar end otherwise). */
    showDataLabels?: boolean;
    /** Data-label formatter. Default: the raw value. */
    dataLabelFormatter?: (value: number) => string;
    /** Stacked mode: show each stack's total above it (formatted with `yAxisFormatter`). Default `false`. */
    showStackTotals?: boolean;
    /** Gap between legend items in px Default 16. */
    legendItemDistance?: number;
    /** Space between the plot and the legend in px Default 12. */
    legendMargin?: number;
    /** Background colour; default `theme.componentBackground`. `'transparent'` is allowed. */
    backgroundColor?: string;
    /** Per-instance theme overrides merged over the context theme. */
    theme?: ChartThemeOverrides;
    /** Class name on the outer element. */
    className?: string;
    /** Accessible name of the chart. Default `'Bar chart'`. */
    ariaLabel?: string;
}

const BAR_RADIUS = 3;
const VERTICAL_RADIUS: [number, number, number, number] = [BAR_RADIUS, BAR_RADIUS, 0, 0];
const HORIZONTAL_RADIUS: [number, number, number, number] = [0, BAR_RADIUS, BAR_RADIUS, 0];
/** Extra top space for stack totals (28px of spacing instead of 10). */
const STACK_TOTAL_SPACE = 18;

/** Generic, theme-aware bar chart: grouped, stacked or horizontal bars with legend, tooltip and data labels. */
export function BarChart<S extends BarSeries = BarSeries>({
    series,
    categories,
    mode = 'grouped',
    height = 320,
    yAxisVisible = true,
    yAxisFormatter,
    yAxisTitle,
    xAxisLabelFormatter,
    rotateXAxisLabels,
    showLegend = false,
    tooltipValueFormatter,
    tooltipHeaderFormatter,
    tooltipShared = true,
    renderTooltip,
    defaultTooltipIndex,
    onPointClick,
    onLegendClick,
    showDataLabels = false,
    dataLabelFormatter,
    showStackTotals = false,
    legendItemDistance = 16,
    legendMargin = 12,
    backgroundColor,
    theme: overrides,
    className,
    ariaLabel = 'Bar chart',
}: BarChartProps<S>) {
    const theme = useChartTheme(overrides);
    const horizontal = mode === 'horizontal';
    const stacked = mode === 'stacked';

    const stableSeries = useContentStable(series);
    const stableCats = useContentStable(categories);
    const resolved = useMemo(() => resolveSeries(stableSeries, theme.palette), [stableSeries, theme.palette]);
    const rows = useMemo(() => buildRows(stableCats, stableSeries), [stableCats, stableSeries]);

    const fmtLabel = useStableCallback((v: string | number, i: number) =>
        (xAxisLabelFormatter ?? defaultCategoryFormatter)(v, i),
    );
    const fmtHeader = useStableCallback((v: string | number, i: number) =>
        (tooltipHeaderFormatter ?? xAxisLabelFormatter ?? defaultCategoryFormatter)(v, i),
    );
    const fmtTooltipValue = useStableCallback((v: number, s: S) =>
        tooltipValueFormatter ? tooltipValueFormatter(v, s) : String(v),
    );
    const fmtAxis = useStableCallback((v: number) => (yAxisFormatter ? yAxisFormatter(v) : String(v)));
    const fmtDataLabel = useStableCallback((v: number) => (dataLabelFormatter ? dataLabelFormatter(v) : String(v)));
    const fmtTotal = useStableCallback((v: number) => (yAxisFormatter ? yAxisFormatter(v) : cleanNumber(v)));
    const renderTooltipStable = useStableCallback((ctx: BarTooltipContext<S>) => renderTooltip?.(ctx));
    const pointClick = useStableCallback((s: ResolvedSeries<S>, row: ChartRow | undefined) => {
        if (!row || !onPointClick) return;
        const v = row[s.key];
        onPointClick(s.name, {
            seriesName: s.name,
            seriesIndex: s.index,
            category: row.category,
            index: row.index,
            value: typeof v === 'number' && Number.isFinite(v) ? v : null,
            color: s.color,
            series: s.input,
        });
    });
    const legendClick = useStableCallback((item: LegendItem) => onLegendClick?.(item.name));

    const visibility = useSeriesVisibility(
        resolved.map((s) => s.key),
        resolved.map((s) => s.name),
    );
    const hover = useSeriesHover();
    const visibleKeys = resolved.filter((s) => !visibility.isHidden(s.key)).map((s) => s.key);

    // Plot length along the value axis, for one tick about every 72 px.
    const [plot, setPlot] = useState<{ width: number; height: number } | null>(null);
    const onPlotArea = useCallback((a: PlotArea) => setPlot({ width: a.width, height: a.height }), []);
    const pixelLength = plot ? (horizontal ? plot.width : plot.height) : horizontal ? 600 : height * 0.6;
    const extent = seriesExtent(rows, visibleKeys, { stacked });
    const scale = extent
        ? niceScale(Math.min(0, extent[0]), Math.max(0, extent[1]), { pixelLength, includeZero: true })
        : undefined;

    const gaps = barGaps(mode, visibleKeys.length);
    const rotate = horizontal ? false : (rotateXAxisLabels ?? !isQuarterAxis(stableCats));
    // The core factories return the same props for equal inputs, so `width="auto"` axes do not re-measure in a loop.
    const leftCategoryAxis = categoryAxisProps(theme, { position: 'left', categories: stableCats, labelFormatter: fmtLabel });
    const leftValueAxis = valueAxisProps(theme, { scale, formatter: fmtAxis, title: yAxisTitle, hide: !yAxisVisible });
    const clickable = Boolean(onPointClick || onLegendClick);

    const items: LegendItem[] = resolved.map((s) => ({
        key: s.key,
        name: s.name,
        color: s.color,
        symbol: 'square',
        hidden: visibility.isHidden(s.key),
    }));
    const tooltipSeries = resolved.map((s) => ({
        key: s.key,
        name: s.name,
        color: s.color,
        hidden: visibility.isHidden(s.key),
        input: s.input,
    }));

    const dataLabelProps = stacked
        ? {
              fill: '#ffffff',
              fontSize: 9,
              fontWeight: 600,
              stroke: 'rgba(0,0,0,0.35)',
              strokeWidth: 2,
              paintOrder: 'stroke' as const,
              strokeLinejoin: 'round' as const,
          }
        : { fill: theme.text.primary, fontSize: 10, fontWeight: 600, stroke: 'none' };
    const totalStyle = {
        fill: theme.text.primary,
        fontSize: 10,
        fontWeight: 600,
        stroke: theme.isDarkMode ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.7)',
        strokeWidth: 2,
        paintOrder: 'stroke' as const,
        strokeLinejoin: 'round' as const,
    };

    const bars = resolved.map((s) => {
        const hidden = visibility.isHidden(s.key);
        const style: CSSProperties = { ...hover.dimProps(s.key).style, cursor: clickable ? 'pointer' : undefined };
        return (
            <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                hide={hidden}
                radius={stacked ? undefined : horizontal ? HORIZONTAL_RADIUS : VERTICAL_RADIUS}
                maxBarSize={gaps.maxBarSize}
                animationDuration={1000}
                animationEasing="ease-out"
                style={style}
                // Darken the hovered category's bars by 5%.
                activeBar={{ style: { ...style, filter: 'brightness(0.95)' } }}
                {...hover.bindItem(s.key)}
                onClick={onPointClick ? (d) => pointClick(s, d?.payload as ChartRow | undefined) : undefined}
            >
                {showDataLabels && !hidden ? (
                    <LabelList
                        position={stacked ? 'center' : horizontal ? 'right' : 'top'}
                        valueAccessor={(entry) =>
                            dataLabelText(entry.payload as ChartRow, s.key, stacked ? visibleKeys : null, fmtDataLabel)
                        }
                        fontFamily={theme.fontFamily}
                        {...dataLabelProps}
                        style={{ opacity: style.opacity, transition: style.transition }}
                    />
                ) : null}
                {stacked && showStackTotals && !hidden ? (
                    <LabelList
                        position="top"
                        valueAccessor={(entry) => {
                            const row = entry.payload as ChartRow;
                            return topOfStack(row, visibleKeys) === s.key ? fmtTotal(stackTotal(row, visibleKeys)) : '';
                        }}
                        fontFamily={theme.fontFamily}
                        {...totalStyle}
                    />
                ) : null}
            </Bar>
        );
    });

    const legend = showLegend ? (
        <ChartLegend
            items={items}
            symbolSize={12}
            symbolRadius={2}
            onToggle={visibility.toggle}
            onItemClick={onLegendClick ? legendClick : undefined}
            onItemHover={hover.setHovered}
            style={{ columnGap: legendItemDistance, paddingTop: Math.max(0, 8 + legendMargin - 12) }}
        />
    ) : undefined;

    // Horizontal: room for half of the last value label, which is centred on the plot's right edge.
    const lastTick = scale?.ticks[scale.ticks.length - 1];
    const rightRoom =
        horizontal && yAxisVisible && lastTick !== undefined
            ? Math.ceil((fmtAxis(lastTick).length * theme.fontSize.axis * 0.6) / 2)
            : 0;
    const margin = {
        ...CHART_MARGIN,
        top: CHART_MARGIN.top + (stacked && showStackTotals ? STACK_TOTAL_SPACE : 0),
        right: Math.max(CHART_MARGIN.right, rightRoom),
    };

    return (
        <ChartFrame
            height={height}
            theme={theme}
            backgroundColor={backgroundColor}
            ariaLabel={ariaLabel}
            className={className}
            legend={legend}
        >
            <RechartsBarChart
                data={rows}
                layout={horizontal ? 'vertical' : 'horizontal'}
                margin={margin}
                barCategoryGap={gaps.barCategoryGap}
                barGap={gaps.barGap}
                stackOffset={stacked ? 'sign' : undefined}
                onMouseLeave={hover.clear}
                style={{ userSelect: 'none' }}
            >
                <CartesianGrid
                    {...gridProps(theme, { direction: horizontal ? 'vertical' : 'horizontal' })}
                    {...(yAxisVisible ? {} : { horizontal: false, vertical: false })}
                />
                {horizontal ? (
                    <>
                        <YAxis {...leftCategoryAxis} />
                        <XAxis
                            {...valueAxisProps(theme, {
                                position: 'bottom',
                                scale,
                                formatter: fmtAxis,
                                title: yAxisTitle,
                                hide: !yAxisVisible,
                            })}
                        />
                    </>
                ) : (
                    <>
                        <XAxis
                            {...categoryAxisProps(theme, { categories: stableCats, labelFormatter: fmtLabel, rotateLabels: rotate })}
                        />
                        <YAxis {...leftValueAxis} />
                    </>
                )}
                <Tooltip
                    {...tooltipProps(theme, { layout: horizontal ? 'vertical' : 'horizontal' })}
                    shared={tooltipShared}
                    defaultIndex={defaultTooltipIndex}
                    position={{ x: 0, y: 0 }}
                    content={
                        <BarTooltipContent<S>
                            rows={rows}
                            series={tooltipSeries}
                            stacked={stacked}
                            horizontal={horizontal}
                            shared={tooltipShared}
                            headerFormatter={fmtHeader}
                            valueFormatter={fmtTooltipValue}
                            renderTooltip={renderTooltip ? renderTooltipStable : undefined}
                        />
                    }
                />
                {stacked ? (
                    <BarStack stackId="stack" radius={VERTICAL_RADIUS}>
                        {bars}
                    </BarStack>
                ) : (
                    bars
                )}
                <PlotAreaProbe onChange={onPlotArea} />
            </RechartsBarChart>
        </ChartFrame>
    );
}
