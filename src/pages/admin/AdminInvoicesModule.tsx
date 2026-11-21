import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Lock,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import {
  INVOICE_PAYMENT_STATUS_LABELS,
  YEMEN_GOVERNORATES,
  formatCurrency,
  t,
} from '../../i18n/translations.ts';
import {
  createManualInvoice,
  issueInvoiceFromReservation,
  logAdminActivity,
  updateInvoicePayment,
} from '../../services/firestoreService.ts';
import type {
  Invoice,
  InvoiceItem,
  InvoicePaymentStatus,
  Reservation,
  UserProfile,
} from '../../types/index.ts';
import { InvoicePreviewModal } from '../../components/InvoicePreviewModal.tsx';
import { buildWhatsAppHref, downloadInvoicePdf } from '../../utils/invoicePdf.ts';

interface AdminInvoicesModuleProps {
  invoices: Invoice[];
  reservations: Reservation[];
  users: UserProfile[];
}

export function AdminInvoicesModule({
  invoices,
  reservations,
  users,
}: AdminInvoicesModuleProps) {
  const { lang, userProfile, storeSettings, products } = useApp();

  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | InvoicePaymentStatus>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7d' | '30d' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [paidInput, setPaidInput] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);

  // Manual Invoice Modal State
  const [manualOpen, setManualOpen] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState('');
  const [selectedCustomerUid, setSelectedCustomerUid] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [governorate, setGovernorate] = useState(YEMEN_GOVERNORATES[0].ar);
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pay_on_pickup_or_delivery');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    {
      productId: '',
      nameAr: '',
      nameEn: '',
      modelNumber: '',
      quantity: 1,
      unitPrice: 0,
      lineTotal: 0,
    },
  ]);
  const [issuing, setIssuing] = useState(false);
  const [formError, setFormError] = useState('');

  const currency = storeSettings.currencyCode || 'USD';
  const uninvoicedReservations = useMemo(
    () =>
      reservations.filter(
        (r) =>
          !r.invoiceId &&
          r.status !== 'cancelled' &&
          !invoices.some((inv) => inv.reservationId === r.id)
      ),
    [reservations, invoices]
  );
  const customerUsers = useMemo(
    () => users.filter((u) => u.role === 'customer'),
    [users]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    return invoices.filter((inv) => {
      if (paymentFilter !== 'all' && inv.paymentStatus !== paymentFilter) return false;

      const issuedMs = Date.parse(inv.issuedAt);
      if (dateRange === 'today' && issuedMs < startOfToday) return false;
      if (dateRange === '7d' && Date.now() - issuedMs > 7 * dayMs) return false;
      if (dateRange === '30d' && Date.now() - issuedMs > 30 * dayMs) return false;
      if (dateRange === 'custom') {
        if (dateFrom) {
          const fromMs = Date.parse(`${dateFrom}T00:00:00`);
          if (!Number.isNaN(fromMs) && issuedMs < fromMs) return false;
        }
        if (dateTo) {
          const toMs = Date.parse(`${dateTo}T23:59:59`);
          if (!Number.isNaN(toMs) && issuedMs > toMs) return false;
        }
      }

      if (!q) return true;
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerPhone.toLowerCase().includes(q) ||
        (inv.referenceNumber || '').toLowerCase().includes(q)
      );
    });
  }, [invoices, paymentFilter, dateRange, dateFrom, dateTo, search]);

  const kpis = useMemo(() => {
    const totalBilled = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const totalCollected = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const totalRemaining = invoices.reduce((s, i) => s + (i.remainingAmount || 0), 0);
    return {
      count: invoices.length,
      totalBilled,
      totalCollected,
      totalRemaining,
    };
  }, [invoices]);

  const handleDownloadRowPdf = async (inv: Invoice) => {
    setDownloadingId(inv.id);
    try {
      await downloadInvoicePdf(inv, storeSettings);
    } finally {
      setDownloadingId(null);
    }
  };

  const openPaymentModal = (inv: Invoice) => {
    setPaymentModalInvoice(inv);
    setPaidInput(String(inv.paidAmount));
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice || !userProfile) return;
    setPaymentSaving(true);
    try {
      const updated = await updateInvoicePayment(
        paymentModalInvoice,
        Math.max(0, Number(paidInput || 0))
      );
      await logAdminActivity({
        actorUid: userProfile.uid,
        actorEmail: userProfile.email,
        actorRole: userProfile.role,
        action: 'invoice_payment_updated',
        entityType: 'invoice',
        entityId: updated.id,
        summaryAr: `تحديث سداد الفاتورة ${updated.invoiceNumber}: المدفوع $${updated.paidAmount} (${INVOICE_PAYMENT_STATUS_LABELS[updated.paymentStatus].ar})`,
        summaryEn: `Updated payment for ${updated.invoiceNumber}: paid $${updated.paidAmount}`,
      });
      setPaymentModalInvoice(null);
    } finally {
      setPaymentSaving(false);
    }
  };

  const resetManualForm = () => {
    setSelectedReservationId('');
    setSelectedCustomerUid('');
    setCustomerName('');
    setCustomerPhone('');
    setGovernorate(YEMEN_GOVERNORATES[0].ar);
    setAddress('');
    setPaymentMethod('pay_on_pickup_or_delivery');
    setDiscountAmount(0);
    setShippingCost(0);
    setPaidAmount(0);
    setNotes('');
    const firstProd = products[0];
    setLineItems([
      firstProd
        ? {
            productId: firstProd.id,
            nameAr: firstProd.nameAr,
            nameEn: firstProd.nameEn,
            modelNumber: firstProd.modelNumber || '',
            quantity: 1,
            unitPrice: firstProd.retailPrice,
            lineTotal: firstProd.retailPrice,
          }
        : {
            productId: '',
            nameAr: '',
            nameEn: '',
            modelNumber: '',
            quantity: 1,
            unitPrice: 0,
            lineTotal: 0,
          },
    ]);
    setFormError('');
  };

  const handlePickReservation = (resId: string) => {
    setSelectedReservationId(resId);
    const res = reservations.find((r) => r.id === resId);
    if (!res) return;
    setSelectedCustomerUid(res.customerUid || '');
    setCustomerName(res.customerName);
    setCustomerPhone(res.phone);
    setGovernorate(res.governorate || YEMEN_GOVERNORATES[0].ar);
    setAddress(res.address || '');
    setPaymentMethod(res.paymentMethod || 'pay_on_pickup_or_delivery');
    setDiscountAmount(res.discountAmount || 0);
    setShippingCost(res.shippingCost || 0);
    setNotes(res.notes || '');
    const prod = products.find((p) => p.id === res.productId);
    const unit = res.unitPrice ?? (res.quantity > 0 ? res.totalPrice / res.quantity : 0);
    setLineItems([
      {
        productId: res.productId,
        nameAr: res.productNameAr || prod?.nameAr || '',
        nameEn: res.productNameEn || prod?.nameEn || '',
        modelNumber: prod?.modelNumber || '',
        quantity: res.quantity,
        unitPrice: unit,
        lineTotal: Number((unit * res.quantity).toFixed(2)),
      },
    ]);
  };

  const handlePickCustomer = (uid: string) => {
    setSelectedCustomerUid(uid);
    const u = customerUsers.find((c) => c.uid === uid);
    if (!u) return;
    setCustomerName(u.displayName);
    if (u.phone) setCustomerPhone(u.phone);
    if (u.governorate) setGovernorate(u.governorate);
    if (u.address) setAddress(u.address);
  };

  const updateLineItem = (index: number, patch: Partial<InvoiceItem>) => {
    setLineItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const merged = { ...item, ...patch };
        const qty = Math.max(1, Math.round(Number(merged.quantity || 1)));
        const price = Math.max(0, Number(merged.unitPrice || 0));
        return {
          ...merged,
          quantity: qty,
          unitPrice: price,
          lineTotal: Number((qty * price).toFixed(2)),
        };
      })
    );
  };

  const handleSelectCatalogProduct = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) {
      updateLineItem(index, { productId: '' });
      return;
    }
    updateLineItem(index, {
      productId: prod.id,
      nameAr: prod.nameAr,
      nameEn: prod.nameEn,
      modelNumber: prod.modelNumber || '',
      unitPrice: prod.retailPrice,
    });
  };

  const manualSubtotal = lineItems.reduce((s, it) => s + it.lineTotal, 0);
  const manualTotal = Math.max(
    0,
    Number((manualSubtotal - Number(discountAmount || 0) + Number(shippingCost || 0)).toFixed(2))
  );

  const handleIssueManualInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setFormError('');

    const validItems = lineItems.filter((it) => it.nameAr.trim() || it.nameEn.trim());
    if (!customerName.trim() || !customerPhone.trim()) {
      setFormError(t(lang, 'يرجى إدخال اسم العميل ورقم الهاتف.', 'Customer name and phone are required.'));
      return;
    }
    if (validItems.length === 0) {
      setFormError(t(lang, 'يرجى إضافة منتج واحد على الأقل.', 'Please add at least one product line item.'));
      return;
    }

    setIssuing(true);
    try {
      let issued: Invoice;
      const linkedRes = selectedReservationId
        ? reservations.find((r) => r.id === selectedReservationId)
        : undefined;

      if (linkedRes && validItems.length === 1 && !linkedRes.invoiceId && validItems[0].productId === linkedRes.productId && validItems[0].quantity === linkedRes.quantity && validItems[0].unitPrice === (linkedRes.unitPrice ?? validItems[0].unitPrice) && Number(discountAmount || 0) === (linkedRes.discountAmount || 0) && Number(shippingCost || 0) === (linkedRes.shippingCost || 0)) {
        issued = await issueInvoiceFromReservation({
          reservation: linkedRes,
          actor: userProfile,
          storeSettings,
          source: 'manual_reservation',
          paidAmount: Number(paidAmount || 0),
          products,
        });
      } else {
        issued = await createManualInvoice({
          actor: userProfile,
          storeSettings,
          customerUid: selectedCustomerUid || undefined,
          customerName,
          customerPhone,
          governorate,
          address,
          items: validItems,
          discountAmount: Number(discountAmount || 0),
          shippingCost: Number(shippingCost || 0),
          paidAmount: Number(paidAmount || 0),
          paymentMethod,
          notes,
          reservationId: linkedRes?.id,
          referenceNumber: linkedRes?.referenceNumber,
        });
      }

      await logAdminActivity({
        actorUid: userProfile.uid,
        actorEmail: userProfile.email,
        actorRole: userProfile.role,
        action: 'manual_invoice_issued',
        entityType: 'invoice',
        entityId: issued.id,
        summaryAr: `إصدار فاتورة يدوية رقم ${issued.invoiceNumber} للعميل ${issued.customerName} ($${issued.totalAmount})`,
        summaryEn: `Issued manual invoice ${issued.invoiceNumber} for ${issued.customerName} ($${issued.totalAmount})`,
      });

      setManualOpen(false);
      setPreviewInvoice(issued);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to issue invoice');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0E0E10]">
            {t(lang, 'نظام الفواتير الإلكترونية PDF وأرشيف الفواتير', 'Electronic PDF Invoicing & Archive')}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t(
              lang,
              'إصدار تلقائي عند تأكيد الطلب، إصدار يدوي، معاينة وطباعة A4، مشاركة واتساب، وأرشفة كاملة.',
              'Automatic issuance on confirmation, manual invoicing, A4 PDF preview & print, WhatsApp share, and full archive.'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetManualForm();
            setManualOpen(true);
          }}
          className="px-4 py-2.5 rounded-lg bg-[#0E0E10] text-white hover:bg-[#C89D3C] hover:text-[#0E0E10] text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t(lang, 'إصدار فاتورة يدوية', 'Issue Manual Invoice')}</span>
        </button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E5E0] rounded-xl p-4">
          <div className="text-xs text-neutral-500">{t(lang, 'إجمالي الفواتير', 'Total Invoices')}</div>
          <div className="text-2xl font-bold font-mono-num text-[#0E0E10] mt-1">{kpis.count}</div>
        </div>
        <div className="bg-white border border-[#E5E5E0] rounded-xl p-4">
          <div className="text-xs text-neutral-500">{t(lang, 'إجمالي المبيعات المفوترة', 'Total Billed')}</div>
          <div className="text-2xl font-bold font-mono-num text-[#9E7822] mt-1" dir="ltr">
            {formatCurrency(kpis.totalBilled, currency)}
          </div>
        </div>
        <div className="bg-white border border-[#E5E5E0] rounded-xl p-4">
          <div className="text-xs text-neutral-500">{t(lang, 'المبالغ المحصّلة', 'Collected')}</div>
          <div className="text-2xl font-bold font-mono-num text-emerald-700 mt-1" dir="ltr">
            {formatCurrency(kpis.totalCollected, currency)}
          </div>
        </div>
        <div className="bg-white border border-[#E5E5E0] rounded-xl p-4">
          <div className="text-xs text-neutral-500">{t(lang, 'المبالغ المتبقية', 'Outstanding')}</div>
          <div className="text-2xl font-bold font-mono-num text-rose-700 mt-1" dir="ltr">
            {formatCurrency(kpis.totalRemaining, currency)}
          </div>
        </div>
      </div>

      {/* Search & Archive Filters */}
      <div className="bg-white border border-[#E5E5E0] rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-neutral-400 absolute top-1/2 -translate-y-1/2 start-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              lang,
              'بحث برقم الفاتورة INV-... أو اسم العميل أو الهاتف...',
              'Search by invoice #, customer name, phone, or ref...'
            )}
            className="w-full ps-9 pe-3.5 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
          />
        </div>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as 'all' | InvoicePaymentStatus)}
          className="px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-semibold"
        >
          <option value="all">{t(lang, 'كل حالات الدفع', 'All Payment Statuses')}</option>
          <option value="paid">{t(lang, 'مدفوعة بالكامل', 'Paid in Full')}</option>
          <option value="partial">{t(lang, 'مدفوعة جزئياً', 'Partially Paid')}</option>
          <option value="unpaid">{t(lang, 'غير مدفوعة', 'Unpaid')}</option>
        </select>

        <select
          value={dateRange}
          onChange={(e) =>
            setDateRange(e.target.value as 'all' | 'today' | '7d' | '30d' | 'custom')
          }
          className="px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-semibold"
        >
          <option value="all">{t(lang, 'كل التواريخ', 'All Dates')}</option>
          <option value="today">{t(lang, 'اليوم', 'Today')}</option>
          <option value="7d">{t(lang, 'آخر 7 أيام', 'Last 7 Days')}</option>
          <option value="30d">{t(lang, 'آخر 30 يوماً', 'Last 30 Days')}</option>
          <option value="custom">{t(lang, 'نطاق مخصص', 'Custom Range')}</option>
        </select>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
            />
            <span className="text-neutral-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
            />
          </div>
        )}
      </div>

      {/* Invoice Archive Table */}
      <div className="bg-white border border-[#E5E5E0] rounded-xl overflow-x-auto">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#F8F8F7] text-neutral-600 border-b border-[#E5E5E0]">
            <tr>
              <th className="py-3 px-4 text-start">{t(lang, 'رقم الفاتورة', 'Invoice #')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'العميل', 'Customer')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'المنتجات', 'Items')}</th>
              <th className="py-3 px-4 text-end">{t(lang, 'الإجمالي / المدفوع', 'Total / Paid')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'حالة الدفع', 'Payment')}</th>
              <th className="py-3 px-4 text-end">{t(lang, 'الإجراءات', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0EC]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-500">
                  <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  {t(
                    lang,
                    'لا توجد فواتير مطابقة لخيارات البحث الحالية.',
                    'No invoices match the current filter criteria.'
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const st = INVOICE_PAYMENT_STATUS_LABELS[inv.paymentStatus];
                return (
                  <tr key={inv.id} className="hover:bg-[#F8F8F7]/70">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono-num font-bold text-[#9E7822]">
                        <Lock className="w-3 h-3 text-[#C89D3C]" />
                        <span>{inv.invoiceNumber}</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono-num mt-0.5">
                        {new Date(inv.issuedAt).toLocaleString('en-GB')}
                      </div>
                      {inv.referenceNumber && (
                        <div className="text-[10px] text-neutral-400 font-mono-num">
                          Ref: {inv.referenceNumber}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0E0E10]">{inv.customerName}</div>
                      <div className="font-mono-num text-neutral-500">{inv.customerPhone}</div>
                      {inv.sentToCustomerAt && (
                        <div className="inline-flex items-center gap-1 text-[10px] text-emerald-700 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t(lang, 'أُرسلت للعميل', 'Sent to Customer')}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#0E0E10] max-w-[200px] truncate">
                        {lang === 'ar'
                          ? inv.items[0]?.nameAr || inv.items[0]?.nameEn
                          : inv.items[0]?.nameEn || inv.items[0]?.nameAr}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono-num">
                        {inv.items.length > 1
                          ? `${inv.items.length} ${t(lang, 'أصناف', 'items')}`
                          : `Qty: ${inv.items[0]?.quantity || 1}`}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-end font-mono-num" dir="ltr">
                      <div className="font-bold text-[#0E0E10]">
                        {formatCurrency(inv.totalAmount, currency)}
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        Paid: {formatCurrency(inv.paidAmount, currency)}
                      </div>
                      {inv.remainingAmount > 0 && (
                        <div className="text-[11px] text-rose-700">
                          Due: {formatCurrency(inv.remainingAmount, currency)}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap ${
                          inv.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.paymentStatus === 'partial'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {lang === 'ar' ? st.ar : st.en}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewInvoice(inv)}
                          title={t(lang, 'معاينة وطباعة', 'Preview & Print')}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E5E5E0] bg-white hover:border-[#C89D3C] text-[#0E0E10] font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t(lang, 'معاينة', 'Preview')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadRowPdf(inv)}
                          disabled={downloadingId === inv.id}
                          title={t(lang, 'تحميل PDF', 'Download PDF')}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0E0E10] text-white hover:bg-[#C89D3C] hover:text-[#0E0E10] font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openPaymentModal(inv)}
                          title={t(lang, 'تحديث السداد', 'Record Payment')}
                          className="p-1.5 rounded-lg border border-[#E5E5E0] bg-white hover:border-[#C89D3C] text-[#9E7822] cursor-pointer"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={buildWhatsAppHref(inv, storeSettings, 'customer')}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t(lang, 'إرسال عبر واتساب', 'Send via WhatsApp')}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      {paymentModalInvoice && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPaymentModalInvoice(null)}
        >
          <form
            onSubmit={handleSavePayment}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl border border-[#E5E5E0] p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0E0E10]">
                {t(lang, 'تحديث حالة السداد', 'Update Invoice Payment')}
              </h3>
              <button
                type="button"
                onClick={() => setPaymentModalInvoice(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#F8F8F7] border border-[#E5E5E0] rounded-xl p-3.5 text-xs space-y-1">
              <div className="font-mono-num font-bold text-[#9E7822]">
                {paymentModalInvoice.invoiceNumber}
              </div>
              <div className="font-semibold text-[#0E0E10]">
                {paymentModalInvoice.customerName}
              </div>
              <div className="flex justify-between pt-1 border-t border-[#E5E5E0] mt-1">
                <span>{t(lang, 'المبلغ المستحق:', 'Invoice Total:')}</span>
                <span className="font-mono-num font-bold" dir="ltr">
                  {formatCurrency(paymentModalInvoice.totalAmount, currency)}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-700">
                  {t(lang, 'إجمالي المبلغ المدفوع', 'Total Paid Amount')} ({currency})
                </label>
                <button
                  type="button"
                  onClick={() => setPaidInput(String(paymentModalInvoice.totalAmount))}
                  className="text-[11px] font-bold text-[#9E7822] hover:underline cursor-pointer"
                >
                  {t(lang, 'مدفوع بالكامل', 'Mark Fully Paid')}
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                max={paymentModalInvoice.totalAmount}
                value={paidInput}
                onChange={(e) => setPaidInput(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
                dir="ltr"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalInvoice(null)}
                className="px-4 py-2 rounded-lg border border-[#E5E5E0] text-xs font-semibold cursor-pointer"
              >
                {t(lang, 'إلغاء', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={paymentSaving}
                className="px-5 py-2 rounded-lg bg-[#0E0E10] text-white hover:bg-[#C89D3C] hover:text-[#0E0E10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {paymentSaving ? t(lang, 'جاري الحفظ...', 'Saving...') : t(lang, 'حفظ السداد', 'Save Payment')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manual Invoice Issuance Modal */}
      {manualOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs overflow-y-auto p-4 flex items-start justify-center"
          onClick={() => setManualOpen(false)}
        >
          <form
            onSubmit={handleIssueManualInvoice}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl bg-white rounded-2xl border border-[#E5E5E0] p-6 space-y-5 shadow-2xl my-auto"
          >
            <div className="flex items-center justify-between border-b border-[#F0F0EC] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#0E0E10]">
                  {t(lang, 'إصدار فاتورة مبيعات يدوية', 'Issue Manual Sales Invoice')}
                </h3>
                <p className="text-xs text-neutral-500">
                  {t(
                    lang,
                    'يمكن ربط الفاتورة بحجز قائم أو إصدارها لطلب مباشر مع إمكانية إضافة عدة منتجات.',
                    'Link to an uninvoiced booking or create a standalone multi-item invoice.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Optional Link to Uninvoiced Reservation or Customer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8F8F7] p-3.5 rounded-xl border border-[#E5E5E0]">
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  {t(lang, 'ربط بحجز غير مفوتر (اختياري)', 'Link Uninvoiced Reservation (Optional)')}
                </label>
                <select
                  value={selectedReservationId}
                  onChange={(e) => handlePickReservation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E5E5E0] rounded-lg"
                >
                  <option value="">{t(lang, 'فاتورة مباشرة بدون ربط بحجز', 'Standalone Manual Invoice')}</option>
                  {uninvoicedReservations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.referenceNumber} · {r.customerName} ({formatCurrency(r.totalPrice, currency)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  {t(lang, 'تعبئة من عميل مسجل (اختياري)', 'Auto-fill Registered Customer (Optional)')}
                </label>
                <select
                  value={selectedCustomerUid}
                  onChange={(e) => handlePickCustomer(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E5E5E0] rounded-lg"
                >
                  <option value="">{t(lang, 'عميل جديد / إدخال يدوي', 'Manual Customer Input')}</option>
                  {customerUsers.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName} ({u.phone || u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'اسم العميل *', 'Customer Name *')}
                </label>
                <input
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'رقم الهاتف *', 'Phone Number *')}
                </label>
                <input
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="770XXXXXX"
                  className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'المحافظة', 'Governorate')}
                </label>
                <select
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
                >
                  {YEMEN_GOVERNORATES.map((g) => (
                    <option key={g.ar} value={lang === 'ar' ? g.ar : g.en}>
                      {lang === 'ar' ? g.ar : g.en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'العنوان التفصيلي', 'Address')}
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#0E0E10]">
                  {t(lang, 'بنود الفاتورة والمنتجات', 'Invoice Line Items')}
                </h4>
                <button
                  type="button"
                  onClick={() =>
                    setLineItems((prev) => [
                      ...prev,
                      {
                        productId: '',
                        nameAr: '',
                        nameEn: '',
                        modelNumber: '',
                        quantity: 1,
                        unitPrice: 0,
                        lineTotal: 0,
                      },
                    ])
                  }
                  disabled={lineItems.length >= 50}
                  className="px-3 py-1.5 rounded-lg border border-[#E5E5E0] hover:border-[#C89D3C] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t(lang, 'إضافة منتج', 'Add Item')}</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pe-1">
                {lineItems.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#F8F8F7] border border-[#E5E5E0] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                  >
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-semibold mb-1">
                        {t(lang, 'اختيار من الكتالوج', 'Catalog Product')}
                      </label>
                      <select
                        value={it.productId || ''}
                        onChange={(e) => handleSelectCatalogProduct(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E5E0] rounded-lg"
                      >
                        <option value="">{t(lang, 'منتج مخصص (إدخال يدوي)', 'Custom Product')}</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {lang === 'ar' ? p.nameAr : p.nameEn} ({formatCurrency(p.retailPrice, currency)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-semibold mb-1">
                        {t(lang, 'اسم المنتج', 'Item Name')}
                      </label>
                      <input
                        required
                        value={it.nameAr}
                        onChange={(e) =>
                          updateLineItem(idx, {
                            nameAr: e.target.value,
                            nameEn: it.nameEn || e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E5E0] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold mb-1">
                        {t(lang, 'الموديل', 'Model')}
                      </label>
                      <input
                        value={it.modelNumber || ''}
                        onChange={(e) => updateLineItem(idx, { modelNumber: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E5E0] rounded-lg font-mono-num"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-semibold mb-1">
                        {t(lang, 'الكمية', 'Qty')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={it.quantity}
                        onChange={(e) => updateLineItem(idx, { quantity: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-[#E5E5E0] rounded-lg font-mono-num"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-semibold mb-1">
                        {t(lang, 'السعر', 'Price')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.unitPrice}
                        onChange={(e) => updateLineItem(idx, { unitPrice: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-[#E5E5E0] rounded-lg font-mono-num"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        disabled={lineItems.length <= 1}
                        onClick={() =>
                          setLineItems((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financials & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'الخصم', 'Discount')} ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'تكلفة الشحن', 'Shipping')} ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold">
                    {t(lang, 'المبلغ المدفوع', 'Paid')} ({currency})
                  </label>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(manualTotal)}
                    className="text-[10px] font-bold text-[#9E7822] hover:underline cursor-pointer"
                  >
                    {t(lang, 'كامل', 'Full')}
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'طريقة الدفع', 'Payment Method')}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
                >
                  <option value="pay_on_pickup_or_delivery">
                    {t(lang, 'نقداً / عند الاستلام', 'Cash / On Delivery')}
                  </option>
                  {(storeSettings.paymentAccounts || [])
                    .filter((a) => a.isActive)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {lang === 'ar' ? a.labelAr : a.labelEn} ({a.accountNumber})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'ملاحظات إضافية على الفاتورة', 'Additional Invoice Notes')}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              />
            </div>

            {/* Live Totals Summary Bar */}
            <div className="bg-[#0E0E10] text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-5 text-xs">
                <div>
                  <span className="text-neutral-400">{t(lang, 'المجموع الفرعي:', 'Subtotal:')}</span>{' '}
                  <span className="font-mono-num font-bold" dir="ltr">
                    {formatCurrency(manualSubtotal, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400">{t(lang, 'الإجمالي المستحق:', 'Final Due:')}</span>{' '}
                  <span className="font-mono-num font-bold text-[#D4AF37]" dir="ltr">
                    {formatCurrency(manualTotal, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400">{t(lang, 'المتبقي:', 'Remaining:')}</span>{' '}
                  <span className="font-mono-num font-bold text-rose-300" dir="ltr">
                    {formatCurrency(Math.max(0, manualTotal - Number(paidAmount || 0)), currency)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={issuing}
                className="px-6 py-2.5 rounded-lg bg-[#C89D3C] text-[#0E0E10] hover:bg-[#D4AF37] text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                {issuing
                  ? t(lang, 'جاري الإصدار...', 'Issuing Invoice...')
                  : t(lang, 'اعتماد وإصدار الفاتورة', 'Issue Official Invoice')}
              </button>
            </div>

            {formError && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}
          </form>
        </div>
      )}

      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          canManage
          onClose={() => setPreviewInvoice(null)}
          onInvoiceUpdated={(updated) => setPreviewInvoice(updated)}
        />
      )}
    </div>
  );
}
