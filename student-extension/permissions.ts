/**
 * Permissions Page — Polyglan Student Extension
 *
 * This script runs in a full-tab context to request persistent
 * microphone permission for the extension origin.
 */

const requestBtn = document.getElementById('requestBtn') as HTMLButtonElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;

async function requestMicrophone() {
  try {
    requestBtn.disabled = true;
    requestBtn.textContent = 'Solicitando...';
    statusDiv.style.display = 'none';

    console.log('[Permissions] Requesting getUserMedia...');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Success! Stop the tracks and notify background
    stream.getTracks().forEach(track => track.stop());
    console.log('[Permissions] Permission granted!');
    
    requestBtn.textContent = 'Permissão Concedida!';
    requestBtn.style.background = '#10B981';

    // Notify background script that permission is ready
    chrome.runtime.sendMessage({ type: 'PERMISSION_GRANTED' });

    // Close the tab after a short delay
    setTimeout(() => {
      window.close();
    }, 1500);

  } catch (err) {
    console.error('[Permissions] Failed to get mic access:', err);
    requestBtn.disabled = false;
    requestBtn.textContent = 'Tentar Novamente';
    statusDiv.textContent = 'Erro ao acessar microfone. Verifique as configurações do navegador.';
    statusDiv.className = 'status error';
  }
}

requestBtn.addEventListener('click', requestMicrophone);

// Auto-check if already granted
navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
  if (result.state === 'granted') {
    requestBtn.textContent = 'Já Autorizado';
    requestBtn.style.background = '#10B981';
    chrome.runtime.sendMessage({ type: 'PERMISSION_GRANTED' });
    setTimeout(() => window.close(), 1000);
  }
});
