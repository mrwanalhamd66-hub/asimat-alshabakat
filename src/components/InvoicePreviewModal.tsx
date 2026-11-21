import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Lock,
  MessageCircle,
  Printer,
  Send,
  Share2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  INVOICE_PAYMENT_STATUS_LABELS,
  formatCurrency,
  t,
} from '../i18n/translations.ts';
import type { Invoice } from '../types/index.ts';
import {
  buildWhatsAppHref,
  downloadInvoicePdf,
} from '../utils/invoicePdf.ts';
import {
  logAdminActivity,
  markInvoiceSentToCustomer,
} from '../services/firestoreService.ts';

interface InvoicePreviewModalProps {
  invoice: Invoice;
  onClose: () => void;
  canManage?: boolean;
  onInvoiceUpdated?: (updated: Invoice) => void;
}

export function InvoicePreviewModal({
  invoice,
  onClose,
  canManage = false,
  onInvoiceUpdated,
}: InvoicePreviewModalProps) {
  const { lang, storeSettings, userProfile } = useApp();
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');

  const currency = storeSettings.currencyCode || 'USD';
  const statusInfo = INVOICE_PAYMENT_STATUS_LABELS[invoice.paymentStatus];

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setFeedback('');
    try {
      await downloadInvoicePdf(invoice, storeSettings);
      setFeedback(
        t(lang, 'تم إنشاء وتحميل الفاتورة بصيغة PDF بنجاح.', 'Invoice PDF downloaded.')
      );
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendToCustomer = async () => {
    setSending(true);
    setFeedback('');
    try {
      const updated = await markInvoiceSentToCustomer(invoice);
      onInvoiceUpdated?.(updated);
      if (userProfile) {
        await logAdminActivity({
          actorUid: userProfile.uid,
          actorEmail: userProfile.email,
          actorRole: userProfile.role,
          action: 'invoice_sent_to_customer',
          entityType: 'invoice',
          entityId: invoice.id,
          summaryAr: `إرسال الفاتورة ${invoice.invoiceNumber} للعميل ${invoice.customerName}`,
          summaryEn: `Sent invoice ${invoice.invoiceNumber} to ${invoice.customerName}`,
        });
      }
      setFeedback(
        invoice.customerUid
          ? t(
              lang,
              'تم إرسال إشعار الفاتورة لحساب العميل وتوثيق الإرسال.',
              'Invoice notification sent to customer account.'
            )
          : t(
              lang,
              'تم تسجيل حالة الإرسال. يمكنك إرسالها عبر واتساب مباشرة أدناه.',
              'Marked as sent. You can also deliver directly via WhatsApp.'
            )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex items-start justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#F4F4F2] rounded-2xl border border-[#C89D3C]/40 overflow-hidden shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Toolbar */}
        <div className="bg-[#0E0E10] text-white px-4 sm:px-6 py-3.5 border-b border-[#C89D3C]/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-mono-num font-bold text-sm text-[#D4AF37]">
              {invoice.invoiceNumber}
            </span>
            <span className="text-neutral-500">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-300 whitespace-nowrap">
              <Lock className="w-3 h-3 text-[#C89D3C]" />
              {t(lang, 'نسخة رسمية معتمدة', 'Official Locked Snapshot')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-3.5 py-2 rounded-lg bg-[#C89D3C] text-[#0E0E10] hover:bg-[#D4AF37] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {downloading
                  ? t(lang, 'جاري التجهيز...', 'Generating...')
                  : t(lang, 'تحميل PDF', 'Download PDF')}
              </span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t(lang, 'طباعة', 'Print')}</span>
            </button>

            <a
              href={buildWhatsAppHref(invoice, storeSettings, 'share')}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t(lang, 'مشاركة واتساب', 'WhatsApp Share')}</span>
            </a>

            {canManage && (
              <>
                <button
                  type="button"
                  onClick={handleSendToCustomer}
                  disabled={sending}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-[#C89D3C] hover:text-[#0E0E10] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t(lang, 'إرسال للعميل', 'Send to Customer')}</span>
                </button>

                <a
                  href={buildWhatsAppHref(invoice, storeSettings, 'customer')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg bg-emerald-500 text-[#0E0E10] hover:bg-emerald-400 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{t(lang, 'واتساب العميل', 'Customer WA')}</span>
                </a>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label={t(lang, 'إغلاق', 'Close')}
              className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {feedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* A4 Luxury Document Preview */}
        <div className="p-3 sm:p-6 overflow-x-auto">
          <div
            id="asema-printable-invoice"
            dir="rtl"
            className="mx-auto w-full max-w-[794px] bg-white border border-[#E5E5E0] rounded-xl overflow-hidden shadow-sm text-[#0E0E10]"
          >
            {/* Gold Accent Top Strip */}
            <div className="h-2 gold-shimmer-line bg-[#0E0E10]" />

            <div className="p-6 sm:p-9 space-y-6">
              {/* Official Brand & Invoice Header */}
              <div className="bg-[#0E0E10] text-white rounded-xl p-5 sm:p-6 border border-[#C89D3C]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-[#0E0E10] border border-[#C89D3C]/40 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 512 512" className="w-14 h-14">
                      <g transform="translate(256 256)">
                        <polygon
                          points="0,-138 138,0 0,138 -138,0"
                          fill="none"
                          stroke="#D4AF37"
                          strokeWidth="18"
                        />
                        <polygon
                          points="0,-82 82,0 0,82 -82,0"
                          fill="#C89D3C"
                          fillOpacity="0.2"
                          stroke="#C89D3C"
                          strokeWidth="10"
                        />
                        <circle cx="0" cy="-138" r="18" fill="#D4AF37" />
                        <circle cx="138" cy="0" r="18" fill="#D4AF37" />
                        <circle cx="0" cy="138" r="18" fill="#D4AF37" />
                        <circle cx="-138" cy="0" r="18" fill="#D4AF37" />
                        <circle cx="0" cy="0" r="24" fill="#D4AF37" />
                      </g>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-extrabold text-white">
                      {storeSettings.storeNameAr || 'عاصمة الشبكات'}
                    </h2>
                    <div className="text-xs font-bold tracking-wider text-[#D4AF37]">
                      {storeSettings.storeNameEn || 'ASEMA NETWORKS'}
                    </div>
                    <p className="text-[11px] text-neutral-300">
                      {storeSettings.locationAr || 'صنعاء، شارع صقر، مول نور اليمن'}
                    </p>
                    <p className="text-[11px] font-mono-num text-neutral-400">
                      {(storeSettings.phones || ['770581056']).join(' | ')}
                    </p>
                  </div>
                </div>

                <div className="text-start sm:text-end space-y-2">
                  <div>
                    <div className="text-xl sm:text-2xl font-extrabold text-[#D4AF37]">
                      فاتورة مبيعات
                    </div>
                    <div className="text-[11px] font-bold tracking-widest text-neutral-300">
                      SALES INVOICE
                    </div>
                  </div>
                  <div className="bg-[#17171B] border border-[#C89D3C]/45 rounded-lg px-3.5 py-2 inline-block text-start">
                    <div className="font-mono-num font-bold text-sm text-[#D4AF37]" dir="ltr">
                      {invoice.invoiceNumber}
                    </div>
                    <div className="font-mono-num text-[11px] text-neutral-400" dir="ltr">
                      {new Date(invoice.issuedAt).toLocaleString('en-GB')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer & Invoice Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#F8F8F7] border border-[#E5E5E0] rounded-xl p-5">
                <div className="md:col-span-7 space-y-1.5">
                  <div className="text-[11px] font-bold text-[#9E7822]">
                    بيانات العميل / CUSTOMER DETAILS
                  </div>
                  <div className="text-base font-extrabold text-[#0E0E10]">
                    {invoice.customerName}
                  </div>
                  <div className="text-xs font-mono-num font-semibold text-neutral-700">
                    الهاتف: {invoice.customerPhone}
                  </div>
                  {(invoice.governorate || invoice.address) && (
                    <div className="text-xs text-neutral-600">
                      {[invoice.governorate, invoice.address].filter(Boolean).join(' — ')}
                    </div>
                  )}
                </div>

                <div className="md:col-span-5 md:border-s md:border-[#E5E5E0] md:ps-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#9E7822]">
                      حالة الدفع
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        invoice.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : invoice.paymentStatus === 'partial'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {statusInfo.ar}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-700">
                    {invoice.referenceNumber ? (
                      <>
                        مرجع الطلب:{' '}
                        <span className="font-mono-num font-bold text-[#0E0E10]">
                          {invoice.referenceNumber}
                        </span>
                      </>
                    ) : (
                      <span>نوع الإصدار: فاتورة مبيعات مباشرة</span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-700">
                    طريقة الدفع:{' '}
                    <span className="font-semibold">
                      {invoice.paymentMethodLabel || invoice.paymentMethod}
                    </span>
                  </div>
                  {invoice.issuedByName && (
                    <div className="text-[11px] text-neutral-500">
                      أُصدرت بواسطة: {invoice.issuedByName}
                    </div>
                  )}
                </div>
              </div>

              {/* Products Table */}
              <div className="border border-[#E5E5E0] rounded-xl overflow-hidden">
                <table className="w-full text-start text-xs">
                  <thead className="bg-[#0E0E10] text-[#D4AF37]">
                    <tr>
                      <th className="py-3 px-3 text-start w-10">#</th>
                      <th className="py-3 px-3 text-start">المنتج والموديل / Product & Model</th>
                      <th className="py-3 px-3 text-center w-20">الكمية</th>
                      <th className="py-3 px-3 text-end w-28">سعر الوحدة</th>
                      <th className="py-3 px-3 text-end w-32">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E0]">
                    {invoice.items.map((it, idx) => (
                      <tr key={`${it.nameAr}-${idx}`} className={idx % 2 === 1 ? 'bg-[#F8F8F7]/70' : 'bg-white'}>
                        <td className="py-3 px-3 font-mono-num text-neutral-400">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-[#0E0E10]">{it.nameAr}</div>
                          {it.nameEn && it.nameEn !== it.nameAr && (
                            <div className="text-[11px] text-neutral-500">{it.nameEn}</div>
                          )}
                          {it.modelNumber && (
                            <div className="text-[11px] font-mono-num font-semibold text-[#9E7822]">
                              Model: {it.modelNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono-num font-bold">
                          {it.quantity}
                        </td>
                        <td className="py-3 px-3 text-end font-mono-num text-neutral-700" dir="ltr">
                          {formatCurrency(it.unitPrice, currency)}
                        </td>
                        <td className="py-3 px-3 text-end font-mono-num font-bold text-[#0E0E10]" dir="ltr">
                          {formatCurrency(it.lineTotal, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 invoice-avoid-break">
                <div className="md:col-span-6 bg-[#F8F8F7] border border-[#E5E5E0] rounded-xl p-5 space-y-2.5">
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>إجمالي المشتريات</span>
                    <span className="font-mono-num font-bold text-[#0E0E10]" dir="ltr">
                      {formatCurrency(invoice.subtotal, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>الخصومات</span>
                    <span
                      className={`font-mono-num font-bold ${
                        invoice.discountAmount > 0 ? 'text-emerald-700' : 'text-neutral-700'
                      }`}
                      dir="ltr"
                    >
                      {invoice.discountAmount > 0 ? `- ` : ''}
                      {formatCurrency(invoice.discountAmount, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>تكاليف الشحن</span>
                    <span className="font-mono-num font-bold text-[#0E0E10]" dir="ltr">
                      {formatCurrency(invoice.shippingCost, currency)}
                    </span>
                  </div>

                  <div className="bg-[#0E0E10] text-white border border-[#C89D3C]/60 rounded-lg px-4 py-3 flex items-center justify-between my-1">
                    <span className="text-xs font-extrabold">المبلغ النهائي المستحق</span>
                    <span className="text-base font-extrabold font-mono-num text-[#D4AF37]" dir="ltr">
                      {formatCurrency(invoice.totalAmount, currency)}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-emerald-700 font-semibold pt-1">
                    <span>المبلغ المدفوع</span>
                    <span className="font-mono-num font-bold" dir="ltr">
                      {formatCurrency(invoice.paidAmount, currency)}
                    </span>
                  </div>
                  <div
                    className={`flex justify-between text-xs font-semibold ${
                      invoice.remainingAmount > 0 ? 'text-rose-700' : 'text-neutral-600'
                    }`}
                  >
                    <span>المبلغ المتبقي</span>
                    <span className="font-mono-num font-bold" dir="ltr">
                      {formatCurrency(invoice.remainingAmount, currency)}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-6 bg-white border border-[#E5E5E0] rounded-xl p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-[11px] font-bold text-[#9E7822]">طريقة الدفع</div>
                      <div className="text-xs font-semibold text-[#0E0E10] mt-0.5">
                        {invoice.paymentMethodLabel || invoice.paymentMethod}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-[#9E7822]">ملاحظات إضافية</div>
                      <p className="text-xs text-neutral-600 leading-relaxed mt-0.5">
                        {invoice.notes?.trim() ||
                          'تشمل الأجهزة فحص التشغيل الأساسي قبل التسليم. يرجى الاحتفاظ برقم الفاتورة للمراجعة والضمان.'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#FAF5E8] border border-[#C89D3C]/40 rounded-lg px-3.5 py-2.5 text-center text-xs font-bold text-[#0E0E10]">
                    شكراً لتعاملكم مع عاصمة الشبكات — ثقتكم أساس تميزنا
                  </div>
                </div>
              </div>
            </div>

            {/* Branded Footer */}
            <div className="bg-[#0E0E10] text-white border-t-2 border-[#C89D3C] px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-[11px]">
              <div>
                <div className="font-bold text-[#D4AF37]">
                  {storeSettings.storeNameAr || 'عاصمة الشبكات'} |{' '}
                  {storeSettings.storeNameEn || 'ASEMA NETWORKS'}
                </div>
                <div className="text-neutral-400">
                  {storeSettings.locationAr || 'صنعاء، شارع صقر، مول نور اليمن'} ·{' '}
                  {(storeSettings.phones || ['770581056']).join(' - ')}
                </div>
              </div>
              <div className="font-mono-num text-neutral-400" dir="ltr">
                {invoice.invoiceNumber} · A4 Electronic Tax/Sales Record
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
