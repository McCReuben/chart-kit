import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react';
import { Line, LineChart, XAxis, YAxis, type MouseHandlerDataParam } from 'recharts';
import { afterEach, describe, expect, it } from 'vitest';

import { lightTheme } from '../theme/themes';
import { categoryAxisProps, valueAxisProps } from './axes';
import { buildRows } from './data';
import { findNearestSeries, useSeriesHover } from './hover';
import { ChartLegend, useSeriesVisibility } from './legend';
import { CrosshairCursor } from './CrosshairCursor';
import { SharedTooltipContent } from './tooltip';
import { useXZoom } from './zoom';

afterEach(cleanup);

const rows = buildRows(['Jan', 'Feb', 'Mar', 'Apr'], [
    { data: [1, 2, 3, 4] },
    { data: [4, null, 2, 1] },
]);

function WrappedXAxis() {
    return <XAxis {...categoryAxisProps(lightTheme, { categories: ['Jan', 'Feb', 'Mar', 'Apr'], interval: 0 })} />;
}

describe('Recharts integration', () => {
    it('allows wrapping <XAxis> in a custom component (Recharts 3)', () => {
        const { container } = render(
            <LineChart width={400} height={200} data={rows}>
                <WrappedXAxis />
                <YAxis {...valueAxisProps(lightTheme)} />
                <Line dataKey="s0" isAnimationActive={false} style={{ opacity: 0.4 }} />
            </LineChart>,
        );
        const labels = Array.from(container.querySelectorAll('.ck-axis-tick text')).map((t) => t.textContent);
        expect(labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr']);
        const path = container.querySelector('.recharts-line-curve') as SVGPathElement | null;
        expect(path?.style.opacity).toBe('0.4');
    });
});

describe('SharedTooltipContent', () => {
    it('renders header, rows, dash for null, and skips hidden series', () => {
        render(
            <SharedTooltipContent
                active
                rows={rows}
                activeIndex={1}
                headerFormatter={(c, i) => `${c} (#${i})`}
                valueFormatter={(v) => (v === null ? '—' : `$${v}`)}
                series={[
                    { key: 's0', name: 'Alpha', color: '#111' },
                    { key: 's1', name: 'Beta', color: '#222', marker: 'dashed' },
                    { key: 's0', name: 'Hidden', color: '#333', hidden: true },
                ]}
            />,
        );
        expect(screen.getByText('Feb (#1)')).toBeTruthy();
        expect(screen.getByText(/Alpha: \$2/)).toBeTruthy();
        expect(screen.getByText(/Beta: —/)).toBeTruthy();
        expect(screen.queryByText(/Hidden/)).toBeNull();
    });
    it('renders nothing when inactive', () => {
        const { container } = render(<SharedTooltipContent active={false} rows={rows} activeIndex={0} series={[]} />);
        expect(container.innerHTML).toBe('');
    });
});

describe('legend + visibility', () => {
    function Demo({ onLegendClick }: { onLegendClick?: (name: string) => void }) {
        const vis = useSeriesVisibility(['s0', 's1']);
        return (
            <ChartLegend
                items={[
                    { key: 's0', name: 'Alpha', color: '#111', hidden: vis.isHidden('s0') },
                    { key: 's1', name: 'Beta', color: '#222', hidden: vis.isHidden('s1') },
                ]}
                onToggle={vis.toggle}
                onItemClick={onLegendClick ? (item) => onLegendClick(item.name) : undefined}
            />
        );
    }
    it('toggles on click', () => {
        render(<Demo />);
        const btn = screen.getByRole('button', { name: 'Alpha' });
        expect(btn.getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(btn);
        expect(btn.getAttribute('aria-pressed')).toBe('false');
        expect(btn.style.color).toBe('rgb(204, 204, 204)');
        fireEvent.click(btn);
        expect(btn.getAttribute('aria-pressed')).toBe('true');
    });
    it('onItemClick replaces toggling', () => {
        const clicked: string[] = [];
        render(<Demo onLegendClick={(n) => clicked.push(n)} />);
        const btn = screen.getByRole('button', { name: 'Beta' });
        fireEvent.click(btn);
        expect(clicked).toEqual(['Beta']);
        expect(btn.style.color).not.toBe('rgb(204, 204, 204)');
    });
});

describe('hover', () => {
    it('finds the series nearest to the pointer', () => {
        const scale = (v: unknown) => 100 - Number(v) * 10;
        const row = { s0: 2, s1: 5, s2: null };
        const series = [{ key: 's0' }, { key: 's1' }, { key: 's2' }];
        expect(findNearestSeries(row, series, 78, () => scale)).toBe('s0');
        expect(findNearestSeries(row, series, 55, () => scale)).toBe('s1');
        expect(findNearestSeries(row, [{ key: 's0', hidden: true }, { key: 's1' }], 80, () => scale)).toBe('s1');
    });
    it('dims other series', () => {
        const { result } = renderHook(() => useSeriesHover());
        act(() => result.current.setHovered('s1'));
        expect(result.current.opacityOf('s0')).toBe(0.4);
        expect(result.current.opacityOf('s1')).toBe(1);
        expect(result.current.dimProps('s0').style.transition).toBe('opacity 120ms ease-out');
        act(() => result.current.clear());
        expect(result.current.opacityOf('s0')).toBe(1);
    });
});

describe('useXZoom', () => {
    const state = (i: number) => ({ activeTooltipIndex: i }) as unknown as MouseHandlerDataParam;
    const ev = (clientX: number) => ({ clientX, button: 0, preventDefault() {} }) as unknown as ReactMouseEvent;

    it('zooms after a drag past the threshold and ignores clicks', () => {
        const data = ['a', 'b', 'c', 'd', 'e', 'f'];
        const { result, rerender } = renderHook(({ key }) => useXZoom({ length: 6, resetKey: key }), {
            initialProps: { key: data as unknown },
        });
        // click: no zoom
        act(() => result.current.chartHandlers.onMouseDown(state(1), ev(100)));
        act(() => result.current.chartHandlers.onMouseMove(state(1), ev(104)));
        act(() => void window.dispatchEvent(new MouseEvent('mouseup')));
        expect(result.current.range).toBeNull();
        // drag
        act(() => result.current.chartHandlers.onMouseDown(state(1), ev(100)));
        act(() => result.current.chartHandlers.onMouseMove(state(3), ev(160)));
        expect(result.current.selection).toEqual({ start: 1, end: 3 });
        act(() => void window.dispatchEvent(new MouseEvent('mouseup')));
        expect(result.current.range).toEqual({ start: 1, end: 3 });
        expect(result.current.sliceRows(data)).toEqual(['b', 'c', 'd']);
        expect(result.current.consumeDragClick()).toBe(true);
        expect(result.current.consumeDragClick()).toBe(false);
        // nested zoom uses indices relative to the visible slice
        act(() => result.current.chartHandlers.onMouseDown(state(1), ev(100)));
        act(() => result.current.chartHandlers.onMouseMove(state(2), ev(200)));
        act(() => void window.dispatchEvent(new MouseEvent('mouseup')));
        expect(result.current.range).toEqual({ start: 2, end: 3 });
        act(() => result.current.reset());
        expect(result.current.range).toBeNull();
        // data change resets
        act(() => result.current.chartHandlers.onMouseDown(state(0), ev(0)));
        act(() => result.current.chartHandlers.onMouseMove(state(4), ev(300)));
        act(() => void window.dispatchEvent(new MouseEvent('mouseup')));
        expect(result.current.isZoomed).toBe(true);
        rerender({ key: [...data] });
        expect(result.current.isZoomed).toBe(false);
    });
});

describe('CrosshairCursor', () => {
    const lineOf = (el: ReactElement) => {
        const { container } = render(<svg>{el}</svg>);
        const l = container.querySelector('line')!;
        return ['x1', 'y1', 'x2', 'y2'].map((a) => Number(l.getAttribute(a)));
    };
    it('draws a vertical line for line charts (points)', () => {
        expect(lineOf(<CrosshairCursor points={[{ x: 50, y: 10 }, { x: 50, y: 200 }]} width={900} />)).toEqual([50, 10, 50, 200]);
    });
    it('draws a vertical line through a bar-chart band (wide bands too)', () => {
        // Recharts: horizontal layout band rect at y = top + 0.5
        expect(lineOf(<CrosshairCursor x={100} y={10.5} width={250} height={200} top={10} left={40} />)).toEqual([225, 10.5, 225, 210.5]);
    });
    it('draws a horizontal line in vertical layout', () => {
        expect(lineOf(<CrosshairCursor x={40.5} y={60} width={900} height={30} top={10} left={40} />)).toEqual([40.5, 75, 940.5, 75]);
    });
});
