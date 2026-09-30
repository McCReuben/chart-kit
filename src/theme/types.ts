/** Colour mode of a resolved chart theme. */
export type ChartThemeMode = 'light' | 'dark';

/** Mode accepted by {@link ChartThemeProvider}: a fixed mode, or `'system'` to follow `prefers-color-scheme`. */
export type ChartThemeModeSetting = ChartThemeMode | 'system';

/** Font sizes (px) used by the chart chrome. */
export interface ChartFontSizes {
    /** Axis tick labels and axis titles (11). */
    axis: number;
    /** Legend item labels (12). */
    legend: number;
    /** Tooltip text (12). */
    tooltip: number;
    /** Data labels drawn on bars or points (10). */
    dataLabel: number;
}

/**
 * Tokens for the `'inverse'` tooltip look: a dark tooltip that looks the same in both themes.
 * Used by `TooltipFrame variant="inverse"` and the markers inside it.
 */
export interface ChartTooltipInverseTokens {
    /** Background colour (`#050505`). */
    background: string;
    /** 1px border colour (`#30343b`). */
    border: string;
    /** Text colour (`#ffffff`). */
    text: string;
    /** CSS box-shadow (`0 6px 18px rgba(0,0,0,.28)`). */
    shadow: string;
    /** Border radius in px (6). */
    radius: number;
    /** CSS padding (`10px 12px`). */
    padding: string;
    /** Minimum width in px (220). */
    minWidth: number;
    /** Font size in px (12). */
    fontSize: number;
    /** Font weight of rows (600). */
    fontWeight: number;
    /** Line height in px (18). */
    lineHeight: number;
    /** Contrast colour used for marker borders and hatch gaps (`#ffffff`). */
    markerContrast: string;
}

/** Text colours. */
export interface ChartTextColors {
    /** Main text: legend items, tooltip text, y-axis title. */
    primary: string;
    /** Secondary text (muted labels). */
    secondary: string;
}

/**
 * A fully resolved chart theme. Every chart and core building block reads its colours, fonts and sizes from here.
 * The built-in values ({@link lightTheme}, {@link darkTheme}) keep the source application's colour tokens (decision D4).
 */
export interface ChartTheme {
    /** Resolved colour mode. */
    mode: ChartThemeMode;
    /** Convenience flag, `mode === 'dark'`. */
    isDarkMode: boolean;
    /** Page background behind chart cards (Storybook uses it as the canvas colour). */
    background: string;
    /** Default chart background (the chart "card"). */
    componentBackground: string;
    /** Border colour of chart chrome: x-axis line and ticks, reset-zoom button stroke. */
    componentBorder: string;
    /** Tooltip background (default look). */
    surface: string;
    /** Tooltip border colour (default look). */
    border: string;
    /** Text colours. */
    text: ChartTextColors;
    /** Axis tick label and x-axis title colour (the originals hardcode `#707070` in both modes). */
    axisLabel: string;
    /** Horizontal grid line colour. */
    gridLine: string;
    /** Crosshair (tooltip cursor) colour. */
    crosshair: string;
    /** Fill of the drag-to-zoom selection rectangle. */
    selectionFill: string;
    /** Colour of hidden legend items (symbol and label). */
    inactiveLegend: string;
    /** Colour for positive values (waterfall increases, favourable deltas). */
    positive: string;
    /** Colour for negative values (waterfall decreases, unfavourable deltas). */
    negative: string;
    /** Forecast series colour. */
    forecast: string;
    /** Budget / target series colour. */
    budget: string;
    /** Accent colour for highlighting the hovered category (active tick, reference line). */
    accent: string;
    /** Font family for all chart text. `'inherit'` uses the host page font. */
    fontFamily: string;
    /** Font sizes in px. */
    fontSize: ChartFontSizes;
    /** Tokens of the inverse (always dark) tooltip look. */
    tooltipInverse: ChartTooltipInverseTokens;
    /** Default categorical series palette (8 colours), assigned in order. */
    palette: string[];
}

/** Recursive partial; arrays are replaced, not merged. */
export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends ReadonlyArray<unknown> ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Partial theme merged over a base theme (deep merge; arrays such as `palette` are replaced).
 * `mode` and `isDarkMode` are not overridable here; use the provider's `mode` prop instead.
 */
export type ChartThemeOverrides = DeepPartial<Omit<ChartTheme, 'mode' | 'isDarkMode'>>;
