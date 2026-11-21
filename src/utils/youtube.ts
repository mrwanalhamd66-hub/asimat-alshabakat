export type YouTubeSourceFormat =
  | 'watch'
  | 'short_link'
  | 'mobile'
  | 'shorts'
  | 'live'
  | 'embed'
  | 'music'
  | 'nocookie'
  | 'direct_video';

export interface ParsedVideoUrl {
  isValid: boolean;
  kind: 'empty' | 'youtube' | 'direct_video' | 'invalid';
  videoId: string | null;
  sourceFormat: YouTubeSourceFormat | null;
  originalUrl: string;
  embedUrl: string | null;
  watchUrl: string | null;
  thumbnailUrl: string | null;
  fallbackThumbnailUrl: string | null;
  startSeconds: number | null;
  errorAr: string | null;
  errorEn: string | null;
}

const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

const ALLOWED_YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  'www.youtu.be',
]);

/**
 * Parses YouTube timestamp formats such as:
 * "90", "90s", "2m30s", "1h2m3s"
 */
export function parseYouTubeTimestamp(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const secs = Number(trimmed);
    return Number.isFinite(secs) && secs > 0 ? secs : null;
  }

  const hmsMatch = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i);
  if (hmsMatch && (hmsMatch[1] || hmsMatch[2] || hmsMatch[3])) {
    const hours = Number(hmsMatch[1] || 0);
    const mins = Number(hmsMatch[2] || 0);
    const secs = Number(hmsMatch[3] || 0);
    const total = hours * 3600 + mins * 60 + secs;
    return total > 0 ? total : null;
  }

  return null;
}

