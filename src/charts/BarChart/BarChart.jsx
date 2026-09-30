import { useMemo } from 'react';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

import { formatRetailWeek } from '../../core/formatRetailWeek';
import { useTheme } from '../../theme/ThemeContext';

const tooltipAwayFromCursor = function tooltipAwayFromCursor(labelWidth, labelHeight, point) {
    const chart = this.chart;
    const gap = 20;
    const originX = (point?.plotX ?? 0) + chart.plotLeft;
    const originY = (point?.plotY ?? 0) + chart.plotTop;
    const barHalf = (point?.shapeArgs?.width ?? 16) / 2;
    const chartW = chart.chartWidth;
    const chartH = chart.chartHeight;

    let x = originX + barHalf + gap;
    if (x + labelWidth > chartW - 8) {
        x = originX - barHalf - labelWidth - gap;
    }
    if (x < 8) x = 8;

    let y = originY - labelHeight / 2;
    if (y < 8) y = 8;
    if (y + labelHeight > chartH - 8) {
        y = Math.max(8, chartH - labelHeight - 8);
    }
    return { x, y };
};

/*
 * Generic, reusable, theme-aware Highcharts bar chart — the bar counterpart to
 * the common LineChart. Usable app-wide.
 *
 * Public API (props):
 *   - series:      array of { name, data (numeric array aligned to categories), color }.
 *                  `dashStyle`/dashed is meaningless for bars and is ignored.
 *   - categories:  x-axis (grouped/stacked) or y-axis (horizontal) category labels.
 *   - mode:        'grouped' | 'stacked' | 'horizontal' (default 'grouped'):
 *                    'grouped'    → chart.type 'column', side-by-side series.
 *                    'stacked'    → chart.type 'column' + plotOptions.series.stacking 'normal'.
 *                    'horizontal' → chart.type 'bar' (Highcharts 'bar' is horizontal), grouped.
 *   - height:      chart height in px (default 320).
 *   - yAxisVisible / yAxisFormatter / yAxisTitle: value-axis chrome (matches LineChart).
 *   - showLegend:  render the legend (default false).
 *   - tooltipValueFormatter: optional per-value formatter for the tooltip.
 */
