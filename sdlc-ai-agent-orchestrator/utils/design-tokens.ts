// Design System Tokens for Kaizen Dhara

export type ThemeType = 'ocean' | 'sunset' | 'forest';

export interface ThemeColors {
    // Primary colors
    primary: string;
    primaryLight: string;
    primaryDark: string;

    // Accent colors
    accent: string;
    accentLight: string;

    // Background colors
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;

    // Surface colors
    surface: string;
    surfaceHover: string;

    // Text colors
    textPrimary: string;
    textSecondary: string;
    textMuted: string;

    // Border colors
    border: string;
    borderLight: string;

    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;

    // Glow/Shadow colors
    glow: string;
}

export const themes: Record<ThemeType, ThemeColors> = {
    ocean: {
        primary: '#0ea5e9',
        primaryLight: '#38bdf8',
        primaryDark: '#0284c7',

        accent: '#06b6d4',
        accentLight: '#22d3ee',

        bgPrimary: '#020617',
        bgSecondary: '#0f172a',
        bgTertiary: '#1e293b',

        surface: 'rgba(15, 23, 42, 0.6)',
        surfaceHover: 'rgba(30, 41, 59, 0.8)',

        textPrimary: '#f8fafc',
        textSecondary: '#cbd5e1',
        textMuted: '#64748b',

        border: 'rgba(148, 163, 184, 0.2)',
        borderLight: 'rgba(148, 163, 184, 0.1)',

        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',

        glow: 'rgba(14, 165, 233, 0.3)',
    },

    sunset: {
        primary: '#f97316',
        primaryLight: '#fb923c',
        primaryDark: '#ea580c',

        accent: '#ec4899',
        accentLight: '#f472b6',

        bgPrimary: '#1c0a00',
        bgSecondary: '#2d1508',
        bgTertiary: '#3d1f0f',

        surface: 'rgba(45, 21, 8, 0.6)',
        surfaceHover: 'rgba(61, 31, 15, 0.8)',

        textPrimary: '#fef3c7',
        textSecondary: '#fde68a',
        textMuted: '#ca8a04',

        border: 'rgba(251, 146, 60, 0.2)',
        borderLight: 'rgba(251, 146, 60, 0.1)',

        success: '#84cc16',
        warning: '#eab308',
        error: '#dc2626',
        info: '#8b5cf6',

        glow: 'rgba(249, 115, 22, 0.3)',
    },

    forest: {
        primary: '#10b981',
        primaryLight: '#34d399',
        primaryDark: '#059669',

        accent: '#14b8a6',
        accentLight: '#2dd4bf',

        bgPrimary: '#022c22',
        bgSecondary: '#064e3b',
        bgTertiary: '#065f46',

        surface: 'rgba(6, 78, 59, 0.6)',
        surfaceHover: 'rgba(6, 95, 70, 0.8)',

        textPrimary: '#ecfdf5',
        textSecondary: '#a7f3d0',
        textMuted: '#6ee7b7',

        border: 'rgba(52, 211, 153, 0.2)',
        borderLight: 'rgba(52, 211, 153, 0.1)',

        success: '#22c55e',
        warning: '#facc15',
        error: '#f87171',
        info: '#60a5fa',

        glow: 'rgba(16, 185, 129, 0.3)',
    },
};

// Typography
export const typography = {
    fontFamily: {
        sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        mono: '"Fira Code", "Cascadia Code", Consolas, Monaco, "Courier New", monospace',
    },

    fontSize: {
        xs: '0.75rem',      // 12px
        sm: '0.875rem',     // 14px
        base: '1rem',       // 16px
        lg: '1.125rem',     // 18px
        xl: '1.25rem',      // 20px
        '2xl': '1.5rem',    // 24px
        '3xl': '1.875rem',  // 30px
        '4xl': '2.25rem',   // 36px
        '5xl': '3rem',      // 48px
    },

    fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        black: 900,
    },

    lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
    },
};

// Spacing
export const spacing = {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
};

// Border Radius
export const borderRadius = {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
};

// Shadows
export const shadows = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

// Animation Durations
export const animation = {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
};

// Helper function to get theme
export const getTheme = (themeType: ThemeType): ThemeColors => {
    return themes[themeType];
};
