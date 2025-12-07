# Configurazione Claude Desktop per MCP Jitsi JaaS Server

Questa guida spiega come configurare Claude Desktop per utilizzare il server MCP Jitsi JaaS.

## Prerequisiti

1. Avere Claude Desktop installato
2. Avere il server MCP Jitsi JaaS in esecuzione su `http://localhost:3000`

## Configurazione

### 1. Localizza il file di configurazione di Claude Desktop

Il file di configurazione si trova in:

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### 2. Modifica il file di configurazione

Apri il file `claude_desktop_config.json` e aggiungi la configurazione del server MCP:

```json
{
  "mcpServers": {
    "jitsi-jaas": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Se hai già altri server MCP configurati, aggiungi semplicemente `jitsi-jaas` all'oggetto `mcpServers`:

```json
{
  "mcpServers": {
    "server-esistente": {
      "url": "http://localhost:8080/mcp"
    },
    "jitsi-jaas": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### 3. Riavvia Claude Desktop

Dopo aver salvato il file di configurazione, riavvia completamente Claude Desktop.

## Verifica

Per verificare che il server sia stato configurato correttamente:

1. Apri Claude Desktop
2. Inizia una nuova conversazione
3. Chiedi a Claude di creare un meeting Jitsi, ad esempio:

```
Crea un meeting Jitsi per me (gianmarco@ethera.it) e il cliente (client@company.com) 
con titolo "Discussione Progetto" della durata di 3 ore
```

Claude dovrebbe utilizzare automaticamente il tool `create_jitsi_meeting` e restituirti i link per operatore e partecipante.

## Esempio di Risposta

Quando Claude utilizza il tool, riceverai una risposta simile a:

```json
{
  "meeting_id": "meeting-1733328475-x3k9p",
  "room_name": "discussione-progetto-1733328475",
  "operator_link": "https://8x8.vc/vpaas-magic-cookie-xxxxx/discussione-progetto-1733328475?jwt=eyJhbG...&config.prejoinPageEnabled=false",
  "participant_link": "https://8x8.vc/vpaas-magic-cookie-xxxxx/discussione-progetto-1733328475?jwt=eyJhbG...&config.prejoinPageEnabled=false",
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

## Troubleshooting

### Il tool non viene riconosciuto

1. Verifica che il server MCP sia in esecuzione:
   ```bash
   curl http://localhost:3000/health
   ```
   Dovresti ricevere: `{"status":"ok","server":"mcp-jitsi-jaas-server"}`

2. Verifica che il file di configurazione sia corretto e salvato

3. Assicurati di aver riavviato completamente Claude Desktop

### Errori di credenziali

Se ricevi errori relativi alle credenziali JaaS:

1. Verifica che il file `.env` sia presente nella root del progetto
2. Controlla che le variabili `JAAS_APP_ID`, `JAAS_KEY_ID` e `JAAS_PRIVATE_KEY` siano configurate correttamente
3. Riavvia il server MCP dopo aver modificato il file `.env`

### Il server non si avvia

1. Verifica che la porta 3000 non sia già in uso
2. Controlla i log del server per eventuali errori
3. Assicurati di aver eseguito `npm install` e `npm run build`

## Comandi Utili

**Avviare il server:**
```bash
npm start
```

**Ricompilare e avviare:**
```bash
npm run dev
```

**Testare il server manualmente:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d @test-tool.json
```

## Note

- Il server deve essere in esecuzione per poter essere utilizzato da Claude Desktop
- Ogni volta che modifichi il codice, devi ricompilare con `npm run build` e riavviare il server
- Le modifiche al file di configurazione di Claude Desktop richiedono un riavvio completo dell'applicazione
