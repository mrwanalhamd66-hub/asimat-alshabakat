import React, { useState } from 'react';
import { CheckCircle2, Clock, PackageCheck, Search, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  RESERVATION_STATUS_LABELS,
  formatCurrency,
  t,
} from '../i18n/translations.ts';
import { lookupReservationTracking } from '../services/firestoreService.ts';
import type { ReservationStatus, ReservationTracking } from '../types/index.ts';
import { PaymentMethodsCard } from '../components/PaymentMethodsCard.tsx';

const STEP_FLOW: ReservationStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'completed',
];

export function TrackingPage() {
  const { lang } = useApp();
  const [refInput, setRefInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReservationTracking | null>(null);
  const [searched, setSearched] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const found = await lookupReservationTracking(refInput, phoneInput);
      setResult(found);
    } catch (err) {
      console.error('Tracking lookup error:', err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = result ? STEP_FLOW.indexOf(result.status) : -1;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0E0E10] dark:text-white font-display">
          {t(lang, 'تتبع حالة الحجز والطلب', 'Track Your Reservation')}
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          {t(
            lang,
            'أدخل رقم المرجع (مثل ASM-123456) ورقم الهاتف المسجل لمتابعة حالة تجهيز جهازك.',
            'Enter your booking reference (e.g. ASM-123456) and registered phone number.'
          )}
        </p>
      </div>

      <form
        onSubmit={handleLookup}
        className="royal-card p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
              {t(lang, 'رقم المرجع *', 'Booking Reference *')}
            </label>
            <input
              type="text"
              required
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              placeholder="ASM-123456"
              className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] text-[#0E0E10] dark:text-white border border-[#E5E3DA] dark:border-white/15 rounded-xl font-mono-num uppercase focus:outline-none focus:border-[#C89D3C]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
              {t(lang, 'رقم الهاتف *', 'Phone Number *')}
            </label>
            <input
              type="tel"
              required
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="770XXXXXX"
              className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] text-[#0E0E10] dark:text-white border border-[#E5E3DA] dark:border-white/15 rounded-xl font-mono-num focus:outline-none focus:border-[#C89D3C]"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-royal w-full"
        >
          <Search className="w-4 h-4" />
          <span>
            {loading
              ? t(lang, 'جاري البحث...', 'Checking Status...')
              : t(lang, 'استعلام عن الحجز', 'Check Reservation Status')}
          </span>
        </button>
      </form>

      {searched && !loading && !result && (
        <div className="royal-card p-8 text-center space-y-2">
          <p className="text-sm font-bold text-[#0E0E10] dark:text-white">
            {t(
              lang,
              'لم يتم العثور على حجز مطابق لهذه البيانات.',
              'No reservation matched this reference and phone number.'
            )}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t(
              lang,
              'تأكد من كتابة الرمز بصيغة ASM-XXXXXX وإدخال نفس رقم الهاتف المسجل.',
              'Verify your ASM-XXXXXX code and phone digits.'
            )}
          </p>
        </div>
      )}

      {result && (
        <div className="royal-card !border-[#C89D3C]/50 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F0F0EC] dark:border-white/10 pb-4">
            <div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                {t(lang, 'المرجع', 'Reference')}
              </span>
              <span className="text-xl font-bold font-mono-num text-[#9E7822] dark:text-[#D4AF37]">
                {result.referenceNumber}
              </span>
            </div>
            <div className="text-end">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                {t(lang, 'الحالة الحالية', 'Current Status')}
              </span>
              <span className="text-sm font-bold text-[#0E0E10] dark:text-white">
                {lang === 'ar'
                  ? RESERVATION_STATUS_LABELS[result.status].ar
                  : RESERVATION_STATUS_LABELS[result.status].en}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                {t(lang, 'المنتج', 'Product')}
              </span>
              <span className="font-bold text-[#0E0E10] dark:text-white">
                {lang === 'ar' ? result.productNameAr : result.productNameEn}
              </span>
            </div>
            <div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                {t(lang, 'الكمية / الإجمالي', 'Qty / Total')}
              </span>
              <span className="font-mono-num font-bold text-[#0E0E10] dark:text-[#D4AF37]">
                {result.quantity} × · {formatCurrency(result.totalPrice)}
              </span>
            </div>
            <div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                {t(lang, 'المحافظة', 'Governorate')}
              </span>
              <span className="font-semibold text-[#0E0E10] dark:text-white">{result.governorate || '-'}</span>
            </div>
          </div>

          {result.status === 'cancelled' ? (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-700/40 rounded-xl p-4 text-sm text-rose-800 dark:text-rose-200 font-medium">
              {t(lang, 'تم إلغاء هذا الحجز.', 'This reservation has been cancelled.')}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2">
              {STEP_FLOW.map((step, i) => {
                const done = i <= currentIdx;
                const Icon =
                  i === 0
                    ? Clock
                    : i <= 2
                    ? PackageCheck
                    : i === 4
                    ? Truck
                    : CheckCircle2;
                return (
                  <div
                    key={step}
                    className={`p-3 rounded-xl border text-center space-y-1.5 ${
                      done
                        ? 'bg-[#FAF5E8] dark:bg-[#C89D3C]/20 border-[#C89D3C] text-[#0E0E10] dark:text-white'
                        : 'bg-[#F8F8F7] dark:bg-[#0E0E10] border-[#E5E3DA] dark:border-white/10 text-neutral-400'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mx-auto ${done ? 'text-[#9E7822] dark:text-[#D4AF37]' : ''}`} />
                    <div className="text-[11px] font-bold">
                      {lang === 'ar'
                        ? RESERVATION_STATUS_LABELS[step].ar
                        : RESERVATION_STATUS_LABELS[step].en}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <PaymentMethodsCard />
    </div>
  );
}
