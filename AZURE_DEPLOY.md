# 🚀 Guida Deploy su Azure App Service

Questa guida ti accompagna passo-passo nel deploy dell'applicazione MCP Jitsi + MeshCentral su Azure App Service.

## 📋 Prerequisiti

- Account Azure attivo
- Azure CLI installato (opzionale, per deploy da terminale)
- Git installato
- Repository GitHub (opzionale, per CI/CD automatico)

---

## 🎯 Parte 1: Configurazione Azure App Service

### 1. Crea l'App Service (già fatto ✅)

Hai già creato l'app service. Ora configura le impostazioni:

### 2. Configura lo Stack Runtime

Nel portale Azure, vai su:
- **Configuration → General Settings**
- **Stack**: Seleziona **Node 18 LTS** (o 20 LTS)
- **Major version**: 18 LTS
- **Minor version**: Latest
- **Startup Command**: `npm start`

### 3. Abilita WebSocket (CRITICO per MeshCentral)

- **Configuration → General Settings**
- **Web sockets**: **ON** ✅
- Clicca **Save**

### 4. Configura Application Settings (Variabili d'Ambiente)

Vai su **Configuration → Application Settings** e aggiungi:

```
JAAS_APP_ID=<tuo_jitsi_app_id>
JAAS_KID=<tuo_jitsi_key_id>
JAAS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
MESHCENTRAL_TOKEN_KEY=<tuo_token_key_hex>
NODE_ENV=production
WEBSITE_NODE_DEFAULT_VERSION=18-lts
```

**⚠️ Importante:**
- Per `JAAS_PRIVATE_KEY`: copia l'intera chiave privata con `\n` per i newline
- Per `MESHCENTRAL_TOKEN_KEY`: genera con `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 5. Configura Persistenza Dati MeshCentral (Opzionale ma Consigliato)

MeshCentral ha bisogno di storage persistente per i dati. Azure App Service ha filesystem effimero.

**Opzione A: Azure Files (Consigliato)**

1. Crea uno Storage Account:
   - Vai su **Storage Accounts → Create**
   - Nome: `meshcentralstorage` (o simile)
   - Performance: Standard
   - Redundancy: LRS

2. Crea File Share:
   - Nel tuo Storage Account → **File shares → + File share**
   - Nome: `meshcentral-data`
   - Quota: 5 GB

3. Monta in App Service:
   - Vai su App Service → **Configuration → Path mappings**
   - Clicca **+ New Azure Storage Mount**
   - Name: `meshcentral-data`
   - Storage accounts: seleziona il tuo storage
   - Share name: `meshcentral-data`
   - Mount path: `/home/site/wwwroot/meshcentral-data`

**Opzione B: Usa MeshCentral Esterno (Alternativa)**

Se preferisci, puoi:
- Deployare MeshCentral su una VM Azure separata
- Usare solo Jitsi su App Service
- Modificare il codice per puntare al MeshCentral esterno

---

## 🚀 Parte 2: Deploy dell'Applicazione

### Metodo 1: Deploy via GitHub Actions (Consigliato)

#### 1. Collega GitHub al tuo App Service

Nel portale Azure:
- Vai su **Deployment Center**
- Source: **GitHub**
- Autorizza Azure ad accedere al tuo account GitHub
- Seleziona:
  - Organization: `gianmarcomezzina11`
  - Repository: `mcp_meshcentral_jitsi`
  - Branch: `main`
- Clicca **Save**

Azure creerà automaticamente un workflow GitHub Actions in `.github/workflows/`.

#### 2. Push del Codice

```bash
git add .
git commit -m "Configurazione per Azure App Service"
git push origin main
```

Azure rileverà il push e avvierà automaticamente il deploy! 🎉

#### 3. Monitora il Deploy

- Vai su **Deployment Center → Logs**
- Oppure su GitHub → **Actions** per vedere il workflow

---

### Metodo 2: Deploy via Azure CLI

Se preferisci deployare manualmente:

```bash
# Login ad Azure
az login

# Imposta la subscription (se ne hai più di una)
az account set --subscription "<tuo-subscription-id>"

# Deploy dell'app
az webapp up --name <nome-tua-app> --resource-group <nome-resource-group> --runtime "NODE:18-lts"
```

---

### Metodo 3: Deploy via VS Code

1. Installa l'estensione **Azure App Service** in VS Code
2. Clicca sull'icona Azure nella sidebar
3. Trova il tuo App Service
4. Click destro → **Deploy to Web App**
5. Seleziona la cartella del progetto

---

## 🔍 Parte 3: Verifica e Test

### 1. Verifica che l'app sia online

Vai su: `https://<nome-tua-app>.azurewebsites.net/health`

Dovresti vedere:
```json
{"status":"ok","server":"mcp-jitsi-jaas-server"}
```

### 2. Testa l'endpoint MCP

```bash
curl -X POST https://<nome-tua-app>.azurewebsites.net/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```

