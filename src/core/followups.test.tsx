import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { isValidElement } from 'react';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { afterEach, describe, expect, it } from 'vitest';

import { darkTheme, lightTheme, mergeTheme } from '../theme/themes';
import { AXIS_TITLE_FONT_SIZE, categoryAxisProps, gridProps, valueAxisProps } from './axes';
import { brighten, parseRgb } from './color';
import { buildRows } from './data';
import { useSeriesHover } from './hover';
import { ChartLegend } from './legend';
import { niceScale } from './niceScale';
import { optionsKey } from './propCache';
import { SharedTooltipContent, tooltipProps } from './tooltip';

afterEach(cleanup);

const fmt = (v: string | number) => `#${v}`;

describe('prop factories return stable identities', () => {
    it('categoryAxisProps (left) returns the same tick and tickFormatter for equal inputs', () => {
        const a = categoryAxisProps(lightTheme, { position: 'left', categories: ['A', 'B'], labelFormatter: fmt });
        // New but equal categories array, same formatter.
        const b = categoryAxisProps(lightTheme, { position: 'left', categories: ['A', 'B'], labelFormatter: fmt });
        expect(b).toBe(a);
        expect(b.tick).toBe(a.tick);
        expect(b.tickFormatter).toBe(a.tickFormatter);
        expect(b.label).toBe(a.label);
    });

    it('categoryAxisProps changes identity when an input changes', () => {
        const base = categoryAxisProps(lightTheme, { categories: ['A', 'B'], labelFormatter: fmt });
        expect(categoryAxisProps(lightTheme, { categories: ['A', 'C'], labelFormatter: fmt })).not.toBe(base);
        expect(categoryAxisProps(lightTheme, { categories: ['A', 'B'], labelFormatter: (v) => String(v) })).not.toBe(base);
        expect(categoryAxisProps(darkTheme, { categories: ['A', 'B'], labelFormatter: fmt })).not.toBe(base);
        expect(categoryAxisProps(lightTheme, { categories: ['A', 'B'], labelFormatter: fmt, activeValue: 1 })).not.toBe(base);
    });

    it('valueAxisProps, gridProps and tooltipProps are stable for equal inputs', () => {
        const f = (v: number) => `${v}`;
        const a = valueAxisProps(lightTheme, { scale: niceScale(0, 10), formatter: f, title: 'T' });
        const b = valueAxisProps(lightTheme, { scale: niceScale(0, 10), formatter: f, title: 'T' });
        expect(b).toBe(a);
        expect(b.domain).toBe(a.domain);
        expect(gridProps(lightTheme, { direction: 'vertical' })).toBe(gridProps(lightTheme, { direction: 'vertical' }));
        const t = tooltipProps(lightTheme, { crosshair: { color: 'red' } });
        expect(tooltipProps(lightTheme, { crosshair: { color: 'red' } }).cursor).toBe(t.cursor);
    });

    it('treats omitted and undefined options alike', () => {
        expect(optionsKey({ a: 1, b: undefined })).toBe(optionsKey({ a: 1 }));
        expect(optionsKey({ f: fmt })).toBe(optionsKey({ f: fmt }));
        expect(optionsKey({ f: fmt })).not.toBe(optionsKey({ f: () => '' }));
    });

    it('renders a horizontal bar chart with a width="auto" category axis without an update loop', () => {
        const data = buildRows(['North', 'South', 'West'], [{ data: [3, 2, 1] }]);
        function Chart() {
            // Inline options every render: the factories must still return the same props.
            return (
                <BarChart width={400} height={200} data={data} layout="vertical">
                    <YAxis {...categoryAxisProps(lightTheme, { position: 'left', categories: ['North', 'South', 'West'], labelFormatter: fmt })} />
                    <XAxis {...valueAxisProps(lightTheme, { position: 'bottom' })} />
                    <Bar dataKey="s0" isAnimationActive={false} />
                </BarChart>
            );
        }
        expect(() => render(<Chart />)).not.toThrow();
    });
});

