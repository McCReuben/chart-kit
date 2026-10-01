import { ChartThemeProvider, useChartTheme } from '../src/theme';

// Page background from the active chart theme, so stories sit on the right surface in both modes.
function Backdrop({ children }) {
    const theme = useChartTheme();
    return <div style={{ background: theme.background, padding: 24, minHeight: '100%' }}>{children}</div>;
}

/** @type {import('@storybook/react-vite').Preview} */
const preview = {
    globalTypes: {
        theme: {
            description: 'Chart theme',
            toolbar: {
                title: 'Theme',
                icon: 'contrast',
                items: [
                    { value: 'light', title: 'Light' },
                    { value: 'dark', title: 'Dark' },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: { theme: 'light' },
    parameters: {
        layout: 'fullscreen',
        controls: { expanded: true },
    },
    decorators: [
        (Story, context) => (
            <ChartThemeProvider mode={context.globals.theme === 'dark' ? 'dark' : 'light'}>
                <Backdrop>
                    <Story />
                </Backdrop>
            </ChartThemeProvider>
        ),
    ],
};

export default preview;
