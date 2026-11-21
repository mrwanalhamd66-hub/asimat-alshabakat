import React, { useEffect, useState } from 'react';
import {
  Check,
  DatabaseBackup,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useApp } from '../../context/AppContext.tsx';
import { DEFAULT_PAYMENT_ACCOUNTS } from '../../data/seedData.ts';
import { formatCurrency, t } from '../../i18n/translations.ts';
import {
  exportFullStoreSnapshot,
  getAdminSettings,
  isOfferCurrentlyActive,
  logAdminActivity,
  markNotificationRead,
  restoreFullStoreSnapshot,
  saveAdminSettings,
  saveStoreSettings,
  updateUserRoleAndPermissions,
} from '../../services/firestoreService.ts';
import type {
  ActivityLog,
  AdminPermission,
  AdminSettings,
  AppNotification,
  PaymentAccount,
  Reservation,
  StoreBackup,
  StoreSettings,
  UserProfile,
  UserRole,
} from '../../types/index.ts';

const ALL_PERMISSIONS: { id: AdminPermission; ar: string; en: string }[] = [
  { id: 'dashboard', ar: 'لوحة الإحصائيات', en: 'Dashboard' },
  { id: 'products', ar: 'المنتجات', en: 'Products' },
  { id: 'categories', ar: 'التصنيفات', en: 'Categories' },
  { id: 'offers', ar: 'العروض', en: 'Offers' },
  { id: 'packages', ar: 'باقات المشاريع', en: 'Project Packages' },
  { id: 'reservations', ar: 'الحجوزات', en: 'Reservations' },
  { id: 'invoices', ar: 'الفواتير الإلكترونية', en: 'Invoices' },
  { id: 'academy', ar: 'الأكاديمية والشهادات', en: 'Academy & Certs' },
  { id: 'community', ar: 'إشراف المجتمع', en: 'Community Mod' },
  { id: 'lab', ar: 'المختبر التقني', en: 'Technical Lab' },
  { id: 'engineers', ar: 'توثيق المهندسين', en: 'Engineers Verify' },
  { id: 'rewards', ar: 'النقاط والمكافآت', en: 'Rewards' },
  { id: 'ads', ar: 'الإعلانات', en: 'Advertisements' },
  { id: 'customers', ar: 'العملاء', en: 'Customers' },
  { id: 'brands', ar: 'العلامات التجارية', en: 'Brands' },
  { id: 'homepage', ar: 'الصفحة الرئيسية', en: 'Homepage Builder' },
  { id: 'chat', ar: 'الدردشة الفورية', en: 'Live Chat' },
  { id: 'notifications', ar: 'الإشعارات', en: 'Notifications' },
  { id: 'reports', ar: 'التقارير', en: 'Reports' },
  { id: 'settings', ar: 'الإعدادات', en: 'Settings' },
];

