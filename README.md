# MCP Jitsi JaaS Server

Server MCP (Model Context Protocol) per generare link personalizzati per meeting Jitsi JaaS. Questo server fornisce un tool che crea automaticamente link separati per operatori (moderatori) e partecipanti, con JWT firmati e configurazione automatica.

## Caratteristiche

- Generazione automatica di link Jitsi JaaS con JWT firmati
- Link separati per operatore (moderatore) e partecipante
- Auto-join configurato (senza pagina di pre-join)
- Estrazione automatica del nome dall'indirizzo email
- Validazione email integrata
- Gestione scadenza dei link configurabile
- Nomi stanza unici con timestamp e sanitizzazione

## Prerequisiti

- Node.js 18+ 
- Account JaaS (Jitsi as a Service) su https://jaas.8x8.vc/
- Credenziali JaaS: App ID, Key ID, Private Key

## Installazione

1. Installa le dipendenze:
```bash
npm install
```

2. Configura le variabili d'ambiente:

Copia il file `.env.example` in `.env` e inserisci le tue credenziali JaaS:

```env
JAAS_APP_ID=vpaas-magic-cookie-your-app-id-here
JAAS_KEY_ID=your-key-id-here
JAAS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
PORT=3000
```

3. Compila il progetto:
```bash
npm run build
```

4. Avvia il server:
```bash
npm start
```

Il server sarà disponibile su `http://localhost:3000`

## Tool Disponibile

### create_jitsi_meeting

Crea un nuovo meeting Jitsi e genera due link personalizzati.

**Parametri:**
- `operator_email` (string, obbligatorio): Email dell'operatore/host
- `participant_email` (string, obbligatorio): Email del partecipante
- `meeting_title` (string, opzionale): Titolo della stanza
- `duration_hours` (number, opzionale, default: 2): Durata validità link in ore

**Risposta:**
```json
{
  "meeting_id": "meeting-1733328475-x3k9p",
  "room_name": "project-discussion-1733328475",
  "operator_link": "https://8x8.vc/...",
  "participant_link": "https://8x8.vc/...",
  "created_at": "2024-12-04T15:30:00.000Z",
  "expires_at": "2024-12-04T18:30:00.000Z",
  "operator_details": {
    "email": "gianmarco@ethera.it",
    "name": "Gianmarco",
    "role": "moderator"
  },
  "participant_details": {
    "email": "client@company.com",
    "name": "Client",
    "role": "participant"
  }
}
```

## Esempio di Utilizzo

### Test con curl

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d @test-tool.json
```

### Con Claude Desktop

Vedi il file `CLAUDE_DESKTOP_CONFIG.md` per istruzioni dettagliate sulla configurazione.

## Sicurezza

- Le chiavi private non vengono mai esposte nelle risposte
- I JWT sono firmati con algoritmo RS256
- Le email vengono validate prima dell'elaborazione
- I token hanno una scadenza configurabile

## Struttura del Progetto

```
mcp-jitsi-jaas-server/
├── src/
│   └── index.ts              # Server MCP principale
├── build/                    # File compilati
├── .env                      # Variabili d'ambiente (non committare!)
├── .env.example              # Template variabili d'ambiente
├── package.json              # Dipendenze e script
├── tsconfig.json             # Configurazione TypeScript
├── test-tool.json            # Esempio richiesta test
├── CLAUDE_DESKTOP_CONFIG.md  # Guida configurazione Claude Desktop
├── QUICK_START.md            # Guida rapida
└── README.md                 # Questa documentazione
```

## Dettagli Tecnici

### Generazione JWT

I JWT includono:
- aud: "jitsi"
- iss: App ID JaaS
- sub: App ID JaaS
- room: Nome stanza
- exp: Timestamp scadenza
- context.user: email, name, moderator flag

### Estrazione Nome

Il nome viene estratto dalla parte prima della @ nell'email:
- `gianmarco@ethera.it` → `Gianmarco`
- `client@company.com` → `Client`

### Generazione Nome Stanza

Le stanze vengono generate con:
1. Sanitizzazione del titolo (lowercase, rimozione caratteri speciali)
2. Timestamp per unicità
3. Formato: `{titolo-sanitizzato}-{timestamp}` o `meeting-{timestamp}`

## Endpoint HTTP

- **POST /mcp** - Endpoint principale MCP per chiamate tool
- **GET /health** - Health check

## Gestione Errori

Il tool gestisce automaticamente:
- Email non valide
- Credenziali JaaS mancanti
- Errori di firma JWT
- Parametri mancanti o non validi

Gli errori vengono ritornati nel formato:
```json
{
  "error": true,
  "message": "Descrizione dell'errore"
}
```

## Licenza

MIT

---

**Nota**: Mantieni le tue credenziali JaaS al sicuro e non committarle nel repository!
