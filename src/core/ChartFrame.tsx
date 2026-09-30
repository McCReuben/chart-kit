import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';

import { ResolvedChartThemeProvider, useChartTheme } from '../theme/ChartThemeProvider';
import type { ChartTheme } from '../theme/types';

/**
 * Outer spacing of the frame in px, as the originals' default `chart.spacing` `[10, 10, 15, 10]`
 * (top, right, bottom, left).
 */
export const CHART_SPACING = { top: 10, right: 10, bottom: 15, left: 10 } as const;

/**
 * Default Recharts `margin` for charts inside a {@link ChartFrame}. The frame already applies
 * {@link CHART_SPACING}, so the chart itself needs only a little room for the top tick label.
 */
export const CHART_MARGIN = { top: 6, right: 4, bottom: 0, left: 4 } as const;

/** Props of {@link ChartFrame}. */
export interface ChartFrameProps {
    /** Total height in px, legend included (as the originals' `chart.height`). */
    height: number;
    /** Resolved theme (usually `useChartTheme(props.theme)`); handed down to all core parts inside. Default: context theme. */
    theme?: ChartTheme;
    /** Background colour; default `theme.componentBackground`. `'transparent'` is allowed. */
    backgroundColor?: string;
    /** Accessible name of the plot; the plot region gets `role="img"` and this `aria-label`. Default `'Chart'`. */
    ariaLabel?: string;
    /** Class name on the outer element. */
    className?: string;
    /** Extra inline styles on the outer element. */
    style?: CSSProperties;
    /** Legend (usually a `ChartLegend`), rendered centred below the plot inside the frame height. */
    legend?: ReactNode;
    /** Content drawn over the plot region (absolutely positioned HTML overlays). */
    overlay?: ReactNode;
    /** The Recharts chart element (e.g. `<LineChart>`); it is wrapped in a `ResponsiveContainer` that fills the plot region. */
    children: ReactElement;
}

/**
 * Chart container that recreates the originals' frame: fixed height, theme background and font, original-style
 * outer spacing, `position: relative` for overlays, and the legend below the plot. It also provides the resolved
 * theme to everything inside (ticks, tooltip, legend, reset-zoom button).
 */
export function ChartFrame({
    height,
    theme: themeProp,
    backgroundColor,
    ariaLabel,
    className,
    style,
    legend,
    overlay,
    children,
}: ChartFrameProps) {
    const contextTheme = useChartTheme();
    const theme = themeProp ?? contextTheme;
    return (
        <ResolvedChartThemeProvider theme={theme}>
            <div
                className={className}
                style={{
                    position: 'relative',
                    boxSizing: 'border-box',
                    width: '100%',
                    height,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: `${CHART_SPACING.top}px ${CHART_SPACING.right}px ${CHART_SPACING.bottom}px ${CHART_SPACING.left}px`,
                    backgroundColor: backgroundColor ?? theme.componentBackground,
                    fontFamily: theme.fontFamily,
                    color: theme.text.primary,
                    ...style,
                }}
            >
                <div
                    role="img"
                    aria-label={ariaLabel ?? 'Chart'}
                    style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, minWidth: 0 }}
                >
                    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                        {children}
                    </ResponsiveContainer>
                    {overlay}
                </div>
                {legend ? <div style={{ flex: '0 0 auto' }}>{legend}</div> : null}
            </div>
        </ResolvedChartThemeProvider>
    );
}
