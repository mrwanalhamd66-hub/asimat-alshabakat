import jsPDF from 'jspdf';
import type { Invoice, StoreSettings } from '../types/index.ts';
import { INVOICE_PAYMENT_STATUS_LABELS, formatCurrency } from '../i18n/translations.ts';

const PAGE_W = 1654; // A4 @ 200 DPI (210mm)
const PAGE_H = 2339; // A4 @ 200 DPI (297mm)
const MARGIN_X = 92;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FOOTER_H = 148;
const SAFE_BOTTOM_Y = PAGE_H - FOOTER_H - 36;

const COLORS = {
  obsidian: '#0E0E10',
  obsidianSoft: '#17171B',
  gold: '#C89D3C',
  goldMetallic: '#D4AF37',
  goldDeep: '#9E7822',
  goldTint: '#FAF5E8',
  white: '#FFFFFF',
  surface: '#F8F8F7',
  border: '#E5E5E0',
  borderDark: '#D4D4CE',
  textPrimary: '#0E0E10',
  textSecondary: '#52525B',
  textMuted: '#71717A',
  emeraldBg: '#ECFDF5',
  emeraldText: '#047857',
  amberBg: '#FFFBEB',
  amberText: '#B45309',
  roseBg: '#FFF1F2',
  roseText: '#BE123C',
};

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawAsemaLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  // Dark obsidian rounded emblem
  drawRoundRect(ctx, x, y, size, size, size * 0.22);
  ctx.fillStyle = COLORS.obsidian;
  ctx.fill();

  // Inner subtle gold border
  const pad = size * 0.055;
  drawRoundRect(ctx, x + pad, y + pad, size - pad * 2, size - pad * 2, size * 0.17);
  ctx.strokeStyle = 'rgba(200, 157, 60, 0.55)';
  ctx.lineWidth = Math.max(2, size * 0.015);
  ctx.stroke();

  const cx = x + size / 2;
  const cy = y + size / 2;
  const outerR = size * 0.28;
  const innerR = size * 0.165;

  // Outer gold diamond
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  ctx.lineTo(cx + outerR, cy);
  ctx.lineTo(cx, cy + outerR);
  ctx.lineTo(cx - outerR, cy);
  ctx.closePath();
  ctx.strokeStyle = COLORS.goldMetallic;
  ctx.lineWidth = Math.max(3, size * 0.036);
  ctx.stroke();

  // Inner filled diamond
  ctx.beginPath();
  ctx.moveTo(cx, cy - innerR);
  ctx.lineTo(cx + innerR, cy);
  ctx.lineTo(cx, cy + innerR);
  ctx.lineTo(cx - innerR, cy);
  ctx.closePath();
  ctx.fillStyle = 'rgba(200, 157, 60, 0.22)';
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = Math.max(2, size * 0.02);
  ctx.stroke();

  // 4 outer nodes + center core
  const nodeR = size * 0.036;
  const nodes = [
    [cx, cy - outerR],
    [cx + outerR, cy],
    [cx, cy + outerR],
    [cx - outerR, cy],
  ];
  ctx.fillStyle = COLORS.goldMetallic;
  for (const [nx, ny] of nodes) {
    ctx.beginPath();
    ctx.arc(nx, ny, nodeR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.048, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 4
): string[] {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) {
        lines.push(current);
        current = word;
      } else {
        // Long single word truncation
        let cut = word;
        while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
          cut = cut.slice(0, -1);
        }
        lines.push(`${cut}…`);
        current = '';
      }
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}  ${hh}:${min}`;
}

function createA4PageCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  return { canvas, ctx };
}

function drawGoldTopRule(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 0, PAGE_W, 0);
  grad.addColorStop(0, COLORS.obsidian);
  grad.addColorStop(0.25, COLORS.gold);
  grad.addColorStop(0.5, COLORS.goldMetallic);
  grad.addColorStop(0.75, COLORS.gold);
  grad.addColorStop(1, COLORS.obsidian);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, PAGE_W, 14);
}

function drawFullHeader(
  ctx: CanvasRenderingContext2D,
  invoice: Invoice,
  storeSettings: StoreSettings
): number {
  drawGoldTopRule(ctx);

  // Dark Obsidian Luxury Header Card
  const headerY = 44;
  const headerH = 236;
  drawRoundRect(ctx, MARGIN_X, headerY, CONTENT_W, headerH, 20);
  ctx.fillStyle = COLORS.obsidian;
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Logo + Company Identity (Right side in RTL)
  const logoSize = 114;
  const logoX = PAGE_W - MARGIN_X - 38 - logoSize;
  const logoY = headerY + 38;
  drawAsemaLogo(ctx, logoX, logoY, logoSize);

  const infoRightX = logoX - 28;
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.white;
  ctx.font = '800 38px "Cairo", sans-serif';
  ctx.fillText(storeSettings.storeNameAr || 'عاصمة الشبكات', infoRightX, headerY + 76);

  ctx.fillStyle = COLORS.goldMetallic;
  ctx.font = '700 20px "Outfit", "Plus Jakarta Sans", sans-serif';
  ctx.fillText(storeSettings.storeNameEn || 'ASEMA NETWORKS', infoRightX, headerY + 112);

  ctx.fillStyle = '#D4D4D8';
  ctx.font = '500 20px "Cairo", sans-serif';
  ctx.fillText(
    storeSettings.locationAr || 'صنعاء، شارع صقر، مول نور اليمن',
    infoRightX,
    headerY + 154
  );

  ctx.fillStyle = '#A1A1AA';
  ctx.font = '600 20px "JetBrains Mono", "Cairo", monospace';
  const phonesStr = (storeSettings.phones || ['770581056']).join('  |  ');
  ctx.fillText(`هاتف: ${phonesStr}`, infoRightX, headerY + 190);
  ctx.restore();

  // Sales Invoice Badge & Title (Left side)
  const leftX = MARGIN_X + 40;
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.goldMetallic;
  ctx.font = '800 42px "Cairo", sans-serif';
  ctx.fillText('فاتورة مبيعات', leftX, headerY + 80);

  ctx.direction = 'ltr';
  ctx.fillStyle = '#D4D4D8';
  ctx.font = '700 18px "Outfit", sans-serif';
  ctx.fillText('SALES INVOICE', leftX, headerY + 114);

  // Invoice Number Pill-free Box
  ctx.fillStyle = COLORS.obsidianSoft;
  drawRoundRect(ctx, leftX, headerY + 136, 360, 68, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 157, 60, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = COLORS.goldMetallic;
  ctx.font = '700 26px "JetBrains Mono", monospace';
  ctx.fillText(invoice.invoiceNumber, leftX + 18, headerY + 168);

  ctx.fillStyle = '#A1A1AA';
  ctx.font = '500 17px "JetBrains Mono", monospace';
  ctx.fillText(formatDateTime(invoice.issuedAt), leftX + 18, headerY + 194);
  ctx.restore();

  // Customer & Order Metadata Strip
  const metaY = headerY + headerH + 26;
  const metaH = 228;
  drawRoundRect(ctx, MARGIN_X, metaY, CONTENT_W, metaH, 16);
  ctx.fillStyle = COLORS.surface;
  ctx.fill();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Gold vertical divider between Customer box (right) and Invoice Details box (left)
  const midX = MARGIN_X + CONTENT_W * 0.54;
  ctx.beginPath();
  ctx.moveTo(midX, metaY + 24);
  ctx.lineTo(midX, metaY + metaH - 24);
  ctx.strokeStyle = COLORS.borderDark;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Right Side: Customer Info (RTL)
  const custRightX = PAGE_W - MARGIN_X - 30;
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  ctx.fillStyle = COLORS.goldDeep;
  ctx.font = '700 20px "Cairo", sans-serif';
  ctx.fillText('بيانات العميل / CUSTOMER', custRightX, metaY + 42);

  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = '800 27px "Cairo", sans-serif';
  ctx.fillText(invoice.customerName, custRightX, metaY + 86);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '600 22px "JetBrains Mono", "Cairo", sans-serif';
  ctx.fillText(`الهاتف: ${invoice.customerPhone}`, custRightX, metaY + 128);

  const locationLine = [invoice.governorate, invoice.address].filter(Boolean).join(' — ');
  ctx.font = '500 20px "Cairo", sans-serif';
  const addrLines = wrapTextLines(ctx, locationLine || 'صنعاء، اليمن', CONTENT_W * 0.41, 2);
  addrLines.forEach((ln, idx) => {
    ctx.fillText(ln, custRightX, metaY + 168 + idx * 30);
  });
  ctx.restore();

  // Left Side: Payment & Reference Metadata
  const detRightX = midX - 28;
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  ctx.fillStyle = COLORS.goldDeep;
  ctx.font = '700 20px "Cairo", sans-serif';
  ctx.fillText('تفاصيل الفاتورة / INVOICE META', detRightX, metaY + 42);

  const stInfo = INVOICE_PAYMENT_STATUS_LABELS[invoice.paymentStatus];
  const badgeColors =
    invoice.paymentStatus === 'paid'
      ? { bg: COLORS.emeraldBg, fg: COLORS.emeraldText }
      : invoice.paymentStatus === 'partial'
      ? { bg: COLORS.amberBg, fg: COLORS.amberText }
      : { bg: COLORS.roseBg, fg: COLORS.roseText };

  drawRoundRect(ctx, MARGIN_X + 26, metaY + 20, 210, 40, 8);
  ctx.fillStyle = badgeColors.bg;
  ctx.fill();
  ctx.fillStyle = badgeColors.fg;
  ctx.font = '700 20px "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(stInfo.ar, MARGIN_X + 26 + 105, metaY + 47);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = '600 21px "Cairo", sans-serif';
  const refLabel = invoice.referenceNumber
    ? `رقم الحجز المرجعي: ${invoice.referenceNumber}`
    : 'نوع الإصدار: فاتورة مبيعات مباشرة';
  ctx.fillText(refLabel, detRightX, metaY + 94);

  const methodText = `طريقة الدفع: ${invoice.paymentMethodLabel || invoice.paymentMethod}`;
  const methodLines = wrapTextLines(ctx, methodText, midX - MARGIN_X - 56, 2);
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '500 20px "Cairo", sans-serif';
  methodLines.forEach((ln, idx) => {
    ctx.fillText(ln, detRightX, metaY + 136 + idx * 28);
  });

  if (invoice.issuedByName) {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 18px "Cairo", sans-serif';
    ctx.fillText(`أُصدرت بواسطة: ${invoice.issuedByName}`, detRightX, metaY + 204);
  }
  ctx.restore();

  return metaY + metaH + 30;
}

function drawContinuationHeader(
  ctx: CanvasRenderingContext2D,
  invoice: Invoice,
  storeSettings: StoreSettings,
  pageNumber: number
): number {
  drawGoldTopRule(ctx);
  const y = 40;
  drawAsemaLogo(ctx, PAGE_W - MARGIN_X - 64, y, 64);

  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.obsidian;
  ctx.font = '800 26px "Cairo", sans-serif';
  ctx.fillText(
    `${storeSettings.storeNameAr || 'عاصمة الشبكات'} — فاتورة مبيعات (${invoice.invoiceNumber})`,
    PAGE_W - MARGIN_X - 84,
    y + 42
  );

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.goldDeep;
  ctx.font = '700 20px "Cairo", sans-serif';
  ctx.fillText(`تابع — صفحة ${pageNumber}`, MARGIN_X, y + 42);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(MARGIN_X, y + 84);
  ctx.lineTo(PAGE_W - MARGIN_X, y + 84);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  return y + 106;
}

// Column coordinates (RTL: # rightmost -> Total leftmost)
const COL = {
  idxRight: PAGE_W - MARGIN_X - 18,
  idxW: 64,
  nameRight: PAGE_W - MARGIN_X - 96,
  nameW: 690,
  qtyCenter: MARGIN_X + 575,
  unitLeft: MARGIN_X + 245,
  totalLeft: MARGIN_X + 26,
};

function drawTableHeader(ctx: CanvasRenderingContext2D, y: number): number {
  const h = 64;
  drawRoundRect(ctx, MARGIN_X, y, CONTENT_W, h, 10);
  ctx.fillStyle = COLORS.obsidian;
  ctx.fill();

  ctx.save();
  ctx.fillStyle = COLORS.goldMetallic;
  ctx.font = '700 21px "Cairo", sans-serif';
  ctx.direction = 'rtl';

  ctx.textAlign = 'right';
  ctx.fillText('#', COL.idxRight, y + 40);
  ctx.fillText('المنتج والموديل / Product & Model', COL.nameRight, y + 40);

  ctx.textAlign = 'center';
  ctx.fillText('الكمية', COL.qtyCenter, y + 40);

  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillText('الإجمالي', COL.totalLeft, y + 40);
  ctx.fillText('سعر الوحدة', COL.unitLeft, y + 40);
  ctx.restore();

  return y + h;
}

function measureRowLayout(ctx: CanvasRenderingContext2D, name: string, model?: string) {
  ctx.save();
  ctx.font = '700 22px "Cairo", sans-serif';
  const nameLines = wrapTextLines(ctx, name, COL.nameW, 3);
  ctx.restore();
  const hasModel = Boolean(model && model.trim());
  const textHeight = nameLines.length * 31 + (hasModel ? 30 : 0);
  const rowH = Math.max(78, textHeight + 30);
  return { nameLines, hasModel, rowH };
}

function drawTableRow(
  ctx: CanvasRenderingContext2D,
  y: number,
  index: number,
  item: Invoice['items'][number],
  currencyCode: string,
  layout: ReturnType<typeof measureRowLayout>
): number {
  const { nameLines, hasModel, rowH } = layout;

  if (index % 2 === 1) {
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(MARGIN_X, y, CONTENT_W, rowH);
  }

  ctx.beginPath();
  ctx.moveTo(MARGIN_X, y + rowH);
  ctx.lineTo(PAGE_W - MARGIN_X, y + rowH);
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  // Row #
  ctx.direction = 'ltr';
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.fillText(String(index + 1).padStart(2, '0'), COL.idxRight, y + 44);

  // Product Name & Model
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = '700 22px "Cairo", sans-serif';
  nameLines.forEach((ln, idx) => {
    ctx.fillText(ln, COL.nameRight, y + 38 + idx * 31);
  });

  if (hasModel && item.modelNumber) {
    ctx.fillStyle = COLORS.goldDeep;
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText(`Model: ${item.modelNumber}`, COL.nameRight, y + 38 + nameLines.length * 31 + 2);
  }

  // Qty
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = '700 22px "JetBrains Mono", monospace';
  ctx.fillText(String(item.quantity), COL.qtyCenter, y + 44);

  // Unit Price & Line Total
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '600 21px "JetBrains Mono", monospace';
  ctx.fillText(formatCurrency(item.unitPrice, currencyCode), COL.unitLeft, y + 44);

  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = '800 22px "JetBrains Mono", monospace';
  ctx.fillText(formatCurrency(item.lineTotal, currencyCode), COL.totalLeft, y + 44);
  ctx.restore();

  return y + rowH;
}

function drawTotalsAndNotesBlock(
  ctx: CanvasRenderingContext2D,
  startY: number,
  invoice: Invoice,
  storeSettings: StoreSettings
) {
  const currency = storeSettings.currencyCode || 'USD';
  let y = startY + 26;

  // Two columns: Totals Card on Left, Notes & Payment Box on Right
  const totalsW = 620;
  const totalsX = MARGIN_X;
  const notesX = MARGIN_X + totalsW + 34;
  const notesW = CONTENT_W - totalsW - 34;

  // Draw Totals Card
  const totalsCardH = 338;
  drawRoundRect(ctx, totalsX, y, totalsW, totalsCardH, 16);
  ctx.fillStyle = COLORS.surface;
  ctx.fill();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  const rows: { label: string; value: string; bold?: boolean; accent?: string }[] = [
    { label: 'إجمالي المشتريات', value: formatCurrency(invoice.subtotal, currency) },
    {
      label: 'الخصومات',
      value:
        invoice.discountAmount > 0
          ? `- ${formatCurrency(invoice.discountAmount, currency)}`
          : formatCurrency(0, currency),
      accent: invoice.discountAmount > 0 ? COLORS.emeraldText : undefined,
    },
    { label: 'تكاليف الشحن', value: formatCurrency(invoice.shippingCost, currency) },
  ];

  let ty = y + 42;
  ctx.save();
  for (const r of rows) {
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '600 21px "Cairo", sans-serif';
    ctx.fillText(r.label, totalsX + totalsW - 26, ty);

    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.fillStyle = r.accent || COLORS.textPrimary;
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText(r.value, totalsX + 26, ty);
    ty += 44;
  }

  // Highlighted Final Total Bar
  const finalBarY = y + 168;
  drawRoundRect(ctx, totalsX + 14, finalBarY, totalsW - 28, 66, 12);
  ctx.fillStyle = COLORS.obsidian;
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.white;
  ctx.font = '800 23px "Cairo", sans-serif';
  ctx.fillText('المبلغ النهائي المستحق', totalsX + totalsW - 32, finalBarY + 41);

  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.goldMetallic;
  ctx.font = '800 27px "JetBrains Mono", monospace';
  ctx.fillText(formatCurrency(invoice.totalAmount, currency), totalsX + 32, finalBarY + 42);

  // Paid & Remaining
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.emeraldText;
  ctx.font = '700 20px "Cairo", sans-serif';
  ctx.fillText('المبلغ المدفوع', totalsX + totalsW - 26, finalBarY + 104);

  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.font = '700 21px "JetBrains Mono", monospace';
  ctx.fillText(formatCurrency(invoice.paidAmount, currency), totalsX + 26, finalBarY + 104);

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = invoice.remainingAmount > 0 ? COLORS.roseText : COLORS.textSecondary;
  ctx.font = '700 20px "Cairo", sans-serif';
  ctx.fillText('المبلغ المتبقي', totalsX + totalsW - 26, finalBarY + 144);

  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.font = '700 21px "JetBrains Mono", monospace';
  ctx.fillText(formatCurrency(invoice.remainingAmount, currency), totalsX + 26, finalBarY + 144);
  ctx.restore();

  // Right Side: Payment Method + Notes + Thank You
  drawRoundRect(ctx, notesX, y, notesW, totalsCardH, 16);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  const nrX = notesX + notesW - 28;
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  ctx.fillStyle = COLORS.goldDeep;
  ctx.font = '700 20px "Cairo", sans-serif';
  ctx.fillText('طريقة الدفع والملاحظات', nrX, y + 40);

  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = '600 20px "Cairo", sans-serif';
  const pmLines = wrapTextLines(
    ctx,
    `الوسيلة: ${invoice.paymentMethodLabel || invoice.paymentMethod}`,
    notesW - 56,
    2
  );
  pmLines.forEach((ln, idx) => {
    ctx.fillText(ln, nrX, y + 78 + idx * 30);
  });

  ctx.fillStyle = COLORS.goldDeep;
  ctx.font = '700 19px "Cairo", sans-serif';
  ctx.fillText('ملاحظات إضافية:', nrX, y + 154);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '500 19px "Cairo", sans-serif';
  const noteText =
    invoice.notes?.trim() ||
    'تشمل الأجهزة فحص التشغيل الأساسي قبل التسليم. يرجى الاحتفاظ برقم الفاتورة للمراجعة والضمان.';
  const noteLines = wrapTextLines(ctx, noteText, notesW - 56, 3);
  noteLines.forEach((ln, idx) => {
    ctx.fillText(ln, nrX, y + 188 + idx * 29);
  });

  // Thank You Box at bottom of notes card
  drawRoundRect(ctx, notesX + 20, y + 268, notesW - 40, 52, 10);
  ctx.fillStyle = COLORS.goldTint;
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 157, 60, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = COLORS.obsidian;
  ctx.font = '700 19px "Cairo", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'شكراً لتعاملكم مع عاصمة الشبكات — ثقتكم أساس تميزنا',
    notesX + notesW / 2,
    y + 301
  );
  ctx.restore();
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  invoice: Invoice,
  storeSettings: StoreSettings,
  pageIndex: number,
  totalPages: number
) {
  const fy = PAGE_H - FOOTER_H;
  ctx.fillStyle = COLORS.obsidian;
  ctx.fillRect(0, fy, PAGE_W, FOOTER_H);

  // Top gold hairline
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(0, fy, PAGE_W, 4);

  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.goldMetallic;
  ctx.font = '700 22px "Cairo", sans-serif';
  ctx.fillText(
    `${storeSettings.storeNameAr || 'عاصمة الشبكات'} | ${storeSettings.storeNameEn || 'ASEMA NETWORKS'}`,
    PAGE_W - MARGIN_X,
    fy + 52
  );

  ctx.fillStyle = '#D4D4D8';
  ctx.font = '500 18px "Cairo", sans-serif';
  const phones = (storeSettings.phones || ['770581056']).join(' - ');
  ctx.fillText(
    `${storeSettings.locationAr || 'صنعاء، شارع صقر، مول نور اليمن'}  |  هاتف: ${phones}`,
    PAGE_W - MARGIN_X,
    fy + 92
  );

  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.fillStyle = '#A1A1AA';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillText(`${invoice.invoiceNumber}  ·  Page ${pageIndex} / ${totalPages}`, MARGIN_X, fy + 74);
  ctx.restore();
}

export async function generateInvoicePdfDoc(
  invoice: Invoice,
  storeSettings: StoreSettings
): Promise<jsPDF> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Fallback to system fonts if webfont loading is blocked
    }
  }

  const currency = storeSettings.currencyCode || 'USD';
  const pages: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }[] = [];

  let current = createA4PageCanvas();
  pages.push(current);

  let y = drawFullHeader(current.ctx, invoice, storeSettings);
  y = drawTableHeader(current.ctx, y);

  for (let i = 0; i < invoice.items.length; i++) {
    const item = invoice.items[i];
    const layout = measureRowLayout(
      current.ctx,
      item.nameAr || item.nameEn,
      item.modelNumber
    );

    if (y + layout.rowH > SAFE_BOTTOM_Y) {
      current = createA4PageCanvas();
      pages.push(current);
      y = drawContinuationHeader(current.ctx, invoice, storeSettings, pages.length);
      y = drawTableHeader(current.ctx, y);
    }

    y = drawTableRow(current.ctx, y, i, item, currency, layout);
  }

  // Ensure Totals + Notes block (~380px) fits comfortably without overlapping footer
  const TOTALS_BLOCK_NEEDED = 390;
  if (y + TOTALS_BLOCK_NEEDED > SAFE_BOTTOM_Y) {
    current = createA4PageCanvas();
    pages.push(current);
    y = drawContinuationHeader(current.ctx, invoice, storeSettings, pages.length);
  }

  drawTotalsAndNotesBlock(current.ctx, y, invoice, storeSettings);

  // Stamp consistent footers with total page count
  pages.forEach((p, idx) => {
    drawFooter(p.ctx, invoice, storeSettings, idx + 1, pages.length);
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pages.forEach((p, idx) => {
    if (idx > 0) pdf.addPage('a4', 'portrait');
    const imgData = p.canvas.toDataURL('image/jpeg', 0.94);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  });

  return pdf;
}

export async function downloadInvoicePdf(
  invoice: Invoice,
  storeSettings: StoreSettings
): Promise<void> {
  const pdf = await generateInvoicePdfDoc(invoice, storeSettings);
  pdf.save(`${invoice.invoiceNumber}_ASEMA_NETWORKS.pdf`);
}

export function buildInvoiceWhatsAppText(
  invoice: Invoice,
  storeSettings: StoreSettings
): string {
  const currency = storeSettings.currencyCode || 'USD';
  const statusAr = INVOICE_PAYMENT_STATUS_LABELS[invoice.paymentStatus].ar;
  const itemsText = invoice.items
    .map(
      (it, i) =>
        `${i + 1}. ${it.nameAr}${it.modelNumber ? ` (${it.modelNumber})` : ''} × ${it.quantity} = ${formatCurrency(it.lineTotal, currency)}`
    )
    .join('\n');

  return [
    `*${storeSettings.storeNameAr || 'عاصمة الشبكات'} — فاتورة مبيعات إلكترونية*`,
    `رقم الفاتورة: *${invoice.invoiceNumber}*`,
    invoice.referenceNumber ? `مرجع الطلب: ${invoice.referenceNumber}` : null,
    `التاريخ: ${formatDateTime(invoice.issuedAt)}`,
    `العميل: ${invoice.customerName} (${invoice.customerPhone})`,
    '',
    '*المنتجات:*',
    itemsText,
    '',
    `إجمالي المشتريات: ${formatCurrency(invoice.subtotal, currency)}`,
    invoice.discountAmount > 0
      ? `الخصومات: -${formatCurrency(invoice.discountAmount, currency)}`
      : null,
    invoice.shippingCost > 0
      ? `الشحن: ${formatCurrency(invoice.shippingCost, currency)}`
      : null,
    `*المبلغ النهائي المستحق: ${formatCurrency(invoice.totalAmount, currency)}*`,
    `المدفوع: ${formatCurrency(invoice.paidAmount, currency)} | المتبقي: ${formatCurrency(invoice.remainingAmount, currency)}`,
    `حالة الدفع: ${statusAr}`,
    `طريقة الدفع: ${invoice.paymentMethodLabel || invoice.paymentMethod}`,
    '',
    'شكراً لتعاملكم مع عاصمة الشبكات.',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export function buildWhatsAppHref(
  invoice: Invoice,
  storeSettings: StoreSettings,
  target: 'customer' | 'share'
): string {
  const encoded = encodeURIComponent(buildInvoiceWhatsAppText(invoice, storeSettings));
  if (target === 'customer') {
    const cleanPhone = invoice.customerPhone.replace(/[^0-9]/g, '').replace(/^967|^0+/, '');
    if (cleanPhone.length >= 7) {
      return `https://wa.me/967${cleanPhone}?text=${encoded}`;
    }
  }
  return `https://wa.me/?text=${encoded}`;
}
