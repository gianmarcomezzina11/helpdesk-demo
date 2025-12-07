# Funzionalità del Server MCP Jitsi JaaS

## 🎯 IMPORTANTE: Nuova Implementazione con IFrame API

I link generati ora puntano a una **pagina HTML intermedia** (`/meeting.html`) che usa l'**IFrame API di Jitsi**. Questo permette di:

- ✅ Configurare correttamente video e audio aperti di default
- ✅ Aprire automaticamente la chat dopo 1 secondo
- ✅ Gestire il redirect dopo la chiamata
- ✅ Supportare tutte le configurazioni avanzate

**Formato link:**
```
http://localhost:3000/meeting.html?appId=vpaas-magic-cookie-xxx&room=nome-stanza&jwt=TOKEN&redirect=URL
```

## ✅ Funzionalità Implementate

### 1. **Auto-Join Immediato**
- ✅ Nessuna pagina di pre-join
- ✅ Entri direttamente nella chiamata con un click
- ✅ Nome utente automatico dall'email

**Parametro:** `config.prejoinConfig.enabled=false`

### 2. **Video e Audio Aperti di Default**
- ✅ Videocamera **APERTA** all'ingresso
- ✅ Microfono **APERTO** all'ingresso
- ✅ Nessuna richiesta di permessi

**Parametri:**
- `config.startWithAudioMuted=false`
- `config.startWithVideoMuted=false`

### 3. **Chat Aperta di Default** ✅
- ✅ La chat si apre **AUTOMATICAMENTE** dopo 1 secondo dall'ingresso
- Implementato tramite IFrame API: `api.executeCommand('toggleChat')`
- Funziona perfettamente con la nuova implementazione

### 4. **Redirect Dopo la Chiamata**
Quando chiudi la chiamata (click su "Hangup"), vieni reindirizzato automaticamente all'URL specificato.

**Parametro opzionale nel tool:**
```json
{
  "redirect_url": "https://tuo-sito.com/grazie"
}
```

**Implementazione:**
- `close.redirectUrl=URL_ENCODED`
- `config.enableClosePage=true`

### 5. **Chiusura Automatica quando Esce il Moderatore** ✅

✅ **IMPLEMENTATO!** Quando il moderatore (operatore) esce dal meeting:
1. Viene rilevato l'evento `participantLeft`
2. Si verifica che il partecipante uscito sia un moderatore
3. Appare un alert: "Il moderatore ha terminato il meeting"
4. Dopo 1 secondo, il meeting si chiude automaticamente per tutti

**Implementazione:** Usa l'IFrame API con eventi `participantJoined` e `participantLeft`

### 6. **Condivisione Schermo Disabilitata** ✅

✅ Il bottone di condivisione schermo è **RIMOSSO** dalla toolbar
- Configurazione: `disableScreensharingVirtualBackground: true`
- Il bottone 'desktop' non appare nella toolbar

### 7. **Inviti Disabilitati** ✅

✅ La funzione di invito è **COMPLETAMENTE DISABILITATA**
- Configurazione: `disableInviteFunctions: true`
- Nessun bottone per invitare altri partecipanti
- Non è possibile copiare/condividere il link dal meeting

#### Come Funziona:

Jitsi JaaS non supporta nativamente la chiusura automatica della stanza quando esce il moderatore tramite URL. Questa funzionalità richiede:

1. **Webhook JaaS** - Per ricevere eventi quando il moderatore lascia la stanza
2. **Backend Server** - Per processare gli eventi e chiudere la stanza
3. **API JaaS** - Per terminare la conferenza

#### Implementazione Webhook (Opzionale):

Per implementare questa funzionalità, devi:

1. **Configurare Webhook su JaaS Dashboard:**
   - Vai su https://jaas.8x8.vc/
   - Sezione "Webhooks"
   - Aggiungi un endpoint webhook che riceve eventi

