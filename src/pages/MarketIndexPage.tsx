import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  PackageCheck,
  Sparkles,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { PRODUCT_STATUS_LABELS, formatCurrency, t } from '../i18n/translations.ts';
import { isOfferCurrentlyActive, subscribePriceHistory } from '../services/firestoreService.ts';
import type { PriceHistoryEntry, Product } from '../types/index.ts';
import { getSmartAlternatives, isProductInStock } from '../utils/networkIntelligence.ts';
import { ResilientImage } from '../components/ResilientImage.tsx';

export function MarketIndexPage() {
  const { lang, products, offers, setSelectedProduct, addToCart } = useApp();
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [altModalProduct, setAltModalProduct] = useState<Product | null>(null);

  useEffect(() => {
    return subscribePriceHistory(setPriceHistory);
  }, []);

  const published = useMemo(() => products.filter((p) => p.isPublished), [products]);

  const mostRequested = useMemo(
    () =>
      [...published]
        .sort(
          (a, b) =>
            (b.reservationCount || 0) * 5 + (b.viewCount || 0) - ((a.reservationCount || 0) * 5 + (a.viewCount || 0))
        )
        .slice(0, 6),
    [published]
  );

  const bestSellers = useMemo(
    () =>
      [...published]
        .sort((a, b) => Number(Boolean(b.isBestSeller)) - Number(Boolean(a.isBestSeller)) || (b.reservationCount || 0) - (a.reservationCount || 0))
        .slice(0, 4),
    [published]
  );

  const newArrivals = useMemo(
    () => published.filter((p) => p.isNewArrival).slice(0, 4),
    [published]
  );

  const activeOffers = useMemo(() => offers.filter(isOfferCurrentlyActive), [offers]);
  const inStockCount = published.filter(isProductInStock).length;
  const outOfStockList = published.filter((p) => !isProductInStock(p));

  const alternativesForModal = useMemo(
    () => (altModalProduct ? getSmartAlternatives(altModalProduct, published) : []),
    [altModalProduct, published]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="bg-[#0E0E10] text-white rounded-2xl p-6 sm:p-8 border border-[#C89D3C]/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#D4AF37] inline-flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" />
            <span>{t(lang, 'بيانات السوق والمخزون المباشرة · عاصمة الشبكات', 'Live Catalog & Inventory Intelligence')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">
            {t(lang, 'مؤشر السوق وتحركات الأسعار والتوفر', 'Networking Market Index & Availability')}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl">
            {t(
              lang,
              'مؤشر شفاف يستعرض بيانات الكتالوج الفعلية: الأجهزة الأكثر طلباً، وصل حديثاً، حالات المخزون، وتغيرات الأسعار المسجلة لحظياً.',
              'Transparent real-time telemetry directly from store inventory: top requested gear, new arrivals, stock availability, and actual price changes.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          {[
            { label: t(lang, 'أجهزة منشورة', 'Published'), val: published.length },
            { label: t(lang, 'متوفر بالتسليم', 'In Stock'), val: inStockCount },
            { label: t(lang, 'عروض نشطة', 'Live Offers'), val: activeOffers.length },
            { label: t(lang, 'تغيرات سعر مسجلة', 'Price Logs'), val: priceHistory.length },
          ].map((k) => (
            <div key={k.label} className="bg-[#17171B] border border-white/10 rounded-xl p-3 text-center">
              <div className="text-[11px] text-neutral-400">{k.label}</div>
              <div className="text-lg font-bold font-mono-num text-[#D4AF37] mt-0.5">{k.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Requested & Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#C89D3C]" />
            <span>{t(lang, 'الأجهزة الأكثر طلباً ومشاهدة', 'Most Requested & Viewed Hardware')}</span>
          </h2>

          <div className="divide-y divide-[#F0F0EC] dark:divide-white/10">
            {mostRequested.map((p, idx) => {
              const st = PRODUCT_STATUS_LABELS[p.status] || PRODUCT_STATUS_LABELS.available;
              return (
                <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-[#FAF5E8] dark:bg-[#0E0E10] text-[#9E7822] dark:text-[#D4AF37] font-mono-num font-bold text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="w-12 h-10 rounded-lg overflow-hidden bg-[#F3F3F1] shrink-0">
                      <ResilientImage src={p.images?.[0]} alt={p.nameEn} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(p)}
                        className="text-sm font-bold truncate block max-w-full hover:text-[#C89D3C] cursor-pointer text-start"
                      >
                        {lang === 'ar' ? p.nameAr : p.nameEn}
                      </button>
                      <div className="text-[11px] text-neutral-500 font-mono-num">
                        {p.viewCount || 0} {t(lang, 'معاينة', 'views')} · {p.reservationCount || 0}{' '}
                        {t(lang, 'حجز', 'orders')} · {lang === 'ar' ? st.ar : st.en}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono-num font-bold text-sm">{formatCurrency(p.retailPrice)}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(p)}
                      className="px-3 py-1.5 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold cursor-pointer"
                    >
                      {t(lang, 'معاينة', 'View')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Best Sellers & New Arrivals */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C89D3C]" />
              <span>{t(lang, 'الأكثر مبيعاً واعتماداً في المشاريع', 'Project Best Sellers')}</span>
            </h2>
            <div className="space-y-2.5">
              {bestSellers.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className="p-3 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 flex items-center justify-between gap-3 cursor-pointer hover:border-[#C89D3C]"
                >
                  <span className="text-xs font-bold truncate">{lang === 'ar' ? p.nameAr : p.nameEn}</span>
                  <span className="font-mono-num text-xs font-bold text-[#9E7822] dark:text-[#D4AF37] shrink-0">
                    {formatCurrency(p.retailPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#C89D3C]" />
              <span>{t(lang, 'وصل حديثاً', 'New Arrivals')}</span>
            </h2>
            {newArrivals.length === 0 ? (
              <p className="text-xs text-neutral-500">{t(lang, 'لا توجد إضافات جديدة موسومة حالياً.', 'No items marked as new arrivals right now.')}</p>
            ) : (
              <div className="space-y-2.5">
                {newArrivals.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className="p-3 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 flex items-center justify-between gap-3 cursor-pointer hover:border-[#C89D3C]"
                  >
                    <span className="text-xs font-bold truncate">{lang === 'ar' ? p.nameAr : p.nameEn}</span>
                    <span className="font-mono-num text-xs font-bold shrink-0">{formatCurrency(p.retailPrice)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Inventory Status & Real Price History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inventory Status Matrix */}
        <div className="lg:col-span-6 bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-[#C89D3C]" />
            <span>{t(lang, 'حالة توفر المخزون والبدائل الذكية', 'Inventory Status & Smart Alternatives')}</span>
          </h2>
          <div className="divide-y divide-[#F0F0EC] dark:divide-white/10">
            {published.map((p) => {
              const inStock = isProductInStock(p);
              const st = PRODUCT_STATUS_LABELS[p.status] || PRODUCT_STATUS_LABELS.available;
              return (
                <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{lang === 'ar' ? p.nameAr : p.nameEn}</div>
                    <div className="text-[11px] font-mono-num text-neutral-500">
                      {p.availableQuantity} {t(lang, 'قطعة', 'units')} · {lang === 'ar' ? st.ar : st.en}
                    </div>
                  </div>
                  {inStock ? (
                    <span className="text-emerald-600 font-bold shrink-0">
                      {t(lang, 'متوفر', 'In Stock')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAltModalProduct(p)}
                      className="px-3 py-1.5 rounded-lg bg-[#FAF5E8] border border-[#C89D3C]/50 text-[#9E7822] font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] shrink-0 cursor-pointer"
                    >
                      {t(lang, 'عرض البدائل الذكية', 'Smart Alternatives')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {outOfStockList.length === 0 && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              {t(lang, 'جميع المنتجات المدرجة حالياً متوفرة في المستودع.', 'All currently listed hardware is in stock.')}
            </p>
          )}
        </div>

        {/* Genuine Price History Log */}
        <div className="lg:col-span-6 bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold">
            {t(lang, 'سجل تغيرات الأسعار الفعلي', 'Verified Price Change History')}
          </h2>
          {priceHistory.length === 0 ? (
            <div className="py-8 px-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 text-xs text-neutral-500 text-center">
              {t(
                lang,
                'لا توجد تغيرات أسعار مسجلة بعد. يتم توثيق أي تعديل في سعر التجزئة تلقائياً هنا من لوحة الإدارة.',
                'No price changes recorded yet. Every retail price adjustment made in Admin Center is logged here automatically.'
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#F0F0EC] dark:divide-white/10">
              {priceHistory.map((entry) => {
                const isDrop = entry.newPrice < entry.oldPrice;
                return (
                  <div key={entry.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold truncate">
                        {lang === 'ar' ? entry.productNameAr : entry.productNameEn}
                      </div>
                      <div className="text-[11px] font-mono-num text-neutral-500">
                        {new Date(entry.changedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 font-mono-num shrink-0">
                      <span className="text-neutral-400 line-through">{formatCurrency(entry.oldPrice)}</span>
                      <span className="font-bold">{formatCurrency(entry.newPrice)}</span>
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold ${
                          isDrop ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {isDrop ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        {Math.abs(entry.changePercent)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Smart Alternatives Quick Modal */}
      {altModalProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#17171B] border border-[#C89D3C]/40 rounded-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">
                {t(lang, 'البدائل الذكية لـ:', 'Smart Alternatives for:')}{' '}
                <span className="text-[#9E7822] dark:text-[#D4AF37]">
                  {lang === 'ar' ? altModalProduct.nameAr : altModalProduct.nameEn}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setAltModalProduct(null)}
                className="text-xs font-bold text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
              >
                {t(lang, 'إغلاق', 'Close')}
              </button>
            </div>
            <div className="space-y-3">
              {alternativesForModal.map((alt) => (
                <div
                  key={alt.product.id}
                  className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-bold">
                      {lang === 'ar' ? alt.product.nameAr : alt.product.nameEn}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {lang === 'ar' ? alt.summaryAr : alt.summaryEn}
                    </div>
                    <div className="text-[11px] text-[#9E7822] dark:text-[#D4AF37]">
                      {(lang === 'ar' ? alt.keyAdvantagesAr : alt.keyAdvantagesEn).join(' · ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono-num font-bold text-sm">
                      {formatCurrency(alt.product.retailPrice)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(alt.product.id, 1, t(lang, 'بديل ذكي', 'Smart Alternative'));
                        setAltModalProduct(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#C89D3C] text-[#0E0E10] text-xs font-bold cursor-pointer"
                    >
                      {t(lang, 'أضف للسلة', 'Add to Cart')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
