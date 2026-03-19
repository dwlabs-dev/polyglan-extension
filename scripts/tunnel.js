import ngrok from '@ngrok/ngrok';
import dotenv from 'dotenv';

dotenv.config();

async function startTunnel() {
  const port = 5173;

  try {
    const listener = await ngrok.connect({
      addr: port,
      authtoken_from_env: true,
    });

    console.log(`\n[ngrok] URL Pública: ${listener.url()}`);
    console.log(`[ngrok] → http://localhost:${port}\n`);

    // Mantém o processo vivo
    setInterval(() => {}, 1000 * 60 * 60);

  } catch (err) {
    console.error(err);
  }
}

startTunnel();
