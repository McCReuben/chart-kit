import { useMemo } from 'react';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

import { formatRetailWeek } from '../../core/formatRetailWeek';
import { useTheme } from '../../theme/ThemeContext';

/*
 * Combo chart: column bars + spline line overlay on shared x/y axes.
 * series: array of { name, data, color, type: 'column' | 'spline' }
 */
export default function ComboBarLineChart({
    series = [],
    categories = [],
    height = 360,
    yAxisFormatter = null,
    yAxisTitle = null,
    xAxisTitle = null,
    showLegend = false,
    tooltipValueFormatter = null,
    yAxisMin = undefined,
    yAxisMax = undefined,
    yAxisTickPositions = undefined,
    weekYear = null,
}) {
    const { colors, isDarkMode } = useTheme();

    const chartOptions = useMemo(() => {
        if (!series?.length) return null;

        return {
            chart: {
                backgroundColor: colors.componentBackground,
                style: { fontFamily: 'inherit' },
                height,
                animation: { duration: 1000, easing: 'easeOut' },
                zoomType: 'x',
                selectionMarkerFill: 'rgba(9,104,246,0.10)',
                resetZoomButton: {
                    theme: {
                        fill: colors.componentBackground,
                        stroke: colors.componentBorder,
                        r: 6,
                        style: { color: colors.text.primary, fontSize: '11px', cursor: 'pointer' },
                        states: { hover: { fill: colors.componentBorder } },
                    },
                    position: { align: 'right', verticalAlign: 'top', x: -10, y: 10 },
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
                categories,
                crosshair: { width: 1, color: colors.componentBorder, dashStyle: 'Dot' },
                labels: {
                    formatter() {
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
                title: yAxisTitle
                    ? { text: yAxisTitle, style: { color: colors.text.primary, fontSize: '11px' } }
                    : { text: null },
                labels: {
                    formatter: yAxisFormatter
                        ? function () {
                              return yAxisFormatter(this.value);
                          }
                        : undefined,
                    style: { color: '#707070', fontSize: '11px' },
                },
                gridLineColor: colors.componentBorder,
                ...(yAxisMin !== undefined && { min: yAxisMin }),
                ...(yAxisMax !== undefined && { max: yAxisMax }),
                ...(yAxisTickPositions !== undefined && { tickPositions: yAxisTickPositions }),
            },
            tooltip: {
                shared: true,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                style: { color: colors.text.primary, fontSize: '12px' },
                useHTML: true,
                formatter() {
                    const idx = this.points[0]?.point?.index ?? 0;
                    const raw = categories[idx] ?? '';
                    const label = formatRetailWeek(raw, weekYear);
                    let html = `<div style="padding:4px 6px"><b>${label}</b><br/>`;
                    this.points.forEach((p) => {
                        const val = tooltipValueFormatter ? tooltipValueFormatter(p.y) : p.y != null ? p.y : '—';
                        const isLine = p.series.type === 'spline';
                        const swatch = isLine
                            ? `<span style="display:inline-block;width:16px;height:2px;background:${p.color};flex-shrink:0;margin-bottom:2px;border-radius:1px"></span>`
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
                column: {
                    animation: { duration: 1000, easing: 'easeOut' },
                    borderWidth: 0,
                    borderRadius: 3,
                    groupPadding: 0.1,
                    pointPadding: 0.05,
                    states: { hover: { brightness: -0.1 }, inactive: { opacity: 1 } },
                },
                spline: {
                    animation: { duration: 1000, easing: 'easeOut' },
                    lineWidth: 2.5,
                    marker: {
                        enabled: false,
                        symbol: 'circle',
                        radius: 4,
                        lineWidth: 0,
                    },
                    states: {
                        hover: {
                            lineWidthPlus: 0,
                            brightness: -0.2,
                            halo: { size: 0 },
                            marker: { enabled: true, radius: 5, lineWidth: 0 },
                        },
                    },
                },
                series: {
                    opacity: 1,
                },
            },
            series: series.map((s) => ({
                type: s.type ?? 'column',
                name: s.name,
                data: s.data,
                color: s.color,
                zIndex: s.type === 'spline' ? 5 : 1,
                ...(s.type === 'spline' && {
                    marker: { enabled: false, fillColor: s.color },
                    states: { hover: { marker: { enabled: true, fillColor: s.color, lineWidth: 0, radius: 5 } } },
                }),
            })),
        };
    }, [
        series,
        categories,
        colors,
        isDarkMode,
        height,
        yAxisFormatter,
        yAxisTitle,
        xAxisTitle,
        showLegend,
        tooltipValueFormatter,
        yAxisMin,
        yAxisMax,
        yAxisTickPositions,
        weekYear,
    ]);

    if (!chartOptions) return null;

    return (
        <HighchartsReact
            highcharts={Highcharts}
            options={chartOptions}
            immutable={false}
            updateArgs={[true, true, false]}
            containerProps={{ style: { width: '100%' } }}
        />
    );
}
