import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  GraduationCap,
  PlayCircle,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { t } from '../i18n/translations.ts';
import {
  issueAcademyCertificate,
  saveAcademyEnrollment,
  subscribeUserCertificates,
  subscribeUserEnrollments,
  verifyCertificateByCode,
} from '../services/firestoreService.ts';
import type {
  AcademyCertificate,
  AcademyCourse,
  AcademyEnrollment,
  AcademyLevel,
  AcademyTrack,
} from '../types/index.ts';
import { downloadCertificatePdf } from '../utils/certificatePdf.ts';
import { ResilientImage } from '../components/ResilientImage.tsx';

const TRACK_LABELS: { id: 'all' | AcademyTrack; ar: string; en: string }[] = [
  { id: 'all', ar: 'جميع المسارات', en: 'All Tracks' },
  { id: 'mikrotik', ar: 'دورات MikroTik', en: 'MikroTik' },
  { id: 'ubiquiti', ar: 'دورات Ubiquiti', en: 'Ubiquiti' },
  { id: 'fundamentals', ar: 'أساسيات الشبكات', en: 'Fundamentals' },
  { id: 'wireless', ar: 'الشبكات اللاسلكية', en: 'Wireless' },
  { id: 'fiber', ar: 'الألياف الضوئية', en: 'Fiber Optics' },
  { id: 'cctv', ar: 'كاميرات المراقبة', en: 'CCTV' },
  { id: 'servers_linux', ar: 'السيرفرات وLinux', en: 'Servers & Linux' },
  { id: 'troubleshooting', ar: 'تشخيص الأعطال', en: 'Troubleshooting' },
];

const LEVEL_LABELS: Record<AcademyLevel, { ar: string; en: string }> = {
  beginner: { ar: 'مبتدئ', en: 'Beginner' },
  intermediate: { ar: 'متوسط', en: 'Intermediate' },
  advanced: { ar: 'متقدم', en: 'Advanced' },
};

