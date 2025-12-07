# MCP Jitsi + MeshCentral Integration

Sistema integrato per video chiamate (Jitsi) e controllo remoto (MeshCentral) tramite Model Context Protocol (MCP).

## 🎯 Funzionalità

- **Video Call**: Jitsi Meet con JWT authentication
- **Controllo Remoto**: MeshCentral desktop remoto
- **Trasferimento File**: File manager con drag & drop
- **Due Ruoli**: Operatore (accesso completo) e Partecipante (solo video)
- **Auto-Join**: Ingresso automatico senza pre-join
- **Auto-Disconnect**: Disconnessione automatica quando si cambia tab

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
    "participant_email": "participant@example.com",
    "meshcentral_node_id": "NODE_ID_FROM_MESHCENTRAL"
  }
}
```

Risposta:
```json
{
  "operator_link": "https://...",
  "participant_link": "https://...",
  "meeting_id": "...",
  "expires_at": "..."
}
```

### Configura MeshCentral Agent

1. Accedi a `https://localhost:4000`
2. Crea account admin
3. Crea device group
4. Installa agent sul PC remoto
5. Copia Node ID dal device

## 🏗️ Architettura

```
┌─────────────┐
│   Browser   │
│  (Operator) │
└──────┬──────┘
       │
       ├─► Video Call (Jitsi 8x8)
       ├─► Desktop (MeshCentral iframe)
       └─► Files (MeshCentral iframe)

┌─────────────┐
│   Browser   │
│(Participant)│
└──────┬──────┘
       │
       └─► Video Call (Jitsi 8x8)
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
- `HTTPS_PORT`: 3001 (Web App)
- `MESHCENTRAL_PORT`: 4000

### User Consent

Disabilitato di default via `_userConsentFlags: 0` in config MeshCentral.

### Tab Auto-Disconnect

Quando cambi tab, l'iframe precedente viene ricaricato per disconnettere la sessione MeshCentral ed evitare conflitti.

## 🐛 Troubleshooting

### MeshCentral chiede ancora consenso

1. Accedi a `https://localhost:4000`
2. Vai su Device Group → Edit
3. Disabilita "User Consent" manualmente

### Certificati SSL non validi

Accetta certificato self-signed nel browser o usa certificati Let's Encrypt.

### File transfer blocca desktop

Usa tab separati e cambia tab per disconnettere automaticamente.

## 📝 License

MIT

## 👤 Author

ARPAL - Agenzia Regionale per la Protezione dell'Ambiente Ligure
