import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, '.data');
const UPLOAD_DIR = path.resolve(DATA_DIR, 'uploads');
const CHAT_STORE_PATH = path.resolve(DATA_DIR, 'chat_sessions.json');
const WHATSAPP_CONFIG_PATH = path.resolve(DATA_DIR, 'whatsapp_config.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderType: 'customer' | 'agent' | 'system';
  senderName: string;
  text: string;
  channel: 'web' | 'whatsapp';
  createdAt: string;
  readByAgent: boolean;
}

export interface ChatSession {
  sessionId: string;
  customerName: string;
  customerPhone: string;
  customerUid?: string;
  channel: 'web' | 'whatsapp';
  status: 'open' | 'pending_whatsapp' | 'resolved';
  assignedAgent?: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
  createdAt: string;
  messages: ChatMessage[];
}

interface WhatsAppConfig {
  phoneNumberId: string;
  businessAccountId: string;
  verifyToken: string;
  storeWhatsappNumber: string;
  integrationReady: boolean;
  autoNotifyBookings: boolean;
  updatedAt: string;
}

function loadChatSessions(): Map<string, ChatSession> {
  const map = new Map<string, ChatSession>();
  try {
    if (fs.existsSync(CHAT_STORE_PATH)) {
      const raw = fs.readFileSync(CHAT_STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as ChatSession[];
      for (const session of parsed) {
        map.set(session.sessionId, session);
      }
    }
  } catch (err) {
    console.error('Failed to load chat store:', err);
  }
  return map;
}

function saveChatSessions(sessions: Map<string, ChatSession>) {
  try {
    const arr = Array.from(sessions.values()).sort((a, b) =>
      b.lastMessageAt.localeCompare(a.lastMessageAt)
    );
    fs.writeFileSync(CHAT_STORE_PATH, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save chat store:', err);
  }
}

function loadWhatsAppConfig(): WhatsAppConfig {
  try {
    if (fs.existsSync(WHATSAPP_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(WHATSAPP_CONFIG_PATH, 'utf-8')) as WhatsAppConfig;
    }
  } catch {
    // ignore
  }
  return {
    phoneNumberId: '',
    businessAccountId: '',
    verifyToken: 'asema_networks_wa_verify',
    storeWhatsappNumber: '967770581056',
    integrationReady: true,
    autoNotifyBookings: true,
    updatedAt: new Date().toISOString(),
  };
}

function saveWhatsAppConfig(cfg: WhatsAppConfig) {
  fs.writeFileSync(WHATSAPP_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}

const chatSessions = loadChatSessions();
let whatsappConfig = loadWhatsAppConfig();

interface ConnectedClient {
  ws: WebSocket;
  role: 'customer' | 'agent';
  sessionId?: string;
  name?: string;
}

const clients = new Set<ConnectedClient>();

function broadcastToAgents(payload: unknown) {
  const raw = JSON.stringify(payload);
  for (const client of clients) {
    if (client.role === 'agent' && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(raw);
    }
  }
}

function broadcastToSession(sessionId: string, payload: unknown) {
  const raw = JSON.stringify(payload);
  for (const client of clients) {
    if (
      client.ws.readyState === WebSocket.OPEN &&
      (client.role === 'agent' || (client.role === 'customer' && client.sessionId === sessionId))
    ) {
      client.ws.send(raw);
    }
  }
}

function getAgentPresenceCount(): number {
  let count = 0;
  for (const client of clients) {
    if (client.role === 'agent' && client.ws.readyState === WebSocket.OPEN) {
      count += 1;
    }
  }
  return count;
}

function broadcastPresence() {
  const agentsOnline = getAgentPresenceCount();
  const raw = JSON.stringify({ type: 'chat:presence', agentsOnline });
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(raw);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Security headers configured with explicit allowlists for YouTube nocookie embeds & Firebase
  app.use((_req, res, next) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=(self "https://www.youtube-nocookie.com" "https://www.youtube.com"), autoplay=(self "https://www.youtube-nocookie.com" "https://www.youtube.com"), encrypted-media=(self "https://www.youtube-nocookie.com" "https://www.youtube.com"), fullscreen=(self "https://www.youtube-nocookie.com" "https://www.youtube.com"), gyroscope=(self "https://www.youtube-nocookie.com" "https://www.youtube.com"), picture-in-picture=(self "https://www.youtube-nocookie.com" "https://www.youtube.com")'
    );
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://www.youtube-nocookie.com https://s.ytimg.com https://apis.google.com https://www.gstatic.com https://www.googleapis.com https://*.firebaseapp.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://i.ytimg.com https://i9.ytimg.com https://yt3.ggpht.com https://lh3.googleusercontent.com https:",
        "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://accounts.google.com https://apis.google.com https://*.firebaseapp.com https://*.web.app",
        "child-src 'self' blob: https://www.youtube-nocookie.com https://www.youtube.com https://*.firebaseapp.com",
        "media-src 'self' blob: data: https://*.googlevideo.com https://www.youtube-nocookie.com https://www.youtube.com https:",
        "connect-src 'self' ws: wss: https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://*.firebaseapp.com https://www.youtube-nocookie.com https://www.youtube.com https://i.ytimg.com https:",
        "object-src 'none'",
        "base-uri 'self'",
      ].join('; ')
    );
    next();
  });

  // Serve uploaded images safely
  app.use('/uploads', express.static(UPLOAD_DIR));

  // Image upload endpoint for Admin Control Center (products, ads, homepage sections)
  app.post('/api/upload', (req, res) => {
    try {
      const { fileName, dataUrl } = req.body as { fileName?: string; dataUrl?: string };
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ error: 'Missing image payload' });
      }
      const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: 'Invalid image format. Allowed: PNG, JPG, WEBP, GIF.' });
      }
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length > 8 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image size exceeds 8MB limit' });
      }
      const safeBase = (fileName || 'asset')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 40);
      const outName = `${safeBase}_${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, outName), buffer);
      return res.json({ url: `/uploads/${outName}`, fileName: outName });
    } catch (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'Upload failed' });
    }
  });

  // Live chat REST endpoints (initial state & WhatsApp handoff)
  app.get('/api/chat/sessions', (_req, res) => {
    const arr = Array.from(chatSessions.values()).sort((a, b) =>
      b.lastMessageAt.localeCompare(a.lastMessageAt)
    );
    res.json({ sessions: arr, agentsOnline: getAgentPresenceCount() });
  });

  app.get('/api/whatsapp/status', (_req, res) => {
    res.json({
      status: whatsappConfig.phoneNumberId ? 'configured' : 'ready_for_api',
      webhookPath: '/api/whatsapp/webhook',
      storeWhatsappNumber: whatsappConfig.storeWhatsappNumber,
      autoNotifyBookings: whatsappConfig.autoNotifyBookings,
      supportedTemplates: [
        'reservation_confirmed',
        'order_preparing',
        'ready_for_pickup',
        'out_for_delivery',
        'live_chat_handoff',
      ],
      updatedAt: whatsappConfig.updatedAt,
    });
  });

  app.post('/api/whatsapp/config', (req, res) => {
    const body = req.body as Partial<WhatsAppConfig>;
    whatsappConfig = {
      ...whatsappConfig,
      phoneNumberId: typeof body.phoneNumberId === 'string' ? body.phoneNumberId.slice(0, 120) : whatsappConfig.phoneNumberId,
      businessAccountId: typeof body.businessAccountId === 'string' ? body.businessAccountId.slice(0, 120) : whatsappConfig.businessAccountId,
      verifyToken: typeof body.verifyToken === 'string' ? body.verifyToken.slice(0, 120) : whatsappConfig.verifyToken,
      storeWhatsappNumber: typeof body.storeWhatsappNumber === 'string' ? body.storeWhatsappNumber.slice(0, 30) : whatsappConfig.storeWhatsappNumber,
      autoNotifyBookings: typeof body.autoNotifyBookings === 'boolean' ? body.autoNotifyBookings : whatsappConfig.autoNotifyBookings,
      updatedAt: new Date().toISOString(),
    };
    saveWhatsAppConfig(whatsappConfig);
    res.json({ ok: true, status: whatsappConfig.phoneNumberId ? 'configured' : 'ready_for_api' });
  });

  // Meta WhatsApp Cloud API Webhook Verification (Future Integration Ready)
  app.get('/api/whatsapp/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === whatsappConfig.verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  });

  // Meta WhatsApp Cloud API Incoming Message Webhook (Routes directly into Live Chat Console)
  app.post('/api/whatsapp/webhook', (req, res) => {
    try {
      const entry = req.body?.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const msg = change?.messages?.[0];
      if (msg && msg.from && msg.text?.body) {
        const phone = String(msg.from).replace(/[^0-9]/g, '');
        const sessionId = `wa_${phone}`;
        const now = new Date().toISOString();
        const contactName = change?.contacts?.[0]?.profile?.name || `WhatsApp ${phone}`;
        let session = chatSessions.get(sessionId);
        if (!session) {
          session = {
            sessionId,
            customerName: contactName,
            customerPhone: phone,
            channel: 'whatsapp',
            status: 'open',
            unreadCount: 0,
            lastMessage: '',
            lastMessageAt: now,
            createdAt: now,
            messages: [],
          };
          chatSessions.set(sessionId, session);
        }
        const messageObj: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          sessionId,
          senderType: 'customer',
          senderName: contactName,
          text: String(msg.text.body).slice(0, 2000),
          channel: 'whatsapp',
          createdAt: now,
          readByAgent: false,
        };
        session.messages.push(messageObj);
        session.lastMessage = messageObj.text;
        session.lastMessageAt = now;
        session.unreadCount += 1;
        session.status = 'open';
        saveChatSessions(chatSessions);
        broadcastToSession(sessionId, { type: 'chat:message', session, message: messageObj });
      }
    } catch (err) {
      console.error('WhatsApp webhook processing error:', err);
    }
    res.sendStatus(200);
  });

  // Prepare WhatsApp formatted handoff or booking notification link
  app.post('/api/whatsapp/prepare-message', (req, res) => {
    const { phone, message } = req.body as { phone?: string; message?: string };
    const cleanPhone = (phone || whatsappConfig.storeWhatsappNumber).replace(/[^0-9]/g, '');
    const normalizedPhone = cleanPhone.startsWith('967') ? cleanPhone : `967${cleanPhone.replace(/^0+/, '')}`;
    const encoded = encodeURIComponent(message || '');
    res.json({
      whatsappUrl: `https://wa.me/${normalizedPhone}?text=${encoded}`,
      normalizedPhone,
      apiPayloadPreview: {
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'text',
        text: { body: message || '' },
      },
    });
  });

  // Server-side Gemini AI Networking Assistant & Camera Device Recognition
  function getGeminiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }

  interface CatalogDigestItem {
    id: string;
    nameAr?: string;
    nameEn?: string;
    modelNumber?: string;
    brandName?: string;
    categoryNameAr?: string;
    retailPrice?: number;
    availableQuantity?: number;
    status?: string;
    specsAr?: string;
    specsEn?: string;
  }

  app.post('/api/ai/assistant', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'AI service key is not configured on the server (GEMINI_API_KEY).',
      });
    }

    try {
      const { question, history, catalogProducts, contextType } = req.body as {
        question?: string;
        history?: { role: 'user' | 'model'; text: string }[];
        catalogProducts?: CatalogDigestItem[];
        contextType?: 'assistant' | 'troubleshoot' | 'compare';
      };

      if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({ error: 'Question is required.' });
      }

      const safeCatalog = Array.isArray(catalogProducts) ? catalogProducts.slice(0, 60) : [];
      const validIds = new Set(safeCatalog.map((p) => p.id));
      const catalogSummary = safeCatalog.map((p) => ({
        id: p.id,
        nameAr: p.nameAr || '',
        nameEn: p.nameEn || '',
        modelNumber: p.modelNumber || '',
        brand: p.brandName || '',
        category: p.categoryNameAr || '',
        priceUsd: p.retailPrice ?? 0,
        stock: p.availableQuantity ?? 0,
        status: p.status || 'available',
        specs: (p.specsAr || p.specsEn || '').slice(0, 400),
      }));

      const conversationContext = Array.isArray(history)
        ? history
            .slice(-6)
            .map((h) => `${h.role === 'user' ? 'User' : 'Engineer'}: ${String(h.text || '').slice(0, 500)}`)
            .join('\n')
        : '';

      const systemInstruction = `You are the Senior Network Engineering Assistant for ASEMA NETWORKS (عاصمة الشبكات - CAPITAL NETWORKS).
STRICT RULES:
1. You MUST rely ONLY on the provided Live Store Catalog JSON for any product names, model numbers, prices, stock quantities, and store product specifications.
2. NEVER invent store prices, fake stock numbers, or claim a device exists in the ASEMA store if its "id" is not in the provided Live Store Catalog. If a user asks about hardware not in the catalog, give accurate general networking engineering advice and explicitly mention which available in-stock ASEMA catalog devices are the closest fit (or state that the exact model is not currently listed in the store).
3. Mode is "${contextType || 'assistant'}":
   - "assistant": technical Q&A, device explanations, and project hardware recommendations.
   - "compare": concise objective spec & suitability comparison between devices.
   - "troubleshoot": systematic Layer 1 -> Layer 2 -> Layer 3 fault diagnosis steps (e.g., MikroTik RouterOS, PoE budget, Wi-Fi channel interference, fiber SFP optical RX/TX levels, subnet/NAT issues).
4. In "recommendedProductIds", return ONLY exact matching "id" strings from the Live Store Catalog.
5. Provide helpful, crystal-clear technical Arabic ("answerAr") and accurate English ("answerEn").`;

      const promptText = `${conversationContext ? `Recent conversation:\n${conversationContext}\n\n` : ''}User inquiry:\n${question.slice(0, 2000)}\n\nLive Store Catalog JSON:\n${JSON.stringify(catalogSummary)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answerAr: { type: Type.STRING },
              answerEn: { type: Type.STRING },
              diagnosticSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              recommendedProductIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              specsComparisonNote: { type: Type.STRING },
            },
            required: ['answerAr', 'answerEn', 'diagnosticSteps', 'recommendedProductIds'],
          },
        },
      });

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText) as {
        answerAr?: string;
        answerEn?: string;
        diagnosticSteps?: string[];
        recommendedProductIds?: string[];
        specsComparisonNote?: string;
      };

      const filteredIds = Array.isArray(parsed.recommendedProductIds)
        ? parsed.recommendedProductIds.filter((id) => typeof id === 'string' && validIds.has(id)).slice(0, 6)
        : [];

      return res.json({
        answerAr: parsed.answerAr || '',
        answerEn: parsed.answerEn || '',
        diagnosticSteps: Array.isArray(parsed.diagnosticSteps) ? parsed.diagnosticSteps.slice(0, 8) : [],
        recommendedProductIds: filteredIds,
        specsComparisonNote: parsed.specsComparisonNote || '',
      });
    } catch (err) {
      console.error('Gemini assistant error:', err);
      return res.status(502).json({ error: 'Failed to process AI engineering request.' });
    }
  });

  app.post('/api/ai/camera-search', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'AI service key is not configured on the server (GEMINI_API_KEY).',
      });
    }

    try {
      const { imageBase64, mimeType, notes, catalogProducts } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        notes?: string;
        catalogProducts?: CatalogDigestItem[];
      };

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ error: 'Missing device image payload.' });
      }

      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      const safeMime = typeof mimeType === 'string' && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
      const safeCatalog = Array.isArray(catalogProducts) ? catalogProducts.slice(0, 60) : [];
      const validIds = new Set(safeCatalog.map((p) => p.id));
      const inStockIds = new Set(
        safeCatalog.filter((p) => (p.availableQuantity ?? 0) > 0 && p.status !== 'out_of_stock').map((p) => p.id)
      );

      const catalogSummary = safeCatalog.map((p) => ({
        id: p.id,
        nameAr: p.nameAr || '',
        nameEn: p.nameEn || '',
        modelNumber: p.modelNumber || '',
        brand: p.brandName || '',
        category: p.categoryNameAr || '',
        priceUsd: p.retailPrice ?? 0,
        stock: p.availableQuantity ?? 0,
        status: p.status || 'available',
        specs: (p.specsAr || p.specsEn || '').slice(0, 300),
      }));

      const promptText = `Inspect the uploaded photo of networking hardware (router, switch, access point, CPE, optical SFP, CCTV camera, cable, or label).
