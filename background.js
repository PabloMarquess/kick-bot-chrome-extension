/**
 * Kick Bot Background Script
 * @version 1.0.1
 * @description Service worker para gerenciar comunicação e timers
 */

// ===== CONFIGURAÇÃO =====
const CONFIG = {
  EMOJI_INTERVAL_MS: 295000,  // 4 minutos e 55 segundos (4*60 + 55)*1000
  LOJA_INTERVAL_MS: 595000    // 9 minutos e 55 segundos (9*60 + 55)*1000
};

// ===== ESTADO GLOBAL =====
const State = {
  isPaused: false,
  emojiNextTime: 0,
  lojaNextTime: 0
};

// ===== UTILITÁRIOS =====
const Utils = {
  /**
   * Envia mensagem para todas as abas do Kick
   * @param {Object} message - Mensagem a ser enviada
   */
  sendToKickTabs: (message) => {
    chrome.tabs.query({ url: "https://kick.com/*" }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Ignora erros de abas que não respondem
        });
      });
    });
  },

  /**
   * Calcula tempo restante em segundos
   * @param {number} nextTime - Timestamp do próximo evento
   * @returns {number} Segundos restantes
   */
  getTimeLeft: (nextTime) => {
    return Math.max(0, Math.ceil((nextTime - Date.now()) / 1000));
  }
};

// ===== CONTROLADOR DE TIMERS =====
const TimerController = {
  /**
   * Inicia os timers
   */
  start: () => {
    const now = Date.now();
    State.emojiNextTime = now + CONFIG.EMOJI_INTERVAL_MS;
    State.lojaNextTime = now + CONFIG.LOJA_INTERVAL_MS;
    State.isPaused = false;
    console.log('[Kick Bot Background] Timers iniciados');
  },

  /**
   * Para os timers
   */
  stop: () => {
    State.isPaused = true;
    console.log('[Kick Bot Background] Timers parados');
  },

  /**
   * Atualiza timer de emoji
   */
  updateEmojiTimer: () => {
    State.emojiNextTime = Date.now() + CONFIG.EMOJI_INTERVAL_MS;
    console.log('[Kick Bot Background] Timer de emoji atualizado');
  },

  /**
   * Atualiza timer de loja
   */
  updateLojaTimer: () => {
    State.lojaNextTime = Date.now() + CONFIG.LOJA_INTERVAL_MS;
    console.log('[Kick Bot Background] Timer de loja atualizado');
  },

  /**
   * Alterna estado de pausa
   */
  togglePause: () => {
    State.isPaused = !State.isPaused;
    console.log(`[Kick Bot Background] ${State.isPaused ? 'Pausado' : 'Retomado'}`);
    
    Utils.sendToKickTabs({ 
      action: State.isPaused ? "pause" : "resume" 
    });
  },

  /**
   * Obtém status atual
   * @returns {Object} Status dos timers
   */
  getStatus: () => {
    return {
      isPaused: State.isPaused,
      emojiTimeLeft: Utils.getTimeLeft(State.emojiNextTime),
      lojaTimeLeft: Utils.getTimeLeft(State.lojaNextTime)
    };
  }
};

// ===== MESSAGE HANDLER =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.action) {
      case "start":
        TimerController.start();
        break;
        
      case "stop":
        TimerController.stop();
        break;
        
      case "emojiSent":
        TimerController.updateEmojiTimer();
        break;
        
      case "lojaSent":
        TimerController.updateLojaTimer();
        break;
        
      case "togglePause":
        TimerController.togglePause();
        break;
        
      case "getStatus":
        sendResponse(TimerController.getStatus());
        break;
        
      default:
        console.log('[Kick Bot Background] Ação desconhecida:', message.action);
    }
  } catch (error) {
    console.error('[Kick Bot Background] Erro ao processar mensagem:', error);
  }
});

console.log('[Kick Bot Background] Service worker carregado'); 