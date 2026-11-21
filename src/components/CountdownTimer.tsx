import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { t } from '../i18n/translations.ts';

export function CountdownTimer({ endDate }: { endDate: string }) {
  const { lang } = useApp();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const target = Date.parse(endDate);
  if (Number.isNaN(target)) return null;
  const diff = Math.max(0, target - now);
  if (diff === 0) {
    return (
      <span className="text-xs font-semibold text-rose-700 font-mono-num">
        {t(lang, 'انتهى العرض', 'Expired')}
      </span>
    );
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <span className="text-xs font-semibold text-[#9E7822] font-mono-num">
      {days > 0 ? `${days}${t(lang, 'ي ', 'd ')}` : ''}
      {pad(hours)}:{pad(mins)}:{pad(secs)}
    </span>
  );
}
