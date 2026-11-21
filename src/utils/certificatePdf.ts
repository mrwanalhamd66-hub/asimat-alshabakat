import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { AcademyCertificate, EngineerProfile } from '../types/index.ts';

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

function drawAsemaEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  drawRoundRect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.22);
  ctx.fillStyle = '#0E0E10';
  ctx.fill();
  ctx.strokeStyle = '#C89D3C';
  ctx.lineWidth = 3;
  ctx.stroke();

  const outerR = size * 0.28;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  ctx.lineTo(cx + outerR, cy);
  ctx.lineTo(cx, cy + outerR);
  ctx.lineTo(cx - outerR, cy);
  ctx.closePath();
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = '#D4AF37';
  ctx.fill();
  ctx.restore();
}

async function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function renderCertificateCanvas(cert: AcademyCertificate): Promise<HTMLCanvasElement> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // continue cleanly
    }
  }

  const W = 2200;
  const H = 1555; // A4 Landscape ratio
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // White luxury textured paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Outer obsidian frame & inner gold frame
  ctx.strokeStyle = '#0E0E10';
  ctx.lineWidth = 22;
  ctx.strokeRect(36, 36, W - 72, H - 72);

  ctx.strokeStyle = '#C89D3C';
  ctx.lineWidth = 5;
  ctx.strokeRect(64, 64, W - 128, H - 128);

  // Top obsidian banner
  ctx.fillStyle = '#0E0E10';
  ctx.fillRect(66, 66, W - 132, 230);
  ctx.fillStyle = '#C89D3C';
  ctx.fillRect(66, 290, W - 132, 8);

  drawAsemaEmblem(ctx, W - 210, 180, 128);

  // Header Titles
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillStyle = '#D4AF37';
  ctx.font = '700 46px "Cairo", "Plus Jakarta Sans", sans-serif';
  ctx.fillText('أكاديمية عاصمة الشبكات', W - 310, 165);
  ctx.fillStyle = '#D4D4D8';
  ctx.font = '600 24px "Plus Jakarta Sans", "Cairo", sans-serif';
  ctx.fillText('ASEMA NETWORKS ACADEMY · تعلّم، طوّر، احترف', W - 310, 222);

  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.fillStyle = '#D4AF37';
  ctx.font = '700 26px "JetBrains Mono", monospace';
  ctx.fillText(cert.certificateCode, 130, 175);
  ctx.fillStyle = cert.isValid ? '#34D399' : '#FB7185';
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(cert.isValid ? 'VERIFIED CREDENTIAL' : 'REVOKED', 130, 220);

  // Center Certificate Title
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillStyle = '#9E7822';
  ctx.font = '700 32px "Cairo", sans-serif';
  ctx.fillText('شهادة إتمام واجتياز دورة تدريبية احترافية', W / 2, 430);

  ctx.fillStyle = '#52525B';
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('CERTIFICATE OF ENGINEERING COMPLETION', W / 2, 476);

  // Recipient Name
  ctx.fillStyle = '#3F3F46';
  ctx.font = '500 28px "Cairo", sans-serif';
  ctx.fillText('تُمنح هذه الشهادة إلى المهندس / المتدرب:', W / 2, 565);

  ctx.fillStyle = '#0E0E10';
  ctx.font = '800 66px "Cairo", "Plus Jakarta Sans", sans-serif';
  ctx.fillText(cert.studentName, W / 2, 665);

  // Decorative Gold Divider
  const grad = ctx.createLinearGradient(W / 2 - 380, 0, W / 2 + 380, 0);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(0.5, '#C89D3C');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(W / 2 - 380, 705, 760, 4);

  // Course Title
  ctx.fillStyle = '#52525B';
  ctx.font = '500 28px "Cairo", sans-serif';
  ctx.fillText('لاجتيازه متطلبات والاختبار النهائي للدورة التدريبية:', W / 2, 785);

  ctx.fillStyle = '#0E0E10';
  ctx.font = '700 44px "Cairo", sans-serif';
  ctx.fillText(cert.courseTitleAr, W / 2, 860);

  if (cert.courseTitleEn) {
    ctx.fillStyle = '#71717A';
    ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(cert.courseTitleEn, W / 2, 912);
  }

  // Score & Track Metrics Bar
  drawRoundRect(ctx, 360, 965, W - 720, 120, 18);
  ctx.fillStyle = '#FAF5E8';
  ctx.fill();
  ctx.strokeStyle = '#C89D3C';
  ctx.lineWidth = 2;
  ctx.stroke();

  const cols = [
    { label: 'التقدير / النتيجة', val: `${cert.scorePercent}%` },
    { label: 'المسار التقني', val: cert.track.toUpperCase() },
    { label: 'تاريخ الإصدار', val: new Date(cert.issuedAt).toLocaleDateString('en-GB') },
  ];
  cols.forEach((c, idx) => {
    const cx = 360 + ((W - 720) / 3) * (idx + 0.5);
    ctx.fillStyle = '#71717A';
    ctx.font = '600 22px "Cairo", sans-serif';
    ctx.fillText(c.label, cx, 1012);
    ctx.fillStyle = '#0E0E10';
    ctx.font = '700 30px "JetBrains Mono", "Cairo", sans-serif';
    ctx.fillText(c.val, cx, 1058);
  });

  // Footer: Signatures + Verification QR Code
  const verifyUrl = `${window.location.origin}/academy?verify=${encodeURIComponent(cert.certificateCode)}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 210,
      margin: 1,
      color: { dark: '#0E0E10', light: '#FFFFFF' },
    });
    const qrImg = await loadImageSafe(qrDataUrl);
    if (qrImg) {
      drawRoundRect(ctx, 130, 1185, 220, 220, 16);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#E5E5E0';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.drawImage(qrImg, 140, 1195, 200, 200);
    }
  } catch {
    // skip QR on error
  }

  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.fillStyle = '#52525B';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillText(`Verify: ${cert.certificateCode}`, 130, 1435);

  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillStyle = '#0E0E10';
  ctx.font = '700 28px "Cairo", sans-serif';
  ctx.fillText(cert.instructorName || 'إدارة أكاديمية عاصمة الشبكات', W - 150, 1310);
  ctx.fillStyle = '#9E7822';
  ctx.font = '600 22px "Cairo", sans-serif';
  ctx.fillText('المدرب المعتمد · عاصمة الشبكات – صنعاء', W - 150, 1355);

  return canvas;
}

export async function downloadCertificatePdf(cert: AcademyCertificate) {
  const canvas = await renderCertificateCanvas(cert);
  const imgData = canvas.toDataURL('image/jpeg', 0.94);
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
  pdf.save(`${cert.certificateCode}.pdf`);
}

export async function renderEngineerMembershipCardCanvas(profile: EngineerProfile): Promise<HTMLCanvasElement> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // continue
    }
  }

  const W = 1280;
  const H = 780;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Obsidian Metallic Dark Card Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0E0E10');
  bg.addColorStop(1, '#1A1A20');
  drawRoundRect(ctx, 0, 0, W, H, 36);
  ctx.fillStyle = bg;
  ctx.fill();

  // Gold Border
  drawRoundRect(ctx, 18, 18, W - 36, H - 36, 28);
  ctx.strokeStyle = '#C89D3C';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Top Header Strip
  drawAsemaEmblem(ctx, W - 105, 105, 86);
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillStyle = '#D4AF37';
  ctx.font = '700 32px "Cairo", sans-serif';
  ctx.fillText('بطاقة العضوية المهنية · عاصمة الشبكات', W - 175, 100);
  ctx.fillStyle = '#A1A1AA';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('CAPITAL NETWORKS · VERIFIED ENGINEER PASS', W - 175, 138);

  // Engineer Photo
  drawRoundRect(ctx, W - 320, 210, 220, 250, 22);
  ctx.fillStyle = '#27272A';
  ctx.fill();
  ctx.strokeStyle = '#C89D3C';
  ctx.lineWidth = 3;
  ctx.stroke();
  if (profile.photoUrl) {
    const avatar = await loadImageSafe(profile.photoUrl);
    if (avatar) {
      ctx.save();
      drawRoundRect(ctx, W - 316, 214, 212, 242, 18);
      ctx.clip();
      ctx.drawImage(avatar, W - 316, 214, 212, 242);
      ctx.restore();
    }
  } else {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#D4AF37';
    ctx.font = '800 84px "Cairo", sans-serif';
    ctx.fillText(profile.fullName.charAt(0).toUpperCase(), W - 210, 365);
  }

  // Engineer Info
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 44px "Cairo", sans-serif';
  ctx.fillText(`م. ${profile.fullName}`, W - 360, 270);

  ctx.fillStyle = '#D4AF37';
  ctx.font = '700 26px "Cairo", sans-serif';
  ctx.fillText(profile.specialty || 'مهندس شبكات', W - 360, 325);

  ctx.fillStyle = '#D4D4D8';
  ctx.font = '500 22px "Cairo", sans-serif';
  ctx.fillText(
    `الخبرة: ${profile.yearsExperience} سنوات · ${profile.governorate || 'اليمن'}`,
    W - 360,
    375
  );

  if (profile.skills.length > 0) {
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '500 20px "Plus Jakarta Sans", "Cairo", sans-serif';
    ctx.fillText(profile.skills.slice(0, 5).join('  •  '), W - 360, 425);
  }

  if (profile.isVerified) {
    drawRoundRect(ctx, W - 640, 468, 280, 46, 12);
    ctx.fillStyle = 'rgba(200, 157, 60, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#D4AF37';
    ctx.font = '700 20px "Cairo", sans-serif';
    ctx.fillText(`✓ ${profile.verificationBadge || 'عضو موثق معتمد'}`, W - 500, 498);
  }

  // Left QR Code + Membership ID
  try {
    const qrDataUrl = await QRCode.toDataURL(
      `ASEMA-ENG:${profile.membershipId}|${profile.fullName}`,
      {
        width: 190,
        margin: 1,
        color: { dark: '#0E0E10', light: '#FFFFFF' },
      }
    );
    const qrImg = await loadImageSafe(qrDataUrl);
    if (qrImg) {
      drawRoundRect(ctx, 78, 215, 204, 204, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.drawImage(qrImg, 88, 225, 184, 184);
    }
  } catch {
    // skip QR
  }

  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.fillStyle = '#D4AF37';
  ctx.font = '700 24px "JetBrains Mono", monospace';
  ctx.fillText(profile.membershipId, 78, 468);

  // Bottom bar
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(42, H - 108, W - 84, 2);
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillStyle = '#A1A1AA';
  ctx.font = '500 20px "Cairo", sans-serif';
  ctx.fillText('عاصمة الشبكات — صنعاء، شارع صقر، مول نور اليمن · بيت الخبرة والابتكار', W - 75, H - 56);

  return canvas;
}
