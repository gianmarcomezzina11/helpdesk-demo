# Server Integrato Jitsi + MeshCentral

## 🎉 Novità: MeshCentral Integrato!

Questo server ora include **MeshCentral integrato** - non serve più un server esterno!

## 🚀 Avvio Rapido

### 1. Installa le dipendenze
```bash
npm install
```

### 2. Compila il progetto
```bash
npm run build
```

### 3. Avvia il server
```bash
npm start
```

Il server avvierà automaticamente:
- **Jitsi Server** su `http://localhost:3000`
- **MeshCentral** su `http://localhost:4000`

## 📋 Configurazione

### File `.env` (solo per Jitsi)

```env
# Jitsi JaaS Configuration
JAAS_APP_ID=vpaas-magic-cookie-xxxxx
JAAS_KEY_ID=your-key-id
JAAS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Server Configuration
PORT=3000
SERVER_URL=http://localhost:3000
```

**Nota:** Non servono più le variabili `MESHCENTRAL_URL` e `MESHCENTRAL_TOKEN_KEY` - tutto è gestito automaticamente!

### MeshCentral Configuration

Il file `meshcentral-config.json` è già configurato e pronto all'uso. Puoi personalizzarlo se necessario.

## 🎯 Come Usare

### 1. Prima Configurazione di MeshCentral

Al primo avvio, accedi a MeshCentral:

1. Apri `http://localhost:4000`
2. Crea un account amministratore
3. Crea un device group
4. Installa l'agent sui dispositivi che vuoi controllare

### 2. Ottenere il NodeID

Per controllare un dispositivo:

1. Accedi a MeshCentral (`http://localhost:4000`)
2. Vai su "My Devices"
3. Clicca sul dispositivo
4. Nell'URL vedrai qualcosa come: `http://localhost:4000/#p=2&node=UkSNlz7t...`
5. Copia la parte dopo `node=` (es: `UkSNlz7tYourNodeIdHere`)

### 3. Chiamare il Tool MCP

#### Solo Video Call (senza controllo remoto)
```json
{
  "operator_email": "operatore@example.com",
  "participant_email": "partecipante@example.com"
}
```

#### Video Call + Controllo Remoto
```json
{
  "operator_email": "operatore@example.com",
  "participant_email": "partecipante@example.com",
  "meshcentral_node_id": "UkSNlz7tYourNodeIdHere"
}
```

## 🌟 Caratteristiche

### Generazione Automatica Token
- ✅ I login token per MeshCentral sono generati **automaticamente**
- ✅ Nessuna configurazione manuale necessaria
- ✅ Token sicuri con scadenza 1 ora

### Interfaccia Unificata
- 📹 **Tab Video Call**: Jitsi completo
- 🖥️ **Tab Controllo Remoto**: Desktop remoto via MeshCentral
- 🎨 UI moderna e responsive
- 🔄 Cambio tab istantaneo

### Sicurezza
- 🔒 Token temporanei auto-generati
- 🔐 Comunicazione sicura tra componenti
- 🛡️ Isolamento tra sessioni

## 📊 Architettura

```
┌─────────────────────────────────────────┐
│   Server Integrato (localhost:3000)    │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │ Express      │  │  MeshCentral    │ │
│  │ + MCP Tool   │  │  (port 4000)    │ │
│  └──────────────┘  └─────────────────┘ │
│         │                   │           │
│         └───────┬───────────┘           │
│                 │                       │
└─────────────────┼───────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  remote-session.html │
        ├─────────────────────┤
        │  Tab 1: Jitsi       │
        │  Tab 2: MeshCentral │
        └─────────────────────┘
```

## 🔧 Personalizzazione MeshCentral

Modifica `meshcentral-config.json` per:

- Cambiare porta (default: 4000)
- Personalizzare titolo e footer
- Configurare certificati SSL
- Abilitare/disabilitare nuovi account
- E molto altro...

Consulta la [documentazione ufficiale MeshCentral](https://ylianst.github.io/MeshCentral/) per tutte le opzioni.

## 🐛 Troubleshooting

### MeshCentral non si avvia

**Problema:** Vedi errori all'avvio relativi a MeshCentral

**Soluzione:**
1. Verifica che la porta 4000 sia libera
2. Controlla il file `meshcentral-config.json`
3. Il server continuerà a funzionare solo con Jitsi

### Controllo remoto non funziona

**Problema:** Il tab controllo remoto è vuoto o mostra errori

**Soluzione:**
1. Verifica che MeshCentral sia avviato (`http://localhost:4000`)
2. Controlla che il NodeID sia corretto
3. Assicurati che il dispositivo sia online in MeshCentral
4. Verifica che l'agent MeshCentral sia installato sul dispositivo

### Token non valido

**Problema:** Errore "Invalid login token"

**Soluzione:**
- I token scadono dopo 1 ora
- Genera un nuovo link chiamando di nuovo il tool
- Verifica che MeshCentral sia configurato con `allowLoginToken: true`

## 📝 Log e Debug

Il server mostra log dettagliati:

```
🚀 ========================================
   MCP Jitsi + MeshCentral Server
========================================
📹 Jitsi Server: http://localhost:3000
🔧 MCP endpoint: http://localhost:3000/mcp
💚 Health check: http://localhost:3000/health
🖥️  MeshCentral: http://localhost:4000
========================================

🛠️  Tool disponibile: create_video_meeting
🔑 MeshCentral integrato e pronto
```

## 🎓 Esempi

### Esempio 1: Solo Video Call
```bash
# Chiama il tool senza meshcentral_node_id
# Risultato: Pagina con solo video call funzionante
```

### Esempio 2: Video Call + Controllo Remoto
```bash
# Chiama il tool con meshcentral_node_id
# Risultato: Pagina con entrambi i tab funzionanti
```

### Esempio 3: Accesso Diretto a MeshCentral
```bash
# Apri http://localhost:4000
# Gestisci dispositivi, gruppi, utenti
```

## 🔄 Aggiornamenti

Per aggiornare MeshCentral:
```bash
npm update meshcentral
npm run build
```

## 📚 Risorse

- [Documentazione MeshCentral](https://ylianst.github.io/MeshCentral/)
- [GitHub MeshCentral](https://github.com/Ylianst/MeshCentral)
- [Jitsi JaaS](https://jaas.8x8.vc/)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)

## ✨ Vantaggi dell'Integrazione

1. **Setup Semplificato**: Un solo server da configurare e avviare
2. **Nessuna Configurazione Esterna**: MeshCentral incluso e pronto
3. **Token Automatici**: Generazione sicura senza intervento manuale
4. **Sviluppo Locale**: Tutto funziona in localhost
5. **Produzione Ready**: Facilmente deployabile con le stesse configurazioni

---

**Buon lavoro con il tuo server integrato! 🎉**
