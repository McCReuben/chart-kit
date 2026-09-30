import { memo, useEffect, useMemo, useRef } from 'react';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

import { formatRetailWeek } from '../../core/formatRetailWeek';
import { useTheme } from '../../theme/ThemeContext';

import './LineChart.css';

// Toggled on the chart container while a series is hovered; see LineChart.css.
const HOVERED_CLASS = 'line-chart--hovered';

// ── Services360 sparkle-dot animation ─────────────────────────────────────────
// Used exclusively by the Services360 module via sparkPoint={true}.
// All other modules leave sparkPoint at its default (false) — no behaviour change.
function s360TriggerSparkle(point) {
    const chart = point.series.chart;
    const series = point.series;

    // Only animate for the series the cursor is closest to
    if (chart.hoverSeries && chart.hoverSeries !== series) return;

    const allPoints = series.points.filter((p) => p.plotX !== undefined && p.plotY !== undefined && p.y !== null);
    if (!allPoints.length) return;

    const targetIdx = allPoints.indexOf(point);
    if (targetIdx < 0) return;

    const coords = allPoints.map((p) => ({
        x: Math.round(p.plotX + chart.plotLeft),
        y: Math.round(p.plotY + chart.plotTop),
    }));

    // Per-chart state — keeps multiple visible charts independent
    if (!chart._s360) chart._s360 = {};
    const sp = chart._s360;

    // Bump generation to cancel any in-progress animation
    sp.gen = (sp.gen ?? 0) + 1;
    const gen = sp.gen;
    clearTimeout(sp.pulseTimer);

    const color = series.color;

    // Create SVG elements on first use; recreate if chart was destroyed/remounted
    if (!sp.dot || sp.dot.renderer !== chart.renderer) {
        try {
            sp.dot?.destroy();
            sp.ring?.destroy();
        } catch (_) {}
        sp.dot = chart.renderer.circle(0, 0, 5).attr({ fill: color, zIndex: 20, opacity: 0 }).add();
        sp.ring = chart.renderer
            .circle(0, 0, 5)
            .attr({ fill: 'none', stroke: color, 'stroke-width': 2, zIndex: 19, opacity: 0 })
            .add();
    } else {
        sp.dot.attr({ fill: color });
        sp.ring.attr({ stroke: color, opacity: 0, r: 5 });
    }

    // Snap dot to leftmost point and make it visible
    sp.dot.attr({ cx: coords[0].x, cy: coords[0].y, opacity: 1 });
    sp.ring.attr({ cx: coords[0].x, cy: coords[0].y, opacity: 0, r: 5 });

    // Travel: step through each data point toward the hovered one
    const stepMs = Math.max(12, Math.floor(1000 / Math.max(targetIdx, 1)));
    let step = 0;

    function tick() {
        if (gen !== sp.gen) return;
        step++;
        if (step > targetIdx) {
            startPulse();
            return;
        }
        sp.dot.attr({ cx: coords[step].x, cy: coords[step].y });
        sp.ring.attr({ cx: coords[step].x, cy: coords[step].y });
        sp.pulseTimer = setTimeout(tick, stepMs);
    }

    // Pulsing glow ring that repeats until a new hover cancels it
    function startPulse() {
        if (gen !== sp.gen) return;
        sp.ring.attr({ r: 5, opacity: 0.85 });
        sp.ring.animate(
            { r: 16, opacity: 0 },
            {
                duration: 900,
                easing: 'easeOut',
                complete() {
                    if (gen !== sp.gen) return;
                    sp.ring.attr({ r: 5, opacity: 0 });
                    sp.pulseTimer = setTimeout(startPulse, 100);
                },
            },
        );
    }

    sp.pulseTimer = setTimeout(tick, 0);
}
// ──────────────────────────────────────────────────────────────────────────────

