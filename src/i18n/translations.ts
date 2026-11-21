import type {
  Language,
  OfferSectionType,
  ProductStatus,
  ReservationStatus,
} from '../types/index.ts';

export const YEMEN_GOVERNORATES = [
  { ar: 'أمانة العاصمة صنعاء', en: "Sana'a Capital" },
  { ar: 'عدن', en: 'Aden' },
  { ar: 'تعز', en: 'Taiz' },
  { ar: 'حضرموت', en: 'Hadhramaut' },
  { ar: 'إب', en: 'Ibb' },
  { ar: 'الحديدة', en: 'Al Hudaydah' },
  { ar: 'ذمار', en: 'Dhamar' },
  { ar: 'مأرب', en: 'Marib' },
  { ar: 'شبوة', en: 'Shabwah' },
  { ar: 'عمران', en: 'Amran' },
  { ar: 'صعدة', en: 'Saada' },
  { ar: 'حجة', en: 'Hajjah' },
  { ar: 'لحج', en: 'Lahij' },
  { ar: 'أبين', en: 'Abyan' },
  { ar: 'الضالع', en: 'Al Dhale' },
  { ar: 'البيضاء', en: 'Al Bayda' },
  { ar: 'المحويت', en: 'Al Mahwit' },
  { ar: 'ريمة', en: 'Raymah' },
  { ar: 'الجوف', en: 'Al Jawf' },
  { ar: 'المهرة', en: 'Al Mahrah' },
  { ar: 'سقطرى', en: 'Socotra' },
];

export const PRODUCT_STATUS_LABELS: Record<
  ProductStatus,
  { ar: string; en: string; tone: 'emerald' | 'amber' | 'rose' | 'slate' }
> = {
  available: { ar: 'متوفر', en: 'Available', tone: 'emerald' },
  limited_stock: { ar: 'كمية محدودة', en: 'Limited Stock', tone: 'amber' },
  out_of_stock: { ar: 'نفد المخزون', en: 'Out of Stock', tone: 'rose' },
  coming_soon: { ar: 'قريباً', en: 'Coming Soon', tone: 'slate' },
  discontinued: { ar: 'متوقف', en: 'Discontinued', tone: 'slate' },
};

export const RESERVATION_STATUS_LABELS: Record<
  ReservationStatus,
  { ar: string; en: string; tone: 'amber' | 'emerald' | 'slate' | 'rose' }
> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending', tone: 'amber' },
  confirmed: { ar: 'تم التأكيد', en: 'Confirmed', tone: 'emerald' },
  preparing: { ar: 'جاري التجهيز', en: 'Preparing', tone: 'amber' },
  ready_for_pickup: { ar: 'جاهز للاستلام', en: 'Ready for Pickup', tone: 'emerald' },
  out_for_delivery: { ar: 'خرج للتوصيل', en: 'Out for Delivery', tone: 'amber' },
  completed: { ar: 'مكتمل', en: 'Completed', tone: 'emerald' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', tone: 'rose' },
};

export const OFFER_SECTION_LABELS: Record<OfferSectionType, { ar: string; en: string }> = {
  today_deals: { ar: 'عروض اليوم', en: "Today's Deals" },
  weekly_offers: { ar: 'العروض الأسبوعية', en: 'Weekly Offers' },
  exclusive_offers: { ar: 'العروض الحصرية', en: 'Exclusive Offers' },
  limited_time: { ar: 'عروض لفترة محدودة', en: 'Limited-Time Deals' },
  wholesale_offers: { ar: 'عروض الجملة', en: 'Wholesale Offers' },
  new_promotions: { ar: 'العروض الجديدة', en: 'New Promotions' },
};

export const INVOICE_PAYMENT_STATUS_LABELS: Record<
  'paid' | 'partial' | 'unpaid',
  { ar: string; en: string; tone: 'emerald' | 'amber' | 'rose' }
> = {
  paid: { ar: 'مدفوعة بالكامل', en: 'Paid in Full', tone: 'emerald' },
  partial: { ar: 'مدفوعة جزئياً', en: 'Partially Paid', tone: 'amber' },
  unpaid: { ar: 'غير مدفوعة', en: 'Unpaid', tone: 'rose' },
};

export function t(lang: Language, ar: string, en: string): string {
  return lang === 'ar' ? ar : en;
}

export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('967') && digits.length > 9) {
    return digits.slice(3);
  }
  return digits.replace(/^0+/, '');
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return `$${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} ${currency === 'USD' ? '' : currency}`.trim();
}
