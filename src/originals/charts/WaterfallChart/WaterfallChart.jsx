import React, { useMemo } from 'react';

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { useTheme } from '../../theme/ThemeContext';

export default function WaterfallChart({
    chartData = [],
    barSize = 80,
    height = 450,
    marginTop = 28,
    marginRight = 80,
    marginLeft = 20,
    marginBottom = 52,
    showYoY = false,
    yAxisFormatter = (v) => String(v),
    showYAxis = false,
    formatBarLabel,
    renderBarLabel,
    renderXTick,
    TooltipContent = null,
    showDefaultTooltip = false,
    yDomain,
    showZeroLine = false,
}) {
    const { colors, isDarkMode } = useTheme();

    const hasMixedSigns = useMemo(() => {
        if (!chartData.length) return false;
        // Use 'value' (actual data value) when available; fall back to delta
        const nums = chartData
            .map((d) => (typeof d.value === 'number' ? d.value : d.delta))
            .filter((v) => typeof v === 'number' && !isNaN(v));
        return nums.some((v) => v > 0) && nums.some((v) => v < 0);
    }, [chartData]);

    const resolvedYDomain = useMemo(() => {
        if (yDomain) return yDomain;
        if (!chartData.length) return ['auto', 'auto'];
        const vals = chartData
            .flatMap((d) => [d.offset, d.offset + d.delta])
            .filter((v) => typeof v === 'number' && !isNaN(v));
        if (!vals.length) return ['auto', 'auto'];
        const min = Math.min(...vals, 0);
        const max = Math.max(...vals, 0);
        const range = max - min || 1;
        const pad = Math.max(0.5, range * 0.12);
        return [min - pad, max + pad];
    }, [chartData, yDomain]);

    const defaultRenderXTick = ({ x, y, payload, index }) => {
        const d = chartData[index];
        const words = String(payload.value ?? '').split(' ');
        const subLines = (d?.subLabel ?? '').split('\n').filter(Boolean);

        return (
            <g transform={`translate(${x},${y})`}>
                {words.map((word, i) => (
                    <text
                        key={i}
                        x={0}
                        y={-4 + i * 18}
                        textAnchor="middle"
                        fill={colors.text.secondary}
                        style={{ fontFamily: `var(--Family-Primary, "Market Sans")`, fontSize: '12px' }}
                    >
                        {word}
                    </text>
                ))}

                {showYoY && d?.pillar && (
                    <text
                        x={0}
                        y={-4 + words.length * 18}
                        textAnchor="middle"
                        fill={colors.text.secondary}
                        style={{ fontFamily: `var(--Family-Primary, "Market Sans")`, fontSize: '12px' }}
                    >
                        YoY
                    </text>
                )}

                {subLines.map((sub, i) => (
                    <text
                        key={`sub-${i}`}
                        x={0}
                        y={words.length * 16 + 12 + (showYoY && d?.pillar ? 18 : 0) + i * 16}
                        textAnchor="middle"
                        fill={colors.text.secondary}
                        style={{ fontFamily: `var(--Family-Primary, "Market Sans")`, fontSize: '10px' }}
                    >
                        {sub}
                    </text>
                ))}
            </g>
        );
    };

    const defaultRenderBarLabel = ({ x, y, width, height: h, index }) => {
        const d = chartData[index];
        if (!d || !formatBarLabel) return null;

        const label = formatBarLabel(d);
        const barPxHeight = Math.abs(h);
        // For very short bars push the label further up so it clears the bar above
        const extra = barPxHeight < 18 ? 18 - barPxHeight + 10 : 0;
        const topY = Math.min(y, y + h) - 8 - extra;

        return (
            <text
                x={x + width / 2}
                y={topY}
                textAnchor="middle"
                fill={colors.text.secondary}
                dominantBaseline="baseline"
                style={{ fontFamily: `var(--Family-Primary, "Market Sans")`, fontSize: '12px' }}
            >
                {label}
            </text>
        );
    };

    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart
                data={chartData}
                margin={{ top: marginTop, right: marginRight, left: marginLeft, bottom: marginBottom }}
            >
                <CartesianGrid strokeDasharray="0" stroke={colors.border} horizontal={false} vertical={false} />

                <XAxis
                    dataKey="name"
                    tickLine={false}
                    tick={renderXTick ?? defaultRenderXTick}
                    axisLine={false}
                    interval={0}
                />

                <YAxis
                    type="number"
                    domain={resolvedYDomain}
                    axisLine={false}
                    tickLine={false}
                    tick={
                        showYAxis
                            ? {
                                  fill: colors.text.secondary,
                                  fontSize: 11,
                                  fontFamily: 'var(--Family-Primary, "Market Sans")',
                              }
                            : false
                    }
                    tickFormatter={showYAxis ? yAxisFormatter : undefined}
                    width={showYAxis ? 52 : 0}
                />

                {(TooltipContent || showDefaultTooltip) && (
                    <Tooltip
                        cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                        content={
                            TooltipContent ? (
                                <TooltipContent />
                            ) : (
                                ({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const entry = payload.find((p) => p.dataKey === 'delta');
                                    if (!entry) return null;
                                    const d = entry.payload;
                                    const raw = entry.value;
                                    return (
                                        <div
                                            style={{
                                                background: colors.surface,
                                                border: `1px solid ${colors.componentBorder}`,
                                                borderRadius: 8,
                                                padding: '8px 12px',
                                                fontSize: 13,
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color: colors.text.secondary,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    marginBottom: 2,
                                                }}
                                            >
                                                {d.name}
                                            </div>
                                            <div style={{ color: d.color, fontWeight: 700 }}>
                                                {raw < 0 ? '-' : ''}
                                                {yAxisFormatter(Math.abs(raw))}
                                            </div>
                                        </div>
                                    );
                                }
                            )
                        }
                    />
                )}

                {showZeroLine && hasMixedSigns && (
                    <ReferenceLine
                        y={0}
                        stroke={isDarkMode ? '#383838' : '#efefef'}
                        strokeWidth={1}
                        ifOverflow="visible"
                        zIndex={50}
                        label={{
                            value: '0',
                            position: 'left',
                            fill: colors.text.secondary,
                            fontSize: 11,
                            fontFamily: 'var(--Family-Primary, "Market Sans")',
                        }}
                    />
                )}

                {/* Invisible offset — positions each bar at its waterfall level */}
                <Bar
                    dataKey="offset"
                    barSize={barSize}
                    stackId="w"
                    fill="transparent"
                    isAnimationActive={false}
                    legendType="none"
                    pointerEvents="none"
                />

                <Bar dataKey="delta" stackId="w" barSize={barSize} radius={0} isAnimationActive={false}>
                    {chartData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                    ))}
                    <LabelList content={renderBarLabel ?? defaultRenderBarLabel} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
