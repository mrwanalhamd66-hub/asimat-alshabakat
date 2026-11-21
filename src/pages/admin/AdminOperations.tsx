import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Edit3,
  Eye,
  FileText,
  Lock,
  MessageCircle,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import {
  RESERVATION_STATUS_LABELS,
  YEMEN_GOVERNORATES,
  formatCurrency,
  t,
} from '../../i18n/translations.ts';
import {
  issueInvoiceFromReservation,
  logAdminActivity,
  removeHomepageSection,
  saveHomepageSectionsBatch,
  updateReservationDetails,
  updateReservationStatus,
  updateUserRoleAndPermissions,
} from '../../services/firestoreService.ts';
import type {
  HomepageSection,
  HomepageSectionType,
  Invoice,
  Reservation,
  ReservationStatus,
  UserProfile,
} from '../../types/index.ts';
import { ImageUploader } from '../../components/ImageUploader.tsx';
import { InvoicePreviewModal } from '../../components/InvoicePreviewModal.tsx';

export function AdminReservationsModule({
  reservations,
  invoices = [],
}: {
  reservations: Reservation[];
  invoices?: Invoice[];
}) {
  const { lang, userProfile, storeSettings, products } = useApp();
  const [statusFilter, setStatusFilter] = useState<'all' | ReservationStatus>('all');
  const [search, setSearch] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [autoIssuedBanner, setAutoIssuedBanner] = useState<Invoice | null>(null);
  const [issuingResId, setIssuingResId] = useState<string | null>(null);
  const [editingRes, setEditingRes] = useState<Reservation | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: '',
    phone: '',
    governorate: YEMEN_GOVERNORATES[0].ar,
    address: '',
    unitPrice: 0,
    quantity: 1,
    discountAmount: 0,
    shippingCost: 0,
    paymentMethod: 'pay_on_pickup_or_delivery',
    notes: '',
  });

  const filtered = reservations.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.referenceNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.governorate.toLowerCase().includes(q)
    );
  });

  const findLinkedInvoice = (res: Reservation): Invoice | undefined => {
    if (res.invoiceId) {
      const byId = invoices.find((inv) => inv.id === res.invoiceId);
      if (byId) return byId;
    }
    return invoices.find((inv) => inv.reservationId === res.id);
  };

  const handleStatusChange = async (res: Reservation, next: ReservationStatus) => {
    if (!userProfile) return;
    const result = await updateReservationStatus(
      res,
      next,
      userProfile,
      storeSettings,
      products
    );
    await logAdminActivity({
      actorUid: userProfile.uid,
      actorEmail: userProfile.email,
      actorRole: userProfile.role,
      action: 'reservation_status_updated',
      entityType: 'reservation',
      entityId: res.id,
      summaryAr: `تغيير حالة الحجز ${res.referenceNumber} إلى ${RESERVATION_STATUS_LABELS[next].ar}`,
      summaryEn: `Updated reservation ${res.referenceNumber} to ${next}`,
    });
    if (result?.issuedInvoice) {
      setAutoIssuedBanner(result.issuedInvoice);
      await logAdminActivity({
        actorUid: userProfile.uid,
        actorEmail: userProfile.email,
        actorRole: userProfile.role,
        action: 'auto_invoice_issued',
        entityType: 'invoice',
        entityId: result.issuedInvoice.id,
        summaryAr: `إصدار فاتورة تلقائية رقم ${result.issuedInvoice.invoiceNumber} عند تأكيد الطلب ${res.referenceNumber}`,
        summaryEn: `Auto-issued invoice ${result.issuedInvoice.invoiceNumber} for reservation ${res.referenceNumber}`,
      });
    }
  };

  const handleManualIssueFromReservation = async (res: Reservation) => {
    if (!userProfile) return;
    setIssuingResId(res.id);
    try {
      const issued = await issueInvoiceFromReservation({
        reservation: res,
        actor: userProfile,
        storeSettings,
        source: 'manual_reservation',
        products,
      });
      await logAdminActivity({
        actorUid: userProfile.uid,
        actorEmail: userProfile.email,
        actorRole: userProfile.role,
        action: 'manual_invoice_issued',
        entityType: 'invoice',
        entityId: issued.id,
        summaryAr: `إصدار فاتورة للطلب ${res.referenceNumber} برقم ${issued.invoiceNumber}`,
        summaryEn: `Issued invoice ${issued.invoiceNumber} from reservation ${res.referenceNumber}`,
      });
      setPreviewInvoice(issued);
    } finally {
      setIssuingResId(null);
    }
  };

  const openEditOrder = (res: Reservation) => {
    setEditingRes(res);
    setEditForm({
      customerName: res.customerName,
      phone: res.phone,
      governorate: res.governorate || YEMEN_GOVERNORATES[0].ar,
      address: res.address || '',
      unitPrice:
        res.unitPrice ??
        (res.quantity > 0 ? Number((res.totalPrice / res.quantity).toFixed(2)) : 0),
      quantity: res.quantity,
      discountAmount: res.discountAmount || 0,
      shippingCost: res.shippingCost || 0,
      paymentMethod: res.paymentMethod || 'pay_on_pickup_or_delivery',
      notes: res.notes || '',
    });
  };

  const handleSaveOrderEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRes || !userProfile) return;
    setEditSaving(true);
    try {
      const updated = await updateReservationDetails(editingRes, editForm);
      await logAdminActivity({
        actorUid: userProfile.uid,
        actorEmail: userProfile.email,
        actorRole: userProfile.role,
        action: 'reservation_details_updated',
        entityType: 'reservation',
        entityId: updated.id,
        summaryAr: `تعديل تفاصيل الطلب ${updated.referenceNumber} قبل إصدار الفاتورة ($${updated.totalPrice})`,
        summaryEn: `Updated order details for ${updated.referenceNumber} before invoicing ($${updated.totalPrice})`,
      });
      setEditingRes(null);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0E0E10]">
            {t(lang, 'إدارة الحجوزات والطلبات', 'Reservations Management')}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t(
              lang,
              'تعديل تفاصيل الطلب قبل الفوترة، تأكيد الطلب وإصدار الفاتورة تلقائياً، ومتابعة التوصيل.',
              'Edit order pricing before invoicing, confirm orders to auto-issue PDF invoices, and notify customers.'
            )}
          </p>
        </div>
      </div>

      {autoIssuedBanner && (
        <div className="bg-[#FAF5E8] border border-[#C89D3C]/50 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#0E0E10] font-semibold">
            <FileText className="w-4 h-4 text-[#9E7822]" />
            <span>
              {t(
                lang,
                `تم تأكيد الطلب وإصدار الفاتورة الإلكترونية رقم ${autoIssuedBanner.invoiceNumber} تلقائياً.`,
                `Order confirmed and electronic invoice ${autoIssuedBanner.invoiceNumber} issued automatically.`
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewInvoice(autoIssuedBanner)}
              className="px-3 py-1.5 rounded-lg bg-[#0E0E10] text-white hover:bg-[#C89D3C] hover:text-[#0E0E10] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{t(lang, 'معاينة وتحميل PDF', 'Preview & Download PDF')}</span>
            </button>
            <button
              type="button"
              onClick={() => setAutoIssuedBanner(null)}
              className="p-1 text-neutral-500 hover:text-neutral-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#E5E5E0] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(lang, 'بحث برقم المرجع، الاسم، أو الهاتف...', 'Search reference, name, phone...')}
          className="w-full sm:w-80 px-3.5 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | ReservationStatus)}
          className="px-3.5 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
        >
          <option value="all">{t(lang, 'كل الحالات', 'All Statuses')}</option>
          {(Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[]).map((st) => (
            <option key={st} value={st}>
              {lang === 'ar' ? RESERVATION_STATUS_LABELS[st].ar : RESERVATION_STATUS_LABELS[st].en}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-[#E5E5E0] rounded-xl overflow-x-auto">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#F8F8F7] text-neutral-600 border-b border-[#E5E5E0]">
            <tr>
              <th className="py-3 px-4 text-start">{t(lang, 'المرجع', 'Reference')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'العميل والهاتف', 'Customer')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'المحافظة والعنوان', 'Location')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'المنتج', 'Product')}</th>
              <th className="py-3 px-4 text-end">{t(lang, 'الإجمالي', 'Total')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'تحديث الحالة', 'Status')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'الفاتورة', 'Invoice')}</th>
              <th className="py-3 px-4 text-end">{t(lang, 'الإجراءات', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0EC]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-neutral-500">
                  {t(lang, 'لا توجد حجوزات مطابقة', 'No matching reservations')}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const linkedInvoice = findLinkedInvoice(r);
                const waText = encodeURIComponent(
                  `مرحباً ${r.customerName}، تحديث من عاصمة الشبكات بخصوص حجزك رقم ${r.referenceNumber} (${r.productNameAr}): الحالة الحالية هي "${RESERVATION_STATUS_LABELS[r.status].ar}".`
                );
                return (
                  <tr key={r.id} className="hover:bg-[#F8F8F7]/60">
                    <td className="py-3 px-4 font-mono-num font-bold text-[#9E7822]">
                      {r.referenceNumber}
                      <div className="text-[10px] text-neutral-400 font-normal">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0E0E10]">{r.customerName}</div>
                      <div className="font-mono-num text-neutral-500">{r.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold">{r.governorate}</div>
                      <div className="text-[11px] text-neutral-500 max-w-[180px] truncate">
                        {r.address}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold max-w-[180px] truncate">
                        {lang === 'ar' ? r.productNameAr : r.productNameEn}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono-num">
                        Qty: {r.quantity}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-end">
                      <div className="font-mono-num font-bold">
                        {formatCurrency(r.totalPrice)}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {(() => {
                          const acc = storeSettings.paymentAccounts?.find(
                            (a) => a.id === r.paymentMethod
                          );
                          if (acc) {
                            return `${lang === 'ar' ? acc.labelAr : acc.labelEn} (${acc.accountNumber})`;
                          }
                          return t(lang, 'عند الاستلام', 'On Delivery');
                        })()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={r.status}
                        onChange={(e) =>
                          handleStatusChange(r, e.target.value as ReservationStatus)
                        }
                        className="px-2.5 py-1.5 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-semibold"
                      >
                        {(Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[]).map(
                          (st) => (
                            <option key={st} value={st}>
                              {lang === 'ar'
                                ? RESERVATION_STATUS_LABELS[st].ar
                                : RESERVATION_STATUS_LABELS[st].en}
                            </option>
                          )
                        )}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {linkedInvoice ? (
                        <button
                          type="button"
                          onClick={() => setPreviewInvoice(linkedInvoice)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF5E8] text-[#9E7822] border border-[#C89D3C]/50 hover:bg-[#C89D3C] hover:text-[#0E0E10] font-mono-num font-bold whitespace-nowrap cursor-pointer"
                        >
                          <Lock className="w-3 h-3" />
                          <span>{linkedInvoice.invoiceNumber}</span>
                        </button>
                      ) : r.status !== 'cancelled' ? (
                        <button
                          type="button"
                          disabled={issuingResId === r.id}
                          onClick={() => handleManualIssueFromReservation(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0E0E10] text-white hover:bg-[#C89D3C] hover:text-[#0E0E10] font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{t(lang, 'إصدار فاتورة', 'Issue Invoice')}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {!linkedInvoice && r.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => openEditOrder(r)}
                            title={t(lang, 'تعديل الطلب قبل الفوترة', 'Edit Order Before Invoice')}
                            className="p-1.5 rounded-lg border border-[#E5E5E0] bg-white hover:border-[#C89D3C] text-neutral-700 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <a
                          href={`https://wa.me/967${r.phone.replace(/^967|^0+/, '')}?text=${waText}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-semibold whitespace-nowrap"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{t(lang, 'واتساب', 'WA')}</span>
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

      {/* Edit Reservation Details Before Invoice Issuance Modal */}
      {editingRes && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditingRes(null)}
        >
          <form
            onSubmit={handleSaveOrderEdit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white rounded-2xl border border-[#E5E5E0] p-6 space-y-4 shadow-2xl my-auto"
          >
            <div className="flex items-center justify-between border-b border-[#F0F0EC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0E0E10]">
                  {t(lang, 'تعديل بيانات الطلب قبل الفوترة', 'Edit Order Details Before Invoicing')}
                </h3>
                <p className="text-[11px] font-mono-num text-[#9E7822] font-semibold">
                  {editingRes.referenceNumber} · {lang === 'ar' ? editingRes.productNameAr : editingRes.productNameEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRes(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'اسم العميل', 'Customer Name')}
                </label>
                <input
                  required
                  value={editForm.customerName}
                  onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'الهاتف', 'Phone')}
                </label>
                <input
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'المحافظة', 'Governorate')}
                </label>
                <select
                  value={editForm.governorate}
                  onChange={(e) => setEditForm({ ...editForm, governorate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
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
                  {t(lang, 'العنوان', 'Address')}
                </label>
                <input
                  required
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'الكمية', 'Quantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'سعر الوحدة', 'Unit Price')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.unitPrice}
                  onChange={(e) => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'الخصم', 'Discount')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.discountAmount}
                  onChange={(e) => setEditForm({ ...editForm, discountAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'تكلفة الشحن', 'Shipping Cost')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.shippingCost}
                  onChange={(e) => setEditForm({ ...editForm, shippingCost: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'طريقة الدفع', 'Payment Method')}
              </label>
              <select
                value={editForm.paymentMethod}
                onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
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

            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'ملاحظات الطلب / الفاتورة', 'Order / Invoice Notes')}
              </label>
              <textarea
                rows={2}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              />
            </div>

            <div className="bg-[#FAF5E8] border border-[#C89D3C]/40 rounded-xl px-4 py-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-[#0E0E10]">
                {t(lang, 'الإجمالي بعد التعديل:', 'Updated Order Total:')}
              </span>
              <span className="font-mono-num font-extrabold text-sm text-[#9E7822]" dir="ltr">
                {formatCurrency(
                  Math.max(
                    0,
                    editForm.unitPrice * editForm.quantity -
                      editForm.discountAmount +
                      editForm.shippingCost
                  ),
                  storeSettings.currencyCode || 'USD'
                )}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingRes(null)}
                className="px-4 py-2 rounded-lg border border-[#E5E5E0] text-xs font-semibold cursor-pointer"
              >
                {t(lang, 'إلغاء', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="px-5 py-2 rounded-lg bg-[#0E0E10] text-white hover:bg-[#C89D3C] hover:text-[#0E0E10] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {editSaving ? t(lang, 'جاري الحفظ...', 'Saving...') : t(lang, 'حفظ التعديلات', 'Save Changes')}
              </button>
            </div>
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

export function AdminCustomersModule({
  users,
  reservations,
}: {
  users: UserProfile[];
  reservations: Reservation[];
}) {
  const { lang, userProfile } = useApp();
  const customers = users.filter((u) => u.role === 'customer');

  const toggleStatus = async (u: UserProfile) => {
    if (!userProfile) return;
    const next: UserProfile = {
      ...u,
      status: u.status === 'active' ? 'suspended' : 'active',
    };
    await updateUserRoleAndPermissions(next);
    await logAdminActivity({
      actorUid: userProfile.uid,
      actorEmail: userProfile.email,
      actorRole: userProfile.role,
      action: 'customer_status_toggled',
      entityType: 'user',
      entityId: u.uid,
      summaryAr: `تغيير حالة العميل ${u.displayName} إلى ${next.status}`,
      summaryEn: `Set customer ${u.displayName} status to ${next.status}`,
    });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-[#0E0E10]">
        {t(lang, 'إدارة العملاء وسجل الحجوزات', 'Customers Directory')}
      </h2>

      <div className="bg-white border border-[#E5E5E0] rounded-xl overflow-x-auto">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#F8F8F7] text-neutral-600 border-b border-[#E5E5E0]">
            <tr>
              <th className="py-3 px-4 text-start">{t(lang, 'العميل', 'Customer')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'الهاتف / المحافظة', 'Phone / Location')}</th>
              <th className="py-3 px-4 text-end">{t(lang, 'عدد الحجوزات', 'Bookings')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'تاريخ التسجيل', 'Joined')}</th>
              <th className="py-3 px-4 text-end">{t(lang, 'الحالة', 'Status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0EC]">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-neutral-500">
                  {t(lang, 'لا يوجد عملاء مسجلون بعد', 'No registered customers yet')}
                </td>
              </tr>
            ) : (
              customers.map((c) => {
                const count = reservations.filter((r) => r.customerUid === c.uid).length;
                return (
                  <tr key={c.uid}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0E0E10]">{c.displayName}</div>
                      <div className="text-[11px] text-neutral-500 font-mono-num">{c.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono-num">{c.phone || '-'}</div>
                      <div className="text-[11px] text-neutral-500">{c.governorate || '-'}</div>
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num font-bold">{count}</td>
                    <td className="py-3 px-4 font-mono-num text-neutral-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-end">
                      <button
                        type="button"
                        onClick={() => toggleStatus(c)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          c.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {c.status === 'active' ? t(lang, 'نشط', 'Active') : t(lang, 'موقوف', 'Suspended')}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminHomepageBuilder() {
  const { lang, homepageSections, products, offers, userProfile } = useApp();
  const [draftSections, setDraftSections] = useState<HomepageSection[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishedMsg, setPublishedMsg] = useState('');

  useEffect(() => {
    setDraftSections([...homepageSections].sort((a, b) => a.order - b.order));
  }, [homepageSections]);

  const activeSec = draftSections.find((s) => s.id === selectedId) || draftSections[0] || null;

  const updateSection = (id: string, patch: Partial<HomepageSection>) => {
    setDraftSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s))
    );
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= draftSections.length) return;
    const copy = [...draftSections];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    setDraftSections(copy.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const addNewSection = () => {
    const newSec: HomepageSection = {
      id: `sec_${Date.now()}`,
      sectionType: 'custom_banner',
      titleAr: 'قسم ترويجي جديد',
      titleEn: 'New Promotional Section',
      subtitleAr: 'وصف مختصر يظهر لعملاء عاصمة الشبكات',
      subtitleEn: 'Subtitle displayed to ASEMA NETWORKS visitors',
      ctaTextAr: 'تصفح المنتجات',
      ctaTextEn: 'Browse Catalog',
      ctaLink: '/catalog',
      order: draftSections.length + 1,
      isEnabled: true,
      updatedAt: new Date().toISOString(),
    };
    setDraftSections((prev) => [...prev, newSec]);
    setSelectedId(newSec.id);
  };

  const handleDeleteSection = async (id: string) => {
    setDraftSections((prev) => prev.filter((s) => s.id !== id));
    await removeHomepageSection(id);
  };

  const handlePublishAll = async () => {
    if (!userProfile) return;
    setSaving(true);
    setPublishedMsg('');
    try {
      const normalized = draftSections.map((s, idx) => ({
        ...s,
        order: idx + 1,
        updatedAt: new Date().toISOString(),
      }));
      await saveHomepageSectionsBatch(normalized);
      await logAdminActivity({
        actorUid: userProfile.uid,
        actorEmail: userProfile.email,
        actorRole: userProfile.role,
        action: 'homepage_published',
        entityType: 'homepage',
        summaryAr: `نشر تحديثات منشئ الصفحة الرئيسية (${normalized.length} أقسام)`,
        summaryEn: `Published homepage layout (${normalized.length} sections)`,
      });
      setPublishedMsg(
        t(lang, 'تم نشر تغييرات الصفحة الرئيسية للموقع العام بنجاح.', 'Homepage changes published live!')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0E0E10]">
            {t(lang, 'منشئ الصفحة الرئيسية المرئي', 'Visual Homepage Builder')}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t(
              lang,
              'أضف أقساماً، عدّل العناوين والصور، أعد الترتيب، اختر المنتجات المميزة وعاين قبل النشر.',
              'Add, reorder, edit titles/images, select featured items, preview, and publish live.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addNewSection}
            className="px-3.5 py-2 rounded-lg border border-[#E5E5E0] bg-white text-xs font-semibold hover:border-[#C89D3C] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t(lang, 'إضافة قسم', 'Add Section')}</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen((v) => !v)}
            className="px-3.5 py-2 rounded-lg border border-[#E5E5E0] bg-white text-xs font-semibold hover:border-[#C89D3C] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{previewOpen ? t(lang, 'إغلاق المعاينة', 'Close Preview') : t(lang, 'معاينة قبل النشر', 'Preview')}</span>
          </button>
          <button
            type="button"
            onClick={handlePublishAll}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-[#0E0E10] text-white text-xs font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors cursor-pointer"
          >
            {saving ? t(lang, 'جاري النشر...', 'Publishing...') : t(lang, 'نشر على الموقع', 'Publish Live')}
          </button>
        </div>
      </div>

      {publishedMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-xs font-semibold">
          {publishedMsg}
        </div>
      )}

      {previewOpen && (
        <div className="bg-[#0E0E10] text-white rounded-xl p-6 space-y-3 border border-[#C89D3C]/40">
          <div className="text-xs font-bold text-[#D4AF37]">
            {t(lang, 'معاينة ترتيب وأقسام الصفحة الرئيسية:', 'Live Structure Preview:')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {draftSections
              .filter((s) => s.isEnabled)
              .map((s) => (
                <div key={s.id} className="bg-[#17171B] border border-white/10 rounded-lg p-3">
                  <div className="text-[11px] text-[#D4AF37] font-mono-num">
                    #{s.order} · {s.sectionType}
                  </div>
                  <div className="text-xs font-bold mt-1">
                    {lang === 'ar' ? s.titleAr : s.titleEn}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Order & Enable/Disable List */}
        <div className="lg:col-span-5 bg-white border border-[#E5E5E0] rounded-xl divide-y divide-[#F0F0EC]">
          {draftSections.map((sec, idx) => (
            <div
              key={sec.id}
              onClick={() => setSelectedId(sec.id)}
              className={`p-3.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                activeSec?.id === sec.id ? 'bg-[#FAF5E8]' : 'hover:bg-[#F8F8F7]'
              }`}
            >
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#0E0E10] truncate">
                  {idx + 1}. {lang === 'ar' ? sec.titleAr : sec.titleEn}
                </div>
                <div className="text-[11px] text-neutral-500 font-mono-num">
                  {sec.sectionType} · {sec.isEnabled ? t(lang, 'ظاهر', 'Enabled') : t(lang, 'مخفي', 'Hidden')}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => moveSection(idx, -1)}
                  className="p-1.5 rounded hover:bg-neutral-200 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(idx, 1)}
                  className="p-1.5 rounded hover:bg-neutral-200 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSection(sec.id)}
                  className="p-1.5 rounded hover:bg-rose-50 text-rose-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Section Editor */}
        <div className="lg:col-span-7 bg-white border border-[#E5E5E0] rounded-xl p-6">
          {activeSec ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0F0EC] pb-3">
                <h3 className="text-base font-bold text-[#0E0E10]">
                  {t(lang, 'تحرير القسم', 'Edit Section')} ({activeSec.sectionType})
                </h3>
                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeSec.isEnabled}
                    onChange={(e) => updateSection(activeSec.id, { isEnabled: e.target.checked })}
                  />
                  <span>{t(lang, 'إظهار في الموقع', 'Enabled on Site')}</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {t(lang, 'نوع القسم', 'Section Type')}
                  </label>
                  <select
                    value={activeSec.sectionType}
                    onChange={(e) =>
                      updateSection(activeSec.id, {
                        sectionType: e.target.value as HomepageSectionType,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
                  >
                    {[
                      'hero',
                      'categories',
                      'featured_products',
                      'latest_offers',
                      'exclusive_products',
                      'new_arrivals',
                      'best_sellers',
                      'advertisements',
                      'announcements',
                      'custom_banner',
                      'brands',
                      'contact_support',
                    ].map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {t(lang, 'رابط الزر', 'CTA Link')}
                  </label>
                  <input
                    value={activeSec.ctaLink || ''}
                    onChange={(e) => updateSection(activeSec.id, { ctaLink: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {t(lang, 'العنوان (عربي)', 'Title (AR)')}
                  </label>
                  <input
                    value={activeSec.titleAr}
                    onChange={(e) => updateSection(activeSec.id, { titleAr: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {t(lang, 'العنوان (إنجليزي)', 'Title (EN)')}
                  </label>
                  <input
                    value={activeSec.titleEn}
                    onChange={(e) => updateSection(activeSec.id, { titleEn: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {t(lang, 'النص الفرعي (عربي)', 'Subtitle (AR)')}
                  </label>
                  <textarea
                    rows={2}
                    value={activeSec.subtitleAr || ''}
                    onChange={(e) => updateSection(activeSec.id, { subtitleAr: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {t(lang, 'النص الفرعي (إنجليزي)', 'Subtitle (EN)')}
                  </label>
                  <textarea
                    rows={2}
                    value={activeSec.subtitleEn || ''}
                    onChange={(e) => updateSection(activeSec.id, { subtitleEn: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
                  />
                </div>
              </div>

              <ImageUploader
                label={t(lang, 'صورة القسم / البنر', 'Section Image / Banner')}
                value={activeSec.imageUrl || ''}
                onChange={(url) => updateSection(activeSec.id, { imageUrl: url })}
              />

              {(activeSec.sectionType === 'featured_products' ||
                activeSec.sectionType === 'exclusive_products' ||
                activeSec.sectionType === 'new_arrivals' ||
                activeSec.sectionType === 'best_sellers') && (
                <div className="space-y-2 pt-2 border-t border-[#F0F0EC]">
                  <div className="text-xs font-bold text-[#0E0E10]">
                    {t(lang, 'اختيار المنتجات المعروضة في هذا القسم:', 'Select Featured Products:')}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                    {products.map((p) => {
                      const picked = (activeSec.selectedProductIds || []).includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 text-xs p-2 rounded border border-[#E5E5E0] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={picked}
                            onChange={(e) => {
                              const current = activeSec.selectedProductIds || [];
                              const next = e.target.checked
                                ? [...current, p.id].slice(0, 12)
                                : current.filter((id) => id !== p.id);
                              updateSection(activeSec.id, { selectedProductIds: next });
                            }}
                          />
                          <span className="truncate">{lang === 'ar' ? p.nameAr : p.nameEn}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeSec.sectionType === 'latest_offers' && (
                <div className="space-y-2 pt-2 border-t border-[#F0F0EC]">
                  <div className="text-xs font-bold text-[#0E0E10]">
                    {t(lang, 'اختيار العروض المميزة:', 'Select Featured Offers:')}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {offers.map((o) => {
                      const picked = (activeSec.selectedOfferIds || []).includes(o.id);
                      return (
                        <label
                          key={o.id}
                          className="flex items-center gap-2 text-xs p-2 rounded border border-[#E5E5E0] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={picked}
                            onChange={(e) => {
                              const current = activeSec.selectedOfferIds || [];
                              const next = e.target.checked
                                ? [...current, o.id].slice(0, 12)
                                : current.filter((id) => id !== o.id);
                              updateSection(activeSec.id, { selectedOfferIds: next });
                            }}
                          />
                          <span className="truncate">{lang === 'ar' ? o.titleAr : o.titleEn}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-neutral-500">
              {t(lang, 'اختر قسماً من القائمة للتعديل.', 'Select a section to edit.')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
