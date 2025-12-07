# MCP Jitsi + MeshCentral Integration

Sistema integrato per video chiamate (Jitsi) e controllo remoto (MeshCentral) tramite Model Context Protocol (MCP).

## 🎯 Funzionalità Principali

### 📹 Video Call (Jitsi Meet)
- JWT authentication con 8x8 JaaS
- Auto-join senza pre-join page
- Due ruoli: Operatore (moderatore) e Partecipante
- Pulsante "Chiudi Sessione" per operatore

### 🖥️ Controllo Remoto (MeshCentral)
- Desktop remoto via iframe
- Auto-connessione quando entri nel tab
- Auto-disconnessione quando esci dal tab
- Chiusura automatica tab "Utilità" (prima volta)
- Blocco popup "beforeunload" del browser

### 📁 Trasferimento File
- File manager integrato
- Apertura automatica cartella Desktop
- Auto-connessione/disconnessione
- Drag & drop supportato

### 🔒 Sicurezza & UX
- Reverse proxy MeshCentral (no CORS)
- Disconnessione automatica Desktop/Files prima di chiudere sessione
- Redirect automatico partecipante al termine
- Nessun popup di conferma uscita

## 📋 Requisiti

- Node.js 18+
- Account Jitsi 8x8 (JaaS)
- Certificati SSL (per HTTPS)

## 🚀 Installazione

### 1. Clona Repository

```bash
git clone https://github.com/gianmarcomezzina11/mcp_meshcentral_jitsi.git
cd mcp_meshcentral_jitsi
npm install
```

### 2. Configura Variabili Ambiente

Copia `.env.example` in `.env` e compila:

```env
# Jitsi JaaS
JAAS_APP_ID=your_app_id
JAAS_KID=your_key_id
JAAS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# MeshCentral
MESHCENTRAL_TOKEN_KEY=your_login_token_key_hex
```

### 3. Genera Login Token Key MeshCentral

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copia l'output in `MESHCENTRAL_TOKEN_KEY`.

### 4. Certificati SSL

Posiziona i certificati MeshCentral in:
- `meshcentral-data/webserver-cert-public.crt`
- `meshcentral-data/webserver-cert-private.key`

Oppure MeshCentral li genererà automaticamente al primo avvio.

## 🎮 Utilizzo

### Avvia Server

```bash
npm run build
npm start
```

Server disponibili:
- **MCP**: `http://localhost:3000/mcp`
- **Web App**: `https://localhost:3001`
- **MeshCentral**: `https://localhost:4000`

### Crea Meeting via MCP

Usa MCP Inspector o Claude Desktop per chiamare il tool:

```json
{
  "name": "create_video_meeting",
  "arguments": {
    "operator_email": "operator@example.com",
    "operator_name": "Mario Rossi",
    "participant_email": "participant@example.com",
    "participant_name": "Luca Bianchi",
    "meshcentral_node_id": "NODE_ID_FROM_MESHCENTRAL",
    "redirect_link": "https://example.com/thanks" // Opzionale
  }
}
```

Risposta:
```json
{
  "operator_link": "https://localhost:3001/remote-session.html?...",
  "participant_link": "https://localhost:3001/remote-session.html?...",
  "meeting_id": "meeting-1234567890",
  "room_name": "meeting-1234567890",
  "expires_at": "2024-12-08T12:00:00Z"
}
```

**Parametri:**
- `operator_email` / `operator_name`: Dati operatore (moderatore)
- `participant_email` / `participant_name`: Dati partecipante
- `meshcentral_node_id`: ID nodo MeshCentral (solo per operatore)
- `redirect_link`: URL redirect partecipante al termine (opzionale)

### Configura MeshCentral Agent

1. Accedi a `https://localhost:4000`
2. Crea account admin
3. Crea device group
4. Installa agent sul PC remoto
5. Copia Node ID dal device

## 🏗️ Architettura

