/**
 * Footer Component Loader for Sunset's Tarbaca
 * This script loads the unified footer component into pages
 */

// Load footer into the specified container
async function loadFooter(containerId = 'footer-container') {
    try {
        const response = await fetch('/components/footer.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const footerHTML = await response.text();
        
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = footerHTML;
        } else {
            console.warn(`Footer container with id "${containerId}" not found`);
        }
    } catch (error) {
        console.error('Error loading footer:', error);
    }
}

// Initialize footer when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadFooter();
});

// Make loadFooter available globally
window.loadFooter = loadFooter;