const LineChart = ({
    series = [],
    categories = [],
    height = 320,
    yAxisVisible = true,
    yAxisFormatter = null,
    yAxisTitle = null,
    xAxisTitle = null,
    showLegend = false,
    tooltipValueFormatter = null,
    tooltipHeaderFormatter = null,
    xAxisLabelFormatter = null,
    backgroundColor = null,
    xAxisTickPositions = undefined,
    xAxisCrosshair = null,
    weekYear = null,
    // sparkPoint — Services360 module only; leave false in all other modules
    sparkPoint = false,
    // animateKey — when this value changes, the line sweeps left-to-right; null = no animation
    animateKey = null,
    immutable = false,
}) => {
    const { colors } = useTheme();
    const chartRef = useRef(null);

    // Formatters are usually declared inline by callers, so their identity changes
    // on every parent render. They are read through a ref — only from Highcharts
    // callbacks, never during render — so they stay current without forcing the
    // chart options to be rebuilt.
    const formatters = useRef(null);
    // eslint-disable-next-line react-hooks/refs
    formatters.current = { yAxisFormatter, tooltipValueFormatter, tooltipHeaderFormatter, xAxisLabelFormatter };

    useEffect(() => {
        if (animateKey == null) return undefined;

        let cr = null;
        let animatedChart = null;
        const restoreClip = () => {
            animatedChart?.series?.forEach((s) => {
                const shared = animatedChart.sharedClips?.[s.getSharedClipKey?.()];
                if (s.group) s.group.clip(shared ?? animatedChart.clipRect);
                if (s.markerGroup) s.markerGroup.clip();
            });
            if (cr) {
                Highcharts.stop(cr);
                cr.destroy();
            }
            cr = null;
            animatedChart = null;
        };

        const raf = requestAnimationFrame(() => {
            const chart = chartRef.current?.chart;
            if (!chart?.renderer || !chart.plotWidth) return;
            const { plotLeft, plotTop, plotWidth, plotHeight } = chart;
            animatedChart = chart;
            cr = chart.renderer.clipRect(plotLeft, plotTop, 0, plotHeight);
            chart.series.forEach((s) => {
                if (s.group) s.group.clip(cr);
                if (s.markerGroup) s.markerGroup.clip(cr);
            });
            cr.animate({ width: plotWidth }, { duration: 1400, complete: restoreClip });
        });

        return () => {
            cancelAnimationFrame(raf);
            // Never leave the series clipped to a zero-width rect when the sweep is
            // interrupted — the lines would stay invisible until the next redraw.
            // A destroyed chart drops all of its properties, including `renderer`.
            if (animatedChart?.renderer) restoreClip();
        };
    }, [animateKey]);

    // Signature of the props that callers rebuild inline on every render. Keying
    // the options on content instead of identity stops Highcharts from being
    // re-initialised when an unrelated piece of parent state changes.
    const contentKey = useMemo(
        () => JSON.stringify([series, categories, xAxisTickPositions, xAxisCrosshair, colors]),
        [series, categories, xAxisTickPositions, xAxisCrosshair, colors],
    );
    const content = useMemo(
        () => ({ series, categories, tickPositions: xAxisTickPositions, crosshair: xAxisCrosshair, colors }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [contentKey],
    );

    const chartOptions = useMemo(() => {
        const { series: seriesData, categories: xCategories, tickPositions, crosshair, colors } = content;
        if (!seriesData?.length) return null;

        return {
            chart: {
                type: 'spline',
                backgroundColor: backgroundColor ?? colors.componentBackground,
                style: { fontFamily: 'inherit' },
                height,
                animation: false,
                zoomType: 'x',
                selectionMarkerFill: 'rgba(9,104,246,0.10)',
                resetZoomButton: {
                    theme: {
                        fill: backgroundColor ?? colors.componentBackground,
                        stroke: colors.componentBorder,
                        r: 6,
                        style: { color: colors.text.primary, fontSize: '11px', cursor: 'pointer' },
                        states: { hover: { fill: colors.componentBorder } },
                    },
                    position: { align: 'right', verticalAlign: 'top', x: -10, y: 10 },
                },
                events: {
                    // A redraw can drop the hover class Highcharts puts on the
                    // series, so keep the container flag in sync with the DOM.
                    redraw() {
                        const hovered = Boolean(this.container?.querySelector('.highcharts-series-hover'));
                        this.container?.classList.toggle(HOVERED_CLASS, hovered);
                    },
                },
            },
            title: { text: null },
            credits: { enabled: false },
            legend: {
                enabled: showLegend,
                align: 'center',
                verticalAlign: 'bottom',
                layout: 'horizontal',
                itemStyle: { color: colors.text.primary, fontSize: '12px', fontWeight: 'normal' },
                itemHoverStyle: { color: colors.text.primary },
                itemMarginRight: 20,
                symbolHeight: 10,
                symbolWidth: 10,
                symbolRadius: 0,
            },
            xAxis: {
                categories: xCategories,
                tickPositions,
                crosshair: crosshair ?? { width: 1, color: colors.componentBorder, dashStyle: 'Dot' },
                labels: {
                    formatter() {
                        const format = formatters.current.xAxisLabelFormatter;
                        if (format) return format(this.value, this.pos);
                        return formatRetailWeek(this.value, weekYear);
                    },
                    style: { color: '#707070', fontSize: '11px' },
                    rotation: -45,
                },
                lineColor: colors.componentBorder,
                tickColor: colors.componentBorder,
                title: xAxisTitle
                    ? { text: xAxisTitle, style: { color: '#707070', fontSize: '11px' } }
                    : { text: null },
            },
            yAxis: {
                visible: yAxisVisible,
                title: yAxisTitle ? { text: yAxisTitle, style: { color: colors.text.primary } } : { text: null },
                labels: {
                    formatter() {
                        const format = formatters.current.yAxisFormatter;
                        return format ? format(this.value) : this.axis.defaultLabelFormatter.call(this);
                    },
                    style: { color: '#707070', fontSize: '11px' },
                },
                gridLineColor: colors.componentBorder,
            },
            tooltip: {
                shared: true,
                animation: false,
                hideDelay: 100,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                style: { color: colors.text.primary, fontSize: '12px' },
                useHTML: true,
                formatter() {
                    const { tooltipHeaderFormatter: header, tooltipValueFormatter: format } = formatters.current;
                    const idx = this.points[0]?.point?.index ?? 0;
                    const raw = xCategories[idx] ?? '';
                    const label = header ? header(raw, idx) : formatRetailWeek(raw, weekYear);
                    let html = `<div style="padding:4px 6px"><b>${label}</b><br/>`;
                    this.points.forEach((p) => {
                        const val = format ? format(p.y) : p.y != null ? p.y : '—';
                        const dashed = p.series.options.dashStyle === 'Dash';
                        const swatch = dashed
                            ? `<span style="display:inline-block;width:14px;height:2px;border-top:2px dashed ${p.color};flex-shrink:0;margin-bottom:2px;vertical-align:middle"></span>`
                            : `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};flex-shrink:0"></span>`;
                        html += `<div style="display:flex;align-items:center;gap:5px;margin-top:3px">
 ${swatch}
 <span>${p.series.name}: ${val}</span>
 </div>`;
                    });
                    return html + '</div>';
                },
            },
            plotOptions: {
                series: {
                    connectNulls: false,
                    animation: false,
                    findNearestPointBy: 'x',
                    states: {
                        hover: { enabled: true, lineWidthPlus: 0, brightness: -0.2, halo: { size: 0 } },
                        inactive: { opacity: 0.4 },
                    },
                    events: {
                        mouseOver() {
                            this.chart.container?.classList.add(HOVERED_CLASS);
                        },
                        mouseOut() {
                            this.chart.container?.classList.remove(HOVERED_CLASS);
                        },
                    },
                    // sparkPoint — Services360 module only
                    ...(sparkPoint
                        ? {
                              point: {
                                  events: {
                                      mouseOver() {
                                          s360TriggerSparkle(this);
                                      },
                                  },
                              },
                          }
                        : {}),
                },
            },
            series: seriesData.map((s) => {
                return {
                    type: 'spline',
                    name: s.name,
                    data: s.data,
                    color: s.color,
                    lineWidth: s.lineWidth ?? 2.5,
                    dashStyle: s.dashStyle ?? 'Solid',
                    marker: {
                        enabled: false,
                        symbol: 'circle',
                        radius: s.markerRadius ?? 5,
                        lineWidth: 0,
                        fillColor: s.color,
                    },
                    states: {
                        hover: {
                            marker: {
                                enabled: true,
                                radius: (s.markerRadius ?? 5) + 1,
                                lineWidth: 0,
                                fillColor: s.color,
                            },
                        },
                    },
                };
            }),
        };
    }, [content, height, yAxisVisible, yAxisTitle, xAxisTitle, showLegend, backgroundColor, weekYear, sparkPoint]);

    const containerProps = useMemo(() => ({ style: { width: '100%', height } }), [height]);

    if (!chartOptions) return null;

    return (
        <HighchartsReact
            ref={chartRef}
            highcharts={Highcharts}
            options={chartOptions}
            immutable={immutable}
            containerProps={containerProps}
        />
    );
};

export default memo(LineChart);
