# chart-kit

Reusable, theme-aware React chart components, extracted from the CortexAI frontend (`cortexaife-main`).

> **Status: phase 2 of 6. The charts were copied without changes.** The components are the originals with only their
> import paths updated. They still depend on the source app's theme context and retail-week formatter. Phase 3
> removes those dependencies. See [Roadmap](#roadmap).

## Getting started

Requires Node ≥ 20.19 (`nvm use` picks up `.nvmrc`).

```sh
npm install
npm run storybook        # docs + playground at http://localhost:6006
npm run build            # library build → dist/chart-kit.js + dist/chart-kit.css
npm run build-storybook  # static docs site → storybook-static/
```

Use the Storybook toolbar's **Theme** control to switch between light and dark.

## Components

| Export              | Library    | What it draws                                                                                               |
| ------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `LineChart`         | Highcharts | Smooth lines, x-zoom, hover dimming, optional sweep animation (`animateKey`) and hover trail (`sparkPoint`) |
| `BarChart`          | Highcharts | `mode`: `grouped`, `stacked` or `horizontal`; stack totals, data labels, point and legend click handlers    |
| `ComboBarLineChart` | Highcharts | Columns plus a line on shared axes (`type: 'column' \| 'spline'` per series)                                |
| `DualAxisChart`     | Highcharts | Left and right value axes (`axis: 0 \| 1`), each series a line or a column                                  |
| `WaterfallChart`    | Recharts   | Waterfall / walk chart from pre-positioned `{ name, offset, delta, color }` rows                            |
| `ChartSegment`      | (above)    | Renders a JSON chart spec (`line`, `dual-axis`, `grouped-bar`, `stacked-bar`, `horizontal-bar`)             |

Every chart must be rendered inside `ThemeProvider`:

```jsx
import { LineChart, ThemeProvider } from 'chart-kit';
import 'chart-kit/style.css';

<ThemeProvider>
    <LineChart
        categories={['2026 RW01', '2026 RW02', '2026 RW03']}
        series={[{ name: 'Revenue', data: [42.1, 43.8, 41.5], color: '#0064D2' }]}
        yAxisFormatter={(v) => `$${v}M`}
    />
</ThemeProvider>;
```

Peer dependencies: `react`, `react-dom`, `highcharts`, `highcharts-react-official`, `recharts`. The charts inherit
their font from the page (the source app sets Poppins globally), so the host app supplies the font.

## Where each file came from

Paths are relative to `cortexaife-main/src/`.

| Here                                                 | Source                                             |
| ---------------------------------------------------- | -------------------------------------------------- |
| `src/charts/LineChart/LineChart.{jsx,css}`           | `components/common/LineChart.{jsx,css}`            |
| `src/charts/BarChart/BarChart.jsx`                   | `components/common/BarChart.jsx`                   |
| `src/charts/ComboBarLineChart/ComboBarLineChart.jsx` | `components/common/ComboBarLineChart.jsx`          |
| `src/charts/DualAxisChart/DualAxisChart.jsx`         | `components/common/DualAxisChart.jsx`              |
| `src/charts/WaterfallChart/WaterfallChart.jsx`       | `components/common/WaterfallChart.jsx`             |
| `src/spec/ChartSegment.jsx`                          | `pages/chatbot/components/ChartSegment.jsx`        |
| `src/spec/ChartSegment.css`                          | rules from `pages/chatbot/styles/report-frame.css` |
| `src/theme/ThemeContext.jsx`                         | `context/ThemeContext.jsx` (temporary stand-in)    |
| `src/core/formatRetailWeek.js`                       | `utils/formatRetailWeek.js`                        |

What changed during the copy:

- Import paths were updated for the new folder layout.
- `ChartSegment` now imports its own `ChartSegment.css`. The original rules were nested under `.chatbot-page` and read
  the chatbot's CSS variables. The copies drop that parent selector and use the chatbot's light and dark values as
  fallbacks.
- No component logic, props or styling was changed.

Stories use invented data in `src/charts/fixtures.js`; none of it comes from the source app.

## Licensing — resolve before using this outside CortexAI

- **Highcharts** needs a commercial licence for commercial use. Four of the five charts depend on it. Check that
  your licence covers every project that will use this library. If it doesn't, move those charts to Recharts, which
  `WaterfallChart` already uses.
- **Code ownership.** This code came from a client codebase. Confirm you're allowed to reuse it before publishing the
  package anywhere.

## Roadmap

1. ~~Set up the repo (Vite library build and Storybook).~~
2. ~~Copy the charts without changes; add stories with synthetic data.~~
3. **Remove dependencies on the source app** (one commit each, checking the stories still look the same):
    - Replace the app's `ThemeContext` with a chart theme that has defaults, so no provider is required. The charts
      only read `componentBackground`, `componentBorder`, `surface`, `border`, `text.primary`, `text.secondary` and
      `isDarkMode`.
    - Make `formatRetailWeek` an optional formatter instead of the default for x-axis labels and tooltips.
    - Turn the hardcoded `#707070` axis colour and the `var(--Family-Primary, "Market Sans")` font into theme values.
    - Rename `LineChart`'s `sparkPoint` (commented as "Services360 only") to a generic name, and give the
      `.line-chart--hovered` CSS class its own namespace.
    - Use LineChart's content-keyed memoisation and ref-held formatters in the other charts too. Right now they
      rebuild their options whenever a caller passes inline formatter functions.
    - Move the repeated legend, tooltip, crosshair and zoom-button settings into a shared `baseOptions(theme)`.
    - Add a `toWaterfallRows(start, steps, end)` helper (see `fixtures.js` for a working version).
    - Remove the unused `React` import in `WaterfallChart` (Vite warns about it).
4. Build new generic components modelled on the dashboard-specific charts: this-year / last-year / forecast
   comparison with hatched bars, treemap, bubble chart, sankey, and tooltip parts.
5. Write docs: one MDX page per chart (when to use it, data shape, props, examples, theming), plus the chart spec.
6. Publish to a private registry, and optionally switch cortexaife to use this package.
