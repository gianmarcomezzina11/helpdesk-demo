#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import cors from "cors";
import { z } from "zod";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { createProxyMiddleware } from 'http-proxy-middleware';
import https from 'https';
import axios from 'axios';
import os from 'os';
import fs from 'fs';

const require = createRequire(import.meta.url);

// Funzione per ottenere l'IP locale
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (!nets) continue;
    
    for (const net of nets) {
      // Salta indirizzi interni e non-IPv4
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost'; // Fallback
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carica variabili d'ambiente
dotenv.config();

// Variabili globali per IP e URL (inizializzate in main())
let LOCAL_IP: string;
let MESHCENTRAL_URL: string;
let SERVER_URL: string;

// Interfacce TypeScript
interface JitsiMeetingResponse {
  meeting_id: string;
  room_name: string;
  operator_link: string;
  participant_link: string;
  meshcentral_url?: string;
  created_at: string;
  expires_at: string;
  operator_details: {
    email: string;
    name: string;
    role: string;
  };
  participant_details: {
    email: string;
    name: string;
    role: string;
  };
}

interface JWTPayload {
  aud: string;
  iss: string;
  sub: string;
  room: string;
  exp: number;
  nbf?: number;
  context: {
    user: {
      id?: string;
      name: string;
      email: string;
      avatar?: string;
      moderator?: string;
    };
    features?: {
      livestreaming?: boolean;
      recording?: boolean;
      transcription?: boolean;
      "outbound-call"?: boolean;
    };
  };
}

// Funzioni helper
function extractNameFromEmail(email: string): string {
  try {
    const namePart = email.split("@")[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  } catch {
    return "User";
  }
}

function sanitizeRoomName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function generateUniqueId(): string {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(3).toString("hex");
  return `meeting-${timestamp}-${randomStr}`;
}

function generateJWT(
  email: string,
  roomName: string,
  isModerator: boolean,
  durationHours: number
): string {
  const appId = process.env.JAAS_APP_ID;
  const keyId = process.env.JAAS_KEY_ID;
  const privateKey = process.env.JAAS_PRIVATE_KEY;

  if (!appId || !keyId || !privateKey) {
    throw new Error(
      "Credenziali JaaS mancanti. Configura JAAS_APP_ID, JAAS_KEY_ID e JAAS_PRIVATE_KEY nel file .env"
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + durationHours * 3600;

  const payload: JWTPayload = {
    aud: "jitsi",
    iss: "chat",
    sub: appId,
    room: "*",
    exp: exp,
    nbf: now - 10,
    context: {
      user: {
        id: email,
        name: extractNameFromEmail(email),
        email: email,
        moderator: isModerator ? "true" : undefined,
      },
      features: {
        livestreaming: isModerator,
        recording: isModerator,
        transcription: isModerator,
        "outbound-call": isModerator,
      },
    },
  };

  // Gestione della private key - supporta sia newline reali che escaped
  let formattedPrivateKey = privateKey;
  
  // Se contiene \n letterali (escaped), convertili in newline reali
  if (privateKey.includes('\\n')) {
    formattedPrivateKey = privateKey.replace(/\\n/g, "\n");
    console.error('🔑 Convertiti \\n escaped in newline reali');
  } else {
    console.error('🔑 Private key già con newline reali (multilinea)');
  }
  
  // Rimuovi spazi extra all'inizio di ogni riga (Azure potrebbe aggiungerli)
  formattedPrivateKey = formattedPrivateKey.split('\n').map(line => line.trim()).join('\n');
  console.error('🔑 Rimossi spazi extra da ogni riga');
  
  // Assicurati che inizi e finisca correttamente
  if (!formattedPrivateKey.includes('-----BEGIN')) {
    throw new Error('JAAS_PRIVATE_KEY non è nel formato corretto. Deve iniziare con -----BEGIN PRIVATE KEY-----');
  }
  
  console.error('🔑 Private key format check:');
  console.error(`   Lunghezza: ${formattedPrivateKey.length} caratteri`);
  console.error(`   Inizia con: ${formattedPrivateKey.substring(0, 27)}`);
  console.error(`   Finisce con: ${formattedPrivateKey.substring(formattedPrivateKey.length - 25)}`);
  console.error(`   Contiene newline: ${formattedPrivateKey.includes('\n')}`);
  console.error(`   Numero righe: ${formattedPrivateKey.split('\n').length}`);

  try {
    // Prova senza oggetto wrapper (jsonwebtoken 9.x supporta stringa PEM diretta per chiavi non criptate)
    return jwt.sign(payload, formattedPrivateKey, {
      algorithm: "RS256",
      keyid: keyId,
    });
  } catch (error: any) {
    console.error('❌ Errore generazione JWT:', error.message);
    throw new Error(`Impossibile generare JWT con JAAS_PRIVATE_KEY: ${error.message}. Verifica che sia una chiave RSA valida in formato PEM.`);
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Create server instance
const server = new McpServer({
  name: "mcp-jitsi-jaas-server",
  version: "1.0.0",
});

// Register the create_video_meeting tool
server.registerTool(
  "create_video_meeting",
  {
    title: "Crea Video Meeting",
    description:
      "Crea un nuovo video meeting e genera due link personalizzati - uno per l'operatore (moderatore) e uno per il partecipante",
    inputSchema: z.object({
      operator_email: z
        .string()
        .email()
        .describe("Email dell'operatore/host del meeting"),
      participant_email: z
        .string()
        .email()
        .describe("Email del partecipante"),
      redirect_url: z
        .string()
        .url()
        .optional()
        .describe("URL di redirect dopo la chiusura della chiamata"),
      meshcentral_node_id: z
        .string()
        .optional()
        .describe("NodeID del dispositivo MeshCentral per il controllo remoto"),
    }),
  },
  async ({ operator_email, participant_email, redirect_url, meshcentral_node_id }) => {
    try {
      // Validazione email
      if (!validateEmail(operator_email)) {
        throw new Error(`Email operatore non valida: ${operator_email}`);
      }
      if (!validateEmail(participant_email)) {
        throw new Error(`Email partecipante non valida: ${participant_email}`);
      }

      // Genera ID e nome stanza
      const meetingId = generateUniqueId();
      const timestamp = Date.now();
      const roomName = `meeting-${timestamp}`;

      // Genera JWT per operatore e partecipante (durata fissa 24 ore)
      const operatorJWT = generateJWT(
        operator_email,
        roomName,
        true,
        24
      );
      const participantJWT = generateJWT(
        participant_email,
        roomName,
        false,
        24
      );

      // Costruisci i link usando la nuova pagina con tab per Video Call e Controllo Remoto
      const appId = process.env.JAAS_APP_ID;
      const serverUrl = SERVER_URL; // Usa variabile globale con IP rilevato automaticamente
      
      // Link alla pagina HTML con tab per Video Call e Controllo Remoto
      const buildMeetingLink = async (jwtToken: string, isModerator: boolean) => {
        const params = new URLSearchParams({
          appId: appId!,
          room: roomName,
          jwt: jwtToken,
          isModerator: isModerator.toString()
        });
        
        if (redirect_url) {
          params.append('redirect', redirect_url);
        }

        // Aggiungi parametri MeshCentral SOLO per l'operatore
        if (isModerator && meshLoginTokenKey && meshcentral_node_id) {
          // Crea guest link automaticamente
          const guestUrl = await createMeshGuestLink(meshcentral_node_id);
          if (guestUrl) {
            params.append('meshUrl', guestUrl);
            console.error(`✅ MeshCentral abilitato per operatore - node: ${meshcentral_node_id.substring(0, 20)}...`);
          } else {
            console.error(`❌ Impossibile creare guest link per node: ${meshcentral_node_id}`);
          }
        }
        
        return `${serverUrl}/remote-session.html?${params.toString()}`;
      };
      
      const operatorLink = await buildMeetingLink(operatorJWT, true);
      const participantLink = await buildMeetingLink(participantJWT, false);

      // Genera MeshCentral URL se disponibile
      let meshUrl: string | null = null;
      if (meshLoginTokenKey && meshcentral_node_id) {
        meshUrl = await createMeshGuestLink(meshcentral_node_id);
      }

      // Calcola timestamp (durata fissa 24 ore)
      const createdAt = new Date().toISOString();
      const expiresAt = new Date(
        Date.now() + 24 * 3600000
      ).toISOString();

      // Costruisci risposta
      const response: JitsiMeetingResponse = {
        meeting_id: meetingId,
        room_name: roomName,
        operator_link: operatorLink,
        participant_link: participantLink,
        meshcentral_url: meshUrl || undefined,
        created_at: createdAt,
        expires_at: expiresAt,
        operator_details: {
          email: operator_email,
          name: extractNameFromEmail(operator_email),
          role: "moderator",
        },
        participant_details: {
          email: participant_email,
          name: extractNameFromEmail(participant_email),
          role: "participant",
        },
      };

      console.error(`✅ Meeting creato: ${meetingId} - Stanza: ${roomName}`);

      // Restituisci solo JSON pulito
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      console.error("Errore nella creazione del meeting:", errorMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: true,
                message: errorMessage,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
);

// MeshCentral integration
let meshcentralProcess: any = null;
let meshLoginTokenKey: string | null = process.env.MESHCENTRAL_TOKEN_KEY || null;
let meshAdminUsername: string | null = null;
let meshAdminPassword: string | null = null;

// Genera config MeshCentral dinamicamente con IP rilevato
function generateMeshCentralConfig(): void {
  const hostname = os.hostname();
  const configPath = path.join(process.cwd(), 'meshcentral-config.json');
  
  // In Azure, usa il dominio pubblico per certUrl (root, non subpath)
  const IS_AZURE = process.env.WEBSITE_INSTANCE_ID !== undefined;
  const publicDomain = IS_AZURE ? (process.env.WEBSITE_HOSTNAME || 'localhost') : `${LOCAL_IP}:3001`;
  const certUrl = `https://${publicDomain}`;  // MeshCentral servito dalla root
  
  const config = {
    settings: {
      cert: `${LOCAL_IP},${hostname}`,
      port: 4000,
      redirPort: 0,
      allowLoginToken: true,
      allowFraming: true,
      allowedOrigin: publicDomain,  // Accetta richieste dal dominio pubblico
      cookieSameSite: "none",
      cookieIpCheck: false,  // Disabilita controllo IP per iframe
      sessionTime: 60,
      sessionKey: "MyReallySecretPassword1",
      certUrl: certUrl,  // URL pubblico dalla root
      trustedProxy: LOCAL_IP,
      agentAllowedIp: "192.168.0.0/16",
      tlsOffload: false,  // Gestisce TLS internamente (no proxy esterno)
      ignoreAgentHashCheck: true,
      allowHighQualityDesktop: true,
      agentUpdateBlockSize: 1024,
      agentCoreDump: false,
      compression: true,
      wsCompression: true,
      agentWsCompression: true,
      _userConsentFlags: 0,  // FORZA: Nessun consenso (underscore nasconde opzione UI)
      agentConfig: {
        noProxy: true,
        ignoreProxyFile: true
      }
    },
    domains: {
      "": {
        title: "Remote Control System",
        title2: "Controllo Remoto",
        newAccounts: false,  // Disabilita creazione nuovi account per sicurezza
        userNameIsEmail: false,
        footer: "Remote Control & Video Call System",
        certUrl: certUrl,  // URL pubblico dalla root
        allowedOrigin: publicDomain,  // Accetta richieste dal dominio pubblico (anche nel dominio)
        guestDeviceSharing: true,
        desktopMultiplex: true,
        _userConsentFlags: 0  // FORZA: Nessun consenso (underscore nasconde opzione UI)
      }
    }
  };
  
  require('fs').writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.error(`✅ Config MeshCentral generato con IP: ${LOCAL_IP}`);
}

// Inizializza MeshCentral
function initMeshCentral(): boolean {
  try {
    // Genera config con IP dinamico
    generateMeshCentralConfig();
    
    const configPath = path.join(process.cwd(), 'meshcentral-config.json');
    
    console.error(`📁 Config path: ${configPath}`);
    
    // Avvia MeshCentral come processo separato
    const meshcentralPath = path.join(process.cwd(), 'node_modules', 'meshcentral');
    
    // Avvia MeshCentral
    meshcentralProcess = spawn('node', [
      path.join(meshcentralPath, 'meshcentral.js'),
      '--configfile', configPath
    ], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Log output di MeshCentral
    meshcentralProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) {
        console.error(`[MeshCentral] ${output}`);
      }
    });
    
    meshcentralProcess.stderr.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output && !output.includes('DeprecationWarning')) {
        console.error(`[MeshCentral] ${output}`);
      }
    });
    
    meshcentralProcess.on('error', (error: Error) => {
      console.error('❌ Errore processo MeshCentral:', error);
    });
    
    meshcentralProcess.on('exit', (code: number) => {
      console.error(`⚠️  MeshCentral terminato con codice: ${code}`);
    });
    
    console.error('✅ MeshCentral avviato come processo separato');
    if (meshLoginTokenKey) {
      console.error(`🔑 Login Token Key caricato: ${meshLoginTokenKey.substring(0, 20)}...`);
    }
    console.error(`🌐 MeshCentral disponibile su: ${MESHCENTRAL_URL} (attendi ~10 secondi)`);
    
    return true;
  } catch (error) {
    console.error('❌ Errore inizializzazione MeshCentral:', error);
    console.error('⚠️  Il server continuerà senza MeshCentral');
    return false;
  }
}

// Genera login token usando l'algoritmo ESATTO di MeshCentral (encodeCookie con AES-256-GCM)
function generateMeshLoginToken(username: string = 'admin', domain: string = ''): string | null {
  try {
    // Usa il loginTokenKey (LoginCookieEncryptionKey) dal .env
    if (!meshLoginTokenKey) {
      console.error('❌ MESHCENTRAL_TOKEN_KEY non configurato');
      return null;
    }
    
    // Formato userid MeshCentral: user/domain/username
    const userid = `user/${domain}/${username}`;
    
    console.error(`🎫 Generazione login token per: ${userid}`);
    
    // Crea l'oggetto cookie come fa MeshCentral
    const cookieObj = {
      u: userid,  // userid
      a: 3,       // authentication level (3 = full admin)
      time: Math.floor(Date.now() / 1000)  // timestamp corrente in secondi
    };
    
    console.error(`🍪 Cookie object:`, JSON.stringify(cookieObj));
    
    // Converti il loginTokenKey da hex a Buffer (deve essere 32+ bytes)
    const key = Buffer.from(meshLoginTokenKey, 'hex');
    
    if (key.length < 32) {
      console.error(`❌ LoginTokenKey troppo corto: ${key.length} bytes (minimo 32)`);
      return null;
    }
    
    // Genera IV random (12 bytes per AES-GCM)
    const iv = crypto.randomBytes(12);
    
    // Crea cipher AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key.slice(0, 32), iv);
    
    // Cripta il JSON del cookie
    const jsonString = JSON.stringify(cookieObj);
    const encrypted = Buffer.concat([
      cipher.update(jsonString, 'utf8'),
      cipher.final()
    ]);
    
    // Ottieni l'authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combina: IV (12 bytes) + AuthTag (16 bytes) + Encrypted data
    const combined = Buffer.concat([iv, authTag, encrypted]);
    
    // Codifica in base64 URL-safe (come fa MeshCentral)
    const loginToken = combined.toString('base64')
      .replace(/\+/g, '@')
      .replace(/\//g, '$');
    
    console.error(`✅ Login token generato: ${loginToken.substring(0, 30)}...`);
    console.error(`📏 Lunghezza: ${loginToken.length} caratteri`);
    
    return loginToken;
  } catch (error) {
    console.error('❌ Errore generazione login token:', error);
    return null;
  }
}

// Genera URL MeshCentral con login token (per iframe!)
async function createMeshGuestLink(nodeId: string): Promise<string | null> {
  try {
    // Genera login token
    const loginToken = generateMeshLoginToken('admin', '');
    
    if (!loginToken) {
      console.error('❌ Impossibile generare login token');
      return null;
    }
    
    // URL tramite REVERSE PROXY (stessa porta 3001 = No CORS!)
    // /meshcentral/ viene proxato a https://localhost:4000/
    // viewmode=11 = device page (mostra pulsanti Desktop/Files)
    // hide=127 = nascondi tutto (tutti i bit attivi: 1+2+4+8+16+32+64)
    const meshUrl = `${SERVER_URL}/meshcentral/?login=${loginToken}&node=${nodeId}&viewmode=11&hide=127`;
    
    console.error(`🔗 URL MeshCentral (via proxy) per node: ${nodeId.substring(0, 20)}...`);
    console.error(`✅ Autenticazione automatica + No CORS!`);
    return meshUrl;
  } catch (error) {
    console.error('❌ Errore creazione link:', error);
    return null;
  }
}

// Start the HTTP server with Streamable HTTP transport
async function main() {
  const app = express();
  const PORT = process.env.PORT || 3000;  // Porta unificata (Azure usa 8080)
  const IS_AZURE = process.env.WEBSITE_INSTANCE_ID !== undefined;  // Detect Azure
  
  // Rileva automaticamente l'IP locale e inizializza variabili globali
  LOCAL_IP = IS_AZURE ? 'localhost' : getLocalIP();
  const MESHCENTRAL_PORT = 4000;  // Porta standard per agent
  
  // In Azure, usa il dominio pubblico invece di IP locale
  if (IS_AZURE) {
    const azureDomain = process.env.WEBSITE_HOSTNAME || 'localhost';
    MESHCENTRAL_URL = `https://${azureDomain}/meshcentral-internal`;
    SERVER_URL = `https://${azureDomain}`;
  } else {
    MESHCENTRAL_URL = `https://${LOCAL_IP}:${MESHCENTRAL_PORT}`;
    SERVER_URL = `https://${LOCAL_IP}:${PORT}`;
  }
  
  console.error(`\n🌐 Ambiente: ${IS_AZURE ? 'Azure App Service' : 'Locale'}`);
  console.error(`📡 Server URL: ${SERVER_URL}`);
  console.error(`📡 Porta: ${PORT}`);
  console.error(`🖥️  MeshCentral URL: ${MESHCENTRAL_URL}\n`);

  // Serve static files from public directory
  app.use(express.static('public'));

  // Enable CORS with proper headers for MCP
  app.use(
    cors({
      origin: "*", // In production, specify allowed origins
      exposedHeaders: ["Mcp-Session-Id"],
      allowedHeaders: ["Content-Type", "mcp-session-id"],
    })
  );
  app.use(express.json());

  // MCP endpoint - POST for client-to-server messages
  app.post("/api/mcp", async (req: Request, res: Response) => {
    console.error("POST request ricevuta");
    
    try {
      // Create a new transport for each request (stateless mode)
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      res.on("close", () => {
        transport.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Errore handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  // GET not supported in stateless mode
  app.get("/api/mcp", (req: Request, res: Response) => {
    res.status(405).end();
  });

  // Health check endpoint
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok", server: "mcp-jitsi-jaas-server", meshcentral: meshEnabled });
  });
  
  console.error('✅ API endpoints: /api/mcp, /api/health');

  // Middleware per impostare X-Forwarded headers prima del proxy MeshCentral
  app.use('/', (req: Request, res: Response, next) => {
    // Informa MeshCentral del dominio pubblico reale tramite headers
    const publicHost = IS_AZURE ? (process.env.WEBSITE_HOSTNAME || 'localhost') : `${LOCAL_IP}:${PORT}`;
    req.headers['x-forwarded-host'] = publicHost;
    req.headers['x-forwarded-proto'] = 'https';
    req.headers['x-forwarded-for'] = req.ip || req.socket.remoteAddress || '';
    
    // Debug logging
    if (req.path === '/' || req.path.startsWith('/control')) {
      console.error(`🔍 MeshCentral request: ${req.method} ${req.path}`);
      console.error(`   Origin: ${req.headers.origin || 'none'}`);
      console.error(`   X-Forwarded-Host: ${req.headers['x-forwarded-host']}`);
    }
    
    next();
  });

  // Reverse Proxy per MeshCentral dalla ROOT (porta 4000 -> / su porta 8080)
  // MeshCentral viene servito dalla root per compatibilità con path relativi
  // Gli agent si connettono direttamente a porta 4000
  app.use('/', createProxyMiddleware({
    target: `https://${LOCAL_IP}:${MESHCENTRAL_PORT}`,
    changeOrigin: true,
    secure: false,  // Accetta certificati self-signed
    ws: true  // Proxy WebSocket per sessioni remote (CRITICO per desktop streaming)
  }));
  
  console.error('✅ Reverse proxy MeshCentral: / -> porta 4000');

  // Endpoint per compatibilità (non più usato)
  app.get('/meshproxy/:nodeId', async (req: Request, res: Response) => {
    try {
      const { nodeId } = req.params;
      
      console.error(`🖥️ Richiesta controllo remoto per node: ${nodeId}`);
      
      // Genera login token se disponibile
      const loginToken = generateMeshLoginToken('admin', '');
      
      // URL con login token o diretto
      const meshUrl = loginToken
        ? `https://192.168.1.210:4000/?login=${loginToken}&node=${nodeId}&viewmode=11&hide=31`
        : `https://192.168.1.210:4000/#p=2&node=${nodeId}`;
      
      console.error(`🔗 URL MeshCentral: ${meshUrl.substring(0, 80)}...`);
      
      // Pagina con iframe che punta al guest link o URL diretto
      const proxyPage = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Controllo Remoto</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #1a1a1a;
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        #loader {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            font-family: Arial, sans-serif;
            color: white;
            z-index: 1000;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        #instructions {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.95);
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            z-index: 1001;
            font-family: Arial, sans-serif;
            text-align: center;
            max-width: 600px;
        }
        #instructions h3 {
            margin: 0 0 10px 0;
            color: #667eea;
        }
        #instructions p {
            margin: 5px 0;
            color: #333;
            font-size: 14px;
        }
        #instructions button {
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        }
        #instructions button:hover {
            background: #5568d3;
        }
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div id="instructions">
        <h3>🖥️ Controllo Remoto</h3>
        <p><strong>Per vedere il desktop remoto:</strong></p>
        <p>1. <a href="https://192.168.1.210:4000" target="_blank" style="color: #667eea; font-weight: bold;">Clicca qui per aprire MeshCentral</a></p>
        <p>2. Fai login (username: <code>admin</code>)</p>
        <p>3. Lascia quella tab aperta</p>
        <p>4. Torna qui e clicca il pulsante sotto</p>
        <button onclick="loadDesktop()">✅ Ho fatto il login - Carica Desktop</button>
        <p style="font-size: 12px; color: #666; margin-top: 15px;">
            💡 Il login è necessario solo la prima volta. Dopo, la sessione rimane attiva.
        </p>
    </div>
    
    <div id="loader" class="hidden">
        <div class="spinner"></div>
        <p>Caricamento desktop remoto...</p>
    </div>
    
    <iframe 
        id="meshframe" 
        allow="clipboard-read; clipboard-write" 
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
        referrerpolicy="no-referrer-when-downgrade"
    ></iframe>
    
    <script>
        const meshUrl = '${meshUrl}';
        const hasLoginToken = meshUrl.includes('?login=') || meshUrl.includes('&login=');
        
        console.log('🔗 MeshUrl:', meshUrl);
        console.log('🎫 Has login token:', hasLoginToken);
        
        function loadDesktop() {
            document.getElementById('instructions').classList.add('hidden');
            document.getElementById('loader').classList.remove('hidden');
            document.getElementById('meshframe').src = meshUrl;
            
            setTimeout(() => {
                document.getElementById('loader').classList.add('hidden');
            }, 2000);
        }
        
        // Se ha login token, carica automaticamente senza mostrare istruzioni
        if (hasLoginToken) {
            console.log('✅ Login token trovato - caricamento automatico!');
            document.getElementById('instructions').style.display = 'none';
            setTimeout(() => {
                loadDesktop();
            }, 500);
        } else {
            console.log('⚠️  Nessun login token - mostra istruzioni');
        }
    </script>
</body>
</html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(proxyPage);
      
    } catch (error) {
      console.error('❌ Errore proxy:', error);
      res.status(500).send('Errore caricamento controllo remoto');
    }
  });
  
  // Fallback: pagina con istruzioni
  app.get("/meshsetup/:nodeId", async (req: Request, res: Response) => {
    try {
      const { nodeId } = req.params;

      const proxyHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Controllo Remoto - Setup Richiesto</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #667eea;
        }
        .step {
            background: #f9f9f9;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #667eea;
            border-radius: 4px;
        }
        .step h3 {
            margin-top: 0;
            color: #333;
        }
        code {
            background: #e8e8e8;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 20px;
        }
        .button:hover {
            background: #5568d3;
        }
        .node-id {
            background: #fff3cd;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            font-family: monospace;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🖥️ Setup Controllo Remoto</h1>
        <p>Per abilitare il controllo remoto automatico, segui questi passaggi una tantum:</p>
        
        <div class="step">
            <h3>1️⃣ Apri MeshCentral</h3>
            <p>Vai su: <a href="https://192.168.1.210:4000" target="_blank">https://192.168.1.210:4000</a></p>
            <p>Fai login con le tue credenziali admin</p>
        </div>
        
        <div class="step">
            <h3>2️⃣ Trova il Dispositivo</h3>
            <p>NodeID del dispositivo:</p>
            <div class="node-id">${nodeId}</div>
            <p>Cerca questo dispositivo nella lista dei tuoi device</p>
        </div>
        
        <div class="step">
            <h3>3️⃣ Crea Guest Sharing Link</h3>
            <p>1. Clicca sul dispositivo</p>
            <p>2. Clicca sul pulsante <strong>"Share"</strong></p>
            <p>3. Seleziona <strong>"Desktop"</strong> come tipo</p>
            <p>4. Imposta durata: <strong>24 ore</strong> (o più)</p>
            <p>5. Clicca <strong>"Create"</strong></p>
            <p>6. <strong>Copia il link</strong> generato</p>
        </div>
        
        <div class="step">
            <h3>4️⃣ Usa il Link Guest</h3>
            <p>Usa il link guest copiato al posto del NodeID quando chiami il tool MCP</p>
            <p>Il link guest permette accesso diretto senza login! ✅</p>
        </div>
        
        <a href="https://192.168.1.210:4000" class="button" target="_blank">Apri MeshCentral</a>
        
        <hr style="margin: 30px 0;">
        
        <h2>💡 Alternativa: Login Manuale</h2>
        <p>Se preferisci, puoi anche:</p>
        <ol>
            <li>Aprire MeshCentral in un'altra tab e fare login</li>
            <li>Poi tornare qui e ricaricare la pagina</li>
            <li>La sessione sarà condivisa automaticamente</li>
        </ol>
    </div>
</body>
</html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(proxyHtml);
      
    } catch (error) {
      console.error('❌ Errore proxy MeshCentral:', error);
      res.status(500).send('Proxy error');
    }
  });

  // Inizializza MeshCentral
  const meshEnabled = initMeshCentral();

  // AVVIA SERVER UNIFICATO (HTTP in locale, HTTPS gestito da Azure in produzione)
  if (IS_AZURE) {
    // In Azure, usa solo HTTP - Azure gestisce HTTPS
    app.listen(PORT, () => {
      console.error(`\n🚀 ========================================`);
      console.error(`   MCP Jitsi + MeshCentral Server (Azure)`);
      console.error(`========================================`);
      console.error(`📹 Server URL: ${SERVER_URL}`);
      console.error(`🔧 MCP endpoint: ${SERVER_URL}/api/mcp`);
      console.error(`💚 Health check: ${SERVER_URL}/api/health`);
      if (meshEnabled) {
        console.error(`🖥️  MeshCentral: ${SERVER_URL}/ (root)`);
      } else {
        console.error(`⚠️  MeshCentral: Non disponibile`);
      }
      console.error(`========================================\n`);
      console.error(`🛠️  Tool disponibile: create_video_meeting`);
      if (meshEnabled) {
        console.error(`🔑 MeshCentral integrato e pronto`);
      }
    });
  } else {
    // In locale, usa HTTPS con certificati MeshCentral
    const certPath = path.join(process.cwd(), 'meshcentral-data', 'webserver-cert-public.crt');
    const keyPath = path.join(process.cwd(), 'meshcentral-data', 'webserver-cert-private.key');
    
    // Attendi che MeshCentral generi i certificati
    const waitForCerts = setInterval(() => {
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        clearInterval(waitForCerts);
        
        const httpsOptions = {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath)
        };
        
        https.createServer(httpsOptions, app).listen(PORT, () => {
          console.error(`\n🚀 ========================================`);
          console.error(`   MCP Jitsi + MeshCentral Server (Locale)`);
          console.error(`========================================`);
          console.error(`� Server URL: ${SERVER_URL}`);
          console.error(`🔧 MCP endpoint: ${SERVER_URL}/mcp`);
          console.error(`💚 Health check: ${SERVER_URL}/health`);
          if (meshEnabled) {
            console.error(`🖥️  MeshCentral: ${MESHCENTRAL_URL}`);
          } else {
            console.error(`⚠️  MeshCentral: Non disponibile`);
          }
          console.error(`========================================\n`);
          console.error(`🛠️  Tool disponibile: create_video_meeting`);
          if (meshEnabled) {
            console.error(`🔑 MeshCentral integrato e pronto`);
          }
        });
      }
    }, 1000);
  }
}

main().catch((error) => {
  console.error("Errore fatale:", error);
  process.exit(1);
});
