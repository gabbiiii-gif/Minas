// Adapter ESC/POS — stub funcional. Implementação real depende de `node-thermal-printer`
// e configuração via electron-store (USB vendor/product ID ou IP). Para o MVP retorna ok=false
// quando não há driver configurado, mas o app continua funcional.
//
// TODO Fase 4: integrar node-thermal-printer ou escpos-usb após validar modelo da impressora.

import { ipcMain } from 'electron'

interface PrintResult { ok: boolean; error?: string }

async function printPromissoria(_payload: unknown): Promise<PrintResult> {
  return { ok: false, error: 'Impressora não configurada (Fase 4: adapter ESC/POS pendente)' }
}

async function printRecibo(_payload: unknown): Promise<PrintResult> {
  return { ok: false, error: 'Impressora não configurada' }
}

async function testPrint(): Promise<PrintResult> {
  return { ok: false, error: 'Impressora não configurada' }
}

export function registerPrinterIpc() {
  ipcMain.handle('printer:promissoria', (_e, payload) => printPromissoria(payload))
  ipcMain.handle('printer:recibo', (_e, payload) => printRecibo(payload))
  ipcMain.handle('printer:test', () => testPrint())
}
