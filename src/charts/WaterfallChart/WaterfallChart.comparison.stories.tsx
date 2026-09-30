import type { ComponentType } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import OriginalWaterfallChartJsx from '../../originals/charts/WaterfallChart/WaterfallChart';
import { lightTheme } from '../../theme';
import { waterfallRows } from '../fixtures';

import { WaterfallChart } from './WaterfallChart';
import { type WaterfallRow, resolveWaterfallColor, toWaterfallRows } from './waterfallRows';

/** The JSX original has no prop types (its optional props are inferred as required). */
const OriginalWaterfallChart = OriginalWaterfallChartJsx as unknown as ComponentType<Record<string, unknown>>;

/** Same steps as the originals' fixture, rebuilt with the helper (no client colours). */
const rows = toWaterfallRows(
    { name: 'Last Year', value: 100 },
    (waterfallRows as WaterfallRow[]).slice(1, -1).map((r) => ({ name: r.name, value: r.value, subLabel: r.subLabel })),
    { name: 'This Year' },
);
/** The original needs a colour per row; give it the rebuild's light-theme colours. */
const originalRows = rows.map((r) => ({ ...r, color: resolveWaterfallColor(r, lightTheme) }));

const yAxisFormatter = (v: number) => v.toFixed(1);
const formatBarLabel = (d: WaterfallRow) => {
    const text = d.value.toFixed(1);
    return d.value > 0 && d.offset !== 0 ? `+${text}` : text;
};

const label = { fontSize: 12, fontWeight: 700, margin: '8px 0' } as const;

function Pair({
    showYAxis = false,
    showDefaultTooltip = false,
}: {
    showYAxis?: boolean;
    showDefaultTooltip?: boolean;
}) {
    return (
        <div>
            <div style={label}>Original (Recharts)</div>
            <OriginalWaterfallChart
                chartData={originalRows}
                barSize={64}
                height={450}
                yAxisFormatter={yAxisFormatter}
                formatBarLabel={formatBarLabel}
                showYAxis={showYAxis}
                showDefaultTooltip={showDefaultTooltip}
            />
            <div style={label}>Rebuild (Recharts)</div>
            <WaterfallChart
                data={rows}
                barSize={64}
                height={450}
                yAxisFormatter={yAxisFormatter}
                formatBarLabel={formatBarLabel}
                showYAxis={showYAxis}
                showDefaultTooltip={showDefaultTooltip}
            />
        </div>
    );
}

const meta = { title: 'Comparison/WaterfallChart', component: Pair } satisfies Meta<typeof Pair>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithYAxisAndTooltip: Story = { args: { showYAxis: true, showDefaultTooltip: true } };
