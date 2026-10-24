'use strict';
// El preload es el ÚNICO puente entre la página web y Electron. Con contextIsolation activo, la página
// no tiene acceso a Node ni a Electron: solo ve lo que se expone aquí, y es solo lectura.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld(
  'desktop',
  Object.freeze({
    platform: process.platform,
    versions: Object.freeze({
      electron: process.versions.electron,
      chrome: process.versions.chrome,
    }),
  })
);
