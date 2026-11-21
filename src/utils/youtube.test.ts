import assert from 'node:assert/strict';
import { parseYouTubeTimestamp, parseYouTubeVideo } from './youtube.ts';

function runYouTubeParserTests() {
  // 1. Standard watch URL
  const watch = parseYouTubeVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(watch.isValid, true);
  assert.equal(watch.kind, 'youtube');
  assert.equal(watch.videoId, 'dQw4w9WgXcQ');
  assert.equal(watch.sourceFormat, 'watch');
  assert.ok(watch.embedUrl?.startsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?'));
  assert.equal(watch.watchUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(watch.thumbnailUrl, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');

  // 2. Short youtu.be URL with query params
  const shortUrl = parseYouTubeVideo('https://youtu.be/M7lc1UVf-VE?si=abc123&t=1m30s');
  assert.equal(shortUrl.isValid, true);
  assert.equal(shortUrl.videoId, 'M7lc1UVf-VE');
  assert.equal(shortUrl.sourceFormat, 'short_link');
  assert.equal(shortUrl.startSeconds, 90);
  assert.ok(shortUrl.embedUrl?.includes('https://www.youtube-nocookie.com/embed/M7lc1UVf-VE'));
  assert.ok(shortUrl.embedUrl?.includes('start=90'));
  assert.equal(shortUrl.watchUrl, 'https://www.youtube.com/watch?v=M7lc1UVf-VE&t=90s');

  // 3. Mobile m.youtube.com URL (the exact source of "رفض m.youtube.com الاتصال")
  const mobileUrl = parseYouTubeVideo('https://m.youtube.com/watch?v=aqz-KE-bpKQ&list=PL123');
  assert.equal(mobileUrl.isValid, true);
  assert.equal(mobileUrl.videoId, 'aqz-KE-bpKQ');
  assert.equal(mobileUrl.sourceFormat, 'mobile');
  assert.ok(mobileUrl.embedUrl?.startsWith('https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?'));
  assert.ok(!mobileUrl.embedUrl?.includes('m.youtube.com'));

  // 4. YouTube Shorts URL
  const shortsUrl = parseYouTubeVideo('https://www.youtube.com/shorts/9bZkp7q19f0');
  assert.equal(shortsUrl.isValid, true);
  assert.equal(shortsUrl.videoId, '9bZkp7q19f0');
  assert.equal(shortsUrl.sourceFormat, 'shorts');
  assert.ok(shortsUrl.embedUrl?.startsWith('https://www.youtube-nocookie.com/embed/9bZkp7q19f0?'));

  // 5. YouTube Live URL
  const liveUrl = parseYouTubeVideo('https://www.youtube.com/live/jfKfPfyJRdk?feature=share');
  assert.equal(liveUrl.isValid, true);
  assert.equal(liveUrl.videoId, 'jfKfPfyJRdk');
  assert.equal(liveUrl.sourceFormat, 'live');
  assert.ok(liveUrl.embedUrl?.startsWith('https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?'));

  // 6. Existing embed / nocookie / missing scheme URLs
  const embedNoScheme = parseYouTubeVideo('youtube.com/embed/LXb3EKWsInQ', { autoplay: true });
  assert.equal(embedNoScheme.isValid, true);
  assert.equal(embedNoScheme.videoId, 'LXb3EKWsInQ');
  assert.ok(embedNoScheme.embedUrl?.startsWith('https://www.youtube-nocookie.com/embed/LXb3EKWsInQ?'));
  assert.ok(embedNoScheme.embedUrl?.includes('autoplay=1'));
  assert.ok(embedNoScheme.embedUrl?.includes('playsinline=1'));

  // 7. Empty input
  const empty = parseYouTubeVideo('   ');
  assert.equal(empty.isValid, false);
  assert.equal(empty.kind, 'empty');

  // 8. Invalid YouTube ID (too short)
  const shortId = parseYouTubeVideo('https://www.youtube.com/watch?v=short123');
  assert.equal(shortId.isValid, false);
  assert.equal(shortId.kind, 'invalid');
  assert.ok(shortId.errorAr);

  // 9. Playlist-only URL without video ID
  const playlistOnly = parseYouTubeVideo('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf');
  assert.equal(playlistOnly.isValid, false);
  assert.equal(playlistOnly.kind, 'invalid');
  assert.ok(playlistOnly.errorAr?.includes('قائمة تشغيل'));

  // 10. Non-YouTube website URL
  const nonYt = parseYouTubeVideo('https://example.com/watch?v=dQw4w9WgXcQ');
  assert.equal(nonYt.isValid, false);
  assert.equal(nonYt.kind, 'invalid');

  // 11. Timestamp parser checks
  assert.equal(parseYouTubeTimestamp('45'), 45);
  assert.equal(parseYouTubeTimestamp('1h2m3s'), 3723);
  assert.equal(parseYouTubeTimestamp('invalid'), null);

  console.log('ALL YOUTUBE PARSER TESTS PASSED (11/11 assertions).');
}

runYouTubeParserTests();