### 3. Verifica i Log

Nel portale Azure:
- **Monitoring → Log stream**
- Oppure **Diagnose and solve problems**

---

## 🔧 Parte 4: Configurazione Avanzata

### Dominio Custom

1. Vai su **Custom domains**
2. Clicca **+ Add custom domain**
3. Inserisci il tuo dominio (es. `app.tuodominio.com`)
4. Segui le istruzioni per configurare il DNS
5. Azure fornirà un certificato SSL gratuito

### CORS (se necessario)

Se hai problemi CORS, aggiungi in **Configuration → Application Settings**:

```
CORS_ORIGIN=https://tuodominio.com
```

E modifica il codice in `src/index.ts`:

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  // ...
}));
```

### Scaling

Per gestire più traffico:
- Vai su **Scale up (App Service plan)**
- Scegli un piano superiore (S1, P1V2, ecc.)
- Oppure **Scale out** per aggiungere istanze

---

## 🐛 Troubleshooting

### Problema: App non si avvia

**Soluzione:**
1. Verifica i log: **Monitoring → Log stream**
2. Controlla che `NODE_ENV=production` sia impostato
3. Verifica che lo startup command sia `npm start`

### Problema: WebSocket non funziona

**Soluzione:**
1. Verifica che **Web sockets** sia **ON** in Configuration
2. Controlla che il proxy MeshCentral abbia `ws: true`

### Problema: MeshCentral non mantiene i dati

**Soluzione:**
1. Configura Azure Files come descritto sopra
2. Oppure usa un database esterno per MeshCentral

### Problema: Certificati SSL MeshCentral

**Soluzione:**
In Azure, MeshCentral non ha bisogno di certificati locali perché Azure gestisce HTTPS.
Il codice è già configurato per rilevare l'ambiente Azure e disabilitare HTTPS locale.

### Problema: Variabili d'ambiente non caricate

**Soluzione:**
1. Verifica che le variabili siano in **Configuration → Application Settings**
2. Riavvia l'app: **Overview → Restart**
3. NON usare file `.env` in produzione (usa Application Settings)

---

## 📊 Monitoraggio

### Application Insights (Consigliato)

1. Vai su **Monitoring → Application Insights**
2. Clicca **Turn on Application Insights**
3. Crea una nuova risorsa o usa una esistente
4. Avrai accesso a:
   - Performance metrics
   - Request tracking
   - Error logging
   - Custom telemetry

### Alerts

Configura alert per:
- CPU > 80%
- Memory > 80%
- HTTP 5xx errors
- Response time > 5s

---

## 💰 Costi Stimati

- **Piano B1**: ~€12/mese
- **Azure Files (5GB)**: ~€0.25/mese
- **Application Insights**: ~€2-5/mese (primi 5GB gratis)
- **Totale**: ~€15-20/mese

---

## 🔐 Sicurezza

### Best Practices

1. **Non committare mai `.env`** nel repository
2. **Usa Application Settings** per le variabili sensibili
3. **Abilita HTTPS only**: Configuration → General Settings → HTTPS Only: ON
4. **Limita accesso MCP**: Aggiungi autenticazione se necessario
5. **Monitora i log**: Attiva Application Insights

### Backup

1. Vai su **Backups**
2. Configura backup automatici giornalieri
3. Include Azure Files nel backup

---

## 📝 Checklist Deploy

Prima di andare in produzione:

- [ ] Stack Node.js 18 LTS configurato
- [ ] WebSocket abilitato
- [ ] Tutte le variabili d'ambiente configurate
- [ ] Azure Files montato per MeshCentral (opzionale)
- [ ] Deploy completato con successo
- [ ] Health check funzionante (`/health`)
- [ ] MCP endpoint testato (`/mcp`)
- [ ] Jitsi meeting testato
- [ ] MeshCentral accessibile (se abilitato)
- [ ] Log stream monitorato
- [ ] Application Insights configurato
- [ ] Dominio custom configurato (opzionale)
- [ ] Certificato SSL attivo
- [ ] Backup configurati

---

## 🆘 Supporto

Se incontri problemi:

1. **Log Stream**: Controlla sempre i log in tempo reale
2. **Diagnose and solve problems**: Tool automatico di Azure
3. **GitHub Issues**: Apri un issue sul repository
4. **Azure Support**: Contatta il supporto Azure se necessario

---

## 🎉 Deploy Completato!

La tua applicazione è ora online su Azure! 🚀

**URL principale**: `https://<nome-tua-app>.azurewebsites.net`

**Endpoint disponibili:**
- `/` - Web app (remote-session.html)
- `/mcp` - MCP Server
- `/health` - Health check
- `/meshcentral` - MeshCentral proxy

**Prossimi passi:**
1. Testa la creazione di un meeting via MCP
2. Configura un dominio custom
3. Monitora le performance
4. Scala se necessario

Buon lavoro! 💪
