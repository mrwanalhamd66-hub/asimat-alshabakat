import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  Check,
  Cpu,
  Layers,
  Minus,
  Network,
  Package,
  Plus,
  Radio,
  ShoppingCart,
  Trash2,
  Wifi,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatCurrency, t } from '../i18n/translations.ts';
import type { CartItem, Product, ProjectPackage, ProjectPackageCategoryType } from '../types/index.ts';
import {
  calculateFreeSpacePathLoss,
  calculateIPv4Subnet,
  generateSmartNetworkPlan,
  isProductInStock,
  splitNetworkIntoSubnets,
  type PlannerBOMItem,
  type PlannerProjectType,
  type PlannerTechType,
} from '../utils/networkIntelligence.ts';
import { ResilientImage } from '../components/ResilientImage.tsx';

type PlannerTab = 'planner' | 'packages' | 'calculators';
type CalcMode = 'ipv4' | 'splitter' | 'bandwidth' | 'wireless' | 'poe';

export function SmartPlannerPage() {
  const { lang, route, products, projectPackages, addManyToCart, setSelectedProduct } = useApp();

  const initialTab = (): PlannerTab => {
    const p = new URLSearchParams(window.location.search).get('tab');
    if (p === 'packages' || p === 'calculators') return p;
    return 'planner';
  };

  const [tab, setTab] = useState<PlannerTab>(initialTab);

  // Sync URL query param changes
  useEffect(() => {
    const q = route.includes('?') ? route.split('?')[1] : window.location.search;
    const p = new URLSearchParams(q).get('tab');
    if (p === 'packages' || p === 'calculators' || p === 'planner') {
      setTab(p);
    }
  }, [route]);

  // =========================================================================
  // 1. SMART NETWORK PLANNER STATE
  // =========================================================================
  const [projectType, setProjectType] = useState<PlannerProjectType>('office_smb');
  const [subscribers, setSubscribers] = useState<number>(60);
  const [coverageAreaSqm, setCoverageAreaSqm] = useState<number>(300);
  const [budgetUsd, setBudgetUsd] = useState<number>(1200);
  const [tech, setTech] = useState<PlannerTechType>('mikrotik');

  const generatedPlan = useMemo(
    () =>
      generateSmartNetworkPlan(
        { projectType, subscribers, coverageAreaSqm, budgetUsd, tech },
        products
      ),
    [projectType, subscribers, coverageAreaSqm, budgetUsd, tech, products]
  );

  const [editableItems, setEditableItems] = useState<PlannerBOMItem[]>(generatedPlan.items);
  const [swapProductToAdd, setSwapProductToAdd] = useState<string>('');
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    setEditableItems(generatedPlan.items);
    setAddedFeedback(false);
  }, [generatedPlan]);

  const editableTotal = useMemo(
    () =>
      Number(
        editableItems.reduce((s, item) => s + item.product.retailPrice * item.quantity, 0).toFixed(2)
      ),
    [editableItems]
  );

  const handleBomQty = (productId: string, delta: number) => {
    setEditableItems((prev) =>
      prev.map((it) =>
        it.product.id === productId
          ? { ...it, quantity: Math.max(1, Math.min(100, it.quantity + delta)) }
          : it
      )
    );
  };

  const handleRemoveBomItem = (productId: string) => {
    setEditableItems((prev) => prev.filter((it) => it.product.id !== productId));
  };

  const handleAddExtraDevice = () => {
    if (!swapProductToAdd) return;
    const found = products.find((p) => p.id === swapProductToAdd);
    if (!found) return;
    setEditableItems((prev) => {
      const exists = prev.find((i) => i.product.id === found.id);
      if (exists) {
        return prev.map((i) => (i.product.id === found.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          product: found,
          quantity: 1,
          roleAr: 'إضافة هندسية مخصصة',
          roleEn: 'Custom Hardware Addition',
          rationaleAr: 'تمت إضافته يدوياً إلى قائمة مكونات المشروع.',
          rationaleEn: 'Manually added to the bill of materials.',
        },
      ];
    });
    setSwapProductToAdd('');
  };

  const handleAddAllBomToCart = () => {
    if (editableItems.length === 0) return;
    const label = t(lang, 'مخطط الشبكات الذكي', 'Smart Network Planner');
    const items: CartItem[] = editableItems.map((it) => ({
      productId: it.product.id,
      quantity: it.quantity,
      sourceLabel: label,
    }));
    addManyToCart(items, true);
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 2500);
  };

  // =========================================================================
  // 2. PROJECT PACKAGES STORE STATE
  // =========================================================================
  const [pkgCategoryFilter, setPkgCategoryFilter] = useState<'all' | ProjectPackageCategoryType>('all');
  const [pkgCustomState, setPkgCustomState] = useState<
    Record<string, Record<string, { included: boolean; quantity: number }>>
  >({});

  const getPkgState = (pkg: ProjectPackage) => {
    const saved = pkgCustomState[pkg.id];
    const map: Record<string, { included: boolean; quantity: number }> = {};
    for (const item of pkg.items) {
      map[item.productId] = saved?.[item.productId] || {
        included: true,
        quantity: item.quantity,
      };
    }
    return map;
  };

  const updatePkgItem = (pkg: ProjectPackage, productId: string, patch: Partial<{ included: boolean; quantity: number }>) => {
    const current = getPkgState(pkg);
    setPkgCustomState((prev) => ({
      ...prev,
      [pkg.id]: {
        ...current,
        [productId]: {
          ...current[productId],
          ...patch,
        },
      },
    }));
  };

  const handleAddPackageToCart = (pkg: ProjectPackage) => {
    const state = getPkgState(pkg);
    const items: CartItem[] = pkg.items
      .filter((it) => state[it.productId]?.included)
      .map((it) => ({
        productId: it.productId,
        quantity: Math.max(1, state[it.productId]?.quantity || it.quantity),
        sourceLabel: lang === 'ar' ? pkg.titleAr : pkg.titleEn,
      }));
    if (items.length > 0) {
      addManyToCart(items, true);
    }
  };

  const filteredPackages = projectPackages.filter(
    (p) => pkgCategoryFilter === 'all' || p.categoryType === pkgCategoryFilter
  );

  // =========================================================================
  // 3. REAL ENGINEERING CALCULATORS STATE
  // =========================================================================
  const [calcMode, setCalcMode] = useState<CalcMode>('ipv4');

  // IPv4 / CIDR
  const [calcIp, setCalcIp] = useState('192.168.88.1');
  const [calcCidr, setCalcCidr] = useState(24);
  const subnetRes = useMemo(() => calculateIPv4Subnet(calcIp, calcCidr), [calcIp, calcCidr]);

  // Subnet Splitter
  const [splitIp, setSplitIp] = useState('10.10.0.0');
  const [splitCidr, setSplitCidr] = useState(22);
  const [splitCount, setSplitCount] = useState(4);
  const splitRes = useMemo(
    () => splitNetworkIntoSubnets(splitIp, splitCidr, splitCount),
    [splitIp, splitCidr, splitCount]
  );

  // Bandwidth Consumption
  const [bwUsers, setBwUsers] = useState(50);
  const [bwPerUserMbps, setBwPerUserMbps] = useState(4);
  const [bwConcurrencyPct, setBwConcurrencyPct] = useState(65);
  const [cctvCameras, setCctvCameras] = useState(8);
  const [cctvBitrateMbps, setCctvBitrateMbps] = useState(4);
  const bwTotals = useMemo(() => {
    const concurrentUsersMbps = (bwUsers * bwPerUserMbps * bwConcurrencyPct) / 100;
    const cctvTotalMbps = cctvCameras * cctvBitrateMbps;
    const totalMbps = concurrentUsersMbps + cctvTotalMbps;
    const dailyStorageGb = (cctvTotalMbps * 86400) / 8 / 1024;
    return {
      concurrentUsersMbps: Number(concurrentUsersMbps.toFixed(1)),
      cctvTotalMbps: Number(cctvTotalMbps.toFixed(1)),
      totalMbps: Number(totalMbps.toFixed(1)),
      recommendedWanMbps: Math.ceil(totalMbps * 1.25),
      dailyStorageGb: Number(dailyStorageGb.toFixed(1)),
    };
  }, [bwUsers, bwPerUserMbps, bwConcurrencyPct, cctvCameras, cctvBitrateMbps]);

  // Wireless Link & AP Estimator
  const [linkDistanceKm, setLinkDistanceKm] = useState(3.5);
  const [linkFreqGhz, setLinkFreqGhz] = useState(5.8);
  const [txPowerDbm, setTxPowerDbm] = useState(23);
  const [txGainDbi, setTxGainDbi] = useState(23);
  const [rxGainDbi, setRxGainDbi] = useState(23);
  const wirelessRes = useMemo(() => {
    const fspl = calculateFreeSpacePathLoss(linkDistanceKm, linkFreqGhz);
    const estimatedRssi = Number((txPowerDbm + txGainDbi + rxGainDbi - fspl.fsplDb - 2).toFixed(1));
    return { ...fspl, estimatedRssi };
  }, [linkDistanceKm, linkFreqGhz, txPowerDbm, txGainDbi, rxGainDbi]);

  // PoE+ Wattage & Hardware Estimator
  const [poeAps, setPoeAps] = useState(6);
  const [poeCams, setPoeCams] = useState(10);
  const [poeMarginPct, setPoeMarginPct] = useState(20);
  const poeTotals = useMemo(() => {
    const rawWatts = poeAps * 18 + poeCams * 11; // ~18W Wi-Fi 6 AP, ~11W IR IP Cam
    const withMargin = Math.ceil(rawWatts * (1 + poeMarginPct / 100));
    const totalPortsNeeded = poeAps + poeCams + 2; // +uplinks
    const recommendedSwitches = Math.max(1, Math.ceil(Math.max(withMargin / 370, totalPortsNeeded / 24)));
    return { rawWatts, withMargin, totalPortsNeeded, recommendedSwitches };
  }, [poeAps, poeCams, poeMarginPct]);

  const PROJECT_TYPE_OPTIONS: { id: PlannerProjectType; ar: string; en: string }[] = [
    { id: 'office_smb', ar: 'شبكة شركة أو مكتب إداري', en: 'Corporate Office / SMB' },
    { id: 'isp_hotspot', ar: 'شبكة مزود خدمة / Hotspot', en: 'ISP / Hotspot Network' },
    { id: 'hotel_density', ar: 'فندق أو قاعة عالية الكثافة', en: 'Hotel / High-Density Venue' },
    { id: 'home_fiber', ar: 'منزل ذكي أو فيلا فايبر', en: 'Smart Home / Villa Fiber' },
    { id: 'cctv_surveillance', ar: 'منظومة كاميرات مراقبة IP', en: 'IP CCTV Surveillance' },
    { id: 'wireless_bridge', ar: 'ربط لاسلكي وتوسعة فروع', en: 'Wireless Bridge & Campus' },
  ];

  const TECH_OPTIONS: { id: PlannerTechType; ar: string; en: string }[] = [
    { id: 'mikrotik', ar: 'MikroTik RouterOS + Wi-Fi 6', en: 'MikroTik RouterOS + Wi-Fi 6' },
    { id: 'wifi6', ar: 'Wi-Fi 6 / Ubiquiti UniFi', en: 'Wi-Fi 6 / Ubiquiti UniFi' },
    { id: 'openwrt', ar: 'OpenWrt 2.5G + SQM', en: 'OpenWrt 2.5G + SQM' },
    { id: 'poe_fiber', ar: 'ألياف 10G SFP+ وسويتشات PoE+', en: '10G SFP+ Fiber & PoE+' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-[#0E0E10] text-white rounded-2xl p-6 sm:p-8 border border-[#C89D3C]/30 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-semibold text-[#D4AF37]">
            {t(lang, 'منصة الهندسة والباقات الذكية · عاصمة الشبكات', 'Engineering & Packages Hub · ASEMA NETWORKS')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">
            {t(
              lang,
              'مخطط الشبكات الذكي والباقات وحاسبات الهندسة',
              'Smart Network Planner, Ready Packages & Calculators'
            )}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            {t(
              lang,
              'صمم مشروع شبكتك وفق مخزوننا الفعلي وأضف المكونات إلى السلة بضغطة واحدة، أو اختر باقة جاهزة قابلة للتخصيص واستخدم الحاسبات الهندسية الدقيقة.',
              'Build an actionable Bill of Materials directly from live catalog stock, customize ready project packages, and run precision networking calculations.'
            )}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-[#17171B] p-1.5 rounded-xl border border-white/10 shrink-0">
          {[
            { id: 'planner' as PlannerTab, ar: 'مخطط الشبكات الذكي', en: 'Smart Planner', icon: Network },
            { id: 'packages' as PlannerTab, ar: 'متجر الباقات الجاهزة', en: 'Project Packages', icon: Package },
            { id: 'calculators' as PlannerTab, ar: 'حاسبات الشبكات', en: 'Calculators', icon: Calculator },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#C89D3C] text-[#0E0E10]'
                    : 'text-neutral-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{lang === 'ar' ? item.ar : item.en}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: SMART NETWORK PLANNER                                        */}
      {/* =================================================================== */}
      {tab === 'planner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Parameters Panel */}
          <div className="lg:col-span-5 bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#C89D3C]" />
              <span>{t(lang, 'معطيات مشروع الشبكة', 'Project Specifications')}</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">
                  {t(lang, 'نوع المشروع', 'Project Type')}
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value as PlannerProjectType)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg focus:outline-none focus:border-[#C89D3C]"
                >
                  {PROJECT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {lang === 'ar' ? opt.ar : opt.en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">
                    {t(lang, 'عدد المشتركين / الأجهزة', 'Subscribers / Devices')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={2000}
                    value={subscribers}
                    onChange={(e) => setSubscribers(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg focus:outline-none focus:border-[#C89D3C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">
                    {t(lang, 'مساحة التغطية (م²)', 'Coverage Area (m²)')}
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={15000}
                    value={coverageAreaSqm}
                    onChange={(e) => setCoverageAreaSqm(Math.max(20, Number(e.target.value) || 20))}
                    className="w-full px-3.5 py-2.5 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg focus:outline-none focus:border-[#C89D3C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">
                  {t(lang, 'الميزانية المستهدفة ($ USD)', 'Target Budget ($ USD)')}
                </label>
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={budgetUsd}
                  onChange={(e) => setBudgetUsd(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg focus:outline-none focus:border-[#C89D3C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5">
                  {t(lang, 'التقنية المفضلة', 'Preferred Technology')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TECH_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTech(opt.id)}
                      className={`px-3 py-2.5 rounded-lg border text-xs font-semibold text-start transition-colors cursor-pointer ${
                        tech === opt.id
                          ? 'bg-[#0E0E10] text-[#D4AF37] border-[#C89D3C]'
                          : 'bg-[#F8F8F7] dark:bg-[#0E0E10] border-[#E5E5E0] dark:border-white/15 hover:border-[#C89D3C]'
                      }`}
                    >
                      {lang === 'ar' ? opt.ar : opt.en}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Technical Estimation Summary */}
            <div className="bg-[#FAF5E8] dark:bg-[#0E0E10] border border-[#C89D3C]/35 rounded-xl p-4 space-y-2 text-xs">
              <div className="font-bold text-[#9E7822] dark:text-[#D4AF37]">
                {lang === 'ar' ? generatedPlan.summaryAr : generatedPlan.summaryEn}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#C89D3C]/25 text-center">
                <div>
                  <div className="text-neutral-500 dark:text-neutral-400">{t(lang, 'نقاط الوصول', 'AP Units')}</div>
                  <div className="font-mono-num font-bold text-sm mt-0.5">{generatedPlan.recommendedApCount}</div>
                </div>
                <div>
                  <div className="text-neutral-500 dark:text-neutral-400">{t(lang, 'منافذ سويتش', 'Ports')}</div>
                  <div className="font-mono-num font-bold text-sm mt-0.5">
                    {generatedPlan.recommendedSwitchPorts || 4}
                  </div>
                </div>
                <div>
                  <div className="text-neutral-500 dark:text-neutral-400">{t(lang, 'حمل PoE التقديري', 'PoE Load')}</div>
                  <div className="font-mono-num font-bold text-sm mt-0.5">{generatedPlan.estimatedPoeWatts}W</div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Catalog BOM Output */}
          <div className="lg:col-span-7 bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5E0] dark:border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-bold">
                  {t(lang, 'المكونات المقترحة من مخزون المتجر', 'Recommended Live-Stock Bill of Materials')}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {t(
                    lang,
                    'يمكنك تعديل الكميات أو إضافة أجهزة أخرى قبل إرسالها للسلة',
                    'Adjust quantities or add extra devices before adding to your cart'
                  )}
                </p>
              </div>
              <div className="text-end">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                  {t(lang, 'التكلفة التقديرية', 'Estimated Total')}
                </span>
                <span className="text-xl font-bold font-mono-num text-[#9E7822] dark:text-[#D4AF37]">
                  {formatCurrency(editableTotal)}
                </span>
                {budgetUsd > 0 && (
                  <span
                    className={`block text-[11px] font-semibold ${
                      editableTotal <= budgetUsd ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {editableTotal <= budgetUsd
                      ? t(lang, `ضمن الميزانية ($${budgetUsd})`, `Within budget ($${budgetUsd})`)
                      : t(
                          lang,
                          `يتجاوز الميزانية بمقدار ${formatCurrency(editableTotal - budgetUsd)}`,
                          `Exceeds target by ${formatCurrency(editableTotal - budgetUsd)}`
                        )}
                  </span>
                )}
              </div>
            </div>

            {editableItems.length === 0 ? (
              <div className="py-10 text-center text-sm text-neutral-500">
                {t(lang, 'اختر منتجات من القائمة أدناه لإضافتها لخطة المشروع.', 'Add hardware from the selector below to build your plan.')}
              </div>
            ) : (
              <div className="divide-y divide-[#F0F0EC] dark:divide-white/10">
                {editableItems.map((item) => {
                  const inStock = isProductInStock(item.product);
                  return (
                    <div key={item.product.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(item.product)}
                          className="w-16 h-14 rounded-lg bg-[#F3F3F1] border border-[#E5E5E0] dark:border-white/10 overflow-hidden shrink-0 cursor-pointer"
                        >
                          <ResilientImage
                            src={item.product.images?.[0]}
                            alt={item.product.nameEn}
                            className="w-full h-full object-cover"
                          />
                        </button>
                        <div className="min-w-0 space-y-1">
                          <div className="text-xs font-bold text-[#9E7822] dark:text-[#D4AF37]">
                            {lang === 'ar' ? item.roleAr : item.roleEn}
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(item.product)}
                            className="text-sm font-bold text-start hover:text-[#C89D3C] transition-colors cursor-pointer"
                          >
                            {lang === 'ar' ? item.product.nameAr : item.product.nameEn}
                          </button>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {lang === 'ar' ? item.rationaleAr : item.rationaleEn}
                          </p>
                          <div className="text-[11px] font-mono-num text-neutral-500">
                            {formatCurrency(item.product.retailPrice)} ·{' '}
                            <span className={inStock ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                              {inStock
                                ? t(lang, `متوفر (${item.product.availableQuantity})`, `In Stock (${item.product.availableQuantity})`)
                                : t(lang, 'غير متوفر حالياً', 'Out of stock')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <div className="inline-flex items-center border border-[#E5E5E0] dark:border-white/15 rounded-lg bg-[#F8F8F7] dark:bg-[#0E0E10]">
                          <button
                            type="button"
                            onClick={() => handleBomQty(item.product.id, -1)}
                            className="p-2 hover:bg-neutral-200 dark:hover:bg-white/10 cursor-pointer"
                            aria-label="Decrease"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-mono-num font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleBomQty(item.product.id, 1)}
                            className="p-2 hover:bg-neutral-200 dark:hover:bg-white/10 cursor-pointer"
                            aria-label="Increase"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="w-20 text-end font-mono-num font-bold text-sm">
                          {formatCurrency(item.product.retailPrice * item.quantity)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBomItem(item.product.id)}
                          className="p-2 text-neutral-400 hover:text-rose-600 cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add custom product to BOM */}
            <div className="pt-3 border-t border-[#E5E5E0] dark:border-white/10 flex flex-wrap items-center gap-2">
              <select
                value={swapProductToAdd}
                onChange={(e) => setSwapProductToAdd(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
              >
                <option value="">{t(lang, '+ إضافة جهاز آخر من الكتالوج للمقترح...', '+ Add another catalog device...')}</option>
                {products.filter((p) => p.isPublished).map((p) => (
                  <option key={p.id} value={p.id}>
                    {lang === 'ar' ? p.nameAr : p.nameEn} ({formatCurrency(p.retailPrice)})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddExtraDevice}
                disabled={!swapProductToAdd}
                className="px-3.5 py-2 rounded-lg border border-[#C89D3C] text-[#9E7822] dark:text-[#D4AF37] text-xs font-bold hover:bg-[#FAF5E8] disabled:opacity-40 cursor-pointer"
              >
                {t(lang, 'إضافة للخطة', 'Add to Plan')}
              </button>
            </div>

            <button
              type="button"
              disabled={editableItems.length === 0}
              onClick={handleAddAllBomToCart}
              className="w-full py-3.5 px-6 rounded-xl bg-[#C89D3C] text-[#0E0E10] hover:bg-[#D4AF37] font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {addedFeedback ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
              <span>
                {addedFeedback
                  ? t(lang, 'تمت إضافة جميع المنتجات إلى السلة!', 'All Hardware Added to Cart!')
                  : t(lang, 'إضافة جميع المنتجات إلى السلة', 'Add All Plan Items to Cart')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: READY PROJECT PACKAGES STORE                                 */}
      {/* =================================================================== */}
      {tab === 'packages' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', ar: 'جميع الباقات', en: 'All Packages' },
              { id: 'internet_setup', ar: 'تأسيس الإنترنت', en: 'Internet Setup' },
              { id: 'isp', ar: 'مزودي الخدمة ISP', en: 'ISP Core' },
              { id: 'cctv', ar: 'كاميرات المراقبة', en: 'CCTV PoE' },
              { id: 'wireless_link', ar: 'الربط اللاسلكي', en: 'Wireless Links' },
              { id: 'server_room', ar: 'غرف السيرفرات', en: 'Server Rooms' },
              { id: 'smb', ar: 'الشركات والمكاتب', en: 'SMB & Offices' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setPkgCategoryFilter(cat.id as 'all' | ProjectPackageCategoryType)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  pkgCategoryFilter === cat.id
                    ? 'bg-[#0E0E10] text-[#D4AF37] border-[#C89D3C]'
                    : 'bg-white dark:bg-[#17171B] border-[#E5E5E0] dark:border-white/15 hover:border-[#C89D3C]'
                }`}
              >
                {lang === 'ar' ? cat.ar : cat.en}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredPackages.map((pkg) => {
              const state = getPkgState(pkg);
              const rawTotal = pkg.items.reduce((sum, item) => {
                if (!state[item.productId]?.included) return sum;
                const prod = products.find((p) => p.id === item.productId);
                return sum + (prod?.retailPrice || 0) * (state[item.productId]?.quantity || item.quantity);
              }, 0);
              const discountPct = pkg.packageDiscountPercent || 0;
              const finalTotal = Number((rawTotal * (1 - discountPct / 100)).toFixed(2));

              return (
                <div
                  key={pkg.id}
                  className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 border-b border-[#E5E5E0] dark:border-white/10">
                      <div className="sm:col-span-5 aspect-[4/3] sm:aspect-auto bg-[#F3F3F1] dark:bg-[#0E0E10]">
                        <ResilientImage
                          src={pkg.imageUrl}
                          alt={lang === 'ar' ? pkg.titleAr : pkg.titleEn}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="sm:col-span-7 p-5 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-[#9E7822] dark:text-[#D4AF37]">
                            {pkg.targetSubscribers}
                          </span>
                          {discountPct > 0 && (
                            <span className="font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
                              -{discountPct}% {t(lang, 'خصم الباقة', 'Bundle Off')}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold">{lang === 'ar' ? pkg.titleAr : pkg.titleEn}</h3>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                          {lang === 'ar' ? pkg.descriptionAr : pkg.descriptionEn}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 space-y-2.5">
                      <div className="text-xs font-bold text-neutral-500">
                        {t(lang, 'تخصيص مكونات الباقة قبل الشراء:', 'Customize Bundle Hardware Before Checkout:')}
                      </div>
                      {pkg.items.map((it) => {
                        const prod = products.find((p) => p.id === it.productId);
                        if (!prod) return null;
                        const st = state[it.productId];
                        return (
                          <div
                            key={it.productId}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                              st.included
                                ? 'bg-[#F8F8F7] dark:bg-[#0E0E10] border-[#E5E5E0] dark:border-white/10'
                                : 'opacity-50 border-dashed border-neutral-300'
                            }`}
                          >
                            <label className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={st.included}
                                disabled={!it.optional}
                                onChange={(e) => updatePkgItem(pkg, it.productId, { included: e.target.checked })}
                              />
                              <div className="min-w-0">
                                <div className="font-semibold truncate">
                                  {lang === 'ar' ? prod.nameAr : prod.nameEn}
                                </div>
                                <div className="text-[11px] text-neutral-500">
                                  {lang === 'ar' ? it.roleAr : it.roleEn} ·{' '}
                                  <span className="font-mono-num">{formatCurrency(prod.retailPrice)}</span>
                                </div>
                              </div>
                            </label>

                            {st.included && (
                              <div className="inline-flex items-center border border-[#E5E5E0] dark:border-white/15 rounded bg-white dark:bg-[#17171B] shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updatePkgItem(pkg, it.productId, { quantity: Math.max(1, st.quantity - 1) })
                                  }
                                  className="px-2 py-1 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-2 font-mono-num font-bold">{st.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updatePkgItem(pkg, it.productId, { quantity: Math.min(50, st.quantity + 1) })
                                  }
                                  className="px-2 py-1 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="px-5 py-4 bg-[#F8F8F7] dark:bg-[#0E0E10] border-t border-[#E5E5E0] dark:border-white/10 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] text-neutral-500 block">
                        {t(lang, 'سعر الباقة المخصصة', 'Configured Bundle Price')}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold font-mono-num text-[#9E7822] dark:text-[#D4AF37]">
                          {formatCurrency(finalTotal)}
                        </span>
                        {discountPct > 0 && rawTotal > finalTotal && (
                          <span className="text-xs line-through text-neutral-400 font-mono-num">
                            {formatCurrency(rawTotal)}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddPackageToCart(pkg)}
                      className="px-5 py-2.5 rounded-xl bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] hover:bg-[#C89D3C] hover:text-[#0E0E10] text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>{t(lang, 'إضافة الباقة إلى السلة', 'Add Bundle to Cart')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: NETWORKING CALCULATORS HUB                                   */}
      {/* =================================================================== */}
      {tab === 'calculators' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ipv4' as CalcMode, ar: 'حاسبة IPv4 وCIDR', en: 'IPv4 / CIDR Calc', icon: Network },
              { id: 'splitter' as CalcMode, ar: 'تقسيم الشبكات Subnets', en: 'Subnet Splitter', icon: Layers },
              { id: 'bandwidth' as CalcMode, ar: 'حاسبة الاستهلاك Bandwidth', en: 'Bandwidth & CCTV', icon: Wifi },
              { id: 'wireless' as CalcMode, ar: 'مسافة الربط اللاسلكي FSPL', en: 'Wireless Link & Fresnel', icon: Radio },
              { id: 'poe' as CalcMode, ar: 'حاسبة طاقة PoE+ والأجهزة', en: 'PoE+ Power & Ports', icon: Zap },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCalcMode(item.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border inline-flex items-center gap-2 cursor-pointer transition-colors ${
                    calcMode === item.id
                      ? 'bg-[#0E0E10] text-[#D4AF37] border-[#C89D3C]'
                      : 'bg-white dark:bg-[#17171B] border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{lang === 'ar' ? item.ar : item.en}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-6">
            {calcMode === 'ipv4' && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold">
                  {t(lang, 'حاسبة الشبكات الفرعية IPv4 وCIDR الدقيقة', 'Precision IPv4 / CIDR Subnet Calculator')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'عنوان IP', 'IPv4 Address')}</label>
                    <input
                      value={calcIp}
                      onChange={(e) => setCalcIp(e.target.value)}
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'قناع الشبكة (CIDR /)', 'CIDR Prefix (/)')}</label>
                    <input
                      type="number"
                      min={0}
                      max={32}
                      value={calcCidr}
                      onChange={(e) => setCalcCidr(Number(e.target.value))}
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                </div>

                {!subnetRes.valid ? (
                  <p className="text-xs text-rose-600">{subnetRes.error}</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4" dir="ltr">
                    {[
                      { label: 'Network Address', val: `${subnetRes.networkAddress}/${subnetRes.cidr}` },
                      { label: 'Subnet Mask', val: subnetRes.subnetMask },
                      { label: 'Wildcard Mask', val: subnetRes.wildcardMask },
                      { label: 'Broadcast Address', val: subnetRes.broadcastAddress },
                      { label: 'First Usable Host', val: subnetRes.firstUsable },
                      { label: 'Last Usable Host', val: subnetRes.lastUsable },
                      { label: 'Usable Hosts', val: subnetRes.usableHosts.toLocaleString() },
                      { label: 'Class / Scope', val: `Class ${subnetRes.ipClass} (${subnetRes.isPrivate ? 'Private' : 'Public'})` },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="p-3.5 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10"
                      >
                        <div className="text-[11px] text-neutral-500">{row.label}</div>
                        <div className="font-mono-num font-bold text-sm mt-1 text-[#0E0E10] dark:text-[#D4AF37]">
                          {row.val}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {calcMode === 'splitter' && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold">
                  {t(lang, 'مقسّم الشبكات الفرعية (Subnet Splitter)', 'Subnet Block Splitter')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'الشبكة الرئيسية', 'Base Network')}</label>
                    <input
                      value={splitIp}
                      onChange={(e) => setSplitIp(e.target.value)}
                      dir="ltr"
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">CIDR</label>
                    <input
                      type="number"
                      min={8}
                      max={29}
                      value={splitCidr}
                      onChange={(e) => setSplitCidr(Number(e.target.value))}
                      dir="ltr"
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'عدد الأقسام المطلوبة', 'Desired Subnets')}</label>
                    <select
                      value={splitCount}
                      onChange={(e) => setSplitCount(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    >
                      {[2, 4, 8, 16, 32].map((n) => (
                        <option key={n} value={n}>
                          {n} subnets
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!splitRes.valid ? (
                  <p className="text-xs text-rose-600">{splitRes.error}</p>
                ) : (
                  <div className="overflow-x-auto" dir="ltr">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F8F8F7] dark:bg-[#0E0E10] border-b border-[#E5E5E0] dark:border-white/10">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Network / CIDR</th>
                          <th className="py-2.5 px-3">Usable Range</th>
                          <th className="py-2.5 px-3">Broadcast</th>
                          <th className="py-2.5 px-3">Hosts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F0EC] dark:divide-white/10 font-mono-num">
                        {splitRes.subnets.map((row) => (
                          <tr key={row.index}>
                            <td className="py-2 px-3">{row.index}</td>
                            <td className="py-2 px-3 font-bold text-[#9E7822] dark:text-[#D4AF37]">{row.networkCidr}</td>
                            <td className="py-2 px-3">
                              {row.firstUsable} – {row.lastUsable}
                            </td>
                            <td className="py-2 px-3">{row.broadcast}</td>
                            <td className="py-2 px-3">{row.usableHosts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {calcMode === 'bandwidth' && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold">
                  {t(lang, 'حاسبة استهلاك البيانات والسعة المطلوبة (Bandwidth & CCTV)', 'Bandwidth & Surveillance Bitrate Calculator')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'عدد المستخدمين', 'Active Users')}</label>
                    <input
                      type="number"
                      min={0}
                      value={bwUsers}
                      onChange={(e) => setBwUsers(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'السرعة للمستخدم (Mbps)', 'Mbps / User')}</label>
                    <input
                      type="number"
                      min={1}
                      value={bwPerUserMbps}
                      onChange={(e) => setBwPerUserMbps(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'نسبة التزامن (%)', 'Concurrency %')}</label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={bwConcurrencyPct}
                      onChange={(e) => setBwConcurrencyPct(Math.max(10, Math.min(100, Number(e.target.value))))}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'كاميرات IP', 'IP Cameras')}</label>
                    <input
                      type="number"
                      min={0}
                      value={cctvCameras}
                      onChange={(e) => setCctvCameras(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'Bitrate/Cam (Mbps)', 'Cam Bitrate (Mbps)')}</label>
                    <input
                      type="number"
                      min={1}
                      value={cctvBitrateMbps}
                      onChange={(e) => setCctvBitrateMbps(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#FAF5E8] dark:bg-[#0E0E10] border border-[#C89D3C]/35">
                    <div className="text-xs text-neutral-500">{t(lang, 'سعة المستخدمين الفعلية', 'User Demand')}</div>
                    <div className="text-xl font-bold font-mono-num mt-1">{bwTotals.concurrentUsersMbps} Mbps</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10">
                    <div className="text-xs text-neutral-500">{t(lang, 'بث الكاميرات', 'CCTV Stream Load')}</div>
                    <div className="text-xl font-bold font-mono-num mt-1">{bwTotals.cctvTotalMbps} Mbps</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10">
                    <div className="text-xs text-neutral-500">{t(lang, 'خط الإنترنت الموصى (+25%)', 'Recommended WAN')}</div>
                    <div className="text-xl font-bold font-mono-num text-[#9E7822] dark:text-[#D4AF37] mt-1">
                      {bwTotals.recommendedWanMbps} Mbps
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10">
                    <div className="text-xs text-neutral-500">{t(lang, 'تخزين الكاميرات اليومي', 'CCTV Storage / Day')}</div>
                    <div className="text-xl font-bold font-mono-num mt-1">{bwTotals.dailyStorageGb} GB</div>
                  </div>
                </div>
              </div>
            )}

            {calcMode === 'wireless' && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold">
                  {t(lang, 'حاسبة مسافة الربط اللاسلكي ومنطقة فرينل (PtP FSPL & Fresnel)', 'Wireless PtP Link Budget & Fresnel Calculator')}
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'المسافة (كم)', 'Distance (km)')}</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0.1}
                      value={linkDistanceKm}
                      onChange={(e) => setLinkDistanceKm(Math.max(0.1, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'التردد (GHz)', 'Freq (GHz)')}</label>
                    <select
                      value={linkFreqGhz}
                      onChange={(e) => setLinkFreqGhz(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    >
                      <option value={2.4}>2.4 GHz</option>
                      <option value={5.8}>5.8 GHz</option>
                      <option value={6}>6.0 GHz</option>
                      <option value={24}>24 GHz</option>
                      <option value={60}>60 GHz</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'طاقة الإرسال (dBm)', 'TX Power (dBm)')}</label>
                    <input
                      type="number"
                      value={txPowerDbm}
                      onChange={(e) => setTxPowerDbm(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'كسب هوائي TX (dBi)', 'TX Gain (dBi)')}</label>
                    <input
                      type="number"
                      value={txGainDbi}
                      onChange={(e) => setTxGainDbi(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'كسب هوائي RX (dBi)', 'RX Gain (dBi)')}</label>
                    <input
                      type="number"
                      value={rxGainDbi}
                      onChange={(e) => setRxGainDbi(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10">
                    <div className="text-xs text-neutral-500">{t(lang, 'فقد الفضاء الحر FSPL', 'Free Space Path Loss')}</div>
                    <div className="text-xl font-bold font-mono-num mt-1">{wirelessRes.fsplDb} dB</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF5E8] dark:bg-[#0E0E10] border border-[#C89D3C]/35">
                    <div className="text-xs text-neutral-500">{t(lang, 'قوة الإشارة المستلمة المتوقعة', 'Estimated Signal (RSSI)')}</div>
                    <div className="text-xl font-bold font-mono-num text-[#9E7822] dark:text-[#D4AF37] mt-1">
                      {wirelessRes.estimatedRssi} dBm
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10">
                    <div className="text-xs text-neutral-500">{t(lang, 'نصف قطر فرينل (المنتصف)', 'Fresnel Radius (Mid)')}</div>
                    <div className="text-xl font-bold font-mono-num mt-1">{wirelessRes.fresnelRadiusMeters} m</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10">
                    <div className="text-xs text-neutral-500">{t(lang, 'خلوص 60% المطلوب (LoS)', 'Required 60% Clearance')}</div>
                    <div className="text-xl font-bold font-mono-num mt-1">{wirelessRes.clearance60PercentMeters} m</div>
                  </div>
                </div>
              </div>
            )}

            {calcMode === 'poe' && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold">
                  {t(lang, 'حاسبة طاقة PoE+ وتقدير عدد السويتشات والمنافذ', 'PoE+ Wattage & Switch Sizing Calculator')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'نقاط وصول Wi-Fi 6 (~18W)', 'Wi-Fi 6 APs (~18W)')}</label>
                    <input
                      type="number"
                      min={0}
                      value={poeAps}
                      onChange={(e) => setPoeAps(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'كاميرات المراقبة IR (~11W)', 'IP IR Cameras (~11W)')}</label>
                    <input
                      type="number"
                      min={0}
                      value={poeCams}
                      onChange={(e) => setPoeCams(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t(lang, 'هامش الأمان (%)', 'Safety Margin (%)')}</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={poeMarginPct}
                      onChange={(e) => setPoeMarginPct(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10">
                    <div className="text-xs text-neutral-500">{t(lang, 'الاستهلاك الفعلي', 'Base PoE Load')}</div>
                    <div className="text-xl font-bold font-mono-num mt-1">{poeTotals.rawWatts} W</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF5E8] dark:bg-[#0E0E10] border border-[#C89D3C]/35">
                    <div className="text-xs text-neutral-500">{t(lang, 'ميزانية الطاقة الموصى بها', 'Recommended Budget')}</div>
                    <div className="text-xl font-bold font-mono-num text-[#9E7822] dark:text-[#D4AF37] mt-1">
                      {poeTotals.withMargin} W
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10">
                    <div className="text-xs text-neutral-500">{t(lang, 'إجمالي المنافذ المطلوبة', 'Required Ports')}</div>
                    <div className="text-xl font-bold font-mono-num mt-1">{poeTotals.totalPortsNeeded} ports</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10">
                    <div className="text-xs text-neutral-500">{t(lang, 'سويتشات 24-Port 370W مقترحة', '24P 370W Switches')}</div>
                    <div className="text-xl font-bold font-mono-num mt-1">{poeTotals.recommendedSwitches} unit(s)</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
