# Kick Bot - Extensão Chrome

Uma extensão para Chrome que automatiza o envio de mensagens no chat do Kick.com com intervalos configuráveis.

## Funcionalidades

### Envio Automático
- **Emojis aleatórios**: A cada 4 minutos e 55 segundos
- **Comando !loja**: A cada 9 minutos e 55 segundos
- **Detecção automática**: Inicia quando entra em um canal do Kick

### Painel de Controle
- **Interface flutuante**: Painel arrastável em qualquer posição da tela
- **Contadores em tempo real**: Mostra tempo restante em formato MM:SS
- **Controles visuais**: Pausar, centralizar e fechar
- **Estatísticas**: Conta total de emojis e comandos enviados

### Recursos Técnicos
- **Arrastar e soltar**: Toda a área do painel é arrastável
- **Centralização**: Botão para centralizar o painel na tela
- **Persistência**: Mantém estado entre navegações
- **Tratamento de erros**: Sistema robusto de fallbacks

## Estrutura do Projeto

```
kick/
├── manifest.json      # Configuração da extensão
├── background.js      # Service worker para comunicação
├── content.js         # Script principal que executa no site
└── README.md         # Documentação
```

## Instalação

### 1. Preparar os Arquivos
Certifique-se de que todos os arquivos estão na mesma pasta:
- `manifest.json`
- `background.js`
- `content.js`

### 2. Instalar no Chrome
1. Abra o Chrome e vá para `chrome://extensions/`
2. Ative o "Modo desenvolvedor" (canto superior direito)
3. Clique em "Carregar sem compactação"
4. Selecione a pasta do projeto
5. A extensão será instalada e aparecerá na barra de ferramentas

## Como Usar

### Início Automático
- A extensão inicia automaticamente quando você entra em um canal do Kick
- O painel de controle aparece no canto superior direito após 1 segundo

### Controles do Painel
- **Arrastar**: Clique e arraste em qualquer área do painel (exceto botões)
- **Pausar/Retomar**: Clique no botão vermelho/verde
- **Centralizar**: Clique no botão azul (⌂) para centralizar na tela
- **Fechar**: Clique no botão cinza (X) para fechar o painel

### Controles via Console
```javascript
// Iniciar o bot
kickBotStart()

// Parar o bot
kickBotStop()

// Pausar/retomar
kickBotPause()

// Mostrar painel
kickBotShowPanel()

// Ver contadores
kickBotEmojiCount()  // Retorna: número
kickBotLojaCount()   // Retorna: número
```

## Configuração

### Intervalos (em content.js e background.js)
```javascript
const EMOJI_INTERVAL_MS = 295000;  // 4 minutos e 55 segundos
const LOJA_INTERVAL_MS = 595000;   // 9 minutos e 55 segundos
```

### Emojis Disponíveis
A extensão coleta emojis da página ou usa uma lista padrão:
- `emojiAngel`
- `emojiClown`
- `emojiBubbly`
- `emojiCheerful`
- `emojiAngry`
- `emojiDJ`

## Arquitetura

### Manifest V3
- **Service Worker**: Gerencia comunicação e timers
- **Content Script**: Executa ações no site
- **Permissões**: `activeTab`, `tabs`

### Comunicação Entre Scripts
```javascript
// Content Script → Background Script
chrome.runtime.sendMessage({ action: "start" })
chrome.runtime.sendMessage({ action: "emojiSent" })
chrome.runtime.sendMessage({ action: "lojaSent" })

// Background Script → Content Script
chrome.tabs.sendMessage(tabId, { action: "pause" })
chrome.tabs.sendMessage(tabId, { action: "resume" })
```

### Sistema de Timers
- **Background Script**: Mantém timers globais
- **Content Script**: Executa ações locais
- **Sincronização**: Comunicação em tempo real

## Interface do Usuário

### Painel de Controle
```
┌─────────────────────────┐
│ 🤖 Kick Bot             │
│ 🟢 Ativo                │
│ Emoji: 9:30             │
│ Loja: 14:45             │
│ [Pausar] [⌂] [X]        │
│ Emojis: 2 | Loja: 1     │
└─────────────────────────┘
```

### Estados do Painel
- **🟢 Ativo**: Bot funcionando normalmente
- **⏸️ PAUSADO**: Bot pausado, timers parados
- **Carregando...**: Inicializando

## Desenvolvimento

### Estrutura do Código

#### content.js
- **Configuração**: Constantes e utilitários
- **Coleta de Emojis**: Busca emojis disponíveis na página
- **Envio de Mensagens**: Simula digitação no chat
- **Painel de Controle**: Interface flutuante arrastável
- **Sistema de Timers**: Execução dos intervalos

#### background.js
- **Gerenciamento de Estado**: Controle de pausa/retomada
- **Comunicação**: Mensagens entre scripts
- **Timers Globais**: Controle de intervalos

### Boas Práticas Implementadas
- **Tratamento de Erros**: Try/catch em todas as operações críticas
- **Validação de Dados**: Verificação de tipos e valores
- **Cleanup de Recursos**: Limpeza de intervalos e event listeners
- **Comunicação Assíncrona**: Promises e callbacks adequados
- **Separação de Responsabilidades**: Background vs Content scripts