import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, MessageCircle, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { t } from '../../i18n/translations.ts';
import type { ChatMessage, ChatSession } from '../../types/index.ts';

export function AdminChatConsole() {
  const { lang, userProfile } = useApp();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [customerTyping, setCustomerTyping] = useState<Record<string, boolean>>({});
  const [whatsappStatus, setWhatsappStatus] = useState<{
    status: string;
    webhookPath: string;
    supportedTemplates: string[];
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/api/whatsapp/status')
      .then((r) => r.json())
      .then((d) => setWhatsappStatus(d))
      .catch(() => null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: number | null = null;

    const connect = () => {
      if (cancelled) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(
          JSON.stringify({
            type: 'chat:join',
            role: 'agent',
            agentName: userProfile?.displayName || 'Support Team',
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type: string;
            sessions?: ChatSession[];
            session?: ChatSession;
            message?: ChatMessage;
            sessionId?: string;
            senderType?: string;
            isTyping?: boolean;
          };

          if (data.type === 'chat:init' && data.sessions) {
            setSessions(data.sessions);
            if (!selectedId && data.sessions.length > 0) {
              setSelectedId(data.sessions[0].sessionId);
            }
          } else if (
            (data.type === 'chat:session_created' ||
              data.type === 'chat:session_updated' ||
              data.type === 'chat:message') &&
            data.session
          ) {
            const updated = data.session;
            setSessions((prev) => {
              const filtered = prev.filter((s) => s.sessionId !== updated.sessionId);
              return [updated, ...filtered].sort((a, b) =>
                b.lastMessageAt.localeCompare(a.lastMessageAt)
              );
            });
            if (data.sessionId || updated.sessionId) {
              setCustomerTyping((prev) => ({ ...prev, [updated.sessionId]: false }));
            }
          } else if (
            data.type === 'chat:typing' &&
            data.sessionId &&
            data.senderType === 'customer'
          ) {
            const sid = data.sessionId;
            setCustomerTyping((prev) => ({ ...prev, [sid]: Boolean(data.isTyping) }));
          }
        } catch (err) {
          console.error('Admin chat parse error:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!cancelled) {
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      };
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [userProfile?.displayName]);

  const activeSession = sessions.find((s) => s.sessionId === selectedId) || sessions[0] || null;

  useEffect(() => {
    if (activeSession && activeSession.unreadCount > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:read',
          sessionId: activeSession.sessionId,
        })
      );
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [activeSession?.sessionId, activeSession?.messages.length]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !replyText.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    wsRef.current.send(
      JSON.stringify({
        type: 'chat:message',
        sessionId: activeSession.sessionId,
        messageId: msgId,
        agentName: userProfile?.displayName || 'فريق الدعم - عاصمة الشبكات',
        text: replyText.trim(),
      })
    );
    wsRef.current.send(
      JSON.stringify({
        type: 'chat:typing',
        sessionId: activeSession.sessionId,
        isTyping: false,
      })
    );
    setReplyText('');
  };

  const handleStatusChange = (status: ChatSession['status']) => {
    if (!activeSession || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'chat:status',
        sessionId: activeSession.sessionId,
        status,
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0E0E10]">
            {t(lang, 'مركز الدردشة الفورية مع العملاء', 'Live Customer Support Chat')}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {connected
              ? t(lang, 'متصل الآن بقناة WebSocket المباشرة · جاهز للرد الفوري', 'Connected to real-time WebSocket stream')
              : t(lang, 'جاري الاتصال بخادم الدردشة...', 'Connecting to chat server...')}
          </p>
        </div>

        {whatsappStatus && (
          <div className="text-xs bg-[#FAF5E8] border border-[#C89D3C]/40 rounded-lg px-3 py-2 text-[#0E0E10]">
            <span className="font-semibold">WhatsApp Business API: </span>
            <span className="font-mono-num">
              {whatsappStatus.status === 'configured'
                ? t(lang, 'مربوط ومفعّل', 'Connected')
                : t(lang, 'جاهز للربط المستقبلي', 'Architecture Ready')}
            </span>
            <span className="mx-1.5">·</span>
            <span className="font-mono-num text-neutral-600">{whatsappStatus.webhookPath}</span>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#E5E5E0] rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
        {/* Sessions List */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-e border-[#E5E5E0] flex flex-col">
          <div className="p-3.5 border-b border-[#F0F0EC] text-xs font-bold text-neutral-700 flex justify-between">
            <span>{t(lang, 'المحادثات النشطة', 'Conversations')}</span>
            <span className="font-mono-num">{sessions.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#F0F0EC]">
            {sessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500">
                {t(
                  lang,
                  'لا توجد محادثات عملاء حالياً. عند إرسال أي عميل لرسالة من المتجر ستظهر هنا فوراً.',
                  'No active customer conversations yet. Customer messages appear here in real time.'
                )}
              </div>
            ) : (
              sessions.map((s) => {
                const isSelected = activeSession?.sessionId === s.sessionId;
                return (
                  <button
                    key={s.sessionId}
                    type="button"
                    onClick={() => setSelectedId(s.sessionId)}
                    className={`w-full text-start p-3.5 hover:bg-[#F8F8F7] transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#FAF5E8]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#0E0E10] truncate">
                        {s.customerName}
                      </span>
                      {s.unreadCount > 0 && (
                        <span className="text-[11px] font-bold font-mono-num text-[#9E7822]">
                          {s.unreadCount} {t(lang, 'جديد', 'new')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 font-mono-num mt-0.5">
                      {s.customerPhone || s.channel} · {s.status}
                    </div>
                    <p className="text-xs text-neutral-600 truncate mt-1">
                      {s.lastMessage || t(lang, 'محادثة جديدة', 'New conversation')}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Active Conversation Thread */}
        <div className="lg:col-span-8 flex flex-col">
          {!activeSession ? (
            <div className="flex-1 flex items-center justify-center p-8 text-sm text-neutral-500">
              {t(lang, 'اختر محادثة من القائمة للرد على العميل.', 'Select a conversation to reply.')}
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-[#E5E5E0] flex flex-wrap items-center justify-between gap-3 bg-[#F8F8F7]">
                <div>
                  <div className="text-sm font-bold text-[#0E0E10]">
                    {activeSession.customerName}
                  </div>
                  <div className="text-xs text-neutral-500 font-mono-num">
                    {activeSession.customerPhone || 'No phone'} · Channel: {activeSession.channel}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeSession.customerPhone && (
                    <a
                      href={`https://wa.me/${activeSession.customerPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{t(lang, 'تحويل لواتساب', 'WhatsApp')}</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(
                        activeSession.status === 'resolved' ? 'open' : 'resolved'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-[#E5E5E0] bg-white text-xs font-semibold hover:border-[#C89D3C] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C89D3C]" />
                    <span>
                      {activeSession.status === 'resolved'
                        ? t(lang, 'إعادة فتح', 'Reopen')
                        : t(lang, 'إغلاق المحادثة', 'Mark Resolved')}
                    </span>
                  </button>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#F8F8F7] max-h-[380px]"
              >
                {activeSession.messages.map((msg) => {
                  const isAgent = msg.senderType === 'agent';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                          isAgent
                            ? 'bg-[#0E0E10] text-white'
                            : 'bg-white border border-[#E5E5E0] text-[#0E0E10]'
                        }`}
                      >
                        <div className="text-[10px] opacity-65 mb-1 font-medium">
                          {msg.senderName} · {new Date(msg.createdAt).toLocaleTimeString()}
                        </div>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
                {customerTyping[activeSession.sessionId] && (
                  <div className="text-xs text-[#9E7822] font-medium">
                    {t(lang, 'العميل يكتب الآن...', 'Customer is typing...')}
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSendReply}
                className="p-3.5 border-t border-[#E5E5E0] bg-white flex items-center gap-2"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    wsRef.current?.send(
                      JSON.stringify({
                        type: 'chat:typing',
                        sessionId: activeSession.sessionId,
                        isTyping: e.target.value.length > 0,
                      })
                    );
                  }}
                  placeholder={t(lang, 'اكتب رد الدعم الفني هنا...', 'Write agent reply...')}
                  className="flex-1 px-3.5 py-2.5 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg focus:outline-none focus:border-[#C89D3C]"
                />
                <button
                  type="submit"
                  disabled={!connected || !replyText.trim()}
                  className="px-4 py-2.5 rounded-lg bg-[#0E0E10] text-white text-sm font-semibold hover:bg-[#C89D3C] hover:text-[#0E0E10] disabled:opacity-40 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{t(lang, 'إرسال', 'Send')}</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
