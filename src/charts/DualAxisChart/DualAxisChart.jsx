import { useMemo } from 'react';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

import { formatRetailWeek } from '../../core/formatRetailWeek';
import { useTheme } from '../../theme/ThemeContext';

/*
 * Generic, reusable, theme-aware Highcharts dual-axis chart — the two-scale
 * counterpart to the common LineChart / BarChart. Plots series against a left
 * (primary) and a right (secondary) value axis so metrics with very different
 * magnitudes/units (e.g. GMB $M vs conversion %) read clearly on one chart.
 * Usable app-wide.
 *
 * Public API (props):
 *   - series:       array of {
 *                     name, data (numeric array aligned to categories), color,
 *                     axis:       0 (left, default) | 1 (right),
 *                     seriesType: 'line' (default) | 'column',
 *                     dashStyle:  line-only ('Dash' → dashed; ignored for columns),
 *                   }.
 *   - categories:   x-axis category labels.
 *   - height:       chart height in px (default 320).
 *   - yAxisTitle:   left (primary) value-axis title (state units here).
 *   - y2AxisTitle:  right (secondary) value-axis title.
 *   - yAxisVisible: value-axis chrome toggle (matches LineChart/BarChart).
 *   - showLegend:   render the legend (default false).
 *   - tooltipValueFormatter: optional per-value formatter for the tooltip.
 */
export default function DualAxisChart({
    series = [],
    categories = [],
    height = 320,
    yAxisTitle = null,
    y2AxisTitle = null,
    yAxisVisible = true,
    showLegend = false,
    tooltipValueFormatter = null,
    backgroundColor = null,
    weekYear = null,
}) {
    const { colors, isDarkMode } = useTheme();

    const chartOptions = useMemo(() => {
        if (!series?.length) return null;

        const axisLabelStyle = { color: '#707070', fontSize: '11px' };
        const makeAxis = (title, opposite) => ({
            opposite,
            visible: yAxisVisible,
            title: title ? { text: title, style: { color: colors.text.primary } } : { text: null },
            labels: { style: axisLabelStyle },
            gridLineColor: colors.componentBorder,
        });

        return {
            chart: {
                backgroundColor: backgroundColor ?? colors.componentBackground,
                style: { fontFamily: 'inherit' },
                height,
                animation: { duration: 1000, easing: 'easeOut' },
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
                symbolHeight: 12,
                symbolWidth: 12,
                symbolRadius: 2,
            },
            xAxis: {
                categories,
                crosshair: { width: 1, color: colors.componentBorder, dashStyle: 'Dot' },
                labels: {
                    formatter() {
                        return formatRetailWeek(this.value, weekYear);
                    },
                    style: axisLabelStyle,
                    rotation: -45,
                },
                lineColor: colors.componentBorder,
                tickColor: colors.componentBorder,
            },
            // Index 0 = left/primary, index 1 = right/secondary. Series pick via `yAxis`.
            yAxis: [makeAxis(yAxisTitle, false), makeAxis(y2AxisTitle, true)],
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
                        html += `<div style="display:flex;align-items:center;gap:5px;margin-top:3px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};flex-shrink:0"></span>
              <span>${p.series.name}: ${val}</span>
            </div>`;
                    });
                    return html + '</div>';
                },
            },
            plotOptions: {
                series: {
                    animation: { duration: 1000, easing: 'easeOut' },
                    borderWidth: 0,
                    borderRadius: 3,
                    states: { hover: { brightness: -0.05, lineWidthPlus: 0, halo: { size: 6, opacity: 0.15 } } },
                },
            },
            series: series.map((s) => {
                const isColumn = s.seriesType === 'column' || s.seriesType === 'bar';
                const type = isColumn ? 'column' : 'spline';
                const dashed = !isColumn && (s.dashStyle === 'Dash' || s.dashStyle === 'dash');
                const out = {
                    type,
                    name: s.name,
                    data: s.data,
                    color: s.color,
                    yAxis: s.axis === 1 ? 1 : 0,
                };
                if (!isColumn) {
                    out.lineWidth = s.lineWidth ?? 2;
                    out.dashStyle = s.dashStyle ?? 'Solid';
                    out.marker = dashed
                        ? { enabled: false, symbol: 'circle' }
                        : {
                              enabled: true,
                              symbol: 'circle',
                              radius: 5,
                              fillColor: '#FFFFFF',
                              lineWidth: 2,
                              lineColor: s.color,
                          };
                }
                return out;
            }),
        };
    }, [
        series,
        categories,
        colors,
        isDarkMode,
        height,
        yAxisTitle,
        y2AxisTitle,
        yAxisVisible,
        showLegend,
        tooltipValueFormatter,
        backgroundColor,
        weekYear,
    ]);

    if (!chartOptions) return null;

    return (
        <HighchartsReact
            highcharts={Highcharts}
            options={chartOptions}
            immutable={true}
            containerProps={{ style: { width: '100%' } }}
        />
    );
}
