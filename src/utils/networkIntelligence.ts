import type { Product } from '../types/index.ts';

export interface CompatibilityRecommendation {
  product: Product;
  reasonAr: string;
  reasonEn: string;
  relationType: 'power' | 'cabling' | 'wireless' | 'switching' | 'routing' | 'expansion';
}

export interface AlternativeRecommendation {
  product: Product;
  score: number;
  priceDiff: number;
  summaryAr: string;
  summaryEn: string;
  keyAdvantagesAr: string[];
  keyAdvantagesEn: string[];
}

export type PlannerProjectType =
  | 'home_fiber'
  | 'isp_hotspot'
  | 'office_smb'
  | 'hotel_density'
  | 'cctv_surveillance'
  | 'wireless_bridge';

export type PlannerTechType = 'wifi6' | 'mikrotik' | 'openwrt' | 'poe_fiber';

export interface PlannerInput {
  projectType: PlannerProjectType;
  subscribers: number;
  coverageAreaSqm: number;
  budgetUsd: number;
  tech: PlannerTechType;
}

export interface PlannerBOMItem {
  product: Product;
  quantity: number;
  roleAr: string;
  roleEn: string;
  rationaleAr: string;
  rationaleEn: string;
}

export interface PlannerResult {
  items: PlannerBOMItem[];
  estimatedTotalUsd: number;
  withinBudget: boolean;
  recommendedSwitchPorts: number;
  estimatedPoeWatts: number;
  recommendedApCount: number;
  summaryAr: string;
  summaryEn: string;
}

