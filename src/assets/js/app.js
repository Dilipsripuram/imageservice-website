/**
 * Main Application Entry Point
 * Initializes and renders the File Manager application
 */

// Application initialization
document.addEventListener('DOMContentLoaded', function() {
    // Render the main application
    ReactDOM.render(
        React.createElement(window.FileManager),
        document.getElementById('root')
    );
    
    console.log('Image Service File Manager initialized');
});