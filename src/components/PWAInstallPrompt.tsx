import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { t } from '../i18n/translations.ts';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall.ts';

const PUBLIC_APP_URL =
  'https://ais-pre-gh6txokjbzx434i4bvoe6x-270842469232.europe-west2.run.app';

export function PWAInstallButton({
  variant = 'header',
}: {
  variant?: 'header' | 'hero' | 'footer';
}) {
  const { lang } = useApp();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isInstalled) return null;

  const isInIframe =
    typeof window !== 'undefined' && window.self !== window.top;

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) return;
    }
    setShowGuide(true);
  };

  const handleCopyUrl = () => {
    navigator.clipboard?.writeText(PUBLIC_APP_URL).catch(() => null);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const buttonClass =
    variant === 'hero'
      ? 'px-5 py-3 rounded-lg bg-white/10 hover:bg-[#C89D3C] text-white hover:text-[#0E0E10] border border-[#C89D3C]/60 text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer'
      : variant === 'footer'
      ? 'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#C89D3C] text-[#0E0E10] hover:bg-[#D4AF37] transition-colors text-xs font-bold cursor-pointer'
      : 'inline-flex items-center gap-1.5 text-[#D4AF37] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer font-semibold';

  return (
    <>
      <button type="button" onClick={handleClick} className={buttonClass}>
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>
          {variant === 'header'
            ? t(lang, 'تنزيل التطبيق', 'Download App')
            : t(lang, 'تنزيل التطبيق فوراً', 'Download App Now')}
        </span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#0E0E10] text-white border border-[#C89D3C]/45 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-start">
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="absolute top-3.5 end-3.5 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#C89D3C]/15 border border-[#C89D3C]/40 text-[#D4AF37] flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {t(
                    lang,
                    'تنزيل وتثبيت تطبيق عاصمة الشبكات',
                    'Download & Install ASEMA NETWORKS App'
                  )}
                </h3>
                <p className="text-xs text-[#D4AF37]">
                  {t(lang, 'يعمل كتطبيق مستقل على Android و iPhone', 'Runs as a standalone app on Android & iOS')}
                </p>
              </div>
            </div>

            {isInIframe && (
              <div className="bg-[#17171B] border border-[#C89D3C]/35 rounded-xl p-3.5 space-y-2.5 text-xs">
                <p className="text-neutral-300 leading-relaxed">
                  {t(
                    lang,
                    'أنت تتصفح داخل نافذة معاينة. افتح الرابط المباشر في متصفح Chrome أو Safari ليظهر زر التثبيت الفوري مباشرة:',
                    'You are inside an embedded preview. Open the direct link in Chrome or Safari for instant 1-tap installation:'
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={PUBLIC_APP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 rounded-lg bg-[#C89D3C] text-[#0E0E10] hover:bg-[#D4AF37] font-bold inline-flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t(lang, 'فتح الرابط للتنزيل الفوري', 'Open App Link')}</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t(lang, 'نُسخ', 'Copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t(lang, 'نسخ الرابط', 'Copy Link')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs text-neutral-300">
              {isIOS ? (
                <div className="bg-[#17171B] border border-white/10 rounded-xl p-3.5 space-y-1.5">
                  <div className="font-bold text-white">
                    {t(lang, 'التثبيت على الآيفون والآيباد (Safari):', 'Install on iPhone / iPad (Safari):')}
                  </div>
                  <p>1. {t(lang, 'اضغط على أيقونة المشاركة (Share) أسفل الشاشة.', 'Tap the Share icon in Safari.')}</p>
                  <p>2. {t(lang, 'اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).', 'Select "Add to Home Screen".')}</p>
                </div>
              ) : (
                <div className="bg-[#17171B] border border-white/10 rounded-xl p-3.5 space-y-1.5">
                  <div className="font-bold text-white">
                    {t(lang, 'التثبيت على أندرويد والكمبيوتر (Chrome / Edge):', 'Install on Android & Desktop (Chrome / Edge):')}
                  </div>
                  <p>
                    1.{' '}
                    {t(
                      lang,
                      'اضغط قائمة المتصفح (⋮) في الأعلى ثم اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".',
                      'Open browser menu (⋮) and tap "Install app" or "Add to Home screen".'
                    )}
                  </p>
                  <p>
                    2.{' '}
                    {t(
                      lang,
                      'أو اضغط أيقونة التثبيت الظاهرة في شريط العنوان أعلى المتصفح.',
                      'Or click the install icon in your browser address bar.'
                    )}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-lg border border-white/20 text-white hover:border-[#C89D3C] text-xs font-bold transition-colors cursor-pointer"
            >
              {t(lang, 'إغلاق', 'Close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const { lang } = useApp();
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 start-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
      <WifiOff className="w-3.5 h-3.5" />
      <span>
        {t(
          lang,
          'وضع عدم الاتصال — يتم عرض البيانات المحفوظة مؤقتاً.',
          'Offline Mode — Cached storefront data is shown.'
        )}
      </span>
    </div>
  );
}