export function AdminNotificationsModule({
  notifications,
}: {
  notifications: AppNotification[];
}) {
  const { lang, products, offers } = useApp();

  const lowStockProducts = products.filter((p) => p.availableQuantity <= 5);
  const expiringOffers = offers.filter((o) => {
    const diff = Date.parse(o.endDate) - Date.now();
    return o.isActive && diff > 0 && diff <= 48 * 60 * 60 * 1000;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#0E0E10]">
        {t(lang, 'مركز الإشعارات والتنبيهات', 'Notifications Center')}
      </h2>

      {(lowStockProducts.length > 0 || expiringOffers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#FAF5E8] border border-[#C89D3C]/40 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-[#9E7822]">
              {t(lang, 'تنبيهات المخزون المنخفض (≤ 5 قطع)', 'Low Stock Alerts (≤ 5 units)')}
            </h3>
            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-neutral-600">{t(lang, 'المخزون مستقر', 'Stock healthy')}</p>
            ) : (
              lowStockProducts.map((p) => (
                <div key={p.id} className="text-xs flex justify-between">
                  <span>{lang === 'ar' ? p.nameAr : p.nameEn}</span>
                  <span className="font-mono-num font-bold">{p.availableQuantity}</span>
                </div>
              ))
            )}
          </div>

          <div className="bg-white border border-[#E5E5E0] rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-[#0E0E10]">
              {t(lang, 'عروض توشك على الانتهاء (خلال 48 ساعة)', 'Offers Expiring Within 48h')}
            </h3>
            {expiringOffers.length === 0 ? (
              <p className="text-xs text-neutral-500">{t(lang, 'لا توجد عروض قريبة الانتهاء', 'No expiring offers')}</p>
            ) : (
              expiringOffers.map((o) => (
                <div key={o.id} className="text-xs flex justify-between">
                  <span>{lang === 'ar' ? o.titleAr : o.titleEn}</span>
                  <span className="font-mono-num text-amber-700">
                    {new Date(o.endDate).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-[#E5E5E0] rounded-xl divide-y divide-[#F0F0EC]">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            {t(lang, 'لا توجد إشعارات مسجلة بعد', 'No notifications recorded yet')}
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-center justify-between gap-4 ${
                n.isRead ? 'bg-white' : 'bg-[#FAF5E8]/50'
              }`}
            >
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#0E0E10]">
                  {lang === 'ar' ? n.titleAr : n.titleEn}
                </div>
                <div className="text-xs text-neutral-600">
                  {lang === 'ar' ? n.messageAr : n.messageEn}
                </div>
                <div className="text-[11px] text-neutral-400 font-mono-num">
                  {new Date(n.createdAt).toLocaleString()} · WhatsApp Ready
                </div>
              </div>
              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => markNotificationRead(n.id)}
                  className="px-3 py-1.5 rounded-lg border border-[#E5E5E0] text-xs font-semibold hover:border-[#C89D3C] inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t(lang, 'مقروء', 'Read')}</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function AdminReportsModule({
  reservations,
  users,
}: {
  reservations: Reservation[];
  users: UserProfile[];
}) {
  const { lang, products, offers, ads } = useApp();

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const dailyBookings = reservations.filter((r) => now - Date.parse(r.createdAt) <= dayMs);
  const weeklyBookings = reservations.filter((r) => now - Date.parse(r.createdAt) <= 7 * dayMs);
  const monthlyBookings = reservations.filter((r) => now - Date.parse(r.createdAt) <= 30 * dayMs);

  const totalViews = products.reduce((s, p) => s + (p.viewCount || 0), 0);
  const conversionRate =
    totalViews > 0 ? ((reservations.length / totalViews) * 100).toFixed(2) : '0.00';

  const topProducts = [...products]
    .sort((a, b) => (b.reservationCount || 0) - (a.reservationCount || 0))
    .slice(0, 5);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const resSheet = XLSX.utils.json_to_sheet(
      reservations.map((r) => ({
        Reference: r.referenceNumber,
        Customer: r.customerName,
        Phone: r.phone,
        Governorate: r.governorate,
        Product: r.productNameEn || r.productNameAr,
        Quantity: r.quantity,
        TotalUSD: r.totalPrice,
        Status: r.status,
        Date: r.createdAt,
      }))
    );
    const prodSheet = XLSX.utils.json_to_sheet(
      products.map((p) => ({
        Model: p.modelNumber,
        NameEN: p.nameEn,
        NameAR: p.nameAr,
        RetailUSD: p.retailPrice,
        Stock: p.availableQuantity,
        Views: p.viewCount || 0,
        Bookings: p.reservationCount || 0,
      }))
    );
    XLSX.utils.book_append_sheet(wb, resSheet, 'Reservations');
    XLSX.utils.book_append_sheet(wb, prodSheet, 'Products');
    XLSX.writeFile(wb, `ASEMA_NETWORKS_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPdf = () => {
    const docPdf = new jsPDF();
    docPdf.setFontSize(16);
    docPdf.text('ASEMA NETWORKS - Analytics & Reservations Report', 14, 18);
    docPdf.setFontSize(10);
    docPdf.text(
      `Generated: ${new Date().toLocaleString()} | Total Bookings: ${reservations.length} | Conversion: ${conversionRate}%`,
      14,
      26
    );
    autoTable(docPdf, {
      startY: 32,
      head: [['Reference', 'Customer', 'Governorate', 'Product', 'Qty', 'Total ($)', 'Status']],
      body: reservations.slice(0, 40).map((r) => [
        r.referenceNumber,
        r.customerName,
        r.governorate,
        (r.productNameEn || r.productNameAr || '').slice(0, 26),
        String(r.quantity),
        String(r.totalPrice),
        r.status,
      ]),
    });
    docPdf.save(`ASEMA_NETWORKS_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0E0E10]">
            {t(lang, 'التقارير والتحليلات وتصدير البيانات', 'Reports & Analytics')}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t(
              lang,
              'مؤشرات الحجوزات اليومية والأسبوعية والشهرية وأداء الإعلانات وتصدير PDF و Excel.',
              'Daily, weekly, and monthly metrics with PDF and Excel export.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-lg border border-[#E5E5E0] bg-white hover:border-[#C89D3C] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>{t(lang, 'تصدير Excel', 'Export Excel')}</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-3.5 py-2 rounded-lg bg-[#0E0E10] text-white hover:bg-[#C89D3C] hover:text-[#0E0E10] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>{t(lang, 'تصدير PDF', 'Export PDF')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: t(lang, 'حجوزات اليوم', 'Daily Bookings'), val: dailyBookings.length },
          { label: t(lang, 'حجوزات الأسبوع', 'Weekly Bookings'), val: weeklyBookings.length },
          { label: t(lang, 'حجوزات الشهر', 'Monthly Bookings'), val: monthlyBookings.length },
          { label: t(lang, 'نسبة التحويل', 'Conversion Rate'), val: `${conversionRate}%` },
          { label: t(lang, 'العملاء المسجلون', 'Customer Activity'), val: users.length },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-[#E5E5E0] rounded-xl p-4">
            <div className="text-xs text-neutral-500">{kpi.label}</div>
            <div className="text-2xl font-bold font-mono-num text-[#0E0E10] mt-1">
              {kpi.val}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E5E5E0] rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-[#0E0E10]">
            {t(lang, 'الأجهزة الأكثر طلباً وشعبية', 'Most Popular Products')}
          </h3>
          <div className="divide-y divide-[#F0F0EC]">
            {topProducts.map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                <span className="font-medium truncate max-w-[240px]">
                  {lang === 'ar' ? p.nameAr : p.nameEn}
                </span>
                <span className="font-mono-num text-neutral-600">
                  {p.viewCount || 0} views · {p.reservationCount || 0} bookings
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E5E5E0] rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-[#0E0E10]">
            {t(lang, 'أداء العروض والحملات الإعلانية', 'Offers & Ad Performance')}
          </h3>
          <div className="divide-y divide-[#F0F0EC]">
            {offers.map((o) => (
              <div key={o.id} className="py-2.5 flex items-center justify-between text-xs">
                <span className="font-medium truncate max-w-[230px]">
                  {lang === 'ar' ? o.titleAr : o.titleEn}
                </span>
                <span className="font-mono-num">
                  {formatCurrency(o.discountedPrice)} ·{' '}
                  {isOfferCurrentlyActive(o) ? 'Active' : 'Expired'}
                </span>
              </div>
            ))}
            {ads.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                <span className="text-neutral-600 truncate max-w-[230px]">
                  Ad: {lang === 'ar' ? a.titleAr : a.titleEn}
                </span>
                <span className="font-mono-num text-neutral-500">
                  {a.impressions || 0} imp · {a.clicks || 0} clicks
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminSettingsModule() {
  const { lang, storeSettings, userProfile, isSuperAdmin } = useApp();
  const [form, setForm] = useState<StoreSettings>(storeSettings);
  const [phonesText, setPhonesText] = useState(storeSettings.phones.join(', '));
  const [accounts, setAccounts] = useState<PaymentAccount[]>(
    storeSettings.paymentAccounts && storeSettings.paymentAccounts.length > 0
      ? storeSettings.paymentAccounts
      : DEFAULT_PAYMENT_ACCOUNTS
  );
  const [adminCfg, setAdminCfg] = useState<AdminSettings>({
    id: 'main',
    whatsappBusinessPhoneId: '',
    whatsappWebhookVerifyToken: 'asema_networks_wa_verify',
    whatsappAutoNotifyBookings: true,
    lowStockThreshold: 5,
    paymentGatewayProvider: 'none_pay_on_delivery',
    updatedAt: new Date().toISOString(),
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    setForm(storeSettings);
    setPhonesText((storeSettings.phones || []).join(', '));
    setAccounts(
      storeSettings.paymentAccounts && storeSettings.paymentAccounts.length > 0
        ? storeSettings.paymentAccounts
        : DEFAULT_PAYMENT_ACCOUNTS
    );
  }, [storeSettings]);

  useEffect(() => {
    if (isSuperAdmin) {
      getAdminSettings()
        .then((res) => {
          if (res) setAdminCfg(res);
        })
        .catch(() => null);
    }
  }, [isSuperAdmin]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const phones = phonesText
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 5);

      const cleanAccounts = accounts
        .filter((a) => a.labelAr.trim() && a.accountNumber.trim())
        .slice(0, 12);

      const nextStore: StoreSettings = {
        ...form,
        id: 'main',
        phones: phones.length > 0 ? phones : ['770581056'],
        paymentAccounts: cleanAccounts,
        enabledPaymentMethods: [
          'pay_on_pickup_or_delivery',
          ...cleanAccounts.filter((a) => a.isActive).map((a) => a.id),
        ].slice(0, 8),
        updatedAt: new Date().toISOString(),
      };
      await saveStoreSettings(nextStore);

      if (isSuperAdmin) {
        await saveAdminSettings({
          ...adminCfg,
          updatedAt: new Date().toISOString(),
        });
        await fetch('/api/whatsapp/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumberId: adminCfg.whatsappBusinessPhoneId,
            verifyToken: adminCfg.whatsappWebhookVerifyToken,
            storeWhatsappNumber: nextStore.whatsappNumber,
            autoNotifyBookings: adminCfg.whatsappAutoNotifyBookings,
          }),
        });
      }

      await logAdminActivity({
        actorUid: userProfile.uid,
        actorEmail: userProfile.email,
        actorRole: userProfile.role,
        action: 'settings_updated',
        entityType: 'store_settings',
        summaryAr: 'تحديث إعدادات المتجر وتكامل واتساب',
        summaryEn: 'Updated store settings & WhatsApp integration config',
      });

      setSavedMsg(t(lang, 'تم حفظ إعدادات المتجر بنجاح.', 'Store settings saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      <h2 className="text-xl font-bold text-[#0E0E10]">
        {t(lang, 'إعدادات المتجر والتكامل المستقبلي', 'Store Settings & Integration Readiness')}
      </h2>

      <div className="bg-white border border-[#E5E5E0] rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">
              {t(lang, 'اسم المتجر (عربي)', 'Store Name (AR)')}
            </label>
            <input
              value={form.storeNameAr}
              onChange={(e) => setForm({ ...form, storeNameAr: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {t(lang, 'اسم المتجر (إنجليزي)', 'Store Name (EN)')}
            </label>
            <input
              value={form.storeNameEn}
              onChange={(e) => setForm({ ...form, storeNameEn: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {t(lang, 'العنوان في صنعاء (عربي)', 'Location (AR)')}
            </label>
            <input
              value={form.locationAr}
              onChange={(e) => setForm({ ...form, locationAr: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {t(lang, 'العنوان في صنعاء (إنجليزي)', 'Location (EN)')}
            </label>
            <input
              value={form.locationEn}
              onChange={(e) => setForm({ ...form, locationEn: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {t(lang, 'أرقام التواصل (مفصولة بفاصلة)', 'Contact Phones (comma-separated)')}
            </label>
            <input
              value={phonesText}
              onChange={(e) => setPhonesText(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {t(lang, 'رقم واتساب المتجر (دولي)', 'Store WhatsApp Number')}
            </label>
            <input
              value={form.whatsappNumber || ''}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold mb-1">
              {t(lang, 'شريط الإعلان العلوي (عربي)', 'Top Announcement (AR)')}
            </label>
            <input
              value={form.announcementAr || ''}
              onChange={(e) => setForm({ ...form, announcementAr: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              {t(lang, 'شريط الإعلان العلوي (إنجليزي)', 'Top Announcement (EN)')}
            </label>
            <input
              value={form.announcementEn || ''}
              onChange={(e) => setForm({ ...form, announcementEn: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-5 pt-2 text-xs font-semibold">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.showAnnouncement !== false}
              onChange={(e) => setForm({ ...form, showAnnouncement: e.target.checked })}
            />
            <span>{t(lang, 'إظهار شريط الإعلان العلوي', 'Show Announcement Bar')}</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.requireOnlinePayment)}
              onChange={(e) => setForm({ ...form, requireOnlinePayment: e.target.checked })}
            />
            <span>{t(lang, 'تفعيل الدفع الإلكتروني عند توفر البوابة', 'Enable Online Payment Gateway (Future)')}</span>
          </label>
        </div>
      </div>

      <div className="bg-white border border-[#E5E5E0] rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#0E0E10]">
              {t(
                lang,
                'طرق الدفع وأرقام الحسابات البنكية والمحافظ (كريمي / جيب / جوالي)',
                'Payment Accounts & Wallets (Kuraimi / Jeeb / Jawali)'
              )}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {t(
                lang,
                'تظهر للعملاء في المتجر ونموذج الحجز وتوجههم مباشرة إلى واتساب المتجر الرئيسي.',
                'Displayed to customers on the storefront & booking modal with instant WhatsApp redirect.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setAccounts((prev) => [
                ...prev,
                {
                  id: `acc_${Date.now()}`,
                  labelAr: 'حساب جديد',
                  labelEn: 'New Account',
                  holderAr: 'مروان فتح مفتاح حامد',
                  holderEn: 'Marwan Fath Muftah Hamed',
                  accountNumber: '',
                  currencyOrTypeAr: 'حساب / محفظة',
                  currencyOrTypeEn: 'Account / Wallet',
                  isActive: true,
                },
              ])
            }
            disabled={accounts.length >= 12}
            className="px-3 py-1.5 rounded-lg border border-[#E5E5E0] hover:border-[#C89D3C] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t(lang, 'إضافة حساب', 'Add Account')}</span>
          </button>
        </div>

        <div className="space-y-3">
          {accounts.map((acc, idx) => (
            <div
              key={acc.id}
              className="p-4 rounded-xl bg-[#F8F8F7] border border-[#E5E5E0] grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
            >
              <div className="md:col-span-3">
                <label className="block text-[11px] font-semibold mb-1">
                  {t(lang, 'اسم الطريقة (عربي)', 'Method Label (AR)')}
                </label>
                <input
                  value={acc.labelAr}
                  onChange={(e) => {
                    const next = [...accounts];
                    next[idx] = { ...acc, labelAr: e.target.value };
                    setAccounts(next);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E5E0] rounded-lg"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[11px] font-semibold mb-1">
                  {t(lang, 'الاسم (صاحب الحساب)', 'Account Holder')}
                </label>
                <input
                  value={acc.holderAr}
                  onChange={(e) => {
                    const next = [...accounts];
                    next[idx] = { ...acc, holderAr: e.target.value };
                    setAccounts(next);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E5E0] rounded-lg"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[11px] font-semibold mb-1">
                  {t(lang, 'رقم الحساب / المحفظة', 'Account Number')}
                </label>
                <input
                  value={acc.accountNumber}
                  onChange={(e) => {
                    const next = [...accounts];
                    next[idx] = { ...acc, accountNumber: e.target.value };
                    setAccounts(next);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E5E0] rounded-lg font-mono-num"
                  dir="ltr"
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-2 pb-1">
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acc.isActive}
                    onChange={(e) => {
                      const next = [...accounts];
                      next[idx] = { ...acc, isActive: e.target.checked };
                      setAccounts(next);
                    }}
                  />
                  <span>{t(lang, 'مفعّل', 'Active')}</span>
                </label>
              </div>
              <div className="md:col-span-1 flex justify-end pb-1">
                <button
                  type="button"
                  onClick={() => setAccounts(accounts.filter((a) => a.id !== acc.id))}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  aria-label="Remove account"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isSuperAdmin && (
        <div className="bg-white border border-[#C89D3C]/40 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#0E0E10]">
            {t(
              lang,
              'جاهزية تكامل WhatsApp Business API (للمشرف العام فقط)',
              'WhatsApp Business API Architecture (Super Admin Only)'
            )}
          </h3>
          <p className="text-xs text-neutral-500">
            Webhook Endpoint: <span className="font-mono-num font-semibold">/api/whatsapp/webhook</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Phone Number ID</label>
              <input
                value={adminCfg.whatsappBusinessPhoneId || ''}
                onChange={(e) =>
                  setAdminCfg({ ...adminCfg, whatsappBusinessPhoneId: e.target.value })
                }
                placeholder="Meta Cloud Phone ID"
                className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Webhook Verify Token</label>
              <input
                value={adminCfg.whatsappWebhookVerifyToken || ''}
                onChange={(e) =>
                  setAdminCfg({ ...adminCfg, whatsappWebhookVerifyToken: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'حد تنبيه المخزون المنخفض', 'Low Stock Threshold')}
              </label>
              <input
                type="number"
                value={adminCfg.lowStockThreshold}
                onChange={(e) =>
                  setAdminCfg({ ...adminCfg, lowStockThreshold: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
              />
            </div>
          </div>
        </div>
      )}

      {savedMsg && <p className="text-xs text-emerald-700 font-semibold">{savedMsg}</p>}

      <button
        type="submit"
        disabled={saving}
        className="px-6 py-2.5 rounded-lg bg-[#0E0E10] text-white text-sm font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors cursor-pointer"
      >
        {saving ? t(lang, 'جاري الحفظ...', 'Saving...') : t(lang, 'حفظ الإعدادات', 'Save Settings')}
      </button>
    </form>
  );
}

export function AdminUsersPermissionsModule({ users }: { users: UserProfile[] }) {
  const { lang, userProfile, isSuperAdmin } = useApp();

  if (!isSuperAdmin) {
    return (
      <div className="bg-white border border-[#E5E5E0] rounded-xl p-8 text-center text-sm text-neutral-600">
        {t(
          lang,
          'صلاحية إدارة المشرفين وتوزيع الصلاحيات محصورة بالمشرف العام (Super Admin) فقط.',
          'Only Super Admin can manage administrator roles and permissions.'
        )}
      </div>
    );
  }

  const handleRoleChange = async (target: UserProfile, role: UserRole) => {
    if (!userProfile) return;
    await updateUserRoleAndPermissions({
      ...target,
      role,
      permissions:
        role === 'super_admin'
          ? ALL_PERMISSIONS.map((p) => p.id)
          : role === 'manager'
          ? target.permissions && target.permissions.length > 0
            ? target.permissions
            : ['dashboard', 'products', 'offers', 'reservations', 'ads', 'chat']
          : role === 'trainer'
          ? ['academy']
          : [],
    });
    await logAdminActivity({
      actorUid: userProfile.uid,
      actorEmail: userProfile.email,
      actorRole: userProfile.role,
      action: 'user_role_updated',
      entityType: 'user',
      entityId: target.uid,
      summaryAr: `تغيير دور ${target.email} إلى ${role}`,
      summaryEn: `Changed ${target.email} role to ${role}`,
    });
  };

  const togglePerm = async (target: UserProfile, perm: AdminPermission) => {
    const current = target.permissions || [];
    const next = current.includes(perm)
      ? current.filter((p) => p !== perm)
      : [...current, perm];
    await updateUserRoleAndPermissions({ ...target, permissions: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#0E0E10]">
          {t(lang, 'المستخدمون والصلاحيات (RBAC)', 'Users & Role Permissions')}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          {t(
            lang,
            'تعيين المشرفين (Managers) وتحديد الأقسام المسموح لهم بإدارتها. المشرف العام فقط يتحكم بهذه الصفحة.',
            'Assign Managers and granular module permissions. Restricted to Super Admin.'
          )}
        </p>
      </div>

      <div className="space-y-4">
        {users.map((u) => (
          <div
            key={u.uid}
            className="bg-white border border-[#E5E5E0] rounded-xl p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-[#0E0E10]">{u.displayName}</div>
                <div className="text-xs text-neutral-500 font-mono-num">{u.email}</div>
              </div>
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                className="px-3 py-1.5 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-semibold"
              >
                <option value="customer">Customer (عميل)</option>
                <option value="trainer">Trainer (مدرب أكاديمية)</option>
                <option value="manager">Manager (مشرف)</option>
                <option value="super_admin">Super Admin (مالك)</option>
              </select>
            </div>

            {u.role === 'manager' && (
              <div className="pt-3 border-t border-[#F0F0EC] flex flex-wrap gap-3">
                {ALL_PERMISSIONS.map((perm) => {
                  const checked = (u.permissions || []).includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      className="inline-flex items-center gap-1.5 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePerm(u, perm.id)}
                      />
                      <span>{lang === 'ar' ? perm.ar : perm.en}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminBackupRestoreModule({ backups }: { backups: StoreBackup[] }) {
  const { lang, userProfile } = useApp();
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleExportSnapshot = async () => {
    if (!userProfile) return;
    setBusy(true);
    setStatusMsg('');
    try {
      const snapshot = await exportFullStoreSnapshot(userProfile);
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ASEMA_NETWORKS_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await logAdminActivity({
        actorUid: userProfile.uid,
        actorEmail: userProfile.email,
        actorRole: userProfile.role,
        action: 'backup_created',
        entityType: 'backup',
        summaryAr: 'إنشاء وتنزيل نسخة احتياطية كاملة لقاعدة البيانات',
        summaryEn: 'Created & downloaded full database backup snapshot',
      });
      setStatusMsg(t(lang, 'تم إنشاء وتنزيل النسخة الاحتياطية بنجاح.', 'Backup exported successfully.'));
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;
    setBusy(true);
    setStatusMsg('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { data?: Record<string, Record<string, unknown>[]> };
      if (!parsed.data) throw new Error('Invalid backup format');
      await restoreFullStoreSnapshot(parsed.data);
      await logAdminActivity({
        actorUid: userProfile.uid,
        actorEmail: userProfile.email,
        actorRole: userProfile.role,
        action: 'backup_restored',
        entityType: 'backup',
        summaryAr: `استعادة بيانات المتجر من الملف: ${file.name}`,
        summaryEn: `Restored store data from ${file.name}`,
      });
      setStatusMsg(t(lang, 'تمت استعادة البيانات بنجاح.', 'Database restored successfully.'));
    } catch {
      setStatusMsg(t(lang, 'ملف النسخة الاحتياطية غير صالح.', 'Invalid backup JSON file.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#0E0E10]">
        {t(lang, 'النسخ الاحتياطي والاستعادة', 'Backup & Restore')}
      </h2>

      <div className="bg-white border border-[#E5E5E0] rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm font-bold text-[#0E0E10] flex items-center gap-2">
            <DatabaseBackup className="w-4 h-4 text-[#C89D3C]" />
            <span>{t(lang, 'تصدير واستعادة قاعدة بيانات المتجر', 'Database Snapshot & Recovery')}</span>
          </div>
          <p className="text-xs text-neutral-500">
            {t(
              lang,
              'تنزيل نسخة JSON شاملة للمنتجات، العروض، الإعلانات، الحجوزات، وأقسام الصفحة الرئيسية.',
              'Download or restore a full JSON snapshot of products, offers, ads, reservations, and layout.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportSnapshot}
            disabled={busy}
            className="px-4 py-2.5 rounded-lg bg-[#0E0E10] text-white text-xs font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t(lang, 'إنشاء وتنزيل نسخة احتياطية', 'Export Full Backup')}</span>
          </button>

          <label className="px-4 py-2.5 rounded-lg border border-[#E5E5E0] bg-[#F8F8F7] hover:border-[#C89D3C] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{t(lang, 'استعادة من ملف JSON', 'Restore from JSON')}</span>
            <input type="file" accept="application/json" onChange={handleRestoreFile} className="hidden" />
          </label>
        </div>
      </div>

      {statusMsg && (
        <p className="text-xs font-semibold text-[#9E7822] bg-[#FAF5E8] border border-[#C89D3C]/40 rounded-lg px-4 py-2.5">
          {statusMsg}
        </p>
      )}

      <div className="bg-white border border-[#E5E5E0] rounded-xl divide-y divide-[#F0F0EC]">
        {backups.map((b) => (
          <div key={b.id} className="p-4 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-[#0E0E10]">{b.label}</div>
              <div className="text-neutral-500 font-mono-num">
                {b.createdByEmail} · {new Date(b.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="text-neutral-600 font-mono-num">
              {b.recordCounts ? `${Object.values(b.recordCounts).reduce((a, c) => a + c, 0)} records` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminActivityLogsModule({ logs }: { logs: ActivityLog[] }) {
  const { lang } = useApp();
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-[#0E0E10]">
        {t(lang, 'سجل النشاطات الإدارية', 'Admin Activity Logs')}
      </h2>

      <div className="bg-white border border-[#E5E5E0] rounded-xl overflow-x-auto">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#F8F8F7] text-neutral-600 border-b border-[#E5E5E0]">
            <tr>
              <th className="py-3 px-4 text-start">{t(lang, 'التاريخ', 'Timestamp')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'المستخدم', 'Actor')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'العملية', 'Action')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'التفاصيل', 'Summary')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0EC]">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="py-2.5 px-4 font-mono-num text-neutral-500">
                  {new Date(l.createdAt).toLocaleString()}
                </td>
                <td className="py-2.5 px-4 font-mono-num">
                  {l.actorEmail} ({l.actorRole})
                </td>
                <td className="py-2.5 px-4 font-mono-num font-semibold text-[#9E7822]">
                  {l.action}
                </td>
                <td className="py-2.5 px-4">{lang === 'ar' ? l.summaryAr : l.summaryEn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
