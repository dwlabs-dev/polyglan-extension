---
description: Architecture Guidelines
---

<architecture_guidelines>
# 🏗️ Polyglan — Architecture Guidelines

## Project Structure & Boundaries
You must strictly adhere to the following directory structure for the `polyglan-extension` project.

---

## 1. Backend (API — Express)

Location: `/api/src/`

- **Routes (`/routes`)**: Only handle HTTP concerns (params, status codes).
- **Services (`/services`)**: All business logic and external API integrations (Google Meet, WebSocket) MUST live here.
- **Lib (`/lib`)**: Shared utilities like Auth helpers, DB clients, WebSocket server setup.
- **RULE**: Routes call Services. Services must not call Routes.

The API is **shared** between the professor's Google Meet Add-on and the student's Chrome Extension. Both clients authenticate against the same endpoints and connect to the same WebSocket server.

---

## 2. Frontend — Professor Add-on (Vite + React)

Location: `/front/src/`

Google Meet Add-on used exclusively by the professor.

### Feature-Based Structure (`/front/src/features/[feature-name]`)

| Feature | Responsibility |
|---|---|
| `professor/` | Session control, student list, mode selection (Debate / História), live transcription view |
| `session/` | Session create, shared session state |

- Features import from `shared/` only — never from other features directly.
- Cross-feature composition happens only in `app/`.

### Service Layer (`/front/src/services/`)

| Service | Responsibility |
|---|---|
| `api.ts` | Base fetch helper with auth headers |
| `session.service.ts` | Create session, set mode, get session state |
| `participants.service.ts` | Fetch participant list from Meet SDK |
| `socket.service.ts` | WebSocket — send mode commands, receive transcription updates |

---

## 3. Student Chrome Extension (Manifest V3)

Location: `/student-extension/`

A Chrome Extension installed by students. Runs inside the Google Meet tab and captures student speech via Web Speech API.

### How it works

1. Student installs the extension once via Chrome Web Store unlisted link (no review for testing)
2. Student opens Google Meet normally
3. Extension detects `meet.google.com` and injects a floating panel into the page
4. When the professor starts a mode (Debate or História), the API broadcasts a WebSocket command to all student extensions in the same Meet room
5. Extension activates Web Speech API → sends tagged transcription fragments to the API

### Extension architecture

```
manifest.json
background/service-worker.ts    → Auth token management, chrome.storage, message relay
content/content-script.ts       → Injected into meet.google.com, mounts React panel, owns WebSocket + Web Speech API
src/
  components/FloatingPanel.tsx  → Main UI injected into Meet page
  components/MicStatus.tsx      → Mic state indicator
  components/FeedbackPanel.tsx  → Real-time feedback
  services/speech.service.ts    → Web Speech API wrapper
  services/socket.service.ts    → WebSocket client
  services/auth.service.ts      → Token via chrome.storage.local
  types/index.ts
```

### Key rules for `student-extension`

- **Manifest V3** — `service_worker` for background, not `background.js`
- **WebSocket and Web Speech API live in the content script** — not in the service worker (SW is ephemeral in MV3)
- **Auth**: student authenticates once → token stored in `chrome.storage.local` → attached to every WS message and API request
- **No `localStorage`** — use `chrome.storage.local`
- **No React Router** — single floating panel, not multi-page
- Required `manifest.json` permissions:
  ```json
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://meet.google.com/*"],
  "content_scripts": [{ "matches": ["https://meet.google.com/*"] }]
  ```

---

## 4. Transcription & Session Mode Tagging

Every transcription fragment must include the active **session mode** so the API can tag it for AI analysis and return real-time feedback per activity.

### Fragment envelope

```ts
type TranscriptionFragment = {
  type: 'TRANSCRIPTION_FRAGMENT';
  sessionId: string;
  studentId: string;
  payload: {
    text: string;
    isFinal: boolean;
    lang: 'en-US' | 'pt-BR';
    mode: 'DEBATE' | 'HISTORIA' | null;
    modeSegmentId: string | null;  // UUID — changes each time professor starts a new mode
  };
  timestamp: number;
}
```

### Mode segment logic

