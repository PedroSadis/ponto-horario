const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            // Cuidado: contextIsolation: false e nodeIntegration: true são inseguros
            // para carregar conteúdo web. Mas para um app local simples, facilita.
            // O ideal é usar um preload.js
            contextIsolation: false,
            nodeIntegration: false // Deixamos false, o frontend será JS puro de navegador
        }
    });

    // Carrega o seu arquivo HTML
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Abre o DevTools (ferramentas de desenvolvedor)
    mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});