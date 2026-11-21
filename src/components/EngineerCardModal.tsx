import { useEffect, useState } from 'react';
import { Download, FileText, ShieldCheck, X } from 'lucide-react';
import jsPDF from 'jspdf';
import { useApp } from '../context/AppContext.tsx';
import { t } from '../i18n/translations.ts';
import type { EngineerProfile } from '../types/index.ts';
import { renderEngineerMembershipCardCanvas } from '../utils/certificatePdf.ts';

export function EngineerCardModal({
  profile,
  onClose,
}: {
  profile: EngineerProfile;
  onClose: () => void;
}) {
  const { lang } = useApp();
  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    renderEngineerMembershipCardCanvas(profile)
      .then((canvas) => {
        if (active) setPreviewSrc(canvas.toDataURL('image/png'));
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [profile]);

  const handleDownloadPng = async () => {
    setBusy(true);
    try {
      const canvas = await renderEngineerMembershipCardCanvas(profile);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${profile.membershipId}_ASEMA_Card.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadPdf = async () => {
    setBusy(true);
    try {
      const canvas = await renderEngineerMembershipCardCanvas(profile);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [148, 90] });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 148, 90);
      pdf.save(`${profile.membershipId}_ASEMA_Card.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#17171B] border border-[#C89D3C]/40 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#C89D3C]" />
            <h3 className="text-base font-bold">
              {t(lang, 'بطاقة العضوية المهنية الرقمية — عاصمة الشبكات', 'ASEMA Digital Engineer Membership Card')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-[#0E0E10] text-white hover:bg-[#C89D3C] hover:text-[#0E0E10] cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl overflow-hidden border border-[#E5E5E0] dark:border-white/10 bg-[#0E0E10] aspect-[1280/780] flex items-center justify-center">
          {previewSrc ? (
            <img src={previewSrc} alt={profile.fullName} className="w-full h-full object-contain" />
          ) : (
            <span className="text-xs text-neutral-400">
              {t(lang, 'جاري تجهيز البطاقة...', 'Rendering card...')}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDownloadPng()}
            className="px-4 py-2.5 rounded-lg border border-[#C89D3C] text-[#9E7822] dark:text-[#D4AF37] text-xs font-bold inline-flex items-center gap-2 hover:bg-[#FAF5E8] dark:hover:bg-white/5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t(lang, 'تحميل صورة PNG للمشاركة', 'Download PNG')}</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDownloadPdf()}
            className="px-5 py-2.5 rounded-lg bg-[#C89D3C] text-[#0E0E10] hover:bg-[#D4AF37] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>{t(lang, 'تحميل بطاقة PDF', 'Download PDF Card')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
