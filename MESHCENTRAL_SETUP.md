# Configurazione MeshCentral per Controllo Remoto

Questa guida spiega come configurare MeshCentral per abilitare il controllo remoto integrato nella sessione video.

## Prerequisiti

1. Un server MeshCentral installato e funzionante
2. Accesso al file `config.json` di MeshCentral
3. Dispositivi già registrati in MeshCentral

## Passo 1: Configurare MeshCentral

Modifica il file `config.json` di MeshCentral per abilitare login token e framing:

```json
{
  "settings": {
    "allowLoginToken": true,
    "allowFraming": true
  }
}
```

Riavvia MeshCentral dopo aver modificato la configurazione.

## Passo 2: Generare il Login Token Key

Il login token key permette di generare token di accesso temporanei per MeshCentral.

Esegui questo comando nella directory di MeshCentral:

```bash
node meshcentral --loginTokenKey
```

Output esempio:
```
Login token key: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

Copia questo valore e aggiungilo al file `.env`:

```env
MESHCENTRAL_TOKEN_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

## Passo 3: Configurare l'URL di MeshCentral

Nel file `.env`, aggiungi l'URL del tuo server MeshCentral:

```env
MESHCENTRAL_URL=https://meshcentral.tuo-dominio.com
```

## Passo 4: Ottenere il NodeID del Dispositivo

Per controllare un dispositivo remoto, hai bisogno del suo NodeID.

### Metodo 1: Dall'interfaccia web di MeshCentral

1. Accedi a MeshCentral
2. Vai su "My Devices"
3. Clicca sul dispositivo che vuoi controllare
4. Nell'URL del browser, troverai il NodeID (es: `node/UkSNlz7t...`)
5. Copia la parte dopo `node/`

### Metodo 2: Tramite API di MeshCentral

Puoi usare l'API di MeshCentral per ottenere la lista dei dispositivi e i loro NodeID.

## Passo 5: Usare il Tool MCP

Quando chiami il tool `create_video_meeting`, puoi ora includere il parametro `meshcentral_node_id`:

```json
{
  "operator_email": "operatore@example.com",
  "participant_email": "partecipante@example.com",
  "meshcentral_node_id": "UkSNlz7tYourNodeIdHere2Sve6Srl6FltDd"
}
```

## Funzionalità della Pagina di Sessione Remota

La pagina generata avrà 2 tab:

### Tab 1: Video Call
- Videochiamata Jitsi completa
- Audio/Video attivi di default
- Chat integrata
- Controlli per moderatore/partecipante

### Tab 2: Controllo Remoto
- Desktop remoto tramite MeshCentral
- Controllo completo del mouse e tastiera
- Clipboard condivisa (copia/incolla)
- Interfaccia pulita senza elementi UI di MeshCentral

## Parametri URL di Embedding MeshCentral

Il sistema usa questi parametri per MeshCentral:

- `viewmode=11`: Modalità Remote Desktop
- `hide=31`: Nasconde tutti gli elementi UI (title bar, toolbar, footer)

Questo garantisce un'esperienza pulita e integrata nell'iframe.

## Sicurezza

⚠️ **Importante:**

1. **Login Token Key**: Mantieni questo valore segreto. Non condividerlo mai pubblicamente.
2. **HTTPS**: Usa sempre HTTPS in produzione per MeshCentral
3. **Token Temporanei**: I login token generati scadono dopo 1 ora
4. **Firewall**: Configura il firewall per permettere solo connessioni autorizzate a MeshCentral

## Troubleshooting

### Il controllo remoto non si carica

1. Verifica che `MESHCENTRAL_URL` sia corretto
2. Controlla che `allowLoginToken` e `allowFraming` siano `true` in config.json
3. Verifica che il NodeID sia corretto
4. Controlla la console del browser per errori

### Errore "X-Frame-Options"

Se vedi questo errore, assicurati che `allowFraming: true` sia impostato nel config.json di MeshCentral.

### Token non valido

1. Verifica che `MESHCENTRAL_TOKEN_KEY` sia corretto
2. Riavvia il server MCP dopo aver modificato .env
3. Controlla che il token non sia scaduto (durata: 1 ora)

## Link Utili

- [Documentazione MeshCentral](https://ylianst.github.io/MeshCentral/)
- [Embedding MeshCentral](https://ylianst.github.io/MeshCentral/meshcentral/#embedding-meshcentral)
- [MeshCentral GitHub](https://github.com/Ylianst/MeshCentral)

## Esempio Completo

```bash
# 1. Configura .env
MESHCENTRAL_URL=https://mesh.example.com
MESHCENTRAL_TOKEN_KEY=your-token-key-here

# 2. Chiama il tool MCP
{
  "operator_email": "tech@example.com",
  "participant_email": "user@example.com",
  "meshcentral_node_id": "UkSNlz7tYourNodeIdHere"
}

# 3. Il sistema genera un link tipo:
# https://your-server.com/remote-session.html?
#   appId=vpaas-magic-cookie-xxx&
#   room=meeting-123&
#   jwt=eyJhbGc...&
#   isModerator=true&
#   meshUrl=https://mesh.example.com&
#   meshToken=generated-token&
#   meshNode=UkSNlz7tYourNodeIdHere
```

## Note

- MeshCentral è **opzionale**. Se non configurato, la pagina mostrerà solo la video call
- Puoi usare la video call senza MeshCentral
- Il controllo remoto richiede che il dispositivo sia online e connesso a MeshCentral