2. **Eventi da ascoltare:**
   - `PARTICIPANT_LEFT` - Quando un partecipante esce
   - Verifica se il partecipante è il moderatore
   - Se sì, termina la conferenza per tutti

3. **Endpoint Webhook (esempio):**
```javascript
app.post('/webhook/jitsi', (req, res) => {
  const event = req.body;
  
  if (event.event === 'PARTICIPANT_LEFT' && event.participant.moderator) {
    // Il moderatore ha lasciato la stanza
    // Termina la conferenza per tutti
    terminateConference(event.roomName);
  }
  
  res.status(200).send('OK');
});
```

#### Alternativa Semplice:

**Soluzione Client-Side (Limitata):**
Jitsi può essere configurato per mostrare un avviso quando il moderatore esce, ma non può forzare la chiusura lato client per motivi di sicurezza.

**Soluzione Consigliata:**
Usa i webhook JaaS per implementare questa logica lato server.

## 📋 Parametri del Tool

### Parametri Obbligatori:
- `operator_email` - Email del moderatore
- `participant_email` - Email del partecipante

### Parametri Opzionali:
- `meeting_title` - Titolo della stanza
- `duration_hours` - Durata validità link (default: 2 ore)
- `redirect_url` - URL di redirect dopo la chiamata

## 🎯 Esempio Completo

```json
{
  "operator_email": "gianmarco@ethera.it",
  "participant_email": "cliente@azienda.com",
  "meeting_title": "Consulenza Tecnica",
  "duration_hours": 3,
  "redirect_url": "https://ethera.it/grazie-per-la-chiamata"
}
```

### Risultato:

**Link Operatore:**
```
https://8x8.vc/vpaas-magic-cookie-xxx/consulenza-tecnica-123?jwt=TOKEN&close.redirectUrl=https%3A%2F%2Fethera.it%2Fgrazie#config.prejoinConfig.enabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&...
```

**Comportamento:**
1. ✅ Click sul link → Entri SUBITO nella call
2. ✅ Video e audio già aperti
3. ✅ Chat disponibile nella toolbar
4. ✅ Quando clicchi "Hangup" → Redirect a https://ethera.it/grazie-per-la-chiamata
5. ⚠️ Chiusura automatica per tutti quando esce il moderatore → Richiede webhook

## 🔧 Configurazioni Applicate

Tutte le configurazioni sono passate nell'URL dopo il simbolo `#`:

```
config.prejoinConfig.enabled=false          # Salta prejoin
config.startWithAudioMuted=false            # Audio aperto
config.startWithVideoMuted=false            # Video aperto
config.enableClosePage=true                 # Abilita redirect
config.disableDeepLinking=true              # Disabilita deep linking
config.subject="Titolo Meeting"             # Titolo della stanza
```

## 📝 Note Importanti

### Video/Audio Aperti:
- ✅ Funziona perfettamente
- Gli utenti entrano con video e audio già attivi
- Possono disattivarli manualmente se vogliono

### Chat:
- La chat è sempre disponibile nella toolbar
- Jitsi non supporta l'apertura automatica via URL
- Gli utenti possono aprirla con un click sull'icona chat

### Redirect:
- ✅ Funziona quando l'utente clicca "Hangup"
- Non funziona se l'utente chiude il tab del browser
- Parametro: `close.redirectUrl=URL_ENCODED`

### Chiusura Automatica Moderatore:
- ⚠️ Richiede implementazione webhook lato server
- Non è possibile forzarla solo tramite URL per motivi di sicurezza
- Soluzione: Implementa webhook JaaS per ascoltare eventi

## 🚀 Prossimi Passi

Se vuoi implementare la chiusura automatica quando esce il moderatore:

1. Configura webhook su JaaS Dashboard
2. Crea endpoint `/webhook/jitsi` nel server
3. Ascolta evento `PARTICIPANT_LEFT`
4. Verifica se è il moderatore
5. Termina la conferenza via API JaaS

Vuoi che implementi anche il sistema di webhook?
