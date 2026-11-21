import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { submitBatchReservations } from '../services/firestoreService.ts';
import { YEMEN_GOVERNORATES, formatCurrency, t } from '../i18n/translations.ts';
import type { Product, Reservation } from '../types/index.ts';
import { ResilientImage } from './ResilientImage.tsx';

export const CartDrawer: React.FC = () => {
  const {
    lang,
    cart,
    cartOpen,
    setCartOpen,
    products,
    offers,
    updateCartQty,
    removeFromCart,
    clearCart,
    userProfile,
    firebaseUser,
    storeSettings,
    navigate,
  } = useApp();

  const [customerName, setCustomerName] = useState(userProfile?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [governorate, setGovernorate] = useState(userProfile?.governorate || YEMEN_GOVERNORATES[0].ar);
  const [address, setAddress] = useState(userProfile?.address || '');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pay_on_pickup_or_delivery');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedList, setSubmittedList] = useState<Reservation[] | null>(null);

  const enrichedItems = useMemo(() => {
    const out: { product: Product; quantity: number; unitPrice: number; sourceLabel?: string }[] = [];
    for (const c of cart) {
      const prod = products.find((p) => p.id === c.productId);
      if (!prod) continue;
      const activeOffer = offers.find(
        (o) =>
          o.productId === prod.id &&
          o.isActive &&
          Date.parse(o.endDate) > Date.now()
      );
      const unitPrice = activeOffer ? activeOffer.discountedPrice : prod.retailPrice;
      out.push({
        product: prod,
        quantity: c.quantity,
        unitPrice,
        sourceLabel: c.sourceLabel,
      });
    }
    return out;
  }, [cart, products, offers]);

  const subtotal = useMemo(
    () => enrichedItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0),
    [enrichedItems]
  );

  if (!cartOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (enrichedItems.length === 0) return;
    if (!customerName.trim() || phone.replace(/[^0-9]/g, '').length < 7 || !address.trim()) {
      setErrorMsg(
        t(
          lang,
          'يرجى إدخال الاسم ورقم الهاتف الصحيح والعنوان لإتمام حجز السلة.',
          'Please enter your name, valid phone number, and delivery address.'
        )
      );
      return;
    }

    setSubmitting(true);
    try {
      const created = await submitBatchReservations({
        customerUid: firebaseUser?.uid,
        customerName: customerName.trim(),
        phone: phone.trim(),
        governorate,
        address: address.trim(),
        notes: notes.trim(),
        items: enrichedItems.map((it) => ({
          product: it.product,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
        paymentMethod,
      });
      setSubmittedList(created);
      clearCart();
    } catch (err) {
      console.error(err);
      setErrorMsg(t(lang, 'تعذر إرسال طلب السلة حالياً. حاول مرة أخرى.', 'Failed to submit cart order.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/55 backdrop-blur-xs">
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl dark:bg-[#141417] dark:text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C89D3C]/15 text-[#9E7822] dark:text-[#D4AF37]">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0E0E10] dark:text-white">
                {t(lang, 'سلة التجهيز والطلبات', 'Project & Order Cart')}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t(lang, `${enrichedItems.length} منتجات في السلة`, `${enrichedItems.length} items in cart`)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSubmittedList(null);
              setCartOpen(false);
            }}
            className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {submittedList ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
              <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
                {t(lang, 'تم استلام طلب السلة بنجاح!', 'Project Cart Order Submitted!')}
              </h3>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                {t(
                  lang,
                  'يمكنك تتبع طلباتك أو طباعة الفاتورة فور تأكيدها من الإدارة.',
                  'Track your orders or download invoices once confirmed by our team.'
                )}
              </p>
              <div className="mt-4 space-y-2 text-start">
                {submittedList.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs shadow-xs dark:bg-neutral-900"
                  >
                    <span className="font-semibold truncate max-w-[210px]">
                      {lang === 'ar' ? res.productNameAr : res.productNameEn} (×{res.quantity})
                    </span>
                    <span className="font-mono font-bold text-[#9E7822] dark:text-[#D4AF37]">
                      {res.referenceNumber}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedList(null);
                    setCartOpen(false);
                    navigate('/account');
                  }}
                  className="rounded-lg bg-[#0E0E10] px-4 py-2 text-xs font-bold text-white dark:bg-[#C89D3C] dark:text-black"
                >
                  {t(lang, 'الانتقال إلى حسابي', 'Go to My Account')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedList(null);
                    setCartOpen(false);
                    navigate('/track');
                  }}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold dark:border-neutral-700"
                >
                  {t(lang, 'تتبع الطلب', 'Track Order')}
                </button>
              </div>
            </div>
          ) : enrichedItems.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <ShoppingCart className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600" />
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                {t(lang, 'سلة المنتجات فارغة حالياً', 'Your cart is currently empty')}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t(
                  lang,
                  'يمكنك إضافة أجهزة من المتجر أو استخدام مخطط الشبكات الذكي والباقات الجاهزة.',
                  'Add products from Catalog, Smart Network Planner, or Ready Packages.'
                )}
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    navigate('/planner');
                  }}
                  className="rounded-lg bg-[#C89D3C] px-4 py-2 text-xs font-bold text-[#0E0E10]"
                >
                  {t(lang, 'خطط مشروع شبكتك', 'Plan Your Network')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    navigate('/catalog');
                  }}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold dark:border-neutral-700"
                >
                  {t(lang, 'تصفح المتجر', 'Browse Catalog')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {enrichedItems.map((it) => (
                  <div
                    key={it.product.id}
                    className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-900/70"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white dark:bg-neutral-800">
                      <ResilientImage
                        src={it.product.images?.[0]}
                        alt={it.product.nameEn}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#0E0E10] dark:text-white">
                        {lang === 'ar' ? it.product.nameAr : it.product.nameEn}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-500">
                        <span className="font-mono font-semibold text-[#9E7822] dark:text-[#D4AF37]">
                          {formatCurrency(it.unitPrice, storeSettings.currencyCode)}
                        </span>
                        {it.sourceLabel && (
                          <span className="truncate rounded bg-neutral-200/80 px-1.5 py-0.5 text-[10px] dark:bg-neutral-800">
                            {it.sourceLabel}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800">
                          <button
                            type="button"
                            onClick={() => updateCartQty(it.product.id, it.quantity - 1)}
                            className="p-1 hover:text-[#C89D3C]"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-mono font-bold">{it.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(it.product.id, it.quantity + 1)}
                            className="p-1 hover:text-[#C89D3C]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(it.product.id)}
                          className="text-rose-500 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checkout Form */}
              <form id="cart-checkout-form" onSubmit={handleCheckout} className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                  {t(lang, 'بيانات تأكيد الحجز والتوصيل', 'Booking & Delivery Details')}
                </h3>
                {errorMsg && (
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    {errorMsg}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t(lang, 'الاسم الكامل *', 'Full Name *')}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#C89D3C] dark:border-neutral-700 dark:bg-neutral-900"
                  />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t(lang, 'رقم الهاتف / واتساب *', 'Phone / WhatsApp *')}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-mono outline-none focus:border-[#C89D3C] dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute top-2.5 start-2.5 h-3.5 w-3.5 text-neutral-400" />
                    <select
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-white ps-8 pe-3 py-2 text-xs outline-none focus:border-[#C89D3C] dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      {YEMEN_GOVERNORATES.map((g) => (
                        <option key={g.ar} value={g.ar}>
                          {lang === 'ar' ? g.ar : g.en}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <CreditCard className="pointer-events-none absolute top-2.5 start-2.5 h-3.5 w-3.5 text-neutral-400" />
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-white ps-8 pe-3 py-2 text-xs outline-none focus:border-[#C89D3C] dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      <option value="pay_on_pickup_or_delivery">
                        {t(lang, 'الدفع عند الاستلام', 'Cash on Delivery / Pickup')}
                      </option>
                      {storeSettings.paymentAccounts
                        ?.filter((a) => a.isActive)
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {lang === 'ar' ? acc.labelAr : acc.labelEn} ({acc.accountNumber})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t(lang, 'العنوان التفصيلي للاستلام أو الشحن *', 'Detailed Address *')}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#C89D3C] dark:border-neutral-700 dark:bg-neutral-900"
                />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t(lang, 'ملاحظات المشروع (اختياري)', 'Project notes (optional)')}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#C89D3C] dark:border-neutral-700 dark:bg-neutral-900"
                />
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        {enrichedItems.length > 0 && !submittedList && (
          <div className="border-t border-neutral-200 bg-neutral-50 p-4 space-y-3 dark:border-neutral-800 dark:bg-[#111114]">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                {t(lang, 'الإجمالي التقديري للسلة:', 'Estimated Cart Total:')}
              </span>
              <span className="font-mono text-lg font-extrabold text-[#9E7822] dark:text-[#D4AF37]">
                {formatCurrency(subtotal, storeSettings.currencyCode)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                form="cart-checkout-form"
                disabled={submitting}
                className="flex-1 rounded-xl bg-[#0E0E10] py-3 text-xs font-bold text-white transition hover:bg-[#1E1E24] disabled:opacity-50 dark:bg-[#C89D3C] dark:text-[#0E0E10]"
              >
                {submitting
                  ? t(lang, 'جاري تأكيد الحجوزات...', 'Submitting...')
                  : t(lang, 'إرسال طلبات السلة الآن', 'Submit Cart Orders')}
              </button>
              <button
                type="button"
                onClick={clearCart}
                className="rounded-xl border border-neutral-300 px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-200/50 dark:border-neutral-700 dark:text-neutral-300"
              >
                {t(lang, 'إفراغ', 'Clear')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