describe('axis defaults', () => {
    it('category axes draw no tick marks unless asked', () => {
        expect(categoryAxisProps(lightTheme, {}).tickLine).toBe(false);
        expect(categoryAxisProps(lightTheme, { tickMarks: true }).tickLine).toEqual({ stroke: lightTheme.componentBorder });
    });

    it('value axis titles default to 13px; titleFontSize overrides both axes', () => {
        const label = (p: { label?: unknown }) => p.label as { fontSize?: number };
        expect(label(valueAxisProps(lightTheme, { title: 'Y' })).fontSize).toBe(AXIS_TITLE_FONT_SIZE);
        expect(label(valueAxisProps(lightTheme, { title: 'Y', titleFontSize: 11 })).fontSize).toBe(11);
        expect(label(categoryAxisProps(lightTheme, { title: 'X' })).fontSize).toBe(lightTheme.fontSize.axis);
        expect(label(categoryAxisProps(lightTheme, { title: 'X', titleFontSize: 14 })).fontSize).toBe(14);
    });
});

describe('tooltipProps crosshair', () => {
    it('hides, defaults and overrides the crosshair', () => {
        expect(tooltipProps(lightTheme, { crosshair: false }).cursor).toBe(false);
        const def = tooltipProps(lightTheme).cursor;
        expect(isValidElement(def) && (def.props as { color: string }).color).toBe(lightTheme.crosshair);
        const custom = tooltipProps(lightTheme, { crosshair: { color: 'red', width: 2, dashArray: 'none' } }).cursor;
        expect(isValidElement(custom) && custom.props).toMatchObject({ color: 'red', lineWidth: 2, dashArray: 'none' });
    });
});

describe('SharedTooltipContent skipNull', () => {
    const rows = buildRows(['Jan', 'Feb'], [{ data: [1, 2] }, { data: [4, null] }]);
    const series = [
        { key: 's0', name: 'Alpha', color: '#111' },
        { key: 's1', name: 'Beta', color: '#222' },
    ];

    it('leaves out null points', () => {
        render(<SharedTooltipContent active rows={rows} activeIndex={1} series={series} skipNull />);
        expect(screen.getByText(/Alpha: 2/)).toBeTruthy();
        expect(screen.queryByText(/Beta/)).toBeNull();
    });

    it('renders nothing when every point is null', () => {
        const allNull = buildRows(['Jan'], [{ data: [null] }]);
        const { container } = render(
            <SharedTooltipContent active rows={allNull} activeIndex={0} series={[series[0]]} skipNull />,
        );
        expect(container.innerHTML).toBe('');
    });
});

describe('ChartLegend', () => {
    it('applies symbolGap and draws the marker symbol', () => {
        const { container } = render(
            <ChartLegend items={[{ key: 's0', name: 'A', color: '#f00', symbol: 'marker' }]} symbolGap={8} symbolSize={12} />,
        );
        const button = container.querySelector('button') as HTMLButtonElement;
        expect(button.style.gap).toBe('8px');
        const circle = container.querySelector('circle');
        expect(circle?.getAttribute('r')).toBe('5');
        expect(circle?.getAttribute('stroke')).toBe('#f00');
    });
});

describe('useSeriesHover per-series dimming', () => {
    it('uses the dimOpacity function per series', () => {
        const { result } = renderHook(() => useSeriesHover({ dimOpacity: (id) => (id === 'col' ? 1 : 0.2) }));
        act(() => result.current.setHovered('line1'));
        expect(result.current.opacityOf('line1')).toBe(1);
        expect(result.current.opacityOf('line2')).toBe(0.2);
        expect(result.current.opacityOf('col')).toBe(1);
        expect(result.current.isDimmed('col')).toBe(true);
    });
});

describe('brighten', () => {
    it('adds amount * 255 to each channel, clamped', () => {
        expect(brighten('#000000', 0.1)).toBe('rgb(26, 26, 26)');
        expect(brighten('#fff', 0.1)).toBe('rgb(255, 255, 255)');
        expect(brighten('rgb(100, 50, 10)', -0.1)).toBe('rgb(75, 25, 0)');
        expect(brighten('red', 0.1)).toBe('red');
        expect(parseRgb('#2a78d6')).toEqual([42, 120, 214]);
    });
});

describe('theme neutral token', () => {
    it('defaults to the base palette[0] and can be overridden', () => {
        expect(lightTheme.neutral).toBe(lightTheme.palette[0]);
        expect(darkTheme.neutral).toBe(darkTheme.palette[0]);
        expect(mergeTheme(lightTheme, { neutral: '#123456' }).neutral).toBe('#123456');
    });
});
