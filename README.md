# Polyglan Extension

Aplicativo de integração com videoconferências (Google Meet) para o ecossistema Polyglan. O foco atual é construir um **Google Workspace Add-on**, mas a arquitetura deve permitir atuar como uma **Extensão do Chrome** caso necessário.

## Responsabilidades
- Conectar-se às reuniões online (Google Meet).
- Acessar informações da reunião, como participantes e duração.
- Construir a interface do **Professor**: Para seleção do tipo de aula (Debate, História, etc).
- Construir a interface do **Aluno**: Focada na gravação individual e ininterrupta do áudio para análise da Inteligência Artificial.
- Interagir sutilmente com a UI durante a chamada (se viável na abordagem).

## Stack Tecnológico 
- TypeScript
- React / Next.js (Para a interface do add-on/extensão, caso seja requerido painel próprio)
- Node.js / NestJS (Para backend de suporte da extensão atuar como BFF - Backend For Frontend)

## Papel no Ecossistema
A extensão funciona como o "ouvido e olho" do sistema durante a videoconferência. Ela capta dados brutos e os retransmite para a `polyglan-api` que realizará a análise e persistência corretas.

## Como Executar (Ambiente de Desenvolvimento)

1. **Instale as dependências:**
   ```bash
   npm install
   ```
2. **Configure o ambiente:**
   Verifique o arquivo `.env` na raiz do projeto (com as URIs da API).
3. **Inicie o servidor de desenvolvimento Vite:**
   ```bash
   npm run dev
   ```
4. **Build da Extensão:**
   Para compilar o diretório que você poderá carregar no navegador como extensão, rode:
   ```bash
   npm run build
   ```
   *O resultado ficará na pasta `dist/`.*
