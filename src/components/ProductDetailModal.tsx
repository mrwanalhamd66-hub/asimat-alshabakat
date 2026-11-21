import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  CreditCard,
  ExternalLink,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { DEFAULT_PAYMENT_ACCOUNTS } from '../data/seedData.ts';
import {
  PRODUCT_STATUS_LABELS,
  YEMEN_GOVERNORATES,
  formatCurrency,
  t,
} from '../i18n/translations.ts';
import {
  removeAlertSubscription,
  saveAlertSubscription,
  submitReservation,
} from '../services/firestoreService.ts';
import type { Reservation } from '../types/index.ts';
import { getCompatibleProducts, getSmartAlternatives, isProductInStock } from '../utils/networkIntelligence.ts';
import { ResilientImage } from './ResilientImage.tsx';

export function ProductDetailModal() {
  const {
    lang,
    products,
    selectedProduct,
    setSelectedProduct,
    firebaseUser,
    userProfile,
    signInWithGoogle,
    storeSettings,
    offers,
    navigate,
    isFavorite,
    isFavoriteBusy,
    toggleFavorite,
    addToCart,
    setCartOpen,
    alertSubscriptions,
  } = useApp();

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState(YEMEN_GOVERNORATES[0].ar);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('pay_on_pickup_or_delivery');
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);
  const [intelTab, setIntelTab] = useState<'compatibility' | 'alternatives'>('compatibility');

  useEffect(() => {
    if (selectedProduct) {
      setActiveImageIdx(0);
      setQuantity(1);
      setPaymentMethod('pay_on_pickup_or_delivery');
      setCopiedAcc(false);
      setErrorMsg('');
      setConfirmedReservation(null);
      setIntelTab(isProductInStock(selectedProduct) ? 'compatibility' : 'alternatives');
      if (userProfile) {
        setCustomerName(userProfile.displayName || '');
        setPhone(userProfile.phone || '');
        setGovernorate(userProfile.governorate || YEMEN_GOVERNORATES[0].ar);
        setAddress(userProfile.address || '');
      }
    }
  }, [selectedProduct, userProfile]);

  const compatibleList = useMemo(
    () => (selectedProduct ? getCompatibleProducts(selectedProduct, products) : []),
    [selectedProduct, products]
  );

  const alternativesList = useMemo(
    () => (selectedProduct ? getSmartAlternatives(selectedProduct, products) : []),
    [selectedProduct, products]
  );

  if (!selectedProduct) return null;

  const activeOffer = offers.find(
    (o) => o.productId === selectedProduct.id && o.isActive
  );
  const effectiveUnitPrice = activeOffer
    ? activeOffer.discountedPrice
    : selectedProduct.retailPrice;
  const totalAmount = Number((effectiveUnitPrice * quantity).toFixed(2));
  const statusInfo =
    PRODUCT_STATUS_LABELS[selectedProduct.status] || PRODUCT_STATUS_LABELS.available;
  const images = selectedProduct.images && selectedProduct.images.length > 0 ? selectedProduct.images : [''];
  const paymentAccounts = (
    storeSettings.paymentAccounts && storeSettings.paymentAccounts.length > 0
      ? storeSettings.paymentAccounts
      : DEFAULT_PAYMENT_ACCOUNTS
  ).filter((acc) => acc.isActive);
  const selectedAccount = paymentAccounts.find((acc) => acc.id === paymentMethod);
  const whatsappNum = (storeSettings.whatsappNumber || '967770581056').replace(/[^0-9]/g, '');
  const inStock = isProductInStock(selectedProduct);

  const stockSub = alertSubscriptions.find(
    (s) => s.productId === selectedProduct.id && s.alertType === 'back_in_stock'
  );
  const priceSub = alertSubscriptions.find(
    (s) => s.productId === selectedProduct.id && s.alertType === 'price_drop'
  );

  const toggleProductAlert = async (alertType: 'back_in_stock' | 'price_drop') => {
    if (!firebaseUser) {
      await signInWithGoogle();
      return;
    }
    const existing = alertType === 'back_in_stock' ? stockSub : priceSub;
    if (existing) {
      await removeAlertSubscription(existing.id);
    } else {
      await saveAlertSubscription({
        id: `al_${firebaseUser.uid}_${selectedProduct.id}_${alertType}`,
        uid: firebaseUser.uid,
        alertType,
        productId: selectedProduct.id,
        productNameAr: selectedProduct.nameAr,
        targetPrice: selectedProduct.retailPrice,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -y * 10, ry: x * 12 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!customerName.trim() || cleanPhone.length < 7 || !address.trim()) {
      setErrorMsg(
        t(
          lang,
          'يرجى إدخال الاسم ورقم الهاتف الصحيح وعنوان التوصيل.',
          'Please enter your name, valid phone number, and delivery address.'
        )
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitReservation({
        customerUid: firebaseUser?.uid || '',
        customerName,
        phone: cleanPhone,
        governorate,
        address,
        notes,
        product: selectedProduct,
        unitPrice: effectiveUnitPrice,
        quantity,
        paymentMethod,
      });
      setConfirmedReservation(res);
    } catch (err) {
      console.error('Booking failed:', err);
      setErrorMsg(
        t(
          lang,
          'تعذر إرسال الحجز حالياً. يرجى المحاولة مرة أخرى أو التواصل عبر الهاتف.',
          'Could not submit booking. Please try again or contact support.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#17171B] dark:text-neutral-100 border border-[#E5E5E0] dark:border-white/15 rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative">
        <button
          type="button"
          onClick={() => setSelectedProduct(null)}
          className="sticky top-4 float-end m-4 z-10 w-10 h-10 rounded-full bg-[#0E0E10] text-white hover:bg-[#C89D3C] hover:text-[#0E0E10] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Interactive 3D Hardware Showcase & Technical Specs */}
            <div className="lg:col-span-6 space-y-5">
              <div
                className="product-3d-stage bg-[#F3F3F1] dark:bg-[#0E0E10] rounded-xl border border-[#E5E5E0] dark:border-white/10 overflow-hidden"
                onPointerMove={handlePointerMove}
                onPointerLeave={() => setTilt({ rx: 0, ry: 0 })}
              >
                <div
                  className="product-3d-card aspect-[4/3] w-full"
                  style={{
                    transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                  }}
                >
                  <ResilientImage
                    src={images[activeImageIdx]}
                    alt={lang === 'ar' ? selectedProduct.nameAr : selectedProduct.nameEn}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`w-20 h-16 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition-colors ${
                        idx === activeImageIdx
                          ? 'border-[#C89D3C]'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <ResilientImage src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <div className="flex items-center flex-wrap gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-semibold text-[#9E7822] dark:text-[#D4AF37]">
                    {selectedProduct.brandName}
                  </span>
                  {selectedProduct.modelNumber && (
                    <>
                      <span>·</span>
                      <span className="font-mono-num">{selectedProduct.modelNumber}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{lang === 'ar' ? selectedProduct.categoryNameAr : selectedProduct.categoryNameEn}</span>
                  <span>·</span>
                  <span className="font-semibold text-[#0E0E10] dark:text-white">
                    {lang === 'ar' ? statusInfo.ar : statusInfo.en} ({selectedProduct.availableQuantity})
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-[#0E0E10] dark:text-white text-balance">
                  {lang === 'ar' ? selectedProduct.nameAr : selectedProduct.nameEn}
                </h2>

                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {lang === 'ar' ? selectedProduct.descriptionAr : selectedProduct.descriptionEn}
                </p>

                {(selectedProduct.specsAr || selectedProduct.specsEn) && (
                  <div className="bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-4 space-y-2">
                    <h3 className="text-xs font-bold text-[#0E0E10] dark:text-[#D4AF37]">
                      {t(lang, 'المواصفات التقنية', 'Technical Specifications')}
                    </h3>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-mono-num">
                      {lang === 'ar' ? selectedProduct.specsAr : selectedProduct.specsEn}
                    </p>
                  </div>
                )}

                <div className="flex items-center flex-wrap gap-2.5 pt-1 text-xs text-neutral-600 dark:text-neutral-300">
                  <button
                    type="button"
                    disabled={isFavoriteBusy(selectedProduct.id)}
                    onClick={() => void toggleFavorite(selectedProduct)}
                    aria-pressed={isFavorite(selectedProduct.id)}
                    className={`px-3 py-2 rounded-lg border font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 ${
                      isFavorite(selectedProduct.id)
                        ? 'bg-[#0E0E10] text-[#D4AF37] border-[#C89D3C]'
                        : 'bg-[#F8F8F7] dark:bg-[#0E0E10] text-[#0E0E10] dark:text-white border-[#E5E5E0] dark:border-white/15 hover:border-[#C89D3C]'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isFavorite(selectedProduct.id) ? 'fill-[#D4AF37]' : ''
                      }`}
                    />
                    <span>
                      {isFavorite(selectedProduct.id)
                        ? t(lang, 'في المفضلة', 'Saved')
                        : t(lang, 'المفضلة', 'Wishlist')}
                    </span>
                  </button>

                  {!inStock && (
                    <button
                      type="button"
                      onClick={() => void toggleProductAlert('back_in_stock')}
                      className={`px-3 py-2 rounded-lg border font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                        stockSub
                          ? 'bg-[#0E0E10] text-[#D4AF37] border-[#C89D3C]'
                          : 'bg-[#FAF5E8] text-[#9E7822] border-[#C89D3C]/40'
                      }`}
                    >
                      {stockSub ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                      <span>
                        {stockSub
                          ? t(lang, 'إلغاء تنبيه التوفر', 'Alert Active')
                          : t(lang, 'نبهني عند التوفر', 'Notify Back in Stock')}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void toggleProductAlert('price_drop')}
                    className={`px-3 py-2 rounded-lg border font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                      priceSub
                        ? 'bg-[#0E0E10] text-[#D4AF37] border-[#C89D3C]'
                        : 'bg-[#F8F8F7] dark:bg-[#0E0E10] border-[#E5E5E0] dark:border-white/15 hover:border-[#C89D3C]'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>
                      {priceSub
                        ? t(lang, 'تنبيه السعر مفعّل', 'Price Alert On')
                        : t(lang, 'تنبيه انخفاض السعر', 'Price Drop Alert')}
                    </span>
                  </button>

                  {(selectedProduct.warrantyAr || selectedProduct.warrantyEn) && (
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#C89D3C]" />
                      {lang === 'ar' ? selectedProduct.warrantyAr : selectedProduct.warrantyEn}
                    </span>
                  )}
                  {selectedProduct.documentationUrl && (
                    <a
                      href={selectedProduct.documentationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#9E7822] dark:text-[#D4AF37] hover:underline font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t(lang, 'الوثائق الفنية (Datasheet)', 'Technical Datasheet')}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Contiguous Purchase & Product Reservation Module */}
            <div className="lg:col-span-6">
              {confirmedReservation ? (
                <div className="bg-[#0E0E10] text-white rounded-xl p-6 sm:p-8 space-y-5 border border-[#C89D3C]/40">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-[#D4AF37] shrink-0" />
                    <div>
                      <h3 className="text-lg font-bold">
                        {t(lang, 'تم تسجيل حجزك بنجاح', 'Reservation Submitted Successfully')}
                      </h3>
                      <p className="text-xs text-neutral-400">
                        {t(lang, 'احتفظ برقم المرجع لمتابعة حالة الطلب', 'Keep your reference number to track your booking')}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">{t(lang, 'رقم المرجع:', 'Reference:')}</span>
                      <span className="font-mono-num font-bold text-[#D4AF37]">
                        {confirmedReservation.referenceNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">{t(lang, 'الكمية:', 'Quantity:')}</span>
                      <span className="font-mono-num">{confirmedReservation.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">{t(lang, 'الإجمالي التقديري:', 'Estimated Total:')}</span>
                      <span className="font-mono-num font-bold">
                        {formatCurrency(confirmedReservation.totalPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">{t(lang, 'المحافظة:', 'Governorate:')}</span>
                      <span>{confirmedReservation.governorate}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-neutral-400">{t(lang, 'طريقة الدفع:', 'Payment Method:')}</span>
                      <span className="font-semibold text-[#D4AF37] text-end">
                        {selectedAccount
                          ? `${lang === 'ar' ? selectedAccount.labelAr : selectedAccount.labelEn} (${selectedAccount.accountNumber})`
                          : t(lang, 'الدفع عند الاستلام / التوصيل', 'Pay on Pickup / Delivery')}
                      </span>
                    </div>
                  </div>

                  {selectedAccount && (
                    <div className="bg-[#17171B] border border-[#C89D3C]/35 rounded-xl p-4 space-y-1.5 text-xs">
                      <div className="text-[#D4AF37] font-bold">
                        {t(lang, 'بيانات الحساب للتحويل:', 'Transfer Account Details:')}
                      </div>
                      <div className="text-neutral-300">
                        {t(lang, 'الاسم:', 'Holder:')}{' '}
                        <span className="text-white font-semibold">
                          {lang === 'ar' ? selectedAccount.holderAr : selectedAccount.holderEn}
                        </span>
                      </div>
                      <div className="text-neutral-300 flex items-center justify-between gap-2">
                        <span>
                          {t(lang, 'رقم الحساب:', 'Account #')}{' '}
                          <span className="text-white font-bold font-mono-num" dir="ltr">
                            {selectedAccount.accountNumber}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(selectedAccount.accountNumber).catch(() => null);
                            setCopiedAcc(true);
                            window.setTimeout(() => setCopiedAcc(false), 1800);
                          }}
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedAcc ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedAcc ? t(lang, 'نُسخ', 'Copied') : t(lang, 'نسخ', 'Copy')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        navigate('/track');
                      }}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-[#C89D3C] text-[#0E0E10] font-semibold text-sm hover:bg-[#D4AF37] transition-colors cursor-pointer"
                    >
                      {t(lang, 'تتبع حالة الحجز', 'Track Reservation')}
                    </button>
                    <a
                      href={`https://wa.me/${whatsappNum}?text=${encodeURIComponent(
                        `مرحباً عاصمة الشبكات، تم تسجيل حجز رقم ${confirmedReservation.referenceNumber}\n• المنتج: ${selectedProduct.nameAr}\n• الكمية: ${confirmedReservation.quantity}\n• الإجمالي: ${formatCurrency(confirmedReservation.totalPrice)}\n• طريقة الدفع: ${
                          selectedAccount
                            ? `${selectedAccount.labelAr} (${selectedAccount.accountNumber}) - ${selectedAccount.holderAr}`
                            : 'الدفع عند الاستلام أو التوصيل'
                        }`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-lg border border-[#C89D3C]/50 text-[#D4AF37] hover:bg-[#C89D3C]/10 text-sm font-semibold inline-flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{t(lang, 'تأكيد وإرسال الإيصال عبر واتساب', 'Confirm & Pay via WhatsApp')}</span>
                    </a>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-5 sm:p-6 space-y-4"
                >
                  <div className="flex items-baseline justify-between border-b border-[#E5E5E0] dark:border-white/10 pb-4">
                    <div>
                      <span className="text-xs text-neutral-500 block">
                        {t(lang, 'سعر الحجز للوحدة', 'Unit Reservation Price')}
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-2xl font-bold text-[#0E0E10] dark:text-white font-mono-num">
                          {formatCurrency(effectiveUnitPrice)}
                        </span>
                        {effectiveUnitPrice < selectedProduct.retailPrice && (
                          <span className="text-sm text-neutral-400 line-through font-mono-num">
                            {formatCurrency(selectedProduct.retailPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="text-xs text-neutral-500 block">
                        {t(lang, 'الإجمالي', 'Subtotal')}
                      </span>
                      <span className="text-lg font-bold text-[#9E7822] dark:text-[#D4AF37] font-mono-num">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-[#0E0E10] dark:text-white">
                      {t(lang, 'الكمية المطلوبة', 'Required Quantity')}
                    </label>
                    <div className="inline-flex items-center border border-[#E5E5E0] dark:border-white/15 bg-white dark:bg-[#17171B] rounded-lg">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="p-2.5 hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-4 font-mono-num font-bold text-sm">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(500, q + 1))}
                        className="p-2.5 hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                        {t(lang, 'الاسم الكامل *', 'Full Name *')}
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={t(lang, 'مثال: محمد الحمادي', 'e.g. Mohammed Ali')}
                        className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/15 rounded-lg focus:outline-none focus:border-[#C89D3C]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                        {t(lang, 'رقم الهاتف *', 'Phone Number *')}
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="770XXXXXX"
                        className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/15 rounded-lg font-mono-num focus:outline-none focus:border-[#C89D3C]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      {t(lang, 'المحافظة *', 'Governorate *')}
                    </label>
                    <select
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/15 rounded-lg focus:outline-none focus:border-[#C89D3C]"
                    >
                      {YEMEN_GOVERNORATES.map((g) => (
                        <option key={g.ar} value={lang === 'ar' ? g.ar : g.en}>
                          {lang === 'ar' ? g.ar : g.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      {t(lang, 'عنوان التوصيل أو الاستلام *', 'Delivery Address *')}
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t(
                        lang,
                        'الشارع، الحي، أو الاستلام من فرع مول نور اليمن',
                        'Street, district, or pickup at Noor Al Yemen Mall'
                      )}
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/15 rounded-lg focus:outline-none focus:border-[#C89D3C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      {t(lang, 'ملاحظات إضافية (اختياري)', 'Additional Notes (Optional)')}
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t(
                        lang,
                        'مثال: مطلوب برمجة أولية أو توصيل مسائي',
                        'e.g. Initial RouterOS setup requested'
                      )}
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/15 rounded-lg focus:outline-none focus:border-[#C89D3C]"
                    />
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      {t(lang, 'طريقة الدفع والحسابات المعتمدة', 'Payment Method & Accounts')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('pay_on_pickup_or_delivery')}
                        className={`text-start px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                          paymentMethod === 'pay_on_pickup_or_delivery'
                            ? 'bg-[#0E0E10] text-white border-[#C89D3C]'
                            : 'bg-white dark:bg-[#17171B] text-neutral-700 dark:text-neutral-200 border-[#E5E5E0] dark:border-white/15 hover:border-[#C89D3C]'
                        }`}
                      >
                        {t(lang, 'الدفع عند الاستلام / التوصيل', 'Pay on Pickup / Delivery')}
                      </button>
                      {paymentAccounts.map((acc) => {
                        const active = paymentMethod === acc.id;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setPaymentMethod(acc.id)}
                            className={`text-start px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#0E0E10] text-white border-[#C89D3C]'
                                : 'bg-white dark:bg-[#17171B] text-neutral-800 dark:text-neutral-200 border-[#E5E5E0] dark:border-white/15 hover:border-[#C89D3C]'
                            }`}
                          >
                            <div className="font-semibold flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-[#C89D3C] shrink-0" />
                              <span className="truncate">
                                {lang === 'ar' ? acc.labelAr : acc.labelEn}
                              </span>
                            </div>
                            <div
                              className={`font-mono-num text-[11px] mt-0.5 ${
                                active ? 'text-[#D4AF37]' : 'text-neutral-500'
                              }`}
                              dir="ltr"
                            >
                              {acc.accountNumber}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedAccount && (
                      <div className="bg-[#0E0E10] text-white border border-[#C89D3C]/40 rounded-xl p-3.5 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#D4AF37]">
                            {lang === 'ar' ? selectedAccount.labelAr : selectedAccount.labelEn}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(selectedAccount.accountNumber).catch(() => null);
                              setCopiedAcc(true);
                              window.setTimeout(() => setCopiedAcc(false), 1800);
                            }}
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            {copiedAcc ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedAcc ? t(lang, 'تم النسخ', 'Copied') : t(lang, 'نسخ الرقم', 'Copy')}</span>
                          </button>
                        </div>
                        <div className="text-neutral-300">
                          {t(lang, 'الاسم:', 'Name:')}{' '}
                          <span className="text-white font-semibold">
                            {lang === 'ar' ? selectedAccount.holderAr : selectedAccount.holderEn}
                          </span>
                        </div>
                        <div className="text-neutral-300">
                          {t(lang, 'رقم الحساب / المحفظة:', 'Account / Wallet #')}{' '}
                          <span className="font-mono-num font-bold text-[#D4AF37]" dir="ltr">
                            {selectedAccount.accountNumber}
                          </span>
                        </div>
                        <a
                          href={`https://wa.me/${whatsappNum}?text=${encodeURIComponent(
                            `مرحباً عاصمة الشبكات، أرغب بالدفع وشراء المنتج:\n• المنتج: ${selectedProduct.nameAr}\n• الكمية: ${quantity}\n• الإجمالي: ${formatCurrency(totalAmount)}\n• الحساب المختار: ${selectedAccount.labelAr} (${selectedAccount.accountNumber})\n• الاسم: ${selectedAccount.holderAr}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 rounded-lg bg-[#C89D3C] text-[#0E0E10] hover:bg-[#D4AF37] font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>
                            {t(
                              lang,
                              'تحويل وتأكيد فوري عبر واتساب (967770581056)',
                              'Pay & Confirm Instantly on WhatsApp (967770581056)'
                            )}
                          </span>
                        </a>
                      </div>
                    )}
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                      {errorMsg}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      disabled={!inStock}
                      onClick={() => {
                        addToCart(selectedProduct.id, quantity);
                        setSelectedProduct(null);
                        setCartOpen(true);
                      }}
                      className="sm:w-1/3 py-3 px-4 rounded-lg border border-[#C89D3C] text-[#9E7822] dark:text-[#D4AF37] hover:bg-[#FAF5E8] dark:hover:bg-white/5 font-bold text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>{t(lang, 'أضف للسلة', 'Add to Cart')}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={submitting || !inStock}
                      className="flex-1 py-3 px-6 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] font-semibold text-sm hover:bg-[#C89D3C] hover:text-[#0E0E10] disabled:bg-neutral-300 disabled:text-neutral-500 transition-colors cursor-pointer"
                    >
                      {submitting
                        ? t(lang, 'جاري تسجيل الحجز...', 'Submitting Reservation...')
                        : t(lang, 'تأكيد حجز المنتج', 'Submit Product Reservation')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* SMART COMPATIBILITY ENGINEER & SMART ALTERNATIVES CENTER          */}
          {/* ================================================================= */}
          <div className="border-t border-[#E5E5E0] dark:border-white/10 pt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIntelTab('compatibility')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer ${
                    intelTab === 'compatibility'
                      ? 'bg-[#0E0E10] text-[#D4AF37] border-[#C89D3C]'
                      : 'bg-[#F8F8F7] dark:bg-[#0E0E10] border-[#E5E5E0] dark:border-white/15'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{t(lang, 'مهندس التوافق الذكي (الملحقات المتوافقة)', 'Smart Compatibility Engineer')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIntelTab('alternatives')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer ${
                    intelTab === 'alternatives'
                      ? 'bg-[#0E0E10] text-[#D4AF37] border-[#C89D3C]'
                      : 'bg-[#F8F8F7] dark:bg-[#0E0E10] border-[#E5E5E0] dark:border-white/15'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>{t(lang, 'مركز البدائل الذكية ومقارنة المواصفات', 'Smart Alternatives & Comparison')}</span>
                </button>
              </div>
              {!inStock && (
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {t(lang, 'هذا المنتج غير متوفر حالياً — نقترح لك أفضل البدائل المتوفرة:', 'Out of stock — check recommended available alternatives:')}
                </span>
              )}
            </div>

            {intelTab === 'compatibility' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {compatibleList.length === 0 ? (
                  <p className="text-xs text-neutral-500">
                    {t(lang, 'لا توجد توصيات توافق إضافية لهذا المنتج حالياً.', 'No additional hardware pairings needed.')}
                  </p>
                ) : (
                  compatibleList.map((rec) => (
                    <div
                      key={rec.product.id}
                      className="p-3.5 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white shrink-0 border border-[#E5E5E0] dark:border-white/10">
                          <ResilientImage src={rec.product.images?.[0]} alt={rec.product.nameEn} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(rec.product)}
                            className="text-xs font-bold text-start hover:text-[#C89D3C] truncate block max-w-full cursor-pointer"
                          >
                            {lang === 'ar' ? rec.product.nameAr : rec.product.nameEn}
                          </button>
                          <p className="text-[11px] text-neutral-500 line-clamp-1">
                            {lang === 'ar' ? rec.reasonAr : rec.reasonEn}
                          </p>
                          <div className="text-[11px] font-mono-num font-bold text-[#9E7822] dark:text-[#D4AF37]">
                            {formatCurrency(rec.product.retailPrice)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(rec.product.id, 1, t(lang, 'توافق ذكي', 'Compatible Hardware'))}
                        className="px-3 py-1.5 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold shrink-0 cursor-pointer"
                      >
                        {t(lang, 'أضف للسلة', 'Add')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {intelTab === 'alternatives' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alternativesList.length === 0 ? (
                  <p className="text-xs text-neutral-500">
                    {t(lang, 'لا توجد بدائل متوفرة مطابقة حالياً.', 'No matching in-stock alternatives right now.')}
                  </p>
                ) : (
                  alternativesList.map((alt) => (
                    <div
                      key={alt.product.id}
                      className="p-4 rounded-xl bg-[#FAF5E8]/60 dark:bg-[#0E0E10] border border-[#C89D3C]/35 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(alt.product)}
                            className="text-xs font-bold text-start hover:text-[#9E7822] cursor-pointer"
                          >
                            {lang === 'ar' ? alt.product.nameAr : alt.product.nameEn}
                          </button>
                          <span className="font-mono-num font-bold text-xs text-[#9E7822] dark:text-[#D4AF37] shrink-0">
                            {formatCurrency(alt.product.retailPrice)}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                          {lang === 'ar' ? alt.summaryAr : alt.summaryEn}
                        </p>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          {(lang === 'ar' ? alt.keyAdvantagesAr : alt.keyAdvantagesEn).join(' · ')}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#C89D3C]/20">
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(alt.product)}
                          className="text-[11px] font-bold text-[#0E0E10] dark:text-white underline cursor-pointer"
                        >
                          {t(lang, 'مقارنة المواصفات والحجز', 'Compare & View')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(alt.product.id, 1, t(lang, 'بديل ذكي', 'Smart Alternative'));
                            setSelectedProduct(null);
                            setCartOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#C89D3C] text-[#0E0E10] text-xs font-bold cursor-pointer"
                        >
                          {t(lang, 'اختر البديل للسلة', 'Add Alternative')}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