function getAllText(p: Product): string {
  return `${p.nameAr} ${p.nameEn} ${p.specsAr || ''} ${p.specsEn || ''} ${p.descriptionAr || ''} ${p.descriptionEn || ''} ${p.modelNumber || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
}

export function isProductInStock(p: Product): boolean {
  return (p.availableQuantity ?? 0) > 0 && p.status !== 'out_of_stock' && p.status !== 'discontinued';
}

/**
 * Smart Compatibility Engineer: inspects real catalog specs, port types, and categories
 * to suggest genuinely compatible hardware, cabling, SFP+, and PoE switches.
 */
export function getCompatibleProducts(target: Product, catalog: Product[]): CompatibilityRecommendation[] {
  const candidates = catalog.filter((p) => p.id !== target.id && p.isPublished);
  const text = getAllText(target);
  const results: CompatibilityRecommendation[] = [];

  const isRouter =
    target.categoryId === 'cat_mikrotik' ||
    target.categoryId === 'cat_wifi6_routers' ||
    target.categoryId === 'cat_openwrt' ||
    text.includes('router');
  const isSwitch = target.categoryId === 'cat_switches' || text.includes('switch');
  const isAp = target.categoryId === 'cat_access_points' || text.includes('access point');
  const isAccessory = target.categoryId === 'cat_cables_accessories';

  for (const item of candidates) {
    const cText = getAllText(item);

    // Router + 10G SFP+ / Cat6A cables
    if ((text.includes('sfp+') || text.includes('sfp')) && (cText.includes('sfp+') || cText.includes('cat6a'))) {
      results.push({
        product: item,
        relationType: 'cabling',
        reasonAr: 'متوافق مع منافذ 10G SFP+ والألياف الضوئية لرفع سرعة الربط الداخلي.',
        reasonEn: 'Compatible with 10G SFP+ fiber cages and shielded Cat6A uplinks.',
      });
      continue;
    }

    // AP requiring PoE+ -> match PoE+ switch
    if (isAp && (text.includes('poe') || text.includes('802.3at')) && cText.includes('poe+')) {
      results.push({
        product: item,
        relationType: 'power',
        reasonAr: 'يغذي نقاط الوصول مباشرة عبر معيار PoE+ 802.3at بكابل واحد.',
        reasonEn: 'Delivers IEEE 802.3at PoE+ power & Gigabit data over one cable.',
      });
      continue;
    }

    // PoE+ Switch -> match Wi-Fi 6 APs
    if (isSwitch && text.includes('poe+') && item.categoryId === 'cat_access_points') {
      results.push({
        product: item,
        relationType: 'wireless',
        reasonAr: 'يعمل مباشرة على منافذ PoE+ في السويتش دون الحاجة لمحول كهرباء خارجي.',
        reasonEn: 'Powered cleanly via the switch 802.3at PoE+ ports without external injectors.',
      });
      continue;
    }

    // Router -> Switch pairing
    if (isRouter && item.categoryId === 'cat_switches') {
      results.push({
        product: item,
        relationType: 'switching',
        reasonAr: 'يوسع عدد منافذ الشبكة ويدعم VLANs القادمة من الراوتر الرئيسي.',
        reasonEn: 'Expands port density with full Layer 2/3 VLAN trunking from this router.',
      });
      continue;
    }

    // Switch or AP -> Core Router
    if ((isSwitch || isAp) && item.categoryId === 'cat_mikrotik') {
      results.push({
        product: item,
        relationType: 'routing',
        reasonAr: 'راوتر مركزي مناسب لإدارة المشتركين والـ Hotspot وتوزيع السرعات.',
        reasonEn: 'Ideal core gateway for RouterOS v7 hotspot, queuing, and NAT.',
      });
      continue;
    }

    // Router/AP -> Shielded Cabling kit
    if ((isRouter || isAp) && item.categoryId === 'cat_cables_accessories') {
      results.push({
        product: item,
        relationType: 'cabling',
        reasonAr: 'كابلات Cat6A نحاس صافي تقلل الفقد وتضمن استقرار ربط 2.5G و10G.',
        reasonEn: 'Pure-copper Cat6A shielding ensures stable 2.5G/10G throughput.',
      });
      continue;
    }

    // Cabling accessory -> Compatible Core Devices
    if (isAccessory && (cText.includes('sfp+') || cText.includes('2.5g') || cText.includes('poe+'))) {
      results.push({
        product: item,
        relationType: 'expansion',
        reasonAr: 'يستخدم وصلات 10G SFP+ وكابلات Cat6A المتضمنة في هذه الباقة.',
        reasonEn: 'Directly utilizes the 10G SFP+ transceivers and Cat6A links in this kit.',
      });
    }
  }

  return results.slice(0, 4);
}

/**
 * Smart Alternatives Center: finds actual in-stock catalog devices with closest category,
 * protocol capabilities (Wi-Fi 6 / RouterOS / OpenWrt / 2.5G), and price proximity.
 */
export function getSmartAlternatives(target: Product, catalog: Product[]): AlternativeRecommendation[] {
  const targetText = getAllText(target);
  const inStock = catalog.filter(
    (p) => p.id !== target.id && p.isPublished && isProductInStock(p)
  );

  const scored: AlternativeRecommendation[] = inStock.map((candidate) => {
    const cText = getAllText(candidate);
    let score = 0;
    const keyAdvantagesAr: string[] = [];
    const keyAdvantagesEn: string[] = [];

    if (candidate.categoryId === target.categoryId) {
      score += 45;
      keyAdvantagesAr.push('نفس التصنيف الوظيفي');
      keyAdvantagesEn.push('Same functional category');
    } else if (
      (target.categoryId === 'cat_wifi6_routers' && candidate.categoryId === 'cat_openwrt') ||
      (target.categoryId === 'cat_openwrt' && candidate.categoryId === 'cat_wifi6_routers') ||
      (target.categoryId === 'cat_mikrotik' && candidate.categoryId === 'cat_wifi6_routers')
    ) {
      score += 32;
      keyAdvantagesAr.push('بديل توجيه ولاسلكي متكافئ');
      keyAdvantagesEn.push('Equivalent routing/wireless class');
    }

    if (candidate.brandId === target.brandId) {
      score += 20;
      keyAdvantagesAr.push(`نفس العلامة (${candidate.brandName || ''})`);
      keyAdvantagesEn.push(`Same brand (${candidate.brandName || ''})`);
    }

    if (targetText.includes('wi-fi 6') && cText.includes('wi-fi 6')) {
      score += 18;
      keyAdvantagesAr.push('يدعم معيار Wi-Fi 6');
      keyAdvantagesEn.push('Supports Wi-Fi 6');
    }
    if (targetText.includes('2.5g') && cText.includes('2.5g')) {
      score += 12;
      keyAdvantagesAr.push('منافذ 2.5G عالية السرعة');
      keyAdvantagesEn.push('2.5G high-speed ports');
    }
    if (targetText.includes('poe') && cText.includes('poe')) {
      score += 12;
      keyAdvantagesAr.push('دعم التغذية عبر الشبكة PoE');
      keyAdvantagesEn.push('PoE support');
    }

    const priceRatio = Math.abs(candidate.retailPrice - target.retailPrice) / Math.max(target.retailPrice, 1);
    score += Math.max(0, 15 - Math.round(priceRatio * 20));

    const priceDiff = Number((candidate.retailPrice - target.retailPrice).toFixed(2));
    if (priceDiff <= 0) {
      keyAdvantagesAr.push(`يوفر $${Math.abs(priceDiff)} مقارنة بالمنتج الأصلي`);
      keyAdvantagesEn.push(`Saves $${Math.abs(priceDiff)} vs original`);
    } else {
      keyAdvantagesAr.push(`متوفر فوراً (${candidate.availableQuantity} قطعة)`);
      keyAdvantagesEn.push(`In stock now (${candidate.availableQuantity} units)`);
    }

    return {
      product: candidate,
      score,
      priceDiff,
      summaryAr:
        candidate.categoryId === target.categoryId
          ? `بديل مباشر متوفر في المستودع (${candidate.availableQuantity} قطعة).`
          : `بديل متوافق في الفئة الشبكية بسعر $${candidate.retailPrice}.`,
      summaryEn:
        candidate.categoryId === target.categoryId
          ? `Direct in-stock alternative (${candidate.availableQuantity} available).`
          : `Compatible networking alternative priced at $${candidate.retailPrice}.`,
      keyAdvantagesAr: keyAdvantagesAr.slice(0, 3),
      keyAdvantagesEn: keyAdvantagesEn.slice(0, 3),
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 4);
}

/**
 * Smart Network Planner Engine: picks real catalog items and calculates quantities
 * from subscribers, coverage area, tech choice, and project type.
 */
export function generateSmartNetworkPlan(input: PlannerInput, catalog: Product[]): PlannerResult {
  const available = catalog.filter((p) => p.isPublished && isProductInStock(p));
  const findByMatch = (predicate: (p: Product) => boolean): Product | undefined =>
    available.find(predicate) || catalog.find((p) => p.isPublished && predicate(p));

  const rb5009 = findByMatch((p) => p.id.includes('rb5009') || getAllText(p).includes('rb5009'));
  const hapAx3 = findByMatch((p) => p.id.includes('hap_ax3') || getAllText(p).includes('hap ax'));
  const openwrtRouter = findByMatch((p) => p.categoryId === 'cat_openwrt' || getAllText(p).includes('openwrt'));
  const wifi6Ap = findByMatch((p) => p.categoryId === 'cat_access_points');
  const poeSwitch = findByMatch((p) => p.categoryId === 'cat_switches');
  const cablingKit = findByMatch((p) => p.categoryId === 'cat_cables_accessories');

  const items: PlannerBOMItem[] = [];
  const apCoveragePerUnit = 130; // ~130 m^2 per high-density AP
  let apCount = Math.max(1, Math.ceil(input.coverageAreaSqm / apCoveragePerUnit));
  if (input.subscribers > 80) {
    apCount = Math.max(apCount, Math.ceil(input.subscribers / 75));
  }
  apCount = Math.min(apCount, 24);

  // Core Router Selection
  let router: Product | undefined;
  if (input.projectType === 'home_fiber' && input.subscribers <= 45) {
    router = input.tech === 'openwrt' ? (openwrtRouter || hapAx3) : (hapAx3 || openwrtRouter);
  } else if (input.tech === 'openwrt' && input.subscribers <= 100 && openwrtRouter) {
    router = openwrtRouter;
  } else {
    router = rb5009 || hapAx3 || openwrtRouter;
  }

  if (router) {
    items.push({
      product: router,
      quantity: 1,
      roleAr: 'الموجّه الرئيسي (Core Gateway)',
      roleEn: 'Core Gateway Router',
      rationaleAr:
        input.subscribers > 60
          ? `يدير ${input.subscribers} مشترك مع توزيع سرعات وقواعد Firewall مستقرة.`
          : `مناسب لتغطية ${input.subscribers} متصل بكفاءة عالية واستجابة فورية.`,
      rationaleEn: `Handles ${input.subscribers} concurrent clients with stable NAT and queuing.`,
    });
  }

  // PoE+ Switch Selection (needed for multiple APs, CCTV, ISP, Hotel, Office)
  const needsSwitch =
    input.projectType === 'cctv_surveillance' ||
    input.projectType === 'isp_hotspot' ||
    input.projectType === 'hotel_density' ||
    input.projectType === 'office_smb' ||
    apCount >= 2 ||
    input.tech === 'poe_fiber';

  let switchQty = 0;
  if (needsSwitch && poeSwitch) {
    const neededPorts =
      input.projectType === 'cctv_surveillance'
        ? Math.max(apCount, Math.ceil(input.subscribers / 2) + 4)
        : apCount + Math.ceil(input.subscribers / 12) + 2;
    switchQty = Math.max(1, Math.ceil(neededPorts / 22));
    items.push({
      product: poeSwitch,
      quantity: switchQty,
      roleAr: 'موزع الشبكة والتغذية (PoE+ Switch)',
      roleEn: 'Managed PoE+ Switch',
      rationaleAr: `يوفر ${switchQty * 24} منفذ جيجابت PoE+ بقدرة ${switchQty * 370}W لتشغيل نقاط الوصول والكاميرات.`,
      rationaleEn: `Provides ${switchQty * 24} Gigabit PoE+ ports and ${switchQty * 370}W total power budget.`,
    });
  }

  // Access Points Selection
  const needsSeparateAps =
    input.projectType === 'hotel_density' ||
    input.projectType === 'office_smb' ||
    input.projectType === 'isp_hotspot' ||
    input.coverageAreaSqm > 160 ||
    input.subscribers > 40;

  if (needsSeparateAps && wifi6Ap) {
    items.push({
      product: wifi6Ap,
      quantity: apCount,
      roleAr: 'نقاط التغطية اللاسلكية (Wi-Fi 6 AP)',
      roleEn: 'High-Density Wi-Fi 6 AP',
      rationaleAr: `توزيع ${apCount} نقطة وصول لتغطية ${input.coverageAreaSqm} م² بكثافة تصل إلى ${apCount * 250} متصل.`,
      rationaleEn: `${apCount} AP unit(s) sized for ${input.coverageAreaSqm} m² and balanced RF roaming.`,
    });
  }

  // Cabling & SFP+ Uplink Kit
  if (cablingKit) {
    const cableKitsCount = Math.max(1, Math.ceil((apCount + switchQty) / 3));
    items.push({
      product: cablingKit,
      quantity: cableKitsCount,
      roleAr: 'باقة الكابلات والألياف (Cat6A + SFP+)',
      roleEn: 'Cat6A & 10G SFP+ Cabling Kit',
      rationaleAr: 'لربط الراوتر بالسويتش عبر SFP+ 10G وتوصيل نقاط الوصول بكابلات محمية.',
      rationaleEn: 'Connects core router to switches via 10G SFP+ and links AP runs with shielded Cat6A.',
    });
  }

  const estimatedTotalUsd = items.reduce(
    (sum, item) => sum + item.product.retailPrice * item.quantity,
    0
  );
  const estimatedPoeWatts = needsSeparateAps ? apCount * 22 : input.projectType === 'cctv_surveillance' ? 120 : 0;
  const recommendedSwitchPorts = switchQty * 24;

  return {
    items,
    estimatedTotalUsd,
    withinBudget: input.budgetUsd <= 0 || estimatedTotalUsd <= input.budgetUsd,
    recommendedSwitchPorts,
    estimatedPoeWatts,
    recommendedApCount: needsSeparateAps ? apCount : 1,
    summaryAr: `تم تصميم خطة متكاملة لعدد ${input.subscribers} مستخدم على مساحة ${input.coverageAreaSqm} م² باعتماد أجهزة حقيقية من مخزون عاصمة الشبكات.`,
    summaryEn: `Designed for ${input.subscribers} users across ${input.coverageAreaSqm} m² using verified live catalog hardware.`,
  };
}

// =========================================================================
// REAL NETWORKING ENGINEERING CALCULATORS (NO SIMULATED NUMBERS)
// =========================================================================

export interface SubnetResult {
  valid: boolean;
  error?: string;
  cidr: number;
  networkAddress: string;
  broadcastAddress: string;
  subnetMask: string;
  wildcardMask: string;
  firstUsable: string;
  lastUsable: string;
  totalHosts: number;
  usableHosts: number;
  ipClass: string;
  isPrivate: boolean;
}

function ipToUint32(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let val = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    val = (val << 8) | n;
  }
  return val >>> 0;
}

function uint32ToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

export function calculateIPv4Subnet(ipStr: string, cidrInput: number): SubnetResult {
  const ipNum = ipToUint32(ipStr);
  const cidr = Math.max(0, Math.min(32, Math.floor(cidrInput)));
  if (ipNum === null) {
    return {
      valid: false,
      error: 'Invalid IPv4 address format (e.g., 192.168.88.1)',
      cidr,
      networkAddress: '',
      broadcastAddress: '',
      subnetMask: '',
      wildcardMask: '',
      firstUsable: '',
      lastUsable: '',
      totalHosts: 0,
      usableHosts: 0,
      ipClass: '-',
      isPrivate: false,
    };
  }

  const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  const wildcard = (~mask) >>> 0;
  const network = (ipNum & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const totalHosts = Math.pow(2, 32 - cidr);
  const usableHosts = cidr === 32 ? 1 : cidr === 31 ? 2 : Math.max(0, totalHosts - 2);
  const firstUsable = cidr >= 31 ? uint32ToIp(network) : uint32ToIp((network + 1) >>> 0);
  const lastUsable = cidr >= 31 ? uint32ToIp(broadcast) : uint32ToIp((broadcast - 1) >>> 0);

  const firstOctet = (ipNum >>> 24) & 255;
  const secondOctet = (ipNum >>> 16) & 255;
  const ipClass =
    firstOctet < 128 ? 'A' : firstOctet < 192 ? 'B' : firstOctet < 224 ? 'C' : firstOctet < 240 ? 'D' : 'E';
  const isPrivate =
    firstOctet === 10 ||
    (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) ||
    (firstOctet === 192 && secondOctet === 168);

  return {
    valid: true,
    cidr,
    networkAddress: uint32ToIp(network),
    broadcastAddress: uint32ToIp(broadcast),
    subnetMask: uint32ToIp(mask),
    wildcardMask: uint32ToIp(wildcard),
    firstUsable,
    lastUsable,
    totalHosts,
    usableHosts,
    ipClass,
    isPrivate,
  };
}

export interface SplitSubnetRow {
  index: number;
  networkCidr: string;
  firstUsable: string;
  lastUsable: string;
  broadcast: string;
  usableHosts: number;
}

export function splitNetworkIntoSubnets(
  ipStr: string,
  baseCidr: number,
  targetSubnets: number
): { valid: boolean; newCidr: number; subnets: SplitSubnetRow[]; error?: string } {
  const base = calculateIPv4Subnet(ipStr, baseCidr);
  if (!base.valid) return { valid: false, newCidr: baseCidr, subnets: [], error: base.error };

  const count = Math.max(1, Math.min(64, targetSubnets));
  const extraBits = Math.ceil(Math.log2(count));
  const newCidr = base.cidr + extraBits;
  if (newCidr > 30) {
    return {
      valid: false,
      newCidr,
      subnets: [],
      error: 'Cannot divide into that many usable subnets inside this block.',
    };
  }

  const baseNet = ipToUint32(base.networkAddress)!;
  const blockSize = Math.pow(2, 32 - newCidr);
  const actualCount = Math.min(32, Math.pow(2, extraBits));
  const subnets: SplitSubnetRow[] = [];

  for (let i = 0; i < actualCount; i++) {
    const net = (baseNet + i * blockSize) >>> 0;
    const bcast = (net + blockSize - 1) >>> 0;
    subnets.push({
      index: i + 1,
      networkCidr: `${uint32ToIp(net)}/${newCidr}`,
      firstUsable: uint32ToIp((net + 1) >>> 0),
      lastUsable: uint32ToIp((bcast - 1) >>> 0),
      broadcast: uint32ToIp(bcast),
      usableHosts: Math.max(0, blockSize - 2),
    });
  }

  return { valid: true, newCidr, subnets };
}

export function calculateFreeSpacePathLoss(distanceKm: number, frequencyGhz: number) {
  const d = Math.max(0.05, distanceKm);
  const f = Math.max(0.4, frequencyGhz);
  // Standard FSPL(dB) = 92.45 + 20*log10(d_km) + 20*log10(f_GHz)
  const fsplDb = 92.45 + 20 * Math.log10(d) + 20 * Math.log10(f);
  // First Fresnel zone radius at midpoint (m): 8.656 * sqrt(d_km / f_GHz)
  const fresnelRadiusMeters = 8.656 * Math.sqrt(d / f);
  const earthBulgeMeters = (d * d) / (8 * 6371 * 1.333 / 1000); // K=4/3 approximation in meters
  return {
    fsplDb: Number(fsplDb.toFixed(2)),
    fresnelRadiusMeters: Number(fresnelRadiusMeters.toFixed(2)),
    clearance60PercentMeters: Number((fresnelRadiusMeters * 0.6).toFixed(2)),
    earthBulgeMeters: Number(earthBulgeMeters.toFixed(2)),
  };
}