function sanitizeVideoIdCandidate(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const cleaned = candidate.trim().split(/[?#&/]/)[0];
  return YOUTUBE_VIDEO_ID_REGEX.test(cleaned) ? cleaned : null;
}

function normalizeUrlInput(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

/**
 * Recognizes all standard, mobile, short, Shorts, Live, and Embed YouTube URLs,
 * validates the 11-char VIDEO_ID, and builds a privacy-enhanced youtube-nocookie.com
 * embed URL alongside watch & thumbnail URLs.
 */
export function parseYouTubeVideo(
  rawUrl?: string | null,
  options?: { autoplay?: boolean; origin?: string }
): ParsedVideoUrl {
  const originalUrl = (rawUrl || '').trim();

  if (!originalUrl) {
    return {
      isValid: false,
      kind: 'empty',
      videoId: null,
      sourceFormat: null,
      originalUrl: '',
      embedUrl: null,
      watchUrl: null,
      thumbnailUrl: null,
      fallbackThumbnailUrl: null,
      startSeconds: null,
      errorAr: null,
      errorEn: null,
    };
  }

  const normalized = normalizeUrlInput(originalUrl);
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    return {
      isValid: false,
      kind: 'invalid',
      videoId: null,
      sourceFormat: null,
      originalUrl,
      embedUrl: null,
      watchUrl: null,
      thumbnailUrl: null,
      fallbackThumbnailUrl: null,
      startSeconds: null,
      errorAr: 'صيغة الرابط غير صالحة. يرجى إدخال رابط YouTube صحيح.',
      errorEn: 'Invalid URL syntax. Please enter a valid YouTube link.',
    };
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return {
      isValid: false,
      kind: 'invalid',
      videoId: null,
      sourceFormat: null,
      originalUrl,
      embedUrl: null,
      watchUrl: null,
      thumbnailUrl: null,
      fallbackThumbnailUrl: null,
      startSeconds: null,
      errorAr: 'بروتوكول الرابط غير مدعوم. استخدم رابط http أو https.',
      errorEn: 'Unsupported URL protocol. Use an http or https link.',
    };
  }

  const host = parsedUrl.hostname.toLowerCase();

  // Direct MP4 / WebM video fallback support
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(parsedUrl.pathname)) {
    return {
      isValid: true,
      kind: 'direct_video',
      videoId: null,
      sourceFormat: 'direct_video',
      originalUrl,
      embedUrl: parsedUrl.toString(),
      watchUrl: parsedUrl.toString(),
      thumbnailUrl: null,
      fallbackThumbnailUrl: null,
      startSeconds: null,
      errorAr: null,
      errorEn: null,
    };
  }

  if (!ALLOWED_YOUTUBE_HOSTS.has(host)) {
    return {
      isValid: false,
      kind: 'invalid',
      videoId: null,
      sourceFormat: null,
      originalUrl,
      embedUrl: null,
      watchUrl: null,
      thumbnailUrl: null,
      fallbackThumbnailUrl: null,
      startSeconds: null,
      errorAr: 'الرابط لا ينتمي إلى YouTube. يرجى استخدام رابط YouTube صالح (watch / youtu.be / m.youtube / shorts / live).',
      errorEn: 'This URL is not a recognized YouTube domain (youtube.com, m.youtube.com, youtu.be, youtube-nocookie.com).',
    };
  }

  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
  let videoId: string | null = null;
  let sourceFormat: YouTubeSourceFormat =
    host === 'm.youtube.com'
      ? 'mobile'
      : host === 'music.youtube.com'
        ? 'music'
        : host.includes('youtube-nocookie.com')
          ? 'nocookie'
          : 'watch';

  // 1. youtu.be/<VIDEO_ID>
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    sourceFormat = 'short_link';
    videoId = sanitizeVideoIdCandidate(pathSegments[0]);
  } else {
    const first = (pathSegments[0] || '').toLowerCase();

    if (first === 'watch' || parsedUrl.searchParams.has('v')) {
      videoId =
        sanitizeVideoIdCandidate(parsedUrl.searchParams.get('v')) ||
        sanitizeVideoIdCandidate(pathSegments[1]);
      if (host === 'm.youtube.com') sourceFormat = 'mobile';
      else if (host === 'music.youtube.com') sourceFormat = 'music';
      else sourceFormat = 'watch';
    } else if (first === 'shorts') {
      sourceFormat = 'shorts';
      videoId = sanitizeVideoIdCandidate(pathSegments[1]);
    } else if (first === 'live') {
      sourceFormat = 'live';
      videoId = sanitizeVideoIdCandidate(pathSegments[1]);
    } else if (first === 'embed' || first === 'v' || first === 'e') {
      sourceFormat = host.includes('youtube-nocookie.com') ? 'nocookie' : 'embed';
      videoId = sanitizeVideoIdCandidate(pathSegments[1]);
    } else if (first === 'attribution_link' && parsedUrl.searchParams.get('u')) {
      try {
        const innerUrl = new URL(parsedUrl.searchParams.get('u')!, 'https://www.youtube.com');
        videoId = sanitizeVideoIdCandidate(innerUrl.searchParams.get('v'));
        sourceFormat = 'watch';
      } catch {
        videoId = null;
      }
    }
  }

  if (!videoId) {
    const isPlaylistOnly = parsedUrl.pathname.toLowerCase().includes('/playlist') && parsedUrl.searchParams.has('list');
    return {
      isValid: false,
      kind: 'invalid',
      videoId: null,
      sourceFormat: null,
      originalUrl,
      embedUrl: null,
      watchUrl: null,
      thumbnailUrl: null,
      fallbackThumbnailUrl: null,
      startSeconds: null,
      errorAr: isPlaylistOnly
        ? 'رابط قائمة تشغيل فقط بدون معرف فيديو محدد. يرجى نسخ رابط الفيديو نفسه.'
        : 'تعذر استخراج معرف الفيديو (VIDEO_ID) المكون من 11 حرفاً من رابط YouTube.',
      errorEn: isPlaylistOnly
        ? 'Playlist-only links without a specific video ID cannot be embedded. Copy the individual video URL.'
        : 'Could not extract a valid 11-character YouTube VIDEO_ID from this URL.',
    };
  }

  const startSeconds =
    parseYouTubeTimestamp(parsedUrl.searchParams.get('t')) ||
    parseYouTubeTimestamp(parsedUrl.searchParams.get('start')) ||
    parseYouTubeTimestamp(parsedUrl.searchParams.get('time_continue'));

  const embedParams = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
    iv_load_policy: '3',
  });

  if (options?.autoplay) {
    embedParams.set('autoplay', '1');
  }
  if (startSeconds && startSeconds > 0) {
    embedParams.set('start', String(startSeconds));
  }
  if (options?.origin) {
    embedParams.set('origin', options.origin);
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?${embedParams.toString()}`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}${startSeconds ? `&t=${startSeconds}s` : ''}`;

  return {
    isValid: true,
    kind: 'youtube',
    videoId,
    sourceFormat,
    originalUrl,
    embedUrl,
    watchUrl,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    fallbackThumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    startSeconds,
    errorAr: null,
    errorEn: null,
  };
}