1. Identify the exact brand, model number, and device name ONLY if visibly recognizable from the photo. If unclear or non-networking, set "recognized": false and explain clearly.
2. Match against the ASEMA Live Store Catalog below:
   - "matchedProductId": exact catalog "id" if this product exists in the store catalog, otherwise empty string "".
   - "similarProductIds": up to 4 catalog IDs in the same category or form factor.
   - "alternativeProductIds": up to 4 IN-STOCK (stock > 0) catalog IDs that serve as viable alternatives.
3. Optional user note: ${(notes || '').slice(0, 300)}
Live Store Catalog JSON:
${JSON.stringify(catalogSummary)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          { inlineData: { data: cleanBase64, mimeType: safeMime } },
          promptText,
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recognized: { type: Type.BOOLEAN },
              deviceName: { type: Type.STRING },
              brand: { type: Type.STRING },
              modelNumber: { type: Type.STRING },
              categoryGuess: { type: Type.STRING },
              confidenceNoteAr: { type: Type.STRING },
              confidenceNoteEn: { type: Type.STRING },
              matchedProductId: { type: Type.STRING },
              similarProductIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              alternativeProductIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              extractedSpecs: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'recognized',
              'deviceName',
              'brand',
              'modelNumber',
              'confidenceNoteAr',
              'confidenceNoteEn',
              'matchedProductId',
              'similarProductIds',
              'alternativeProductIds',
              'extractedSpecs',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}') as {
        recognized?: boolean;
        deviceName?: string;
        brand?: string;
        modelNumber?: string;
        categoryGuess?: string;
        confidenceNoteAr?: string;
        confidenceNoteEn?: string;
        matchedProductId?: string;
        similarProductIds?: string[];
        alternativeProductIds?: string[];
        extractedSpecs?: string[];
      };

      return res.json({
        recognized: Boolean(parsed.recognized),
        deviceName: parsed.deviceName || '',
        brand: parsed.brand || '',
        modelNumber: parsed.modelNumber || '',
        categoryGuess: parsed.categoryGuess || '',
        confidenceNoteAr: parsed.confidenceNoteAr || '',
        confidenceNoteEn: parsed.confidenceNoteEn || '',
        matchedProductId:
          parsed.matchedProductId && validIds.has(parsed.matchedProductId) ? parsed.matchedProductId : '',
        similarProductIds: Array.isArray(parsed.similarProductIds)
          ? parsed.similarProductIds.filter((id) => validIds.has(id)).slice(0, 4)
          : [],
        alternativeProductIds: Array.isArray(parsed.alternativeProductIds)
          ? parsed.alternativeProductIds.filter((id) => inStockIds.has(id)).slice(0, 4)
          : [],
        extractedSpecs: Array.isArray(parsed.extractedSpecs) ? parsed.extractedSpecs.slice(0, 8) : [],
      });
    } catch (err) {
      console.error('Gemini camera-search error:', err);
      return res.status(502).json({ error: 'Failed to analyze hardware image.' });
    }
  });

  const server = http.createServer(app);

  // Real-time WebSocket server for customer chat widget & admin support chat console
  const wss = new WebSocketServer({ server, path: '/ws/chat' });

  wss.on('connection', (ws) => {
    let clientInfo: ConnectedClient = { ws, role: 'customer' };
    clients.add(clientInfo);

    ws.on('message', (rawData) => {
      try {
        const data = JSON.parse(rawData.toString()) as {
          type: string;
          role?: 'customer' | 'agent';
          sessionId?: string;
          customerName?: string;
          customerPhone?: string;
          customerUid?: string;
          agentName?: string;
          text?: string;
          messageId?: string;
          status?: 'open' | 'pending_whatsapp' | 'resolved';
          isTyping?: boolean;
        };

        if (data.type === 'chat:join') {
          clientInfo.role = data.role === 'agent' ? 'agent' : 'customer';
          clientInfo.name = data.agentName || data.customerName || 'Guest';

          if (clientInfo.role === 'agent') {
            const allSessions = Array.from(chatSessions.values()).sort((a, b) =>
              b.lastMessageAt.localeCompare(a.lastMessageAt)
            );
            ws.send(
              JSON.stringify({
                type: 'chat:init',
                role: 'agent',
                sessions: allSessions,
                agentsOnline: getAgentPresenceCount(),
              })
            );
            broadcastPresence();
          } else if (data.sessionId) {
            clientInfo.sessionId = data.sessionId;
            let session = chatSessions.get(data.sessionId);
            if (!session) {
              const now = new Date().toISOString();
              session = {
                sessionId: data.sessionId,
                customerName: (data.customerName || 'عميل جديد').slice(0, 80),
                customerPhone: (data.customerPhone || '').slice(0, 30),
                customerUid: data.customerUid,
                channel: 'web',
                status: 'open',
                unreadCount: 0,
                lastMessage: '',
                lastMessageAt: now,
                createdAt: now,
                messages: [],
              };
              chatSessions.set(data.sessionId, session);
              saveChatSessions(chatSessions);
              broadcastToAgents({ type: 'chat:session_created', session });
            }
            ws.send(
              JSON.stringify({
                type: 'chat:init',
                role: 'customer',
                session,
                agentsOnline: getAgentPresenceCount(),
              })
            );
          }
          return;
        }

        if (data.type === 'chat:message' && data.sessionId && data.text?.trim()) {
          const sessionId = data.sessionId;
          const now = new Date().toISOString();
          let session = chatSessions.get(sessionId);
          if (!session) {
            session = {
              sessionId,
              customerName: (data.customerName || 'عميل').slice(0, 80),
              customerPhone: (data.customerPhone || '').slice(0, 30),
              customerUid: data.customerUid,
              channel: 'web',
              status: 'open',
              unreadCount: 0,
              lastMessage: '',
              lastMessageAt: now,
              createdAt: now,
              messages: [],
            };
            chatSessions.set(sessionId, session);
          }

          // Idempotency guard against duplicate messageIds on reconnect
          const msgId = data.messageId || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          if (session.messages.some((m) => m.id === msgId)) {
            return;
          }

          const senderType = clientInfo.role === 'agent' ? 'agent' : 'customer';
          const newMsg: ChatMessage = {
            id: msgId,
            sessionId,
            senderType,
            senderName:
              senderType === 'agent'
                ? (data.agentName || clientInfo.name || 'فريق الدعم - عاصمة الشبكات').slice(0, 80)
                : (data.customerName || session.customerName || 'عميل').slice(0, 80),
            text: data.text.trim().slice(0, 2000),
            channel: session.channel,
            createdAt: now,
            readByAgent: senderType === 'agent',
          };

          session.messages.push(newMsg);
          session.lastMessage = newMsg.text;
          session.lastMessageAt = now;
          if (senderType === 'customer') {
            session.unreadCount += 1;
            if (session.status === 'resolved') session.status = 'open';
          } else {
            session.unreadCount = 0;
            session.assignedAgent = newMsg.senderName;
          }

          saveChatSessions(chatSessions);
          broadcastToSession(sessionId, {
            type: 'chat:message',
            session,
            message: newMsg,
          });
          return;
        }

        if (data.type === 'chat:read' && data.sessionId && clientInfo.role === 'agent') {
          const session = chatSessions.get(data.sessionId);
          if (session) {
            session.unreadCount = 0;
            session.messages.forEach((m) => {
              m.readByAgent = true;
            });
            saveChatSessions(chatSessions);
            broadcastToAgents({ type: 'chat:session_updated', session });
          }
          return;
        }

        if (data.type === 'chat:status' && data.sessionId && data.status && clientInfo.role === 'agent') {
          const session = chatSessions.get(data.sessionId);
          if (session) {
            session.status = data.status;
            saveChatSessions(chatSessions);
            broadcastToSession(data.sessionId, { type: 'chat:session_updated', session });
          }
          return;
        }

        if (data.type === 'chat:typing' && data.sessionId) {
          broadcastToSession(data.sessionId, {
            type: 'chat:typing',
            sessionId: data.sessionId,
            senderType: clientInfo.role,
            isTyping: Boolean(data.isTyping),
          });
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      const wasAgent = clientInfo.role === 'agent';
      clients.delete(clientInfo);
      if (wasAgent) {
        broadcastPresence();
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ASEMA NETWORKS server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
