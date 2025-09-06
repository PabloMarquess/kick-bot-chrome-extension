/**
 * Kick Bot - Extensão Chrome para automação de chat
 * @version 1.0.1
 * @description Envia emojis e comandos no chat do Kick.com com intervalos configuráveis
 */

// ===== CONFIGURAÇÃO =====
const CONFIG = {
  EMOJI_INTERVAL_MS: 295000,  // 4 minutos e 55 segundos (4*60 + 55)*1000
  LOJA_INTERVAL_MS: 595000,   // 9 minutos e 55 segundos (9*60 + 55)*1000
  UPDATE_INTERVAL_MS: 1000,   // 1 segundo
  PANEL_DELAY_MS: 1000,       // Delay para criar painel
  CHECK_INTERVAL_MS: 500      // Intervalo para verificar chat
};

const URL_PATTERN = /https:\/\/(www\.)?kick\.com\/[^/]+$/i;
const DEFAULT_EMOTES = [
  "emojiAngel", "emojiClown", "emojiBubbly", 
  "emojiCheerful", "emojiAngry", "emojiDJ"
];

// ===== UTILITÁRIOS =====
const DOM = {
  query: (selector, root = document) => root.querySelector(selector),
  queryAll: (selector, root = document) => Array.from(root.querySelectorAll(selector))
};

// ===== COMUNICAÇÃO COM BACKGROUND SCRIPT =====
const BackgroundComm = {
  /**
   * Envia mensagem para o background script
   * @param {string} action - Ação a ser executada
   */
  send: (action) => {
    try {
      chrome.runtime.sendMessage({ action }).catch(error => {
        console.error('[Kick Bot] Erro ao enviar mensagem:', error);
      });
    } catch (error) {
      console.error('[Kick Bot] Erro de comunicação:', error);
    }
  },

  /**
   * Obtém status do background script
   * @returns {Promise<Object>} Status atual do bot
   */
  getStatus: () => {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('[Kick Bot] Erro de runtime:', chrome.runtime.lastError.message);
            resolve({ isPaused: false, emojiTimeLeft: 0, lojaTimeLeft: 0 });
            return;
          }
          resolve(response || { isPaused: false, emojiTimeLeft: 0, lojaTimeLeft: 0 });
        });
      } catch (error) {
        console.log('[Kick Bot] Erro ao obter status:', error);
        resolve({ isPaused: false, emojiTimeLeft: 0, lojaTimeLeft: 0 });
      }
    });
  }
};

// ===== COLETA DE EMOTES =====
const EmoteCollector = {
  /**
   * Coleta emojis disponíveis na página
   * @returns {Array<string>} Lista de nomes de emojis
   */
  collect: () => {
    const emoteSet = new Set();

    // Busca emojis com data-emote-name
    DOM.queryAll('[data-emote-name]').forEach(element => {
      const name = element.getAttribute('data-emote-name')?.trim();
      if (name) emoteSet.add(name);
    });

    // Busca emojis em imagens
    DOM.queryAll('img[alt^="emoji"]').forEach(img => {
      const name = img.getAttribute('alt')?.trim();
      if (name) emoteSet.add(name);
    });

    // Se não encontrou emojis, usa lista padrão
    if (emoteSet.size === 0) {
      DEFAULT_EMOTES.forEach(emote => emoteSet.add(emote));
    }

    return Array.from(emoteSet);
  }
};

// ===== ENVIO DE MENSAGENS =====
const MessageSender = {
  /**
   * Envia texto no input do chat
   * @param {string} text - Texto a ser enviado
   * @returns {boolean} Sucesso do envio
   */
  send: (text) => {
    const input = DOM.query('[data-testid="chat-input"][contenteditable="true"]');
    if (!input) return false;

    input.focus();

    try {
      // Limpa o input e insere o texto
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(input);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('delete');
      document.execCommand('insertText', false, text);
    } catch {
      // Fallback para navegadores que não suportam execCommand
      input.textContent = text;
    }

    // Dispara eventos para simular digitação
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));

    // Simula pressionar Enter
    const enterEvent = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true };
    input.dispatchEvent(new KeyboardEvent('keydown', enterEvent));
    input.dispatchEvent(new KeyboardEvent('keyup', enterEvent));

    return true;
  }
};

// ===== ESTADO GLOBAL =====
const State = {
  emojiCount: 0,
  lojaCount: 0,
  isPaused: false,
  controlPanel: null,
  emojiTimer: null,
  lojaTimer: null
};

