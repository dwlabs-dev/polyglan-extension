/**
 * Popup script for Polyglan Student Extension
 * 
 * Logic:
 * 1. Find the active tab.
 * 2. Obtain streamId via tabCapture.
 * 3. Message the service-worker to start the offscreen recording with this ID.
 */

const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

function updateStatus(text: string, isError: boolean = false) {
    statusEl.textContent = text;
    statusEl.style.display = 'block';
    statusEl.className = isError ? 'error' : 'success';
}

connectBtn.addEventListener('click', async () => {
    connectBtn.disabled = true;
    connectBtn.textContent = 'Conectando...';

    try {
        // Step 1: Query the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.id) {
            throw new Error('Não foi possível identificar a aba ativa.');
        }

        console.log(`[Popup] Requesting streamId for tab ${tab.id}`);

        // Step 2: Request MediaStream Id (Requires user gesture, which we have here!)
        chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (streamId) => {
            if (chrome.runtime.lastError || !streamId) {
                const error = chrome.runtime.lastError?.message || 'Falha ao obter ID da mídia.';
                console.error('[Popup] getMediaStreamId failed:', error);
                updateStatus(`Erro: ${error}`, true);
                connectBtn.disabled = false;
                connectBtn.textContent = 'CONECTAR ÁUDIO 🎤';
                return;
            }

            console.log('[Popup] StreamId obtained, signaling service-worker');

            // Step 3: Send to service worker to initiate the offscreen/WS flow
            chrome.runtime.sendMessage({
                type: 'START_CAPTURE',
                streamId: streamId,
                meetingId: '_popup_triggered_', // Background will use its pending ID if available
                speakerId: '_popup_triggered_',  // Background will use its pending ID if available
                tabId: tab.id
            }, (response) => {
                if (response?.success) {
                    updateStatus('Áudio conectado com sucesso!');
                    setTimeout(() => window.close(), 1000); // Close popup after a second
                } else {
                    updateStatus(`Erro: ${response?.error || 'Desconhecido'}`, true);
                    connectBtn.disabled = false;
                    connectBtn.textContent = 'CONECTAR ÁUDIO 🎤';
                }
            });
        });

    } catch (err: any) {
        console.error('[Popup] Error:', err);
        updateStatus(`Erro: ${err.message}`, true);
        connectBtn.disabled = false;
        connectBtn.textContent = 'CONECTAR ÁUDIO 🎤';
    }
});
