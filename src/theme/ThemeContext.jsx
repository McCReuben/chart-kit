import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children, forceLightMode = false }) => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // If forceLightMode is true, always return false (light mode)
        if (forceLightMode) return false;
        // Always use system preference on initial load
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // Apply dark-mode class to body element
    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode((prev) => !prev);
    };

    const theme = {
        isDarkMode,
        toggleTheme,
        colors: {
            // Background colors
            background: isDarkMode ? '#000000' : '#f8f9fa',
            surface: isDarkMode ? '#000000' : '#ffffff',
            headerBg: isDarkMode ? '#000000' : '#ffffff',

            // Component backgrounds
            componentBackground: isDarkMode ? '#2B2C2F' : '#ffffff',
            tableHeaderBackground: isDarkMode ? '#212225' : '#F7F7F7',

            greentext: isDarkMode ? '#507D17' : '#AAED56',
            redtext: isDarkMode ? '#570303' : '#FF5C5C',

            greenbar: isDarkMode ? '#507D17' : '#288034',
            redbar: isDarkMode ? '#FF5C5C' : '#D50B0B',
            text: {
                primary: isDarkMode ? '#FFFFFF' : '#191919',
                secondary: isDarkMode ? '#C0C0C0' : '#707070',
                headerTitle: isDarkMode ? '#F7F7F7' : '#191919',

                font: 'var(--Family-Primary, "Market Sans")',
                fontSize: ' var(--Size-Body, 14px)',
                fontStyle: 'normal',
                fontWeight: 700,
                lineHeight: 'var(--Line-height-250, 20px)',
                letterSpacing: 'var(--Letter-spacing-None, 0)',
                fontFeatureSettings: 'liga off, clig off',
                color: 'var(--Foreground-Primary, #191919)',
            },
            table: {
                valueColor: isDarkMode ? '#C0C0C0' : '#707070',
            },
            tableSeperator: isDarkMode ? '#8F8F8F' : '#191919',
            divider: isDarkMode ? '#363636' : '#E5E5E5',
            // Border colors
            border: isDarkMode ? '#3a3a3a' : '#e5e5e5',
            componentBorder: isDarkMode ? '#3B4043' : '#e5e5e5',
            tableCellBorder: isDarkMode ? '#8F8F8F' : '#e5e5e5',
            toggleBorder: isDarkMode ? '#FFFFFF' : '#191919',

            // Card colors
            card: {
                background: isDarkMode ? '#2A2A2A' : '#F8F9FA',
            }, // Original grey colors

            grey: {
                100: isDarkMode ? '#2A2A2A' : '#F8F9FA',
                200: isDarkMode ? '#3A3A3A' : '#DEE2E6',
            },

            green: {
                100: '#eaffe5ff',
                200: '#eaffe5ff',
            },

            // Consistent colors for graphs and tables (same in light and dark mode)
            consistentRed: isDarkMode ? '#D50B0B' : '#FF5C5C',
            consistentGreen: isDarkMode ? '#3CC14E' : '#92C821',

            // Button colors
            button: {
                disabled: {
                    background: isDarkMode ? '#707070' : '#C7C7C7',
                    text: isDarkMode ? '#191919' : '#FFFFFF',
                },
            },

            // Chart colors
            chart: {
                budget: '#0968F6',
                forecast: isDarkMode ? '#71E3E2' : '#F3511B',
            },

            // Scrollbar colors
            // scrollbar: {
            //   thumb: isDarkMode ? '#3F4043' : '#C7C7C7',
            //   track: isDarkMode ? '#2B2C2F' : '#F7F7F7',
            // },
        },
    };

    return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};