// ===== AÇÕES DO BOT =====
const BotActions = {
  /**
   * Envia emoji aleatório
   */
  sendRandomEmote: () => {
    if (State.isPaused) return;
    
    const emoteNames = EmoteCollector.collect();
    if (!emoteNames.length) return;
    
    const randomEmote = emoteNames[Math.floor(Math.random() * emoteNames.length)];
    if (MessageSender.send(`:${randomEmote}:`)) {
      State.emojiCount++;
      console.log(`[Kick Bot] Emoji enviado: ${randomEmote}. Total: ${State.emojiCount}`);
      
      BackgroundComm.send("emojiSent");
      ControlPanel.update();
    }
  },

  /**
   * Envia comando !loja
   */
  sendLojaCommand: () => {
    if (State.isPaused) return;
    
    if (MessageSender.send('!loja')) {
      State.lojaCount++;
      console.log(`[Kick Bot] Comando !loja enviado. Total: ${State.lojaCount}`);
      
      BackgroundComm.send("lojaSent");
      ControlPanel.update();
    }
  }
};

// ===== PAINEL DE CONTROLE =====
const ControlPanel = {
  /**
   * Cria o painel de controle
   */
  create: () => {
    if (State.controlPanel) return;
    
    State.controlPanel = document.createElement('div');
    State.controlPanel.id = 'kick-bot-panel';
    State.controlPanel.className = 'kick-bot-panel';
    
    // Aplica estilos CSS
    Object.assign(State.controlPanel.style, {
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      zIndex: '9999',
      minWidth: '200px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      cursor: 'move',
      userSelect: 'none',
      pointerEvents: 'auto'
    });
    
    // HTML do painel
    State.controlPanel.innerHTML = `
      <div class="kick-bot-header" style="margin-bottom: 10px; font-weight: bold; color: #00ff00;">
        🤖 Kick Bot
      </div>
      <div id="kick-bot-status" style="margin-bottom: 10px;">Carregando...</div>
      <div style="margin-bottom: 10px; display: flex; gap: 5px; justify-content: center;">
        <button id="kick-bot-toggle" class="kick-bot-btn kick-bot-btn-pause" title="Pausar/Retomar">
          <span class="btn-icon">⏸️</span>
          <span class="btn-text">Pausar</span>
        </button>
        <button id="kick-bot-center" class="kick-bot-btn kick-bot-btn-center" title="Centralizar painel">
          <span class="btn-icon">🎯</span>
          <span class="btn-text">Centralizar</span>
        </button>
        <button id="kick-bot-close" class="kick-bot-btn kick-bot-btn-close" title="Fechar painel">
          <span class="btn-icon">❌</span>
          <span class="btn-text">Fechar</span>
        </button>
      </div>
      <div style="font-size: 10px; color: #ccc; text-align: center;">
        Emojis: <span id="kick-bot-emoji-count">0</span> | 
        Loja: <span id="kick-bot-loja-count">0</span>
      </div>
    `;
    
    // Adiciona estilos CSS para os botões
    ControlPanel._addButtonStyles();
    
    document.body.appendChild(State.controlPanel);
    ControlPanel._setupEventListeners();
    ControlPanel._setupDragFunctionality();
    ControlPanel._startUpdateInterval();
  },

  /**
   * Adiciona estilos CSS para os botões
   * @private
   */
  _addButtonStyles: () => {
    if (document.getElementById('kick-bot-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'kick-bot-styles';
    style.textContent = `
      .kick-bot-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 10px;
        font-weight: bold;
        transition: all 0.2s ease;
        min-width: 60px;
        height: 45px;
        position: relative;
        overflow: hidden;
      }
      
      .kick-bot-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      }
      
      .kick-bot-btn:active {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      
      .kick-bot-btn-pause {
        background: linear-gradient(135deg, #ff4444, #cc3333);
        color: white;
      }
      
      .kick-bot-btn-pause:hover {
        background: linear-gradient(135deg, #ff5555, #dd4444);
      }
      
      .kick-bot-btn-resume {
        background: linear-gradient(135deg, #00ff00, #00cc00);
        color: white;
      }
      
      .kick-bot-btn-resume:hover {
        background: linear-gradient(135deg, #11ff11, #00dd00);
      }
      
      .kick-bot-btn-center {
        background: linear-gradient(135deg, #4444ff, #3333cc);
        color: white;
      }
      
      .kick-bot-btn-center:hover {
        background: linear-gradient(135deg, #5555ff, #4444dd);
      }
      
      .kick-bot-btn-close {
        background: linear-gradient(135deg, #666, #444);
        color: white;
      }
      
      .kick-bot-btn-close:hover {
        background: linear-gradient(135deg, #777, #555);
      }
      
      .btn-icon {
        font-size: 14px;
        margin-bottom: 2px;
        display: block;
      }
      
      .btn-text {
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .kick-bot-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s;
      }
      
      .kick-bot-btn:hover::before {
        left: 100%;
      }
    `;
    
    document.head.appendChild(style);
  },

  /**
   * Configura event listeners do painel
   * @private
   */
  _setupEventListeners: () => {
    const toggleBtn = DOM.query('#kick-bot-toggle');
    const centerBtn = DOM.query('#kick-bot-center');
    const closeBtn = DOM.query('#kick-bot-close');
    
    toggleBtn?.addEventListener('click', BotController.togglePause);
    centerBtn?.addEventListener('click', ControlPanel.center);
    closeBtn?.addEventListener('click', ControlPanel.close);
  },

  /**
   * Centraliza o painel na tela
   */
  center: () => {
    if (!State.controlPanel) return;
    
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const panelWidth = State.controlPanel.offsetWidth;
    const panelHeight = State.controlPanel.offsetHeight;
    
    Object.assign(State.controlPanel.style, {
      top: `${centerY - panelHeight / 2}px`,
      left: `${centerX - panelWidth / 2}px`,
      right: 'auto',
      transform: 'none'
    });
  },

  /**
   * Fecha o painel
   */
  close: () => {
    if (!State.controlPanel) return;
    
    State.controlPanel.remove();
    State.controlPanel = null;
    ControlPanel._stopUpdateInterval();
  },

  /**
   * Configura funcionalidade de arrastar
   * @private
   */
  _setupDragFunctionality: () => {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    State.controlPanel.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = State.controlPanel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      
      Object.assign(State.controlPanel.style, {
        top: `${startTop}px`,
        left: `${startLeft}px`,
        right: 'auto',
        transform: 'none'
      });
      
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      Object.assign(State.controlPanel.style, {
        left: `${startLeft + deltaX}px`,
        top: `${startTop + deltaY}px`
      });
      
      e.preventDefault();
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  },

  /**
   * Inicia intervalo de atualização
   * @private
   */
  _startUpdateInterval: () => {
    if (window.kickBotUpdateInterval) return;
    window.kickBotUpdateInterval = setInterval(ControlPanel.update, CONFIG.UPDATE_INTERVAL_MS);
  },

  /**
   * Para intervalo de atualização
   * @private
   */
  _stopUpdateInterval: () => {
    if (window.kickBotUpdateInterval) {
      clearInterval(window.kickBotUpdateInterval);
      window.kickBotUpdateInterval = null;
    }
  },

  /**
   * Atualiza o painel com informações atuais
   */
  update: async () => {
    if (!State.controlPanel) return;
    
    try {
      const status = await BackgroundComm.getStatus();
      const statusDiv = DOM.query('#kick-bot-status');
      const toggleBtn = DOM.query('#kick-bot-toggle');
      const emojiCountSpan = DOM.query('#kick-bot-emoji-count');
      const lojaCountSpan = DOM.query('#kick-bot-loja-count');
      
      if (!statusDiv || !toggleBtn || !emojiCountSpan || !lojaCountSpan) {
        console.log('[Kick Bot] Elementos do painel ainda não carregados');
        return;
      }
      
      if (status.isPaused) {
        statusDiv.innerHTML = '⏸️ PAUSADO';
        const iconSpan = toggleBtn.querySelector('.btn-icon');
        const textSpan = toggleBtn.querySelector('.btn-text');
        if (iconSpan) iconSpan.textContent = '▶️';
        if (textSpan) textSpan.textContent = 'Retomar';
        toggleBtn.className = 'kick-bot-btn kick-bot-btn-resume';
      } else {
        const emojiTime = ControlPanel._formatTime(status.emojiTimeLeft || 0);
        const lojaTime = ControlPanel._formatTime(status.lojaTimeLeft || 0);
        statusDiv.innerHTML = `🟢 Ativo<br>Emoji: ${emojiTime}<br>Loja: ${lojaTime}`;
        const iconSpan = toggleBtn.querySelector('.btn-icon');
        const textSpan = toggleBtn.querySelector('.btn-text');
        if (iconSpan) iconSpan.textContent = '⏸️';
        if (textSpan) textSpan.textContent = 'Pausar';
        toggleBtn.className = 'kick-bot-btn kick-bot-btn-pause';
      }
      
      emojiCountSpan.textContent = State.emojiCount || 0;
      lojaCountSpan.textContent = State.lojaCount || 0;
    } catch (error) {
      console.error('[Kick Bot] Erro ao atualizar painel:', error);
    }
  },

  /**
   * Formata tempo em MM:SS
   * @param {number} seconds - Segundos
   * @returns {string} Tempo formatado
   * @private
   */
  _formatTime: (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) {
      return '0:00';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
};

// ===== CONTROLADOR DO BOT =====
const BotController = {
  /**
   * Inicia o bot
   */
  start: () => {
    if (State.emojiTimer || State.lojaTimer) return;
    if (!URL_PATTERN.test(location.href)) return;

    const checkInterval = setInterval(() => {
      const chatInput = DOM.query('[data-testid="chat-input"][contenteditable="true"]');
      if (chatInput) {
        clearInterval(checkInterval);
        
        // Inicia timers
        State.emojiTimer = setInterval(BotActions.sendRandomEmote, CONFIG.EMOJI_INTERVAL_MS);
        State.lojaTimer = setInterval(BotActions.sendLojaCommand, CONFIG.LOJA_INTERVAL_MS);
        
        // Reseta contadores
        State.emojiCount = 0;
        State.lojaCount = 0;
        State.isPaused = false;
        
        console.log('[Kick Bot] Iniciado. Emoji a cada 4:55min, !loja a cada 9:55min.');
        
        BackgroundComm.send("start");
        setTimeout(ControlPanel.create, CONFIG.PANEL_DELAY_MS);
      }
    }, CONFIG.CHECK_INTERVAL_MS);
  },

  /**
   * Para o bot
   */
  stop: () => {
    if (State.emojiTimer) {
      clearInterval(State.emojiTimer);
      State.emojiTimer = null;
    }
    if (State.lojaTimer) {
      clearInterval(State.lojaTimer);
      State.lojaTimer = null;
    }
    
    console.log(`[Kick Bot] Parado. Total emojis: ${State.emojiCount}, Total loja: ${State.lojaCount}`);
    BackgroundComm.send("stop");
  },

  /**
   * Pausa/retoma o bot
   */
  togglePause: () => {
    BackgroundComm.send("togglePause");
    State.isPaused = !State.isPaused;
    console.log(`[Kick Bot] ${State.isPaused ? 'Pausado' : 'Retomado'}`);
  }
};

// ===== INICIALIZAÇÃO E EVENTOS =====
const App = {
  /**
   * Inicializa a aplicação
   */
  init: () => {
    // Listener para mensagens do background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        if (message.action === "pause") {
          State.isPaused = true;
          console.log('[Kick Bot] Pausado via background.');
        } else if (message.action === "resume") {
          State.isPaused = false;
          console.log('[Kick Bot] Retomado via background.');
        }
      } catch (error) {
        console.error('[Kick Bot] Erro ao processar mensagem:', error);
      }
    });

    // Observa navegação SPA
    const mutationObserver = new MutationObserver(() => {
      if (!State.emojiTimer && !State.lojaTimer && 
          URL_PATTERN.test(location.href) && 
          DOM.query('[data-testid="chat-input"][contenteditable="true"]')) {
        BotController.start();
      }
    });
    
    mutationObserver.observe(document.documentElement, { 
      childList: true, 
      subtree: true 
    });

    // Auto-start
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      BotController.start();
    } else {
      window.addEventListener('DOMContentLoaded', BotController.start);
    }

    // Exposição de controles globais
    App._exposeGlobalControls();
  },

  /**
   * Expõe controles globais para uso no console
   * @private
   */
  _exposeGlobalControls: () => {
    window.kickBotStart = BotController.start;
    window.kickBotStop = BotController.stop;
    window.kickBotPause = BotController.togglePause;
    window.kickBotEmojiCount = () => State.emojiCount;
    window.kickBotLojaCount = () => State.lojaCount;
    window.kickBotShowPanel = ControlPanel.create;
  }
};

// Inicializa a aplicação
App.init();
