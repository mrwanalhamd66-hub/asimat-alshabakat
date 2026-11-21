import { Heart, ShoppingCart } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { PRODUCT_STATUS_LABELS, formatCurrency, t } from '../i18n/translations.ts';
import { incrementProductView } from '../services/firestoreService.ts';
import type { Product } from '../types/index.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface ProductCardProps {
  product: Product;
  overridePrice?: number;
  offerTag?: string;
}

export function ProductCard({ product, overridePrice, offerTag }: ProductCardProps) {
  const {
    lang,
    setSelectedProduct,
    isFavorite,
    isFavoriteBusy,
    toggleFavorite,
    addToCart,
    setCartOpen,
  } = useApp();
  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const statusInfo = PRODUCT_STATUS_LABELS[product.status] || PRODUCT_STATUS_LABELS.available;
  const displayPrice = overridePrice ?? product.retailPrice;
  const prevPrice = overridePrice ? product.retailPrice : product.previousPrice;
  const favorited = isFavorite(product.id);
  const busy = isFavoriteBusy(product.id);
  const unavailable = product.status === 'out_of_stock' || product.status === 'discontinued';

  const handleOpen = () => {
    setSelectedProduct(product);
    incrementProductView(product);
  };

  return (
    <article
      className="group bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#C89D3C]/50"
    >
      <div className="aspect-[4/3] w-full bg-[#F3F3F1] dark:bg-[#0E0E10] overflow-hidden relative">
        <button
          type="button"
          onClick={handleOpen}
          className="w-full h-full block cursor-pointer text-start"
          aria-label={name}
        >
          <ResilientImage
            src={product.images?.[0]}
            alt={name}
            fallbackLabel={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void toggleFavorite(product)}
          aria-pressed={favorited}
          aria-label={
            favorited
              ? t(lang, 'إزالة من المفضلة', 'Remove from Favorites')
              : t(lang, 'حفظ في المفضلة', 'Save to Favorites')
          }
          title={
            favorited
              ? t(lang, 'إزالة من المفضلة', 'Remove from Favorites')
              : t(lang, 'حفظ في المفضلة', 'Save to Favorites')
          }
          className={`absolute top-3 end-3 z-10 w-9 h-9 rounded-lg border flex items-center justify-center transition-all cursor-pointer disabled:opacity-60 ${
            favorited
              ? 'bg-[#0E0E10] text-[#D4AF37] border-[#C89D3C] shadow-md'
              : 'bg-white/95 backdrop-blur-sm text-neutral-700 border-[#E5E5E0] hover:border-[#C89D3C] hover:text-[#9E7822] shadow-sm'
          }`}
        >
          <Heart className={`w-4 h-4 ${favorited ? 'fill-[#D4AF37]' : ''}`} />
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          {/* Unboxed clean metadata with typographic separators */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-medium text-neutral-700 dark:text-neutral-200">
              {product.brandName || 'ASEMA'}
            </span>
            {product.modelNumber && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">{product.modelNumber}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span
              className={
                statusInfo.tone === 'emerald'
                  ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                  : statusInfo.tone === 'amber'
                  ? 'text-amber-700 dark:text-amber-400 font-medium'
                  : statusInfo.tone === 'rose'
                  ? 'text-rose-700 dark:text-rose-400 font-medium'
                  : 'text-neutral-500'
              }
            >
              {lang === 'ar' ? statusInfo.ar : statusInfo.en}
            </span>
            {offerTag && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#9E7822] dark:text-[#D4AF37] font-semibold">{offerTag}</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpen}
            className="text-start block w-full cursor-pointer"
          >
            <h3 className="text-base font-semibold text-[#0E0E10] dark:text-white leading-snug line-clamp-2 group-hover:text-[#9E7822] dark:group-hover:text-[#D4AF37] transition-colors">
              {name}
            </h3>
          </button>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
            {lang === 'ar' ? product.descriptionAr : product.descriptionEn}
          </p>
        </div>

        <div className="pt-3 border-t border-[#F0F0EC] dark:border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-[#0E0E10] dark:text-white font-mono-num">
              {formatCurrency(displayPrice)}
            </span>
            {prevPrice && prevPrice > displayPrice && (
              <span className="text-xs text-neutral-400 line-through font-mono-num">
                {formatCurrency(prevPrice)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!unavailable && (
              <button
                type="button"
                onClick={() => {
                  addToCart(product.id, 1);
                  setCartOpen(true);
                }}
                aria-label={t(lang, 'أضف إلى السلة', 'Add to Cart')}
                title={t(lang, 'أضف إلى السلة', 'Add to Cart')}
                className="p-2 rounded-lg border border-[#E5E5E0] dark:border-white/15 bg-[#F8F8F7] dark:bg-[#0E0E10] text-[#0E0E10] dark:text-[#D4AF37] hover:border-[#C89D3C] transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleOpen}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {unavailable
                ? t(lang, 'عرض البدائل', 'Alternatives')
                : product.status === 'coming_soon'
                ? t(lang, 'حجز مسبق', 'Pre-Book')
                : t(lang, 'احجز الآن', 'Reserve')}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
