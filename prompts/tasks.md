# Centralização da Experiência Polyglan no Popup

O objetivo deste plano é unificar todas as interações do aluno na extensão Polyglan dentro do Popup (barra de ferramentas), removendo o Painel Flutuante que é injetado diretamente no Google Meet. Isso proporciona uma tela mais limpa para o usuário e centraliza o controle da sessão.

## User Review Required

> [!IMPORTANT]
> **Persistência de Estado:** Como o Popup do Chrome fecha automaticamente quando o usuário clica fora dele, toda a lógica de estado (conexão WebSocket, status da gravação, transcrição atual) deve ser movida para o **Service Worker** (Background Script). O Popup servirá apenas como uma "janela" para esse estado persistente.

> [!NOTE]
> **Permissões de Microfone:** O navegador exige um gesto do usuário para liberar o microfone. O Popup é o lugar ideal para isso. Uma vez concedida, a gravação continuará via **Offscreen Document**.

## Proposed Changes

### 1. Student Extension Core & Orchestration

#### [MODIFY] [service-worker.ts](file:///d:/Projetos/polyglan/polyglan-extension/student-extension/background/service-worker.ts)
- Implementar gerenciamento de estado global (status da sessão, dados do usuário).
- Integrar a lógica de `socketService` (WebSocket de comandos e transcrição) que antes ficava no `FloatingPanel`.
- Atuar como ponte entre o `Offscreen Document` (áudio/transcrição) e o Popup UI.

#### [MODIFY] [offscreen.ts](file:///d:/Projetos/polyglan/polyglan-extension/student-extension/offscreen/offscreen.ts)
- Adicionar suporte à `SpeechRecognition` (Web Speech API) no offscreen document para garantir que a transcrição não pare quando o popup fechar.
- Enviar as transcrições parciais e finais de volta para o Service Worker via `chrome.runtime.sendMessage`.

### 2. UI / UX Transformation

#### [MODIFY] [content-script.tsx](file:///d:/Projetos/polyglan/polyglan-extension/student-extension/content/content-script.tsx)
- Remover a injeção do `FloatingPanel`.
- Manter apenas a detecção de início/fim de reunião para sinalizar o Service Worker automaticamente.

#### [NEW] [popup-app](file:///d:/Projetos/polyglan/polyglan-extension/student-extension/popup/)
- Transformar o Popup em uma aplicação React para um design premium e reuso do `FloatingPanel`.
- Implementar o design **"Golden Hour"**:
    - Estética premium com tons de âmbar (#F4A900) e cinza escuro (#2C2420).
    - Feedback visual de gravação (micro-animações).
    - Visualização em tempo real da transcrição.

### 3. Services & Infrastructure

#### [MODIFY] [audioCapture.service.ts](file:///d:/Projetos/polyglan/polyglan-extension/student-extension/src/services/audioCapture.service.ts)
- Refatorar para ser acionado via mensagens do sistema (Extension Messaging).

---

## Open Questions

> [!IMPORTANT]
> 1. **React no Popup**: Você está de acordo em converter o Popup para uma aplicação React? Isso facilitará muito o reuso dos componentes e estilos que já temos.
> 2. **Conteúdo da Transcrição**: No Popup, você gostaria de ver apenas a frase atual (como no FloatingPanel) ou um histórico curto das últimas falas da sessão?
> 3. **Modo História**: Mantemos o banner especial de "História Ativa" com o timer quando detectado?

---

## Verification Plan

### Automated Tests
- Não aplicável para mudanças de arquitetura de UI/UX neste estágio, mas faremos testes manuais rigorosos com o navegador.

### Manual Verification
1.  **Instalação**: Verificar se o manifest carrega corretamente sem erros.
2.  **Fluxo de Login**: Abrir o popup, clicar em "Entrar com Google" e validar o redirecionamento.
3.  **Permissão de Mic**: Abrir o popup e garantir que o pedido de microfone ocorra dentro do contexto da extensão.
4.  **Gravação em Segundo Plano**:
    - Iniciar uma reunião no Google Meet.
    - Abrir o popup e ver o status "Aguardando" ou "Gravando".
    - Fechar o popup, falar por alguns segundos, abrir o popup novamente e validar se a transcrição acumulada aparece.
5.  **Design "Golden Hour"**: Validar se as cores, fontes e animações seguem o padrão premium solicitado.
