import { useMemo, type CSSProperties } from 'react';

import { BarChart } from '../../charts/BarChart';
import { DualAxisChart } from '../../charts/DualAxisChart';
import { LineChart } from '../../charts/LineChart';
import { useContentStable } from '../../core';
import { useChartTheme, type ChartTheme, type ChartThemeOverrides } from '../../theme';
import { planChartSegment, type ChartSpec } from './chartSegmentSpec';

/**
 * Card border colour. No theme token matches (`selectionFill` is `rgba(9,104,246,0.10)`, close but not equal),
 * so it is derived from the mode here. Candidate for a theme token (e.g. `cardBorder`).
 */
export function cardBorderColor(theme: ChartTheme): string {
    return theme.isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(9,104,246,0.08)';
}

export interface ChartSegmentProps {
    /**
     * Declarative chart spec (from a backend or an LLM). Renders nothing (`null`) when it is not an object, has an
     * unknown `type`, or has no series. Series without a `color` use the theme palette.
     */
    spec: ChartSpec | null | undefined;
    /** Per-instance theme overrides, merged over the context theme and passed on to the chart. */
    theme?: ChartThemeOverrides;
    /** Class name on the card. Use it (or `style`) for spacing between segments, e.g. `:first-child` margins. */
    className?: string;
    /**
     * Inline styles merged over the card's defaults (`margin: 14px 0`, `padding: 12`, 1px border, radius 8).
     * Replaces the original's `:first-child`/`:last-child` margin rules, which inline styles cannot express.
     */
    style?: CSSProperties;
    /** Accessible name of the chart. Default: the spec title. */
    ariaLabel?: string;
}

/** Renders a declarative {@link ChartSpec} as a Line, DualAxis or Bar chart inside a titled, bordered card. */
export function ChartSegment({ spec, theme: themeOverrides, className, style, ariaLabel }: ChartSegmentProps) {
    const theme = useChartTheme(themeOverrides);
    const stableSpec = useContentStable(spec);
    const plan = useMemo(() => planChartSegment(stableSpec), [stableSpec]);
    if (!plan) return null;

    const common = {
        categories: plan.categories,
        height: plan.height,
        showLegend: plan.showLegend,
        // Transparent so the host (message bubble) background shows through.
        backgroundColor: 'transparent',
        theme: themeOverrides,
        ariaLabel: ariaLabel ?? plan.title,
    };

    let chart;
    if (plan.kind === 'line') {
        chart = (
            <LineChart
                {...common}
                series={plan.series.map((s) => ({ name: s.name, data: s.data, color: s.color, dashStyle: s.dashed ? 'Dash' : 'Solid' }))}
                xAxisTitle={plan.xLabel}
                yAxisTitle={plan.yLabel}
            />
        );
    } else if (plan.kind === 'dual-axis') {
        chart = (
            <DualAxisChart
                {...common}
                series={plan.series.map((s) => ({
                    name: s.name,
                    data: s.data,
                    color: s.color,
                    dashStyle: s.dashed ? 'Dash' : 'Solid',
                    axis: s.axis,
                    seriesType: s.seriesType,
                }))}
                yAxisTitle={plan.yLabel ?? null}
                y2AxisTitle={plan.y2Label ?? null}
            />
        );
    } else {
        chart = (
            <BarChart
                {...common}
                mode={plan.barMode}
                series={plan.series.map((s) => ({ name: s.name, data: s.data, color: s.color }))}
                yAxisTitle={plan.yLabel}
            />
        );
    }

    return (
        <div
            className={className}
            style={{
                margin: '14px 0',
                padding: 12,
                border: `1px solid ${cardBorderColor(theme)}`,
                borderRadius: 8,
                fontFamily: theme.fontFamily,
                ...style,
            }}
        >
            {plan.title && (
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary, marginBottom: 8 }}>{plan.title}</div>
            )}
            {chart}
        </div>
    );
}
