import path from 'node:path';
import process from 'node:process';
import { google } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';

const SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'https://www.googleapis.com/auth/meetings.conference.media.audio.readonly'
];
const CREDENTIALS_PATH = path.join(process.cwd(), 'examples/credentials.json');

async function createSpace() {
  try {
    console.log('Autenticando...');
    console.log('SCOPES:', SCOPES);
    console.log('CREDENTIALS_PATH:', CREDENTIALS_PATH);

    const authClient = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });

    console.log(authClient.credentials);

    const meet = google.meet({ version: 'v2', auth: authClient });

    console.log('Criando espaço de reunião via REST API...');

    const response = await meet.spaces.create({
      headers: {
        'Authorization': `Bearer ${authClient.credentials.access_token}`,
      },
      requestBody: {}
    });

    // const fetchResponse = await fetch('https://meet.googleapis.com/v2/spaces', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${authClient.credentials.access_token}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({})
    // });

    // const data = await fetchResponse.json();

    // console.log('Resultado do teste direto:', data);

    console.log(`\n✅ Sucesso!`);
    console.log(`Link do Meet: ${data?.meetingUri}`);
    console.log(`Link do Meet: ${response?.data?.meetingUri}`);

  } catch (error) {
    // Se o erro for 401, vamos dar uma dica melhor
    if (error.status === 401) {
      console.error('Error:', error);
      console.error('\n❌ Erro de Autenticação: O Google não aceitou o token.');
      console.error('Dica: Delete qualquer arquivo "token.json" na pasta e rode o comando novamente.');
    } else {
      console.error('Erro ao criar espaço:', error.message);
    }
  }
}

await createSpace();