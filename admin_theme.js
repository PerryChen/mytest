/**
 * Theme Manager for Admin Panel
 */
const ThemeManager = {
    init() {
        this.toggleBtn = document.getElementById('theme-toggle');
        this.bindEvents();
        this.loadPreference();
    },

    bindEvents() {
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggleTheme());
        }
    },

    loadPreference() {
        // Check localStorage first
        const savedTheme = localStorage.getItem('velotric_admin_theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else {
            // Default to dark mode
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('velotric_admin_theme', newTheme);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});
