const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
  //  fullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    
  });
  mainWindow.loadFile('page-main.html');
 
}
const menuTemplate = [
 /*
  {
    label: 'Retenues Sources TVA',
    click() {
      mainWindow.loadFile('retenueTvaSource.html');
    },
  },
  {
    label: 'TVA Etrangere',
    click() {
      mainWindow.loadFile('retenueTvaEtrangere.html');
    },
  },
  {
    label: 'TVA Fournisseur 75%',
    click() {
      mainWindow.loadFile('declarationtvaFournisseur75p.html');
    },
  },
  {
    label: 'TVA Client Debiteur',
    click() {
      mainWindow.loadFile('declarationtvaClientDebiteur.html');
    },
  },
  {
    label: 'Déduction TVA',
    click() {
      mainWindow.loadFile('declarationdeductiontva.html');
    },
  },
  {
    label: 'Immobilisations',
    click() {
      mainWindow.loadFile('declarationimmobilisations.html');
    },
  },*/
  {
    label: "Quitter",
    role: "quit"
}
];

const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);
app.on('ready', createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