export default function BarChart({
    series = [],
    categories = [],
    mode = 'grouped',
    height = 320,
    yAxisVisible = true,
    yAxisFormatter = null,
    yAxisTitle = null,
    showLegend = false,
    tooltipValueFormatter = null,
    tooltipShared = true,
    tooltipHtmlFormatter = null,
    onPointClick = null,
    onLegendClick = null,
    backgroundColor = null,
    weekYear = null,
    marginBottom = null,
    legendMargin = 12,
    legendSymbolPadding = 5,
    legendItemDistance = 16,
    showDataLabels = false,
    dataLabelFormatter = null,
    showStackTotals = false,
}) {
    const { colors, isDarkMode } = useTheme();

    const chartOptions = useMemo(() => {
        if (!series?.length) return null;

        const horizontal = mode === 'horizontal';
        const stacked = mode === 'stacked';
        const chartType = horizontal ? 'bar' : 'column';
        const quarterAxis = (categories || []).some((c) => /^\d{4}\s*Q[1-4]$/i.test(String(c)));

        return {
            chart: {
                type: chartType,
                backgroundColor: backgroundColor ?? colors.componentBackground,
                style: { fontFamily: 'inherit' },
                height,
                animation: false,
                spacingTop: stacked && showStackTotals ? 28 : 10,
                ...(marginBottom != null ? { marginBottom } : {}),
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
                itemMarginTop: 8,
                itemMarginBottom: 4,
                itemDistance: legendItemDistance,
                itemMarginRight: 20,
                symbolPadding: legendSymbolPadding,
                symbolHeight: 12,
                symbolWidth: 12,
                symbolRadius: 2,
                margin: legendMargin,
                padding: 8,
            },
            xAxis: {
                categories,
                crosshair: { width: 1, color: colors.componentBorder, dashStyle: 'Dot' },
                labels: {
                    formatter() {
                        return formatRetailWeek(this.value, weekYear);
                    },
                    style: { color: '#707070', fontSize: '11px' },
                    rotation: horizontal || quarterAxis ? 0 : -45,
                },
                lineColor: colors.componentBorder,
                tickColor: colors.componentBorder,
            },
            yAxis: {
                visible: yAxisVisible,
                title: yAxisTitle ? { text: yAxisTitle, style: { color: colors.text.primary } } : { text: null },
                labels: {
                    formatter: yAxisFormatter
                        ? function () {
                              return yAxisFormatter(this.value);
                          }
                        : undefined,
                    style: { color: '#707070', fontSize: '11px' },
                },
                gridLineColor: colors.componentBorder,
                reversedStacks: stacked ? false : undefined,
                stackLabels:
                    stacked && showStackTotals
                        ? {
                              enabled: true,
                              crop: false,
                              overflow: 'allow',
                              allowOverlap: true,
                              style: {
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  color: colors.text.primary,
                                  textOutline: isDarkMode ? '1px rgba(0,0,0,0.45)' : '1px rgba(255,255,255,0.7)',
                              },
                              formatter() {
                                  if (this.total == null) return '';
                                  return yAxisFormatter ? yAxisFormatter(this.total) : this.total;
                              },
                          }
                        : undefined,
            },
            tooltip: {
                shared: tooltipShared,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                style: { color: colors.text.primary, fontSize: '12px' },
                useHTML: true,
                followPointer: false,
                stickOnContact: false,
                hideDelay: 50,
                padding: 10,
                positioner: tooltipAwayFromCursor,
                formatter() {
                    if (tooltipHtmlFormatter) return tooltipHtmlFormatter(this);
                    const points = this.points ?? (this.point ? [this] : []);
                    const idx = points[0]?.point?.index ?? 0;
                    const raw = categories[idx] ?? this.x ?? '';
                    const label = formatRetailWeek(raw, weekYear);
                    let html = `<div style="padding:4px 6px"><b>${label}</b><br/>`;
                    points.forEach((p) => {
                        const val = tooltipValueFormatter ? tooltipValueFormatter(p.y) : p.y != null ? p.y : '—';
                        html += `<div style="display:flex;align-items:center;gap:5px;margin-top:3px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};flex-shrink:0"></span>
              <span>${p.series.name}: ${val}</span>
            </div>`;
                    });
                    return html + '</div>';
                },
            },
            plotOptions: {
                column: stacked
                    ? {
                          stacking: 'normal',
                          borderWidth: 0,
                          groupPadding: 0.06,
                          pointPadding: 0.02,
                          maxPointWidth: 48,
                      }
                    : { borderWidth: 0 },
                bar: { borderWidth: 0 },
                series: {
                    animation: { duration: 1000, easing: 'easeOut' },
                    borderWidth: 0,
                    borderRadius: 3,
                    stacking: stacked ? 'normal' : undefined,
                    cursor: onPointClick || onLegendClick ? 'pointer' : undefined,
                    states: { hover: { brightness: -0.05 } },
                    events: onLegendClick
                        ? {
                              legendItemClick(e) {
                                  if (e?.preventDefault) e.preventDefault();
                                  onLegendClick(this.name);
                                  return false;
                              },
                          }
                        : undefined,
                    dataLabels: {
                        enabled: showDataLabels,
                        inside: stacked,
                        crop: false,
                        overflow: 'allow',
                        allowOverlap: false,
                        verticalAlign: stacked ? 'middle' : 'bottom',
                        style: {
                            fontSize: stacked ? '9px' : '10px',
                            fontWeight: '600',
                            color: stacked ? '#ffffff' : colors.text.primary,
                            textOutline: stacked ? '1px rgba(0,0,0,0.35)' : 'none',
                        },
                        formatter() {
                            if (this.y == null || Number(this.y) === 0) return '';
                            if (stacked && this.percentage != null && this.percentage < 4) return '';
                            return dataLabelFormatter ? dataLabelFormatter(this.y) : this.y;
                        },
                    },
                    point: onPointClick
                        ? {
                              events: {
                                  click() {
                                      onPointClick(this.series.name, this);
                                  },
                              },
                          }
                        : undefined,
                },
            },
            series: series.map((s) => ({
                type: chartType,
                name: s.name,
                data: s.data,
                color: s.color,
            })),
        };
    }, [
        series,
        categories,
        mode,
        colors,
        isDarkMode,
        height,
        yAxisVisible,
        yAxisFormatter,
        yAxisTitle,
        showLegend,
        tooltipValueFormatter,
        tooltipShared,
        tooltipHtmlFormatter,
        onPointClick,
        onLegendClick,
        backgroundColor,
        weekYear,
        marginBottom,
        legendMargin,
        legendSymbolPadding,
        legendItemDistance,
        showDataLabels,
        dataLabelFormatter,
        showStackTotals,
    ]);

    if (!chartOptions) return null;

    return (
        <HighchartsReact
            highcharts={Highcharts}
            options={chartOptions}
            immutable={false}
            containerProps={{ style: { width: '100%' } }}
        />
    );
}
