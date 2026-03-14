/* content.js for Polyglan AI */

let mediaRecorder = null;
let isRecording = false;
let currentMode = null;

async function toggleRecording(mode, buttonElement) {
    const statusText = document.getElementById('polyglan-status-text');
    const debateBtn = document.getElementById('polyglan-btn-debate');
    const historyBtn = document.getElementById('polyglan-btn-history');

    // Se já estiver gravando e clicou no mesmo modo, parar.
    if (isRecording && currentMode === mode) {
        mediaRecorder.stop();
        buttonElement.innerText = mode + " Mode";
        statusText.innerText = "";
        debateBtn.disabled = false;
        historyBtn.disabled = false;
        return;
    }

    // Pedir permissão e iniciar gravação
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Opção por webm que é padrão em navegadores Chromium
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        mediaRecorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                console.log(`[Polyglan] Enviando chunk de audio (${event.data.size} bytes) para background.js... Modo: ${currentMode}`);
                
                // Converter o Blob para Base64 (Data URL) para poder enviar via sendMessage
                const reader = new FileReader();
                reader.readAsDataURL(event.data);
                reader.onloadend = () => {
                    const base64data = reader.result.split(',')[1];
                    
                    chrome.runtime.sendMessage({
                        action: "upload_audio_chunk",
                        audioData: base64data,
                        mode: currentMode,
                        timestamp: new Date().toISOString()
                    }, (response) => {
                        console.log("[Polyglan] Resposta do Background Worker:", response);
                    });
                };
            }
        };
        
        mediaRecorder.onstop = () => {
            stream.getTracks().forEach(track => track.stop()); // Libera o microfone
            isRecording = false;
            currentMode = null;
        };

        isRecording = true;
        currentMode = mode;
        
        // Atualizar UI
        buttonElement.innerText = `Parar ${mode}`;
        statusText.innerText = `Gravando em ${mode}... (Chunks a cada 30s)`;
        
        if (mode === 'Debate') historyBtn.disabled = true;
        if (mode === 'History') debateBtn.disabled = true;
        
        // INICIA GRAVAÇÃO: emitir chunk de dados a cada 30.000 ms (30 segundos)
        mediaRecorder.start(30000); 

    } catch (e) {
        console.error("[Polyglan] Erro ao acessar microfone:", e);
        alert("Não foi possível acessar seu microfone. Verifique as permissões do navegador.");
    }
}

function injectSidePanel() {
    // Evitar duplicatas
    if (document.getElementById('polyglan-side-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'polyglan-side-panel';
    panel.innerHTML = `
        <div class="polyglan-header">
            <h2>Polyglan AI</h2>
        </div>
        <div class="polyglan-content">
            <p>Melhore sua pronúncia em tempo real.</p>
            <button id="polyglan-btn-listen" class="polyglan-button">Ouvir minha pronúncia</button>
            
            <div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 15px;">
                <p>Modos Especiais (Gravação):</p>
                <button id="polyglan-btn-debate" class="polyglan-button" style="margin-bottom: 8px; background-color: #f57c00;">Debate Mode</button>
                <button id="polyglan-btn-history" class="polyglan-button" style="background-color: #7b1fa2;">History Mode</button>
                <p id="polyglan-status-text" style="font-size: 12px; color: #ffeb3b; margin-top: 10px; font-weight: bold;"></p>
            </div>
        </div>
        <div class="polyglan-footer">
            <span>v1.0 MVP</span>
        </div>
    `;

    document.body.appendChild(panel);

    // Event listener para o botão de pronúncia
    document.getElementById('polyglan-btn-listen').addEventListener('click', () => {
        alert('Funcionalidade "Ouvir minha pronúncia" será implementada em breve!');
    });

    // Event listeners para novos modos
    document.getElementById('polyglan-btn-debate').addEventListener('click', (e) => {
        toggleRecording('Debate', e.target);
    });

    document.getElementById('polyglan-btn-history').addEventListener('click', (e) => {
        toggleRecording('History', e.target);
    });
}

function customizeMeetInterface() {
    // Mudar a cor da barra inferior (Meet costuma usar [jscontroller="Ym3RAd"] ou classes específicas)
    // Vamos procurar por elementos comuns da barra de ferramentas
    const bottomBar = document.querySelector('div[data-is-muted]'); // Seletor genérico para teste
    
    // Tentar encontrar por cor de fundo ou tags comuns
    const toolbars = document.querySelectorAll('div[role="menu"], .I986ue');
    toolbars.forEach(el => {
        el.style.backgroundColor = '#004d40';
    });
    
    // Injeção de CSS direto para garantir que a barra inferior mude
    const style = document.createElement('style');
    style.innerHTML = `
        .Gv1uRe, .RHXDLb, .I986ue, [role="footer"], .f07Ync {
            background-color: #004d40 !important;
        }
    `;
    document.head.appendChild(style);
}

// Inicializar após carregamento
window.addEventListener('load', () => {
    // Pequeno delay para garantir que o Meet carregou os elementos dinâmicos
    setTimeout(() => {
        injectSidePanel();
        customizeMeetInterface();
    }, 3000);
});

// Observar mudanças no DOM caso o Meet recarregue partes da interface
const observer = new MutationObserver((mutations) => {
    if (!document.getElementById('polyglan-side-panel')) {
        injectSidePanel();
    }
});

observer.observe(document.body, { childList: true, subtree: true });