- Professor starts a mode → API generates `modeSegmentId` (UUID) and broadcasts to all students
- Students attach `modeSegmentId` to every fragment while that mode is active
- Professor pauses or stops → students set `mode: null`, `modeSegmentId: null`
- AI layer queries fragments by `modeSegmentId` — cleanly separated per activity

### Session command flow

```
Professor clicks "Iniciar Debate"
    ↓ front sends: { type: 'START_MODE', sessionId, payload: { mode: 'DEBATE' } }
    ↓ API generates modeSegmentId
    ↓ API broadcasts to all students in that room:
      { type: 'SESSION_COMMAND', payload: { command: 'START', mode: 'DEBATE', modeSegmentId } }
    ↓ student-extension activates mic + tags all fragments with modeSegmentId
    ↓ API stores fragments tagged by modeSegmentId → available for AI analysis
```

---

## 5. Shared API Contracts

### REST endpoints

```
POST /api/session/create        → professor creates session → { sessionId }
POST /api/session/join          → student joins → { token, sessionId, lang }
POST /api/session/mode          → professor sets mode → { modeSegmentId }
GET  /api/session/:id/state     → current state (mode, modeSegmentId, participants)
```

### WebSocket message types

```ts
type WsMessageType =
  | 'TRANSCRIPTION_FRAGMENT'   // student-extension → API
  | 'START_MODE'               // professor add-on → API
  | 'SESSION_COMMAND'          // API → student extensions
  | 'MODE_CHANGED'             // API → all clients
  | 'FEEDBACK'                 // API → specific student
  | 'PARTICIPANT_JOINED'       // API → professor
  | 'PARTICIPANT_LEFT'         // API → professor

type WsMessage = {
  type: WsMessageType;
  sessionId: string;
  payload: unknown;
  timestamp: number;
}
```

---

## 🚦 Dependency Flow (Unidirectional)

### Professor add-on
```
Shared → Services → Features → App
```

### Student extension
```
types → services → components → content-script
```
- ❌ `components/` cannot import from `background/`
- ❌ `services/` cannot import from `components/`

### Backend
```
Lib → Services → Routes → Server
```

---

## 📦 Zero Barrel Files

No `index.ts` barrel files. Import files directly.

---

## Project Structure

```
polyglan-extension/
├── api/                              # Express backend — shared
│   ├── src/
│   │   ├── routes/
│   │   │   ├── health.ts
│   │   │   ├── session.ts
│   │   │   ├── meet.ts
│   │   │   └── participants.ts
│   │   ├── services/
│   │   │   ├── meet.service.ts
│   │   │   ├── session.service.ts
│   │   │   └── transcription.service.ts
│   │   ├── lib/
│   │   │   ├── google-auth.ts
│   │   │   └── websocket.ts
│   │   └── server.ts
│   ├── tsconfig.json
│   └── package.json
│
├── front/                            # Professor Google Meet Add-on
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.tsx
│   │   │   ├── main.tsx
│   │   │   └── SessionContext.tsx
│   │   ├── features/
│   │   │   ├── professor/
│   │   │   │   ├── components/
│   │   │   │   │   ├── StudentList.tsx
│   │   │   │   │   ├── SessionControls.tsx
│   │   │   │   │   ├── ModeSelector.tsx
│   │   │   │   │   └── LiveTranscription.tsx
│   │   │   │   ├── hooks/
│   │   │   │   └── types/
│   │   │   └── session/
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── session.service.ts
│   │   │   ├── participants.service.ts
│   │   │   └── socket.service.ts
│   │   ├── shared/
│   │   └── types/
│   │       └── index.ts
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── student-extension/                # Student Chrome Extension (MV3)
│   ├── manifest.json
│   ├── background/
│   │   └── service-worker.ts
│   ├── content/
│   │   └── content-script.ts
│   ├── src/
│   │   ├── components/
│   │   │   ├── FloatingPanel.tsx
│   │   │   ├── MicStatus.tsx
│   │   │   └── FeedbackPanel.tsx
│   │   ├── services/
│   │   │   ├── speech.service.ts
│   │   │   ├── socket.service.ts
│   │   │   └── auth.service.ts
│   │   └── types/
│   │       └── index.ts
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── package.json
├── .env
└── infra/
```
</architecture_guidelines>