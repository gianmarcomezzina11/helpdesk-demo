# 🤖 Flusso Completamente Automatico

## ✨ Zero Configurazione Manuale!

Tutto è **completamente automatico**. Non devi fare NULLA manualmente per i login token.

## 🔄 Come Funziona

### 1️⃣ Avvio del Server

Quando esegui `npm start`:

```
🔧 Inizializzazione MeshCentral...
🔑 Login Token Key generato: a1b2c3d4e5f6g7h8i9j0...
✅ MeshCentral avviato come processo separato
🌐 MeshCentral disponibile su: https://localhost:4000

🚀 ========================================
   MCP Jitsi + MeshCentral Server
========================================
📹 Jitsi Server: http://localhost:3000
🔧 MCP endpoint: http://localhost:3000/mcp
💚 Health check: http://localhost:3000/health
🖥️  MeshCentral: https://localhost:4000
========================================

🛠️  Tool disponibile: create_video_meeting
🔑 MeshCentral integrato e pronto
```

**Cosa succede automaticamente:**
- ✅ Genera chiave di login casuale e sicura
- ✅ Avvia MeshCentral su porta 4000
- ✅ Avvia server Jitsi su porta 3000
- ✅ Tutto pronto per l'uso

### 2️⃣ Chiamata al Tool MCP

Quando chiami il tool `create_video_meeting`:

```json
{
  "operator_email": "operatore@example.com",
  "participant_email": "partecipante@example.com",
  "meshcentral_node_id": "UkSNlz7tYourNodeIdHere"
}
```

**Cosa succede automaticamente:**
1. ✅ Genera JWT per Jitsi (operatore e partecipante)
2. ✅ Genera login token per MeshCentral (valido 1 ora)
3. ✅ Crea URL completo con tutti i parametri
4. ✅ Restituisce i link pronti all'uso

### 3️⃣ Utente Apre il Link

Quando l'utente clicca sul link generato:

```
https://your-server.com/remote-session.html?
  appId=vpaas-xxx&
  room=meeting-123&
  jwt=eyJhbGc...&
  isModerator=true&
  meshUrl=https://localhost:4000&
  meshToken=dXNlci8vYWRtaW4sMTczNT...&
  meshNode=UkSNlz7tYourNodeIdHere
```

**Cosa succede automaticamente:**
1. ✅ Pagina carica con 2 tab
2. ✅ Tab Video Call: Jitsi si connette con JWT
3. ✅ Tab Controllo Remoto: MeshCentral si autentica con login token
4. ✅ Utente vede desktop remoto senza fare login

## 🎯 Flusso Completo Automatico

```
┌─────────────────────────────────────────────────────────────┐
│ 1. AVVIO SERVER                                             │
│    npm start                                                │
│    ↓                                                        │
│    • Genera login token key automaticamente                │
│    • Avvia MeshCentral                                      │
│    • Avvia server Jitsi/MCP                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CHIAMATA TOOL MCP                                        │
│    create_video_meeting(operator, participant, node_id)    │
│    ↓                                                        │
│    • Genera JWT Jitsi (automatico)                          │
│    • Genera login token MeshCentral (automatico)            │
│    • Costruisce URL completo (automatico)                   │
│    • Restituisce link                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. UTENTE APRE LINK                                         │
│    https://server.com/remote-session.html?params...        │
│    ↓                                                        │
│    • Pagina HTML carica                                     │
│    • Tab 1: Jitsi si connette (automatico)                  │
│    • Tab 2: MeshCentral si autentica (automatico)           │
│    • Utente vede tutto funzionante                          │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Sicurezza Automatica

### Login Token MeshCentral
- ✅ Generato al volo per ogni richiesta
- ✅ Valido solo 1 ora
- ✅ Firmato con chiave segreta
- ✅ Non riutilizzabile
- ✅ Specifico per utente e sessione

### JWT Jitsi
- ✅ Generato per ogni meeting
- ✅ Valido 24 ore
- ✅ Firmato con chiave privata
- ✅ Contiene ruolo (moderatore/partecipante)

## 📝 Cosa Devi Fare Tu

### Setup Iniziale (Una Volta Sola)

1. **Configura Jitsi** (file `.env`):
   ```env
   JAAS_APP_ID=vpaas-magic-cookie-xxxxx
   JAAS_KEY_ID=your-key-id
   JAAS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
   ```

2. **Configura MeshCentral** (prima volta):
   - Apri `https://localhost:4000`
   - Crea account amministratore
   - Installa agent sui dispositivi
   - Ottieni NodeID dei dispositivi

### Uso Quotidiano (Zero Configurazione)

1. **Avvia server**: `npm start`
2. **Chiama tool** con NodeID del dispositivo
3. **Condividi link** generato
4. **Fine!** Tutto il resto è automatico

## 🎉 Vantaggi

- ✅ **Zero configurazione manuale** dei token
- ✅ **Sicurezza automatica** (token temporanei)
- ✅ **Nessun comando da eseguire** manualmente
- ✅ **Tutto integrato** in un unico server
- ✅ **Pronto all'uso** in secondi

## 🔍 Debug

Se qualcosa non funziona, controlla i log del server:

```
🎫 Login token generato per: user//admin (scade: 12:34:56)
🔗 Link con MeshCentral generato per node: UkSNlz7t...
```

Questi messaggi confermano che i token vengono generati automaticamente.

## 💡 Nota Importante

**NON DEVI MAI:**
- ❌ Eseguire comandi MeshCentral manualmente
- ❌ Generare token manualmente
- ❌ Configurare login token key nel .env
- ❌ Fare nulla con i token

**TUTTO È AUTOMATICO!** 🚀

---

**Il sistema è progettato per essere completamente trasparente e automatico.**
