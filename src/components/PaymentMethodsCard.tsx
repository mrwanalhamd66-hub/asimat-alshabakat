import React, { useState } from 'react';
import { Check, Copy, CreditCard, MessageCircle, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { DEFAULT_PAYMENT_ACCOUNTS } from '../data/seedData.ts';
import { t } from '../i18n/translations.ts';

export function PaymentMethodsCard() {
  const { lang, storeSettings } = useApp();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const accounts = (
    storeSettings.paymentAccounts && storeSettings.paymentAccounts.length > 0
      ? storeSettings.paymentAccounts
      : DEFAULT_PAYMENT_ACCOUNTS
  ).filter((acc) => acc.isActive);

  const whatsappNum = (storeSettings.whatsappNumber || '967770581056').replace(/[^0-9]/g, '');
  const primaryHolder =
    accounts[0]?.holderAr || 'مروان فتح مفتاح حامد';

  const handleCopy = (e: React.MouseEvent, id: string, accountNumber: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(accountNumber).catch(() => null);
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  if (accounts.length === 0) return null;

  return (
    <div className="bg-[#0E0E10] text-white border border-[#C89D3C]/35 rounded-2xl p-6 sm:p-8 space-y-6 mt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#D4AF37]">
            <CreditCard className="w-4 h-4" />
            <span>
              {t(
                lang,
                'بيانات الحسابات – كريمي والمحافظ الإلكترونية',
                'Official Payment Accounts – Kuraimi & Mobile Wallets'
              )}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            {t(
              lang,
              'طرق الدفع المعتمدة — اضغط على أي حساب للتحويل والتأكيد عبر واتساب',
              'Payment Methods — Click Any Account to Pay & Confirm via WhatsApp'
            )}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-300">
            {t(lang, 'الاسم المعتمد للحسابات:', 'Account Holder Name:')}{' '}
            <span className="font-bold text-[#D4AF37]">{primaryHolder}</span>
          </p>
        </div>

        <a
          href={`https://wa.me/${whatsappNum}?text=${encodeURIComponent(
            `مرحباً عاصمة الشبكات، أرغب بالتواصل بخصوص الدفع والتحويل عبر بيانات الحسابات المعتمدة.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-lg bg-[#C89D3C] text-[#0E0E10] hover:bg-[#D4AF37] text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors shrink-0 self-start md:self-auto"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="font-mono-num" dir="ltr">
            +{whatsappNum}
          </span>
          <span>{t(lang, 'واتساب الدفع الرئيسي', 'Primary WhatsApp')}</span>
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const waText = encodeURIComponent(
            `مرحباً عاصمة الشبكات، أرغب بالدفع والتحويل عبر:\n• الطريقة: ${acc.labelAr}\n• رقم الحساب/المحفظة: ${acc.accountNumber}\n• الاسم: ${acc.holderAr}`
          );
          const waUrl = `https://wa.me/${whatsappNum}?text=${waText}`;
          const isWallet =
            acc.id.includes('wallet') || acc.id.includes('jeeb') || acc.labelAr.includes('جيب');

          return (
            <a
              key={acc.id}
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[#17171B] hover:bg-[#1E1E24] border border-white/10 hover:border-[#C89D3C] rounded-xl p-4 flex flex-col justify-between gap-4 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#D4AF37] inline-flex items-center gap-1.5">
                    {isWallet ? (
                      <Wallet className="w-3.5 h-3.5" />
                    ) : (
                      <CreditCard className="w-3.5 h-3.5" />
                    )}
                    <span>{lang === 'ar' ? acc.labelAr : acc.labelEn}</span>
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {lang === 'ar' ? acc.currencyOrTypeAr : acc.currencyOrTypeEn}
                  </span>
                </div>

                <div className="text-lg sm:text-xl font-bold text-white font-mono-num tracking-wide" dir="ltr">
                  {acc.accountNumber}
                </div>

                <div className="text-xs text-neutral-400">
                  {t(lang, 'الاسم:', 'Name:')}{' '}
                  <span className="text-neutral-200 font-medium">
                    {lang === 'ar' ? acc.holderAr : acc.holderEn}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] group-hover:text-white transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{t(lang, 'اضغط للتحويل عبر واتساب', 'Click to Open WhatsApp')}</span>
                </span>

                <button
                  type="button"
                  onClick={(e) => handleCopy(e, acc.id, acc.accountNumber)}
                  className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-neutral-200 inline-flex items-center gap-1 cursor-pointer shrink-0"
                  aria-label="Copy account number"
                >
                  {copiedId === acc.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>{t(lang, 'نُسخ', 'Copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{t(lang, 'نسخ', 'Copy')}</span>
                    </>
                  )}
                </button>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