export function AcademyPage() {
  const { lang, firebaseUser, userProfile, signInWithGoogle, academyCourses } = useApp();

  const [tab, setTab] = useState<'courses' | 'my_learning' | 'verify'>(() => {
    return new URLSearchParams(window.location.search).get('verify') ? 'verify' : 'courses';
  });
  const [trackFilter, setTrackFilter] = useState<'all' | AcademyTrack>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | AcademyLevel>('all');
  const [activeCourse, setActiveCourse] = useState<AcademyCourse | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string>('');
  const [quizMode, setQuizMode] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizFeedback, setQuizFeedback] = useState<{
    score: number;
    passed: boolean;
    cert?: AcademyCertificate;
  } | null>(null);

  const [enrollments, setEnrollments] = useState<AcademyEnrollment[]>([]);
  const [certificates, setCertificates] = useState<AcademyCertificate[]>([]);
  const [busyAction, setBusyAction] = useState(false);

  // Verification Lookup
  const [verifyCodeInput, setVerifyCodeInput] = useState(
    () => new URLSearchParams(window.location.search).get('verify') || ''
  );
  const [verifiedResult, setVerifiedResult] = useState<AcademyCertificate | null | 'not_found'>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!firebaseUser) {
      setEnrollments([]);
      setCertificates([]);
      return;
    }
    const u1 = subscribeUserEnrollments(firebaseUser.uid, setEnrollments);
    const u2 = subscribeUserCertificates(firebaseUser.uid, setCertificates);
    return () => {
      u1();
      u2();
    };
  }, [firebaseUser]);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('verify');
    if (code) {
      setVerifyCodeInput(code);
      setTab('verify');
      void runVerificationLookup(code);
    }
  }, []);

  const filteredCourses = useMemo(() => {
    return academyCourses.filter((c) => {
      if (!c.isPublished) return false;
      if (trackFilter !== 'all' && c.track !== trackFilter) return false;
      if (levelFilter !== 'all' && c.level !== levelFilter) return false;
      return true;
    });
  }, [academyCourses, trackFilter, levelFilter]);

  const getEnrollment = (courseId: string): AcademyEnrollment | undefined =>
    enrollments.find((e) => e.courseId === courseId);

  const openCourse = async (course: AcademyCourse) => {
    const enr = getEnrollment(course.id);
    const startLesson =
      course.lessons.find((l) => l.id === enr?.lastLessonId) || course.lessons[0];
    setActiveCourse(course);
    setActiveLessonId(startLesson?.id || '');
    setQuizMode(false);
    setQuizFeedback(null);
    setAnswers({});

    if (firebaseUser && userProfile && !enr) {
      const now = new Date().toISOString();
      await saveAcademyEnrollment({
        id: `${firebaseUser.uid}_${course.id}`,
        uid: firebaseUser.uid,
        studentName: userProfile.displayName,
        courseId: course.id,
        courseTitleAr: course.titleAr,
        instructorUid: course.instructorUid,
        completedLessonIds: [],
        bookmarkedLessonIds: [],
        lastLessonId: startLesson?.id || '',
        progressPercent: 0,
        quizAttempts: 0,
        bestQuizScore: 0,
        passedQuiz: false,
        createdAt: now,
        updatedAt: now,
      });
    }
  };

  const upsertProgress = async (
    course: AcademyCourse,
    patch: Partial<AcademyEnrollment>
  ) => {
    if (!firebaseUser || !userProfile) {
      await signInWithGoogle();
      return null;
    }
    const existing = getEnrollment(course.id);
    const now = new Date().toISOString();
    const completed = patch.completedLessonIds ?? existing?.completedLessonIds ?? [];
    const totalLessons = Math.max(1, course.lessons.length);
    const pct = Math.min(100, Math.round((completed.length / totalLessons) * 100));

    const next: AcademyEnrollment = {
      id: `${firebaseUser.uid}_${course.id}`,
      uid: firebaseUser.uid,
      studentName: userProfile.displayName,
      courseId: course.id,
      courseTitleAr: course.titleAr,
      instructorUid: course.instructorUid,
      completedLessonIds: completed,
      bookmarkedLessonIds: patch.bookmarkedLessonIds ?? existing?.bookmarkedLessonIds ?? [],
      lastLessonId: patch.lastLessonId ?? existing?.lastLessonId ?? activeLessonId,
      progressPercent: patch.progressPercent ?? pct,
      quizAttempts: patch.quizAttempts ?? existing?.quizAttempts ?? 0,
      bestQuizScore: patch.bestQuizScore ?? existing?.bestQuizScore ?? 0,
      passedQuiz: patch.passedQuiz ?? existing?.passedQuiz ?? false,
      certificateCode: patch.certificateCode ?? existing?.certificateCode,
      completedAt: patch.completedAt ?? existing?.completedAt,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await saveAcademyEnrollment(next);
    return next;
  };

  const handleToggleCompleteLesson = async (course: AcademyCourse, lessonId: string) => {
    const existing = getEnrollment(course.id);
    const prev = existing?.completedLessonIds || [];
    const nextCompleted = prev.includes(lessonId)
      ? prev.filter((id) => id !== lessonId)
      : [...prev, lessonId];
    await upsertProgress(course, {
      completedLessonIds: nextCompleted,
      lastLessonId: lessonId,
    });
  };

  const handleToggleBookmark = async (course: AcademyCourse, lessonId: string) => {
    const existing = getEnrollment(course.id);
    const prev = existing?.bookmarkedLessonIds || [];
    const nextBookmarks = prev.includes(lessonId)
      ? prev.filter((id) => id !== lessonId)
      : [...prev, lessonId];
    await upsertProgress(course, { bookmarkedLessonIds: nextBookmarks });
  };

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse) return;
    if (!firebaseUser || !userProfile) {
      await signInWithGoogle();
      return;
    }
    setBusyAction(true);
    try {
      const totalQ = Math.max(1, activeCourse.quizQuestions.length);
      let correct = 0;
      for (const q of activeCourse.quizQuestions) {
        if (answers[q.id] === q.correctIndex) correct++;
      }
      const score = Math.round((correct / totalQ) * 100);
      const passed = score >= (activeCourse.passingScorePercent || 70);
      const existing = getEnrollment(activeCourse.id);
      let issuedCert: AcademyCertificate | undefined = certificates.find(
        (c) => c.courseId === activeCourse.id && c.isValid
      );

      if (passed && !issuedCert) {
        issuedCert = await issueAcademyCertificate({
          uid: firebaseUser.uid,
          studentName: userProfile.displayName,
          course: activeCourse,
          scorePercent: score,
        });
      }

      await upsertProgress(activeCourse, {
        completedLessonIds: passed
          ? activeCourse.lessons.map((l) => l.id)
          : existing?.completedLessonIds || [],
        progressPercent: passed ? 100 : existing?.progressPercent || 0,
        quizAttempts: (existing?.quizAttempts || 0) + 1,
        bestQuizScore: Math.max(existing?.bestQuizScore || 0, score),
        passedQuiz: Boolean(existing?.passedQuiz || passed),
        certificateCode: issuedCert?.certificateCode || existing?.certificateCode,
        completedAt: passed ? existing?.completedAt || new Date().toISOString() : existing?.completedAt,
      });

      setQuizFeedback({ score, passed, cert: issuedCert });
    } finally {
      setBusyAction(false);
    }
  };

  const runVerificationLookup = async (codeRaw?: string) => {
    const q = (codeRaw ?? verifyCodeInput).trim().toUpperCase();
    if (!q) return;
    setVerifying(true);
    setVerifiedResult(null);
    try {
      const cert = await verifyCertificateByCode(q);
      setVerifiedResult(cert || 'not_found');
    } finally {
      setVerifying(false);
    }
  };

  const activeEnrollment = activeCourse ? getEnrollment(activeCourse.id) : undefined;
  const activeLesson =
    activeCourse?.lessons.find((l) => l.id === activeLessonId) || activeCourse?.lessons[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Official Academy Header */}
      <div className="bg-[#0E0E10] text-white rounded-2xl p-6 sm:p-8 border border-[#C89D3C]/35 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-semibold text-[#D4AF37] inline-flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4" />
            <span>{t(lang, 'التعليم والتأهيل الهندسي · عاصمة الشبكات', 'Professional Networking Education')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">
            {t(
              lang,
              'أكاديمية عاصمة الشبكات – تعلّم، طوّر، احترف',
              'ASEMA Networks Academy — Learn, Develop, Master'
            )}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            {t(
              lang,
              '8 مسارات تخصصية شاملة، دروس تطبيقية، تتبع للتقدم، اختبارات تفاعلية، وشهادات إتمام إلكترونية PDF موثقة برقم تحقق فريد ورمز QR.',
              '8 specialized networking tracks, practical lessons, interactive quizzes, and verifiable PDF completion certificates with QR verification.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 bg-[#17171B] p-1.5 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => {
              setTab('courses');
              setActiveCourse(null);
            }}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold cursor-pointer ${
              tab === 'courses' ? 'bg-[#C89D3C] text-[#0E0E10]' : 'text-neutral-300 hover:text-white'
            }`}
          >
            {t(lang, 'الدورات والمسارات', 'Tracks & Courses')}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('my_learning');
              setActiveCourse(null);
            }}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold cursor-pointer ${
              tab === 'my_learning'
                ? 'bg-[#C89D3C] text-[#0E0E10]'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            {t(lang, 'تعليمي وشهاداتي', 'My Learning')} ({certificates.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('verify');
              setActiveCourse(null);
            }}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold cursor-pointer ${
              tab === 'verify' ? 'bg-[#C89D3C] text-[#0E0E10]' : 'text-neutral-300 hover:text-white'
            }`}
          >
            {t(lang, 'التحقق من الشهادات', 'Verify Certificate')}
          </button>
        </div>
      </div>

      {/* COURSE WORKSPACE (ACTIVE PLAYER + LESSONS + QUIZ) */}
      {activeCourse && (
        <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5E0] dark:border-white/10 pb-4">
            <div>
              <button
                type="button"
                onClick={() => setActiveCourse(null)}
                className="text-xs font-bold text-[#9E7822] dark:text-[#D4AF37] hover:underline cursor-pointer mb-1 block"
              >
                ← {t(lang, 'العودة إلى قائمة الدورات', 'Back to All Courses')}
              </button>
              <h2 className="text-xl font-bold">
                {lang === 'ar' ? activeCourse.titleAr : activeCourse.titleEn}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {activeCourse.instructorName} · {activeCourse.durationMinutes}{' '}
                {t(lang, 'دقيقة', 'mins')} · +{activeCourse.pointsReward} {t(lang, 'نقطة', 'pts')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-mono-num font-bold">
                {t(lang, 'التقدم:', 'Progress:')} {activeEnrollment?.progressPercent || 0}%
              </div>
              <button
                type="button"
                onClick={() => setQuizMode((v) => !v)}
                className="px-4 py-2 rounded-lg bg-[#C89D3C] text-[#0E0E10] text-xs font-bold hover:bg-[#D4AF37] cursor-pointer"
              >
                {quizMode
                  ? t(lang, 'العودة للدروس', 'Back to Lessons')
                  : t(lang, 'بدء الاختبار وإصدار الشهادة', 'Take Final Quiz')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar Lessons */}
            <aside className="lg:col-span-4 space-y-2">
              <h3 className="text-xs font-bold text-neutral-500 mb-2">
                {t(lang, 'محتوى الدورة والدروس', 'Course Syllabus')} ({activeCourse.lessons.length})
              </h3>
              {activeCourse.lessons.map((les) => {
                const done = activeEnrollment?.completedLessonIds.includes(les.id);
                const bookmarked = activeEnrollment?.bookmarkedLessonIds.includes(les.id);
                const current = !quizMode && activeLesson?.id === les.id;
                return (
                  <button
                    key={les.id}
                    type="button"
                    onClick={() => {
                      setQuizMode(false);
                      setActiveLessonId(les.id);
                      if (firebaseUser) {
                        void upsertProgress(activeCourse, { lastLessonId: les.id });
                      }
                    }}
                    className={`w-full text-start p-3 rounded-xl border text-xs flex items-start justify-between gap-2 cursor-pointer transition-colors ${
                      current
                        ? 'bg-[#0E0E10] text-white border-[#C89D3C]'
                        : 'bg-[#F8F8F7] dark:bg-[#0E0E10] border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-bold">{lang === 'ar' ? les.titleAr : les.titleEn}</div>
                      <div className="text-[11px] opacity-70 font-mono-num">
                        {les.durationMinutes} min
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      {bookmarked && <Bookmark className="w-3.5 h-3.5 text-[#C89D3C] fill-[#C89D3C]" />}
                      {done && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                  </button>
                );
              })}
            </aside>

            {/* Main Lesson / Quiz Body */}
            <div className="lg:col-span-8">
              {quizMode ? (
                <form onSubmit={handleSubmitQuiz} className="space-y-5">
                  <div className="p-4 rounded-xl bg-[#FAF5E8] dark:bg-[#0E0E10] border border-[#C89D3C]/40 text-xs">
                    {t(
                      lang,
                      `يتطلب النجاح وإصدار الشهادة الموثقة الحصول على نسبة ${activeCourse.passingScorePercent}% على الأقل.`,
                      `Score at least ${activeCourse.passingScorePercent}% to pass and earn your verified PDF certificate.`
                    )}
                  </div>

                  {activeCourse.quizQuestions.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 space-y-3"
                    >
                      <div className="text-sm font-bold">
                        {qIdx + 1}. {q.questionAr}
                      </div>
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => (
                          <label
                            key={optIdx}
                            className="flex items-center gap-2.5 text-xs p-2.5 rounded-lg bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 cursor-pointer hover:border-[#C89D3C]"
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={answers[q.id] === optIdx}
                              onChange={() => setAnswers((p) => ({ ...p, [q.id]: optIdx }))}
                              required
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  {quizFeedback && (
                    <div
                      className={`p-5 rounded-xl border space-y-3 ${
                        quizFeedback.passed
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/40'
                          : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/40'
                      }`}
                    >
                      <div className="text-base font-bold">
                        {quizFeedback.passed
                          ? t(lang, `مبروك! نجحت بنسبة ${quizFeedback.score}%`, `Congratulations! Passed with ${quizFeedback.score}%`)
                          : t(lang, `حصلت على ${quizFeedback.score}% — حاول مرة أخرى للوصول للحد المطلوب.`, `Scored ${quizFeedback.score}% — please try again.`)}
                      </div>
                      {quizFeedback.cert && (
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-200 dark:border-white/10">
                          <div className="text-xs font-mono-num font-bold">
                            {t(lang, 'رقم الشهادة الموثق:', 'Certificate ID:')} {quizFeedback.cert.certificateCode}
                          </div>
                          <button
                            type="button"
                            onClick={() => void downloadCertificatePdf(quizFeedback.cert!)}
                            className="px-4 py-2 rounded-lg bg-[#0E0E10] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-4 h-4 text-[#D4AF37]" />
                            <span>{t(lang, 'تحميل الشهادة PDF', 'Download Certificate PDF')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busyAction}
                    className="px-6 py-3 rounded-xl bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-sm font-bold cursor-pointer"
                  >
                    {busyAction
                      ? t(lang, 'جاري تصحيح الاختبار...', 'Grading Quiz...')
                      : t(lang, 'تصحيح الاختبار وإصدار النتيجة', 'Submit & Grade Quiz')}
                  </button>
                </form>
              ) : (
                activeLesson && (
                  <div className="space-y-4">
                    {activeLesson.videoUrl && (
                      <div className="aspect-video rounded-xl overflow-hidden bg-black border border-[#E5E5E0] dark:border-white/10">
                        <iframe
                          src={activeLesson.videoUrl}
                          title={activeLesson.titleAr}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    )}

                    <div className="p-5 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-bold">
                          {lang === 'ar' ? activeLesson.titleAr : activeLesson.titleEn}
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleToggleBookmark(activeCourse, activeLesson.id)}
                            className="px-3 py-1.5 rounded-lg border border-[#E5E5E0] dark:border-white/15 bg-white dark:bg-[#17171B] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Bookmark
                              className={`w-3.5 h-3.5 ${
                                activeEnrollment?.bookmarkedLessonIds.includes(activeLesson.id)
                                  ? 'fill-[#C89D3C] text-[#C89D3C]'
                                  : ''
                              }`}
                            />
                            <span>{t(lang, 'إشارة مرجعية', 'Bookmark')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleToggleCompleteLesson(activeCourse, activeLesson.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                              activeEnrollment?.completedLessonIds.includes(activeLesson.id)
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#0E0E10] text-white hover:bg-[#C89D3C] hover:text-[#0E0E10]'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {activeEnrollment?.completedLessonIds.includes(activeLesson.id)
                                ? t(lang, 'مكتمل', 'Completed')
                                : t(lang, 'تحديد كمكتمل', 'Mark Complete')}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="text-sm leading-loose whitespace-pre-line text-neutral-700 dark:text-neutral-200">
                        {activeLesson.contentAr}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: COURSES CATALOG */}
      {!activeCourse && tab === 'courses' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {TRACK_LABELS.map((tr) => (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => setTrackFilter(tr.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                    trackFilter === tr.id
                      ? 'bg-[#0E0E10] text-[#D4AF37] border-[#C89D3C]'
                      : 'bg-white dark:bg-[#17171B] border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C]'
                  }`}
                >
                  {lang === 'ar' ? tr.ar : tr.en}
                </button>
              ))}
            </div>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as 'all' | AcademyLevel)}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10"
            >
              <option value="all">{t(lang, 'جميع المستويات', 'All Levels')}</option>
              <option value="beginner">{t(lang, 'مبتدئ', 'Beginner')}</option>
              <option value="intermediate">{t(lang, 'متوسط', 'Intermediate')}</option>
              <option value="advanced">{t(lang, 'متقدم', 'Advanced')}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const enr = getEnrollment(course.id);
              const lvl = LEVEL_LABELS[course.level];
              return (
                <article
                  key={course.id}
                  className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[16/9] bg-[#0E0E10] overflow-hidden">
                      <ResilientImage
                        src={course.thumbnailUrl}
                        alt={course.titleEn}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <span className="font-bold text-[#9E7822] dark:text-[#D4AF37]">
                          {lang === 'ar' ? lvl.ar : lvl.en}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono-num">
                          <Clock className="w-3.5 h-3.5" />
                          {course.durationMinutes}m · {course.lessons.length} {t(lang, 'دروس', 'lessons')}
                        </span>
                      </div>
                      <h3 className="text-base font-bold leading-snug">
                        {lang === 'ar' ? course.titleAr : course.titleEn}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                        {lang === 'ar' ? course.descriptionAr : course.descriptionEn}
                      </p>
                      <div className="text-[11px] text-neutral-500">{course.instructorName}</div>
                    </div>
                  </div>

                  <div className="px-5 py-4 bg-[#F8F8F7] dark:bg-[#0E0E10] border-t border-[#E5E5E0] dark:border-white/10 space-y-3">
                    {enr && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono-num">
                          <span>{t(lang, 'نسبة الإنجاز', 'Completion')}</span>
                          <span>{enr.progressPercent}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-[#C89D3C]"
                            style={{ width: `${enr.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => void openCourse(course)}
                      className="w-full py-2.5 rounded-xl bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] hover:bg-[#C89D3C] hover:text-[#0E0E10] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>
                        {enr
                          ? t(lang, 'متابعة الدورة التدريبية', 'Resume Course')
                          : t(lang, 'ابدأ التعلم الآن', 'Start Learning')}
                      </span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: MY LEARNING & CERTIFICATES */}
      {!activeCourse && tab === 'my_learning' && (
        <div className="space-y-6">
          {!firebaseUser ? (
            <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-8 text-center space-y-4">
              <BookOpen className="w-8 h-8 text-[#C89D3C] mx-auto" />
              <p className="text-sm">
                {t(
                  lang,
                  'سجل دخولك لحفظ تقدمك في الدورات وإصدار الشهادات الموثقة باسمك.',
                  'Sign in to save course progress and issue verified certificates.'
                )}
              </p>
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="px-5 py-2.5 rounded-lg bg-[#0E0E10] text-white text-xs font-bold cursor-pointer"
              >
                {t(lang, 'تسجيل الدخول عبر Google', 'Sign In with Google')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#C89D3C]" />
                  <span>{t(lang, 'دوراتي المسجلة', 'Enrolled Courses')} ({enrollments.length})</span>
                </h2>
                {enrollments.length === 0 ? (
                  <p className="text-xs text-neutral-500">
                    {t(lang, 'لم تبدأ أي دورة بعد.', 'You have not started any courses yet.')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {enrollments.map((enr) => {
                      const course = academyCourses.find((c) => c.id === enr.courseId);
                      return (
                        <div
                          key={enr.id}
                          className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="text-sm font-bold">{enr.courseTitleAr}</div>
                            <div className="text-xs font-mono-num text-neutral-500">
                              {t(lang, 'التقدم:', 'Progress:')} {enr.progressPercent}% ·{' '}
                              {t(lang, 'أفضل اختبار:', 'Best Quiz:')} {enr.bestQuizScore}%
                            </div>
                          </div>
                          {course && (
                            <button
                              type="button"
                              onClick={() => void openCourse(course)}
                              className="px-3.5 py-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold cursor-pointer shrink-0"
                            >
                              {t(lang, 'استكمال', 'Resume')}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#C89D3C]" />
                  <span>{t(lang, 'شهاداتي الإلكترونية الموثقة', 'My Verified Certificates')} ({certificates.length})</span>
                </h2>
                {certificates.length === 0 ? (
                  <p className="text-xs text-neutral-500">
                    {t(
                      lang,
                      'اجتز الاختبار النهائي في أي دورة لإصدار شهادتك الموثقة تلقائياً.',
                      'Pass any course quiz to generate your verified certificate.'
                    )}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="p-4 rounded-xl bg-[#FAF5E8] dark:bg-[#0E0E10] border border-[#C89D3C]/40 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-mono-num font-bold text-[#9E7822] dark:text-[#D4AF37]">
                            {cert.certificateCode}
                          </div>
                          <div className="text-sm font-bold">{cert.courseTitleAr}</div>
                          <div className="text-[11px] text-neutral-500 font-mono-num">
                            {cert.scorePercent}% · {new Date(cert.issuedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void downloadCertificatePdf(cert)}
                          className="px-3.5 py-2 rounded-lg bg-[#0E0E10] text-white hover:bg-[#C89D3C] hover:text-[#0E0E10] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: VERIFY CERTIFICATE */}
      {!activeCourse && tab === 'verify' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#C89D3C]" />
            <h2 className="text-lg font-bold">
              {t(lang, 'بوابة التحقق من صحة شهادات عاصمة الشبكات', 'ASEMA Academy Certificate Verification')}
            </h2>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runVerificationLookup();
            }}
            className="flex gap-2"
          >
            <input
              value={verifyCodeInput}
              onChange={(e) => setVerifyCodeInput(e.target.value)}
              dir="ltr"
              placeholder="ASEMA-CERT-2026-12345"
              className="flex-1 px-4 py-2.5 text-sm font-mono-num bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-xl"
            />
            <button
              type="submit"
              disabled={verifying}
              className="px-5 py-2.5 rounded-xl bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{verifying ? t(lang, 'جاري الفحص...', 'Checking...') : t(lang, 'تحقق', 'Verify')}</span>
            </button>
          </form>

          {verifiedResult === 'not_found' && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-700/40 text-xs text-rose-700 dark:text-rose-300">
              {t(
                lang,
                'لم يتم العثور على شهادة مطابقة لهذا الرقم. تأكد من إدخال الصيغة الكاملة مثل ASEMA-CERT-2026-XXXXX.',
                'No certificate found matching this code.'
              )}
            </div>
          )}

          {verifiedResult && verifiedResult !== 'not_found' && (
            <div className="p-5 rounded-xl bg-[#FAF5E8] dark:bg-[#0E0E10] border border-[#C89D3C]/50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono-num font-bold text-[#9E7822] dark:text-[#D4AF37]">
                  {verifiedResult.certificateCode}
                </span>
                <span
                  className={`font-bold ${
                    verifiedResult.isValid ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {verifiedResult.isValid
                    ? t(lang, 'شهادة صحيحة ومعتمدة ✓', 'VALID & AUTHENTIC ✓')
                    : t(lang, 'شهادة ملغاة', 'REVOKED')}
                </span>
              </div>
              <div className="text-sm font-bold">{verifiedResult.studentName}</div>
              <div>{verifiedResult.courseTitleAr}</div>
              <div className="text-neutral-500 font-mono-num">
                {t(lang, 'النتيجة:', 'Score:')} {verifiedResult.scorePercent}% ·{' '}
                {t(lang, 'تاريخ الإصدار:', 'Issued:')}{' '}
                {new Date(verifiedResult.issuedAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
