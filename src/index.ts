// Public entry point for the chart-kit library. The frozen Highcharts originals
// live in src/originals/ for Storybook comparison only and are never exported.

// Theme
export { ChartThemeProvider, DARK_PALETTE, LIGHT_PALETTE, darkTheme, lightTheme, mergeTheme, useChartTheme } from './theme';
export type {
    ChartFontSizes,
    ChartTextColors,
    ChartTheme,
    ChartThemeMode,
    ChartThemeModeSetting,
    ChartThemeOverrides,
    ChartThemeProviderProps,
    ChartTooltipInverseTokens,
    DeepPartial,
} from './theme';

// Core building blocks
export {
    AXIS_TITLE_FONT_SIZE,
    ActiveCategoryTick,
    CHART_MARGIN,
    CHART_SPACING,
    CategoryTick,
    ChartFrame,
    ChartLegend,
    CrosshairCursor,
    DIM_OPACITY,
    EMPTY_VALUE,
    HatchPattern,
    LegendSymbol,
    NearestSeriesTracker,
    PlotAreaProbe,
    ROTATED_LABEL_ANGLE,
    ResetZoomButton,
    SharedTooltipContent,
    TooltipFrame,
    TooltipMarker,
    TooltipRow,
    TooltipTitle,
    ZoomSelection,
    brighten,
    buildRows,
    categoryAxisProps,
    currencyFormatter,
    formatCurrency,
    formatNumber,
    formatPercent,
    formatRetailWeek,
    gridProps,
    niceScale,
    numberFormatter,
    parseRgb,
    percentFormatter,
    resolveSeries,
    retailWeekFormatter,
    seriesExtent,
    tooltipProps,
    useContentStable,
    useSeriesHover,
    useSeriesVisibility,
    useStableCallback,
    useUniqueId,
    useXZoom,
    valueAxisProps,
} from './core';
export type {
    ActiveCategoryTickProps,
    BaseFormatOptions,
    CategoryAxisOptions,
    CategoryFormatter,
    CategoryTickProps,
    ChartFrameProps,
    ChartLegendProps,
    ChartRow,
    CrosshairCursorProps,
    CurrencyFormatOptions,
    GridOptions,
    HatchPatternProps,
    IndexRange,
    LegendItem,
    LegendSymbolKind,
    LegendSymbolProps,
    MarkerKind,
    NiceScale,
    NiceScaleOptions,
    NumberFormatOptions,
    PercentFormatOptions,
    ResolvedSeries,
    SeriesHover,
    SeriesInput,
    SeriesVisibility,
    SharedTooltipContentProps,
    TooltipFrameProps,
    TooltipMarkerProps,
    TooltipRowProps,
    TooltipSeriesItem,
    TooltipCrosshairOptions,
    TooltipTitleProps,
    TooltipVariant,
    ValueAxisOptions,
    ValueFormatter,
    XZoom,
    XZoomOptions,
} from './core';

// Charts
export * from './charts/WaterfallChart';
export * from './charts/DualAxisChart';
export * from './charts/LineChart';
export * from './charts/ComboBarLineChart';
export * from './charts/BarChart';

// Spec renderer
export * from './spec/ChartSegment';
