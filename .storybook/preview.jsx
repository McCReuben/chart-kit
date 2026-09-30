import { useEffect } from 'react';

import { ThemeProvider, useTheme } from '../src/originals/theme/ThemeContext';
import { ChartThemeProvider } from '../src/theme';

// ThemeProvider owns its dark-mode state (seeded from the OS preference), so the
// toolbar toggle drives it through toggleTheme rather than a prop.
function ThemeSync({ mode, children }) {
    const { isDarkMode, toggleTheme, colors } = useTheme();
    const wantDark = mode === 'dark';

    useEffect(() => {
        if (isDarkMode !== wantDark) toggleTheme();
    }, [isDarkMode, wantDark, toggleTheme]);

    return <div style={{ background: colors.background, padding: 24, minHeight: '100%' }}>{children}</div>;
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
            // Originals read the app ThemeProvider; rebuilt charts read ChartThemeProvider.
            // Both follow the toolbar so Comparison stories switch together.
            <ThemeProvider>
                <ChartThemeProvider mode={context.globals.theme === 'dark' ? 'dark' : 'light'}>
                    <ThemeSync mode={context.globals.theme}>
                        <Story />
                    </ThemeSync>
                </ChartThemeProvider>
            </ThemeProvider>
        ),
    ],
};

export default preview;
