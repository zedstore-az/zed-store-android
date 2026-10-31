const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("zedDesktop", Object.freeze({
  isDesktop: true,
  platform: process.platform
}));
