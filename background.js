/* background.js for Polyglan AI */

// Converter base64 string de volta para Blob
function base64ToBlob(base64, mime) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "upload_audio_chunk") {
        console.log(`[Background] Recebido pedido de upload. Modo: ${message.mode}`);
        
        try {
            // Reconstruir o Blob a partir da string base64
            const audioBlob = base64ToBlob(message.audioData, 'audio/webm');
            
            const formData = new FormData();
            formData.append("audio_chunk", audioBlob, "chunk.webm");
            formData.append("mode", message.mode);
            formData.append("timestamp", message.timestamp);

            fetch("http://localhost:3000/upload-chunk", {
                method: "POST",
                body: formData
            }).then(response => {
                console.log("[Background] Chunk enviado com sucesso para a API:", response.status);
                sendResponse({ success: true, status: response.status });
            }).catch(error => {
                console.error("[Background] Erro ao enviar chunk para a API:", error);
                sendResponse({ success: false, error: error.toString() });
            });
            
            // Retornar true para indicar que a resposta será enviada assincronamente (dentro do fetch)
            return true;
        } catch (error) {
            console.error("[Background] Erro ao processar Blob ou Fetch:", error);
            sendResponse({ success: false, error: error.toString() });
        }
    }
});
