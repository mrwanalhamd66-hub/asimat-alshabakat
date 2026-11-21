import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, MessageSquare, Send, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { t } from '../i18n/translations.ts';
import type { ChatMessage, ChatSession } from '../types/index.ts';

function getOrCreateSessionId(): string {
  const key = 'asema_chat_session_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export function LiveChatWidget() {
  const { lang, userProfile, firebaseUser, storeSettings, route } = useApp();
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [agentsOnline, setAgentsOnline] = useState(0);
  const [agentTyping, setAgentTyping] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string>(getOrCreateSessionId());

  useEffect(() => {
    if (userProfile) {
      setCustomerName((prev) => prev || userProfile.displayName || '');
      setCustomerPhone((prev) => prev || userProfile.phone || '');
    }
  }, [userProfile]);

  useEffect(() => {
    if (!open || !started) return;

    let cancelled = false;
    let reconnectTimeout: number | null = null;

    const connectWs = () => {
      if (cancelled) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(
          JSON.stringify({
            type: 'chat:join',
            role: 'customer',
            sessionId: sessionIdRef.current,
            customerName: customerName || 'زائر',
            customerPhone: customerPhone || '',
            customerUid: firebaseUser?.uid || '',
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            type: string;
            session?: ChatSession;
            message?: ChatMessage;
            agentsOnline?: number;
            senderType?: string;
            isTyping?: boolean;
          };

          if (typeof payload.agentsOnline === 'number') {
            setAgentsOnline(payload.agentsOnline);
          }

          if (payload.type === 'chat:init' && payload.session) {
            setMessages(payload.session.messages || []);
          } else if (payload.type === 'chat:message' && payload.message) {
            const incomingMsg = payload.message;
            setMessages((prev) =>
              prev.some((m) => m.id === incomingMsg.id) ? prev : [...prev, incomingMsg]
            );
            setAgentTyping(false);
          } else if (payload.type === 'chat:typing' && payload.senderType === 'agent') {
            setAgentTyping(Boolean(payload.isTyping));
          } else if (payload.type === 'chat:presence' && typeof payload.agentsOnline === 'number') {
            setAgentsOnline(payload.agentsOnline);
          }
        } catch (err) {
          console.error('Chat parse error:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!cancelled) {
          reconnectTimeout = window.setTimeout(connectWs, 2500);
        }
      };
    };

    connectWs();

    return () => {
      cancelled = true;
      if (reconnectTimeout) window.clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, [open, started, customerName, customerPhone, firebaseUser?.uid]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, agentTyping]);

  // Hide floating customer widget when on /admin dashboard
  if (route.startsWith('/admin')) return null;

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;
    localStorage.setItem('asema_chat_name', customerName.trim());
    localStorage.setItem('asema_chat_phone', customerPhone.trim());
    setStarted(true);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    wsRef.current.send(
      JSON.stringify({
        type: 'chat:message',
        sessionId: sessionIdRef.current,
        messageId: msgId,
        customerName: customerName || 'عميل',
        customerPhone: customerPhone || '',
        text,
      })
    );
    wsRef.current.send(
      JSON.stringify({
        type: 'chat:typing',
        sessionId: sessionIdRef.current,
        isTyping: false,
      })
    );
    setInputText('');
  };

  const handleInputChange = (val: string) => {
    setInputText(val);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:typing',
          sessionId: sessionIdRef.current,
          isTyping: val.length > 0,
        })
      );
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = window.setTimeout(() => {
        wsRef.current?.send(
          JSON.stringify({
            type: 'chat:typing',
            sessionId: sessionIdRef.current,
            isTyping: false,
          })
        );
      }, 1800);
    }
  };

  const whatsappSummaryText = encodeURIComponent(
    `مرحباً عاصمة الشبكات، أرغب بمتابعة محادثة الدعم الفوري (${customerName || 'عميل'} - مرجع المحادثة: ${sessionIdRef.current})`
  );

  return (
    <div className={`fixed bottom-5 ${lang === 'ar' ? 'left-5' : 'right-5'} z-40`}>
      {open ? (
        <div className="w-[340px] sm:w-[380px] bg-white border border-[#E5E5E0] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[540px]">
          {/* Header */}
          <div className="bg-[#0E0E10] text-white px-4 py-3.5 flex items-center justify-between border-b border-[#C89D3C]/30">
            <div>
              <h3 className="text-sm font-bold text-white">
                {t(lang, 'الدعم المباشر · عاصمة الشبكات', 'Live Support · ASEMA NETWORKS')}
              </h3>
              <p className="text-[11px] text-neutral-300 mt-0.5">
                {agentsOnline > 0
                  ? t(lang, `فريق الدعم متواجد الآن (${agentsOnline})`, `Support agents online (${agentsOnline})`)
                  : connected
                  ? t(lang, 'متصل بقناة الدعم الفوري', 'Connected to support queue')
                  : t(lang, 'تواصل مباشر مع فريق المبيعات والدعم', 'Direct sales & engineering chat')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!started ? (
            <form onSubmit={handleStartChat} className="p-5 space-y-3.5 bg-[#F8F8F7]">
              <p className="text-xs text-neutral-600 leading-relaxed">
                {t(
                  lang,
                  'أدخل اسمك ورقم هاتفك لبدء محادثة فورية مع مهندسي الشبكات والمبيعات.',
                  'Enter your name and phone number to start a real-time chat with our team.'
                )}
              </p>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {t(lang, 'الاسم *', 'Name *')}
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t(lang, 'اسمك الكريم', 'Your name')}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E5E5E0] rounded-lg focus:outline-none focus:border-[#C89D3C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {t(lang, 'رقم الهاتف / واتساب', 'Phone / WhatsApp')}
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="770XXXXXX"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E5E5E0] rounded-lg font-mono-num focus:outline-none focus:border-[#C89D3C]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-[#0E0E10] text-white text-sm font-semibold hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors cursor-pointer"
              >
                {t(lang, 'بدء المحادثة المباشرة', 'Start Live Chat')}
              </button>
              <a
                href={`https://wa.me/${storeSettings.whatsappNumber || '967770581056'}?text=${whatsappSummaryText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-4 rounded-lg border border-[#E5E5E0] bg-white text-neutral-700 hover:border-[#C89D3C] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <span>{t(lang, 'أو تواصل مباشرة عبر واتساب', 'Or message us via WhatsApp')}</span>
              </a>
            </form>
          ) : (
            <>
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8F8F7] min-h-[260px]"
              >
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-xs text-neutral-500">
                    {t(
                      lang,
                      'مرحباً بك في عاصمة الشبكات! اكتب استفسارك عن الأجهزة أو الأسعار أو الحجوزات.',
                      'Welcome to ASEMA NETWORKS! Ask about routers, stock, or reservations.'
                    )}
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isCustomer = msg.senderType === 'customer';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            isCustomer
                              ? 'bg-[#0E0E10] text-white'
                              : 'bg-white border border-[#E5E5E0] text-[#0E0E10]'
                          }`}
                        >
                          <div className="text-[10px] opacity-65 mb-1 font-medium">
                            {msg.senderName}
                          </div>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                {agentTyping && (
                  <div className="text-[11px] text-[#9E7822] font-medium">
                    {t(lang, 'ممثل الدعم يكتب الآن...', 'Support agent is typing...')}
                  </div>
                )}
              </div>

              <div className="px-3 py-1.5 bg-white border-t border-[#F0F0EC] flex items-center justify-between text-[11px] text-neutral-500">
                <span>
                  {connected
                    ? t(lang, 'مباشر عبر WebSocket', 'Live WebSocket')
                    : t(lang, 'إعادة الاتصال...', 'Reconnecting...')}
                </span>
                <a
                  href={`https://wa.me/${storeSettings.whatsappNumber || '967770581056'}?text=${whatsappSummaryText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>{t(lang, 'تحويل لواتساب', 'WhatsApp Handoff')}</span>
                </a>
              </div>

              <form
                onSubmit={handleSend}
                className="p-3 bg-white border-t border-[#E5E5E0] flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={t(lang, 'اكتب رسالتك هنا...', 'Type your message...')}
                  className="flex-1 px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg focus:outline-none focus:border-[#C89D3C]"
                />
                <button
                  type="submit"
                  disabled={!connected || !inputText.trim()}
                  className="p-2.5 rounded-lg bg-[#0E0E10] text-white hover:bg-[#C89D3C] hover:text-[#0E0E10] disabled:opacity-40 transition-colors cursor-pointer"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-4 py-3 rounded-full bg-[#0E0E10] text-white border border-[#C89D3C]/60 shadow-xl hover:bg-[#1A1A20] transition-transform hover:-translate-y-0.5 flex items-center gap-2.5 cursor-pointer"
        >
          <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
          <span className="text-sm font-semibold whitespace-nowrap">
            {t(lang, 'الدعم المباشر', 'Live Chat')}
          </span>
        </button>
      )}
    </div>
  );
}
