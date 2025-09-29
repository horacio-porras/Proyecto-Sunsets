//Componente Footer

//Función para cargar el footer en cualquier página
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

//Inicializa el footer cuando se carga el DOM
document.addEventListener('DOMContentLoaded', function() {
    loadFooter();
});

//Disponibilidad global
window.loadFooter = loadFooter;