```
┌─────────────────────────────────────────┐
│           Browser (Operatore)           │
├─────────────────────────────────────────┤
│  Tab 1: Video Call (Jitsi 8x8)         │
│  Tab 2: Controllo Remoto (MeshCentral) │
│  Tab 3: Trasferimento File (MeshCentral)│
│  [🚪 Chiudi Sessione] ← Solo operatore │
└──────────────┬──────────────────────────┘
               │
               ├─► Jitsi 8x8 (JWT auth)
               └─► MeshCentral (proxy :3001/meshcentral → :4000)

┌─────────────────────────────────────────┐
│         Browser (Partecipante)          │
├─────────────────────────────────────────┤
│  Tab 1: Video Call (Jitsi 8x8)         │
│  (No accesso MeshCentral)               │
└──────────────┬──────────────────────────┘
               │
               └─► Jitsi 8x8 (JWT auth)
                   ↓ (al termine)
                   Redirect a redirect_link
```

## 📁 Struttura Progetto

```
.
├── src/
│   └── index.ts          # Server MCP + Express
├── public/
│   ├── remote-session.html   # UI principale
│   └── img/              # Logo ARPAL
├── meshcentral-data/     # Dati MeshCentral (gitignored)
├── package.json
├── tsconfig.json
└── .env                  # Configurazione (gitignored)
```

## 🔧 Configurazione Avanzata

### Porte

Modifica in `src/index.ts`:
- `HTTP_PORT`: 3000 (MCP)
- `HTTPS_PORT`: 3001 (Web App + Reverse Proxy MeshCentral)
- `MESHCENTRAL_PORT`: 4000 (interno, proxato su :3001/meshcentral)

### User Consent

Disabilitato di default via `_userConsentFlags: 0` in config MeshCentral.

### Auto-Connessione/Disconnessione

**Desktop (Controllo Remoto):**
- Entrando: Click automatico su "Desktop" dopo 500ms
- Uscendo: Click automatico su "Disconnetti"
- Prima volta: Chiude tab "Utilità" automaticamente

**Files (Trasferimento File):**
- Entrando: Click automatico su "Connetti" (p13Connect/p5Connect)
- Uscendo: Click automatico su "Disconnetti" (p13Disconnect)
- Apertura automatica cartella Desktop

### Chiusura Sessione

Quando operatore clicca "Chiudi Sessione":
1. Disconnette Desktop e Files (se attivi)
2. Invia messaggio broadcast a tutti i partecipanti
3. Termina meeting Jitsi per tutti
4. Operatore vede "Sessione Chiusa"
5. Partecipante viene rediretto a `redirect_link` (se presente)

## 🐛 Troubleshooting

### MeshCentral chiede ancora consenso

1. Accedi a `https://localhost:4000`
2. Vai su Device Group → Edit
3. Disabilita "User Consent" manualmente
4. Oppure cancella `meshcentral-config.json` e riavvia

### Certificati SSL non validi

Accetta certificato self-signed nel browser o usa certificati Let's Encrypt.

### Tab "Utilità" appare ancora

Il tab viene chiuso automaticamente solo la prima volta che entri in "Controllo Remoto". Se riappare, è normale - verrà chiuso al prossimo refresh.

### Partecipante non viene rediretto

Verifica che `redirect_link` sia stato passato correttamente nella chiamata MCP `create_video_meeting`.

### Desktop/Files non si disconnettono

Verifica in console i log:
- `✅ Click su Disconnetti Desktop`
- `✅ Files disconnesso`

Se non appaiono, potrebbe essere un problema CORS (verifica che MeshCentral sia accessibile su `:3001/meshcentral`).

## 🎨 Personalizzazione

### Logo

Sostituisci il logo in `public/img/` con il tuo.

### Colori

Modifica i colori in `public/remote-session.html`:
- Gradiente header: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Colore primario: `#667eea`
- Pulsante chiudi: `#dc3545`

### Testi

Cerca e sostituisci in `public/remote-session.html`:
- "Sessione Remota" → Il tuo titolo
- Footer, messaggi, ecc.

## 📝 License

MIT

## 👤 Author

Gianmarco Mezzina
