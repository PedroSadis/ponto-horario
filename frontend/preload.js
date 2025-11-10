// frontend/preload.js

const { contextBridge } = require('electron');

// Exemplo: Expor uma API segura para o processo de renderização
// Por enquanto, não vamos expor nada diretamente, mas é o lugar certo para fazê-lo
// se você precisar de comunicação IPC segura entre renderer e main process.
contextBridge.exposeInMainWorld(
  'electronAPI', {
    // Aqui você pode expor funções que interagem com o processo principal,
    // por exemplo, para salvar arquivos, acessar o sistema, etc.
    // Ex: invoke: (channel, data) => ipcRenderer.invoke(channel, data)
  }
);