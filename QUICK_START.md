# Quick Start - MCP Jitsi JaaS Server

Guida rapida per iniziare ad utilizzare il server MCP Jitsi JaaS.

## Setup Rapido (5 minuti)

### 1. Configura le Credenziali JaaS

Crea un file `.env` nella root del progetto:

```bash
cp .env.example .env
```

Modifica `.env` con le tue credenziali JaaS:

```env
JAAS_APP_ID=vpaas-magic-cookie-xxxxxxxxxxxxx
JAAS_KEY_ID=your-key-id
JAAS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"
PORT=3000
```

**Dove trovare le credenziali:**
1. Vai su https://jaas.8x8.vc/
2. Accedi al tuo account
3. Vai su "Developers" → "API Keys"
4. Crea una nuova API Key o usa una esistente
5. Copia App ID, Key ID e Private Key

### 2. Installa e Avvia

```bash
# Installa dipendenze (già fatto)
npm install

# Compila il progetto (già fatto)
npm run build

# Avvia il server
npm start
```

Dovresti vedere:
```
MCP Jitsi JaaS Server avviato su http://localhost:3000
MCP endpoint: http://localhost:3000/mcp
Health check: http://localhost:3000/health
Tool disponibile: create_jitsi_meeting
```

### 3. Testa il Server

Apri un nuovo terminale e testa:

```bash
curl http://localhost:3000/health
```

Risposta attesa:
```json
{"status":"ok","server":"mcp-jitsi-jaas-server"}
```

### 4. Crea il Tuo Primo Meeting

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create_jitsi_meeting",
      "arguments": {
        "operator_email": "tua-email@dominio.it",
        "participant_email": "cliente@azienda.com",
        "meeting_title": "Primo Test",
        "duration_hours": 2
      }
    },
    "id": 1
  }'
```

Riceverai due link:
- **operator_link**: Per te (con privilegi di moderatore)
- **participant_link**: Per il cliente (partecipante standard)

## Integrazione con Claude Desktop

### 1. Trova il File di Configurazione

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

### 2. Aggiungi il Server

Apri `claude_desktop_config.json` e aggiungi:

```json
{
  "mcpServers": {
    "jitsi-jaas": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### 3. Riavvia Claude Desktop

Chiudi completamente e riapri Claude Desktop.

### 4. Usa il Tool

In Claude Desktop, chiedi:

> "Crea un meeting Jitsi per me (gianmarco@ethera.it) e il cliente (mario.rossi@azienda.com) con titolo 'Discussione Progetto' della durata di 3 ore"

Claude userà automaticamente il tool e ti fornirà i link!

## Esempi di Utilizzo

### Meeting Standard (2 ore)

```json
{
  "operator_email": "host@company.com",
  "participant_email": "guest@client.com",
  "meeting_title": "Weekly Sync"
}
```

### Meeting Lungo (4 ore)

```json
{
  "operator_email": "host@company.com",
  "participant_email": "guest@client.com",
  "meeting_title": "Workshop",
  "duration_hours": 4
}
```

### Meeting Senza Titolo

```json
{
  "operator_email": "host@company.com",
  "participant_email": "guest@client.com"
}
```

Verrà generato automaticamente un nome tipo: `meeting-1733328475`

## Troubleshooting

### Errore: "Credenziali JaaS mancanti"

✅ Verifica che il file `.env` esista e contenga tutte le variabili
✅ Riavvia il server dopo aver modificato `.env`

### Errore: "Email non valida"

✅ Controlla che le email siano nel formato corretto: `nome@dominio.ext`

### Il server non si avvia

✅ Verifica che la porta 3000 non sia già in uso
✅ Prova a cambiare porta nel file `.env`: `PORT=3001`

### Claude Desktop non vede il tool

✅ Verifica che il server sia in esecuzione
✅ Controlla che il file di configurazione sia corretto
✅ Riavvia completamente Claude Desktop

## Comandi Utili

```bash
# Avvia il server
npm start

# Ricompila e avvia
npm run dev

# Verifica health
curl http://localhost:3000/health

# Test con file JSON
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d @test-tool.json
```

## Prossimi Passi

1. ✅ Configura le credenziali JaaS
2. ✅ Avvia il server
3. ✅ Testa con curl
4. ✅ Integra con Claude Desktop
5. 🎉 Inizia a creare meeting!

## Supporto

Per maggiori dettagli consulta:
- `README.md` - Documentazione completa
- `CLAUDE_DESKTOP_CONFIG.md` - Guida configurazione Claude Desktop
- `.env.example` - Template variabili d'ambiente

---

**Buon lavoro! 🚀**
