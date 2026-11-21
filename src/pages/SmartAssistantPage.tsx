import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Camera,
  CheckCircle2,
  GitCompare,
  Send,
  ShoppingCart,
  Sparkles,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatCurrency, t } from '../i18n/translations.ts';
import type { Product } from '../types/index.ts';
import { ResilientImage } from '../components/ResilientImage.tsx';

type AssistantTab = 'assistant' | 'camera';
type AssistantMode = 'assistant' | 'compare' | 'troubleshoot';

interface AssistantReplyPayload {
  answer: string;
  recommendedProductIds?: string[];
  diagnosticSteps?: string[];
}

interface CameraSearchPayload {
  identified: boolean;
  deviceName?: string;
  brand?: string;
  modelNumber?: string;
  summary?: string;
  matchedProductId?: string | null;
  similarProductIds?: string[];
  alternativeProductIds?: string[];
}

export function SmartAssistantPage() {
  const { lang, route, products, setSelectedProduct, addToCart } = useApp();

  const initialTab = (): AssistantTab => {
    return new URLSearchParams(window.location.search).get('tab') === 'camera' ? 'camera' : 'assistant';
  };

  const [tab, setTab] = useState<AssistantTab>(initialTab);
  const [mode, setMode] = useState<AssistantMode>('assistant');
  const [prompt, setPrompt] = useState('');
  const [asking, setAsking] = useState(false);
  const [aiError, setAiError] = useState('');
  const [history, setHistory] = useState<
    { role: 'user' | 'assistant'; text: string; productIds?: string[]; steps?: string[] }[]
  >([]);

  // Camera Search State
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraResult, setCameraResult] = useState<CameraSearchPayload | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const q = route.includes('?') ? route.split('?')[1] : window.location.search;
    const p = new URLSearchParams(q).get('tab');
    if (p === 'camera' || p === 'assistant') setTab(p);
  }, [route]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startLiveCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 60);
    } catch {
      setCameraError(
        t(
          lang,
          'تعذر تشغيل الكاميرا المباشرة. يمكنك رفع صورة الجهاز أو استخدام كاميرا الهاتف مباشرة.',
          'Unable to open live webcam. You can capture or upload an image file below.'
        )
      );
    }
  };

  const captureFromWebcam = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPreviewDataUrl(dataUrl);
    stopCamera();
    void analyzeImage(dataUrl);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (dataUrl) {
        setPreviewDataUrl(dataUrl);
        void analyzeImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const catalogDigest = products
    .filter((p) => p.isPublished)
    .map((p) => ({
      id: p.id,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      brandName: p.brandName,
      modelNumber: p.modelNumber,
      retailPrice: p.retailPrice,
      availableQuantity: p.availableQuantity,
      status: p.status,
      specsAr: p.specsAr,
    }));

  const handleAskAssistant = async (e: React.FormEvent, quickPrompt?: string) => {
    e.preventDefault();
    const q = (quickPrompt || prompt).trim();
    if (!q || asking) return;
    setAiError('');
    setPrompt('');
    setHistory((prev) => [...prev, { role: 'user', text: q }]);
    setAsking(true);

    try {
      const resp = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: q,
          lang,
          mode,
          catalogProducts: catalogDigest,
        }),
      });
      const json = (await resp.json()) as AssistantReplyPayload & { error?: string };
      if (!resp.ok) {
        throw new Error(json.error || 'AI service unavailable');
      }
      setHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: json.answer,
          productIds: json.recommendedProductIds,
          steps: json.diagnosticSteps,
        },
      ]);
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes('GEMINI_API_KEY')
          ? t(
              lang,
              'خدمة المساعد الذكي تتطلب تفعيل مفتاح Gemini في إعدادات التشغيل (Secrets).',
              'Smart Assistant requires Gemini API key configuration in runtime secrets.'
            )
          : t(
              lang,
              'تعذر الاتصال بمساعد الشبكات الذكي حالياً. يرجى المحاولة بعد لحظات.',
              'Could not reach Smart Assistant right now. Please try again.'
            );
      setAiError(msg);
    } finally {
      setAsking(false);
    }
  };

  const analyzeImage = async (dataUrl: string) => {
    setScanning(true);
    setCameraError('');
    setCameraResult(null);
    try {
      const resp = await fetch('/api/ai/camera-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          lang,
          catalogProducts: catalogDigest,
        }),
      });
      const json = (await resp.json()) as CameraSearchPayload & { error?: string };
      if (!resp.ok) {
        throw new Error(json.error || 'Recognition failed');
      }
      setCameraResult(json);
    } catch (err) {
      setCameraError(
        err instanceof Error && err.message.includes('GEMINI_API_KEY')
          ? t(
              lang,
              'خدمة التعرف الذكي بالكاميرا تتطلب ضبط مفتاح Gemini في إعدادات التشغيل.',
              'Camera recognition requires Gemini API key configuration.'
            )
          : t(
              lang,
              'تعذر تحليل الصورة حالياً. تأكد من وضوح الجهاز أو رقم الموديل وحاول مجدداً.',
              'Unable to recognize device from photo. Try a clearer shot showing the device/model.'
            )
      );
    } finally {
      setScanning(false);
    }
  };

  const renderProductMiniCard = (p: Product) => (
    <div
      key={p.id}
      className="bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-3 flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white shrink-0 border border-[#E5E5E0] dark:border-white/10">
          <ResilientImage src={p.images?.[0]} alt={p.nameEn} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setSelectedProduct(p)}
            className="text-xs font-bold text-start hover:text-[#C89D3C] truncate block max-w-full cursor-pointer"
          >
            {lang === 'ar' ? p.nameAr : p.nameEn}
          </button>
          <div className="text-[11px] font-mono-num text-[#9E7822] dark:text-[#D4AF37]">
            {formatCurrency(p.retailPrice)} · {p.modelNumber || p.brandName}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => addToCart(p.id, 1, t(lang, 'المساعد الذكي', 'AI Assistant'))}
          className="p-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] hover:bg-[#C89D3C] hover:text-[#0E0E10] cursor-pointer"
          title={t(lang, 'أضف للسلة', 'Add to Cart')}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  const matchedProd = cameraResult?.matchedProductId
    ? products.find((p) => p.id === cameraResult.matchedProductId)
    : undefined;
  const similarProds = (cameraResult?.similarProductIds || [])
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
  const altProds = (cameraResult?.alternativeProductIds || [])
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="bg-[#0E0E10] text-white rounded-2xl p-6 sm:p-8 border border-[#C89D3C]/30 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#D4AF37] inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t(lang, 'ذكاء عاصمة الشبكات الهندسي', 'ASEMA Networking Intelligence')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">
            {t(lang, 'مساعد الشبكات الذكي والبحث بالكاميرا', 'Smart Network Assistant & Camera Search')}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl">
            {t(
              lang,
              'اسأل مهندس الشبكات الذكي عن الأجهزة والمقارنات وتشخيص الأعطال من مخزون المتجر الفعلي، أو صوّر أي راوتر أو سويتش للتعرف عليه ومطابقته فوراً.',
              'Ask our catalog-grounded engineering assistant for model comparisons & troubleshooting, or photograph any router/switch for instant hardware recognition.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 bg-[#17171B] p-1.5 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setTab('assistant')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-2 cursor-pointer ${
              tab === 'assistant'
                ? 'bg-[#C89D3C] text-[#0E0E10]'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>{t(lang, 'مساعد الشبكات الذكي', 'Smart Assistant')}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('camera')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-2 cursor-pointer ${
              tab === 'camera'
                ? 'bg-[#C89D3C] text-[#0E0E10]'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{t(lang, 'البحث الذكي بالكاميرا', 'Camera Search')}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SMART NETWORKING ASSISTANT */}
      {tab === 'assistant' && (
        <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-5">
          {/* Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E5E0] dark:border-white/10 pb-4">
            {[
              { id: 'assistant' as AssistantMode, ar: 'اقتراح واختيار الأجهزة', en: 'Device Selection', icon: Bot },
              { id: 'compare' as AssistantMode, ar: 'مقارنة الموديلات', en: 'Compare Models', icon: GitCompare },
              { id: 'troubleshoot' as AssistantMode, ar: 'تشخيص وحل الأعطال', en: 'Troubleshoot Faults', icon: Wrench },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer ${
                    mode === m.id
                      ? 'bg-[#0E0E10] text-[#D4AF37] border-[#C89D3C]'
                      : 'bg-[#F8F8F7] dark:bg-[#0E0E10] border-[#E5E5E0] dark:border-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? m.ar : m.en}</span>
                </button>
              );
            })}
          </div>

          {/* Starter Engineering Prompts */}
          {history.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  ar: 'أريد راوتر مايكروتك مناسب لشبكة فايبر تخدم 120 مشتركاً مع منفذ 10G SFP+.',
                  en: 'Recommend a MikroTik router with 10G SFP+ for a 120-user fiber network.',
                },
                {
                  ar: 'قارن بين راوتر MikroTik hAP ax3 وراوتر OpenWrt Flint 2 من حيث السرعة والـ VPN.',
                  en: 'Compare MikroTik hAP ax3 vs OpenWrt Flint 2 for VPN throughput and Wi-Fi 6.',
                },
                {
                  ar: 'لدي تقطيع في تغذية كاميرات المراقبة على سويتش PoE، ما السبب وطريقة الفحص؟',
                  en: 'My IP cameras reboot randomly on a PoE switch, how do I diagnose the cause?',
                },
              ].map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => void handleAskAssistant(e, lang === 'ar' ? sample.ar : sample.en)}
                  className="text-start p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C] text-xs leading-relaxed cursor-pointer transition-colors"
                >
                  {lang === 'ar' ? sample.ar : sample.en}
                </button>
              ))}
            </div>
          )}

          {/* Conversation */}
          {history.length > 0 && (
            <div className="space-y-4 max-h-[520px] overflow-y-auto pe-1">
              {history.map((msg, i) => {
                const recProducts = (msg.productIds || [])
                  .map((id) => products.find((p) => p.id === id))
                  .filter((p): p is Product => Boolean(p));

                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border text-sm leading-relaxed space-y-3 ${
                      msg.role === 'user'
                        ? 'bg-[#0E0E10] text-white border-[#C89D3C]/40 ms-6'
                        : 'bg-[#F8F8F7] dark:bg-[#0E0E10] border-[#E5E5E0] dark:border-white/10 me-6'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-[#9E7822] dark:text-[#D4AF37]">
                      {msg.role === 'user'
                        ? t(lang, 'استفسارك الهندسي', 'Your Question')
                        : t(lang, 'مهندس عاصمة الشبكات الذكي', 'ASEMA Smart Engineer')}
                    </div>
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {msg.steps && msg.steps.length > 0 && (
                      <div className="bg-white dark:bg-[#17171B] rounded-lg p-3 border border-[#E5E5E0] dark:border-white/10 space-y-1.5 text-xs">
                        <div className="font-bold text-[#0E0E10] dark:text-white">
                          {t(lang, 'خطوات الفحص والتنفيذ:', 'Engineering Checklist:')}
                        </div>
                        {msg.steps.map((st, sIdx) => (
                          <div key={sIdx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#C89D3C] shrink-0 mt-0.5" />
                            <span>{st}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {recProducts.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="text-xs font-bold text-neutral-500">
                          {t(lang, 'الأجهزة المتوفرة المطابقة في المتجر:', 'Matched Store Hardware:')}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {recProducts.map((p) => renderProductMiniCard(p))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {aiError && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/40 text-amber-800 dark:text-amber-300 text-xs">
              {aiError}
            </div>
          )}

          <form onSubmit={(e) => void handleAskAssistant(e)} className="flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t(
                lang,
                'اكتب سؤالك عن أجهزة مايكروتك، Wi-Fi 6، مقارنة الموديلات أو تشخيص عطل...',
                'Ask about MikroTik, Wi-Fi 6, model comparisons, or network faults...'
              )}
              className="flex-1 px-4 py-3 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-xl focus:outline-none focus:border-[#C89D3C]"
            />
            <button
              type="submit"
              disabled={asking || !prompt.trim()}
              className="px-5 py-3 rounded-xl bg-[#C89D3C] text-[#0E0E10] hover:bg-[#D4AF37] font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>{asking ? t(lang, 'جاري التحليل...', 'Analyzing...') : t(lang, 'إرسال', 'Ask')}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: SMART CAMERA SEARCH */}
      {tab === 'camera' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#C89D3C]" />
              <span>{t(lang, 'تصوير أو رفع صورة الجهاز', 'Capture or Upload Device Photo')}</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t(
                lang,
                'صوّر واجهة الراوتر أو السويتش أو ملصق الموديل ليتم التعرف عليه وعرض المواصفات والبدائل المتوفرة في المتجر.',
                'Snap a router, access point, switch, or model label to inspect specs and matched store inventory.'
              )}
            </p>

            <div className="flex flex-wrap gap-2">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={() => void startLiveCamera()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#0E0E10] text-white hover:bg-[#C89D3C] hover:text-[#0E0E10] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>{t(lang, 'تشغيل الكاميرا المباشرة', 'Open Live Camera')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="py-2.5 px-4 rounded-xl border border-rose-300 text-rose-600 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>{t(lang, 'إغلاق', 'Stop')}</span>
                </button>
              )}

              <label className="flex-1 py-2.5 px-4 rounded-xl border border-[#C89D3C] text-[#9E7822] dark:text-[#D4AF37] hover:bg-[#FAF5E8] dark:hover:bg-white/5 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{t(lang, 'اختر صورة / تصوير', 'Upload / Mobile Cam')}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFilePick}
                  className="hidden"
                />
              </label>
            </div>

            {cameraActive && (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden bg-black aspect-[4/3] border border-[#C89D3C]">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={captureFromWebcam}
                  className="w-full py-2.5 rounded-xl bg-[#C89D3C] text-[#0E0E10] font-bold text-xs cursor-pointer"
                >
                  {t(lang, 'التقاط الصورة والتحليل الآن', 'Capture & Recognize Hardware')}
                </button>
              </div>
            )}

            {previewDataUrl && !cameraActive && (
              <div className="rounded-xl overflow-hidden border border-[#E5E5E0] dark:border-white/10 aspect-[4/3] bg-[#0E0E10]">
                <img src={previewDataUrl} alt="Captured hardware" className="w-full h-full object-contain" />
              </div>
            )}

            {cameraError && (
              <p className="text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-700/40 rounded-lg p-3">
                {cameraError}
              </p>
            )}
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-bold">
              {t(lang, 'نتائج التعرف والمطابقة في المتجر', 'Hardware Recognition & Store Matching')}
            </h2>

            {scanning ? (
              <div className="py-12 text-center space-y-2 text-sm text-neutral-500">
                <Sparkles className="w-6 h-6 text-[#C89D3C] mx-auto animate-pulse" />
                <div>{t(lang, 'جاري تحليل صورة الجهاز ومطابقته مع المخزون...', 'Analyzing device image and matching store catalog...')}</div>
              </div>
            ) : !cameraResult ? (
              <div className="py-12 text-center text-xs text-neutral-500 dark:text-neutral-400">
                {t(
                  lang,
                  'التقط صورة لأي جهاز شبكات لعرض الموديل، السعر، المواصفات، والبدائل المتوفرة.',
                  'Capture or upload a device photo to view model recognition, specs, and available store alternatives.'
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-[#FAF5E8] dark:bg-[#0E0E10] border border-[#C89D3C]/40 space-y-1.5">
                  <div className="text-xs font-bold text-[#9E7822] dark:text-[#D4AF37]">
                    {cameraResult.identified
                      ? t(lang, 'تم التعرف على الجهاز', 'Device Recognized')
                      : t(lang, 'لم يتطابق الموديل بدقة', 'Approximate Hardware Scan')}
                  </div>
                  <div className="text-base font-bold">
                    {cameraResult.deviceName || t(lang, 'جهاز شبكات', 'Networking Device')}
                    {cameraResult.modelNumber && (
                      <span className="font-mono-num text-xs ms-2 text-neutral-500">
                        ({cameraResult.modelNumber})
                      </span>
                    )}
                  </div>
                  {cameraResult.brand && (
                    <div className="text-xs text-neutral-600 dark:text-neutral-300">
                      {t(lang, 'العلامة التجارية:', 'Brand:')} {cameraResult.brand}
                    </div>
                  )}
                  {cameraResult.summary && (
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 pt-1">{cameraResult.summary}</p>
                  )}
                </div>

                {matchedProd && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {t(lang, 'المنتج المطابق في متجر عاصمة الشبكات:', 'Exact Store Match:')}
                    </div>
                    {renderProductMiniCard(matchedProd)}
                  </div>
                )}

                {similarProds.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-neutral-500">
                      {t(lang, 'منتجات مشابهة:', 'Similar Products:')}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {similarProds.map((p) => renderProductMiniCard(p))}
                    </div>
                  </div>
                )}

                {altProds.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-[#9E7822] dark:text-[#D4AF37]">
                      {t(lang, 'بدائل متوفرة جاهزة للتسليم:', 'Available In-Stock Alternatives:')}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {altProds.map((p) => renderProductMiniCard(p))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
