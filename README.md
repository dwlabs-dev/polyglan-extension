# Polyglan Extension

Aplicativo de integração com videoconferências (Google Meet) para o ecossistema Polyglan. O foco atual é construir um **Google Workspace Add-on**, mas a arquitetura deve permitir atuar como uma **Extensão do Chrome** caso necessário.

## Responsabilidades
- Conectar-se às reuniões online (Google Meet).
- Acessar informações da reunião, como participantes e duração.
- Capturar transcrições ou gravar arquivos de áudio para a IA.
- Interagir sutilmente com a UI durante a chamada (se viável na abordagem).

## Stack Tecnológico 
- TypeScript
- React / Next.js (Para a interface do add-on/extensão, caso seja requerido painel próprio)
- Node.js / NestJS (Para backend de suporte da extensão atuar como BFF - Backend For Frontend)

## Papel no Ecossistema
A extensão funciona como o "ouvido e olho" do sistema durante a videoconferência. Ela capta dados brutos e os retransmite para a `polyglan-api` que realizará a análise e persistência corretas.
