import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { GENERATED_IMAGES } from '../data/seedData.ts';
import { useApp } from '../context/AppContext.tsx';
import { t } from '../i18n/translations.ts';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUploader({ value, onChange, label }: ImageUploaderProps) {
  const { lang } = useApp();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = String(reader.result || '');
          const resp = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, dataUrl }),
          });
          const json = (await resp.json()) as { url?: string; error?: string };
          if (!resp.ok || !json.url) {
            throw new Error(json.error || 'Upload failed');
          }
          onChange(json.url);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-semibold text-neutral-700">{label}</label>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/uploads/... or https://..."
          className="flex-1 min-w-[180px] px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-3 py-2 rounded-lg bg-[#0E0E10] text-white text-xs font-semibold hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{uploading ? t(lang, 'جاري الرفع...', 'Uploading...') : t(lang, 'رفع صورة', 'Upload')}</span>
        </button>
      </div>

      {/* Built-in Studio Presets */}
      <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-neutral-500">
        <ImageIcon className="w-3.5 h-3.5 text-[#C89D3C]" />
        <span>{t(lang, 'صور استوديو جاهزة:', 'Studio presets:')}</span>
        {[
          { label: 'MikroTik', url: GENERATED_IMAGES.mikrotikRouter },
          { label: 'Wi-Fi 6', url: GENERATED_IMAGES.wifi6Ap },
          { label: 'Switch PoE', url: GENERATED_IMAGES.poeSwitch },
          { label: 'Hero Hub', url: GENERATED_IMAGES.heroHub },
          { label: 'Fiber/Cables', url: GENERATED_IMAGES.promoFiber },
        ].map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.url)}
            className="px-2 py-0.5 rounded bg-neutral-100 hover:bg-[#FAF5E8] text-neutral-700 border border-[#E5E5E0] cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}
