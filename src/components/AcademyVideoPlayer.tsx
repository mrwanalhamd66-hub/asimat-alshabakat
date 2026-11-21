import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Play,
  RefreshCw,
  ShieldCheck,
  VideoOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { t } from '../i18n/translations.ts';
import { parseYouTubeVideo } from '../utils/youtube.ts';

interface AcademyVideoPlayerProps {
  url?: string;
  title: string;
  posterUrl?: string;
  compact?: boolean;
}

type PlayerMode = 'preview' | 'playing' | 'unavailable';

export function AcademyVideoPlayer({
  url,
  title,
  posterUrl,
  compact = false,
}: AcademyVideoPlayerProps) {
  const { lang } = useApp();
  const [mode, setMode] = useState<PlayerMode>('preview');
  const [thumbStage, setThumbStage] = useState<'hq' | 'mq' | 'poster' | 'none'>('hq');
  const [unavailableReason, setUnavailableReason] = useState<{ ar: string; en: string } | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : undefined;

  const parsed = useMemo(
    () =>
      parseYouTubeVideo(url, {
        autoplay: mode === 'playing',
        origin,
      }),
    [url, mode, origin]
  );

  // Reset player state cleanly whenever the lesson video URL changes
  useEffect(() => {
    setMode('preview');
    setThumbStage('hq');
    setUnavailableReason(null);
    setReloadNonce(0);
  }, [url]);

  // Listen for YouTube IFrame API postMessage errors (e.g. embedding disabled 101/150 or deleted 100)
  useEffect(() => {
    if (mode !== 'playing' || parsed.kind !== 'youtube') return;

    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== 'https://www.youtube-nocookie.com' &&
        event.origin !== 'https://www.youtube.com'
      ) {
        return;
      }

      let payload: { event?: string; info?: unknown } | null = null;
      if (typeof event.data === 'string') {
        try {
          payload = JSON.parse(event.data) as { event?: string; info?: unknown };
        } catch {
          return;
        }
      } else if (event.data && typeof event.data === 'object') {
        payload = event.data as { event?: string; info?: unknown };
      }

      if (!payload) return;

      const errorCode =
        payload.event === 'onError' && typeof payload.info === 'number'
          ? payload.info
          : typeof payload.info === 'object' &&
              payload.info !== null &&
              'errorCode' in payload.info &&
              typeof (payload.info as { errorCode?: unknown }).errorCode === 'number'
            ? (payload.info as { errorCode: number }).errorCode
            : null;

      if (errorCode !== null) {
        if (errorCode === 101 || errorCode === 150) {
          setUnavailableReason({
            ar: 'صاحب الفيديو قيّد التشغيل المدمج خارج موقع YouTube. يمكنك المشاهدة مباشرة عبر الزر أدناه.',
            en: 'The video owner disabled embedded playback on external sites. Watch directly on YouTube below.',
          });
        } else if (errorCode === 100) {
          setUnavailableReason({
            ar: 'هذا الفيديو غير متاح حالياً (محذوف أو مضبوط كفيديو خاص).',
            en: 'This video is currently unavailable (deleted or set to private).',
          });
        } else {
          setUnavailableReason({
            ar: 'تعذر تشغيل الفيديو داخل الإطار المدمج. جرّب إعادة التحميل أو المشاهدة مباشرة على YouTube.',
            en: 'Unable to play this video in the embedded player. Retry or watch directly on YouTube.',
          });
        }
        setMode('unavailable');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mode, parsed.kind]);

  const handleIframeLoad = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      // Register listening handshake with YouTube nocookie iframe so onError events are emitted
      win.postMessage(JSON.stringify({ event: 'listening', id: parsed.videoId || 1 }), '*');
      win.postMessage(
        JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onError'] }),
        '*'
      );
    } catch {
      // Cross-origin postMessage failure is safe to ignore
    }
  };

  if (parsed.kind === 'empty') {
    return null;
  }

  // Invalid / malformed URL card (never leaves a blank space or broken iframe)
  if (!parsed.isValid || parsed.kind === 'invalid') {
    const safeExternalHref = /^https?:\/\//i.test(parsed.originalUrl) ? parsed.originalUrl : null;
    return (
      <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/25 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[#0E0E10] dark:text-white">
              {t(lang, 'رابط الفيديو غير قابل للتشغيل المدمج', 'Video Link Cannot Be Embedded')}
            </h4>
            <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {lang === 'ar'
                ? parsed.errorAr || 'رابط الفيديو غير صالح.'
                : parsed.errorEn || 'Invalid video URL.'}
            </p>
            <p className="text-[11px] text-neutral-500 font-mono-num truncate" dir="ltr">
              {parsed.originalUrl}
            </p>
          </div>
        </div>
        {safeExternalHref && (
          <div>
            <a
              href={safeExternalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold hover:opacity-90"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t(lang, 'فتح الرابط في نافذة جديدة', 'Open Link Externally')}</span>
            </a>
          </div>
        )}
      </div>
    );
  }

  // Direct MP4 / WebM video file
  if (parsed.kind === 'direct_video' && parsed.embedUrl) {
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-[#E5E5E0] dark:border-white/10">
        <video
          controls
          playsInline
          preload="metadata"
          poster={posterUrl}
          src={parsed.embedUrl}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  const activeThumbnailSrc =
    thumbStage === 'hq'
      ? parsed.thumbnailUrl
      : thumbStage === 'mq'
        ? parsed.fallbackThumbnailUrl
        : thumbStage === 'poster'
          ? posterUrl || null
          : null;

  const advanceThumbFallback = () => {
    setThumbStage((prev) => {
      if (prev === 'hq') return 'mq';
      if (prev === 'mq') return posterUrl ? 'poster' : 'none';
      return 'none';
    });
  };

  return (
    <div className="space-y-2">
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 shadow-sm">
        {mode === 'preview' && (
          <div className="absolute inset-0 w-full h-full">
            {activeThumbnailSrc ? (
              <img
                src={activeThumbnailSrc}
                alt={title}
                onError={advanceThumbFallback}
                className="w-full h-full object-cover opacity-90 transition-transform duration-500 hover:scale-[1.01]"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#0E0E10] via-[#1B1B21] to-[#262013]" />
            )}

            {/* Contrast overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/30" />

            {/* Top badge */}
            {!compact && (
              <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm border border-white/15 text-[11px] font-semibold text-white">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{t(lang, 'مشغل فيديو الأكاديمية الآمن', 'Secure Academy Video Player')}</span>
                </span>
                {parsed.videoId && (
                  <span
                    className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-black/65 border border-white/10 text-[10px] font-mono-num text-neutral-300"
                    dir="ltr"
                  >
                    YouTube · {parsed.videoId}
                  </span>
                )}
              </div>
            )}

            {/* Central Play trigger */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setUnavailableReason(null);
                  setMode('playing');
                }}
                aria-label={t(lang, `تشغيل درس: ${title}`, `Play lesson: ${title}`)}
                className="group inline-flex flex-col items-center gap-2.5 cursor-pointer focus:outline-none"
              >
                <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#C89D3C] text-[#0E0E10] shadow-2xl shadow-black/60 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 group-focus-visible:ring-4 group-focus-visible:ring-[#D4AF37]/50">
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-[#0E0E10] translate-x-0.5" />
                </span>
                <span className="px-3.5 py-1 rounded-lg bg-black/75 backdrop-blur-sm border border-white/15 text-xs sm:text-sm font-bold text-white">
                  {t(lang, 'تشغيل الفيديو داخل الأكاديمية', 'Play Lesson Video')}
                </span>
              </button>
            </div>

            {/* Bottom title */}
            {!compact && (
              <div className="hidden sm:flex absolute bottom-3 inset-x-4 items-end justify-between gap-3 pointer-events-none">
                <p className="text-xs font-semibold text-white/90 line-clamp-1">{title}</p>
              </div>
            )}
          </div>
        )}

        {mode === 'playing' && parsed.embedUrl && (
          <iframe
            key={`${parsed.videoId}_${reloadNonce}`}
            ref={iframeRef}
            src={parsed.embedUrl}
            title={title || 'ASEMA Academy Video'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            loading="eager"
            onLoad={handleIframeLoad}
            onError={() => {
              setUnavailableReason({
                ar: 'تعذر تحميل إطار الفيديو من YouTube.',
                en: 'Failed to load the YouTube player frame.',
              });
              setMode('unavailable');
            }}
          />
        )}

        {mode === 'unavailable' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-gradient-to-br from-[#0E0E10] via-[#17171B] to-[#1F1A11] text-white">
            <div className="w-12 h-12 rounded-full bg-[#C89D3C]/15 border border-[#C89D3C]/40 flex items-center justify-center mb-3">
              <VideoOff className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <h4 className="text-sm sm:text-base font-bold mb-1.5">
              {t(lang, 'الفيديو غير متاح للتشغيل المدمج', 'Embedded Playback Unavailable')}
            </h4>
            <p className="text-xs text-neutral-300 max-w-md leading-relaxed mb-4">
              {lang === 'ar'
                ? unavailableReason?.ar ||
                  'قد يكون الفيديو خاصاً أو محظوراً من التضمين الخارجي من قِبل ناشره. يمكنك مشاهدته مباشرة على YouTube.'
                : unavailableReason?.en ||
                  'This video may be private or restricted from external embedding by its owner. You can watch it directly on YouTube.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {parsed.watchUrl && (
                <a
                  href={parsed.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-[#C89D3C] text-[#0E0E10] text-xs font-bold hover:bg-[#D4AF37] inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t(lang, 'مشاهدة على YouTube', 'Watch on YouTube')}</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setUnavailableReason(null);
                  setReloadNonce((n) => n + 1);
                  setMode('playing');
                }}
                className="px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white text-xs font-semibold hover:bg-white/15 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t(lang, 'إعادة المحاولة', 'Retry')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Persistent utility bar below the 16:9 frame so Watch on YouTube is always one tap away */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 text-xs">
        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span>
            {mode === 'playing'
              ? t(lang, 'يعمل عبر مشغل YouTube الآمن (youtube-nocookie)', 'Playing via privacy-enhanced YouTube embed')
              : t(lang, 'جاهز للتشغيل المدمج بنسبة 16:9', 'Ready for responsive 16:9 playback')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode === 'playing' && (
            <button
              type="button"
              onClick={() => {
                setUnavailableReason({
                  ar: 'إذا ظهرت رسالة رفض الاتصال أو تعذر التحميل على شبكتك، يمكنك فتح الفيديو مباشرة على YouTube.',
                  en: 'If the video fails to load on your network or device, open it directly on YouTube.',
                });
                setMode('unavailable');
              }}
              className="px-2.5 py-1 rounded-md border border-[#E5E5E0] dark:border-white/15 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 hover:border-[#C89D3C] cursor-pointer"
            >
              {t(lang, 'تعذر التشغيل؟', 'Playback issue?')}
            </button>
          )}
          {parsed.watchUrl && (
            <a
              href={parsed.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0E0E10] dark:bg-white/10 text-white text-[11px] font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>{t(lang, 'مشاهدة على YouTube', 'Watch on YouTube')}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
