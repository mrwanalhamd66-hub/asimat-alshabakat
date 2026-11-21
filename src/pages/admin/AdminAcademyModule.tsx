import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  GraduationCap,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { t } from '../../i18n/translations.ts';
import {
  logAdminActivity,
  removeAcademyCourse,
  saveAcademyCourse,
  subscribeAllCertificates,
  subscribeAllEnrollments,
  toggleCertificateValidity,
} from '../../services/firestoreService.ts';
import type {
  AcademyCertificate,
  AcademyCourse,
  AcademyEnrollment,
  AcademyLesson,
  AcademyLevel,
  AcademyQuizQuestion,
  AcademyTrack,
} from '../../types/index.ts';
import { ImageUploader } from '../../components/ImageUploader.tsx';
import { AcademyVideoPlayer } from '../../components/AcademyVideoPlayer.tsx';
import { parseYouTubeVideo } from '../../utils/youtube.ts';

const TRACK_OPTIONS: { id: AcademyTrack; ar: string; en: string }[] = [
  { id: 'mikrotik', ar: 'دورات MikroTik', en: 'MikroTik' },
  { id: 'ubiquiti', ar: 'دورات Ubiquiti', en: 'Ubiquiti' },
  { id: 'fundamentals', ar: 'أساسيات الشبكات', en: 'Fundamentals' },
  { id: 'wireless', ar: 'الشبكات اللاسلكية', en: 'Wireless' },
  { id: 'fiber', ar: 'الألياف الضوئية', en: 'Fiber Optics' },
  { id: 'cctv', ar: 'كاميرات المراقبة', en: 'CCTV' },
  { id: 'servers_linux', ar: 'السيرفرات وLinux', en: 'Servers & Linux' },
  { id: 'troubleshooting', ar: 'تشخيص الأعطال', en: 'Troubleshooting' },
];

export function AdminAcademyModule() {
  const { lang, academyCourses, userProfile, isAdminOrStaff } = useApp();
  const [subTab, setSubTab] = useState<'courses' | 'enrollments' | 'certificates'>('courses');
  const [editing, setEditing] = useState<AcademyCourse | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewLessonIds, setPreviewLessonIds] = useState<Record<string, boolean>>({});
  const [enrollments, setEnrollments] = useState<AcademyEnrollment[]>([]);
  const [certificates, setCertificates] = useState<AcademyCertificate[]>([]);

  useEffect(() => {
    const u1 = subscribeAllEnrollments(setEnrollments);
    const u2 = subscribeAllCertificates(setCertificates);
    return () => {
      u1();
      u2();
    };
  }, []);

  const openNewCourse = () => {
    setFormError(null);
    setPreviewLessonIds({});
    const now = new Date().toISOString();
    setEditing({
      id: `course_${Date.now()}`,
      titleAr: '',
      titleEn: '',
      descriptionAr: '',
      descriptionEn: '',
      track: 'mikrotik',
      level: 'beginner',
      instructorUid: userProfile?.uid || '',
      instructorName: userProfile?.displayName || 'م. مروان الحمد',
      thumbnailUrl: '',
      durationMinutes: 45,
      pointsReward: 100,
      lessons: [
        {
          id: `les_${Date.now()}`,
          titleAr: 'الدرس الأول: مقدمة المسار العملي',
          titleEn: 'Lesson 1: Practical Introduction',
          durationMinutes: 15,
          videoUrl: '',
          contentAr: 'اكتب محتوى الدرس والأوامر العملية هنا...',
          order: 1,
        },
      ],
      quizQuestions: [
        {
          id: `q_${Date.now()}`,
          questionAr: 'اكتب سؤال التقييم النهائي للدورة؟',
          options: ['الخيار الصحيح', 'خيار ٢', 'خيار ٣', 'خيار ٤'],
          correctIndex: 0,
          explanationAr: 'تفسير الإجابة الصحيحة للطلاب.',
        },
      ],
      passingScorePercent: 70,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    });
  };

  const addLessonRow = () => {
    if (!editing) return;
    const nextOrder = editing.lessons.length + 1;
    const newLesson: AcademyLesson = {
      id: `les_${Date.now()}_${nextOrder}`,
      titleAr: `الدرس ${nextOrder}`,
      titleEn: `Lesson ${nextOrder}`,
      durationMinutes: 15,
      videoUrl: '',
      contentAr: '',
      order: nextOrder,
    };
    setEditing({ ...editing, lessons: [...editing.lessons, newLesson] });
  };

  const updateLessonRow = (idx: number, patch: Partial<AcademyLesson>) => {
    if (!editing) return;
    const next = editing.lessons.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    setEditing({ ...editing, lessons: next });
  };

  const removeLessonRow = (idx: number) => {
    if (!editing || editing.lessons.length <= 1) return;
    setEditing({ ...editing, lessons: editing.lessons.filter((_, i) => i !== idx) });
  };

  const addQuestionRow = () => {
    if (!editing) return;
    const q: AcademyQuizQuestion = {
      id: `q_${Date.now()}_${editing.quizQuestions.length + 1}`,
      questionAr: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      explanationAr: '',
    };
    setEditing({ ...editing, quizQuestions: [...editing.quizQuestions, q] });
  };

  const updateQuestionRow = (idx: number, patch: Partial<AcademyQuizQuestion>) => {
    if (!editing) return;
    const next = editing.quizQuestions.map((q, i) => (i === idx ? { ...q, ...patch } : q));
    setEditing({ ...editing, quizQuestions: next });
  };

  const removeQuestionRow = (idx: number) => {
    if (!editing || editing.quizQuestions.length <= 1) return;
    setEditing({ ...editing, quizQuestions: editing.quizQuestions.filter((_, i) => i !== idx) });
  };

  const toggleLessonPreview = (lessonId: string) => {
    setPreviewLessonIds((prev) => ({ ...prev, [lessonId]: !prev[lessonId] }));
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !userProfile) return;
    setFormError(null);

    // Validate any non-empty lesson video URL before saving
    for (let i = 0; i < editing.lessons.length; i += 1) {
      const les = editing.lessons[i];
      const rawUrl = (les.videoUrl || '').trim();
      if (rawUrl) {
        const parsed = parseYouTubeVideo(rawUrl);
        if (!parsed.isValid) {
          setFormError(
            lang === 'ar'
              ? `خطأ في رابط الفيديو بالدرس #${i + 1} (${les.titleAr || `الدرس ${i + 1}`}): ${parsed.errorAr || 'رابط غير صالح'}`
              : `Invalid video URL in Lesson #${i + 1} (${les.titleEn || les.titleAr}): ${parsed.errorEn || 'Invalid URL'}`
          );
          return;
        }
      }
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const totalMins = editing.lessons.reduce((s, l) => s + Number(l.durationMinutes || 10), 0);
      const cleanCourse: AcademyCourse = {
        ...editing,
        titleEn: editing.titleEn.trim() || editing.titleAr.trim(),
        instructorUid: editing.instructorUid || userProfile.uid,
        durationMinutes: Math.max(5, Number(editing.durationMinutes || totalMins)),
        pointsReward: Math.max(10, Math.min(500, Number(editing.pointsReward || 100))),
        passingScorePercent: Math.max(40, Math.min(100, Number(editing.passingScorePercent || 70))),
        lessons: editing.lessons.map((l, idx) => ({
          ...l,
          order: idx + 1,
          titleEn: l.titleEn?.trim() || l.titleAr.trim() || `Lesson ${idx + 1}`,
          durationMinutes: Math.max(1, Number(l.durationMinutes || 10)),
          // Preserve the original clean YouTube URL in Firestore; embed URL is generated dynamically on render
          videoUrl: (l.videoUrl || '').trim(),
        })),
        quizQuestions: editing.quizQuestions.filter((q) => q.questionAr.trim()),
        updatedAt: now,
      };
      await saveAcademyCourse(cleanCourse);
      if (isAdminOrStaff) {
        await logAdminActivity({
          actorUid: userProfile.uid,
          actorEmail: userProfile.email,
          actorRole: userProfile.role,
          action: 'academy_course_saved',
          entityType: 'academy_course',
          entityId: cleanCourse.id,
          summaryAr: `حفظ دورة أكاديمية: ${cleanCourse.titleAr}`,
          summaryEn: `Saved academy course: ${cleanCourse.titleEn}`,
        });
      }
      setEditing(null);
      setPreviewLessonIds({});
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0E0E10] dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#C89D3C]" />
            <span>{t(lang, 'إدارة أكاديمية عاصمة الشبكات والشهادات', 'ASEMA Academy & Certification Management')}</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t(
              lang,
              'بناء الدورات والدروس والاختبارات التفاعلية، متابعة تقدم المتدربين، وإدارة صلاحية الشهادات الصادرة.',
              'Manage courses, video/markdown lessons, quizzes, student progress, and issued certificates.'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={openNewCourse}
          className="px-4 py-2.5 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t(lang, 'إضافة دورة جديدة', 'Add New Course')}</span>
        </button>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'courses' as const, ar: `الدورات التدريبية (${academyCourses.length})`, en: `Courses (${academyCourses.length})`, icon: BookOpen },
          { id: 'enrollments' as const, ar: `تقدم الطلاب (${enrollments.length})`, en: `Enrollments (${enrollments.length})`, icon: Users },
          { id: 'certificates' as const, ar: `الشهادات المعتمدة (${certificates.length})`, en: `Certificates (${certificates.length})`, icon: Award },
        ].map((item) => {
          const Icon = item.icon;
          const active = subTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubTab(item.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                active
                  ? 'bg-[#C89D3C] text-[#0E0E10]'
                  : 'bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{lang === 'ar' ? item.ar : item.en}</span>
            </button>
          );
        })}
      </div>

      {editing && (
        <form
          onSubmit={handleSaveCourse}
          className="bg-white dark:bg-[#17171B] border border-[#C89D3C]/50 rounded-xl p-6 space-y-5 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-[#F0F0EC] dark:border-white/10 pb-3">
            <h3 className="text-base font-bold">
              {editing.titleAr ? `${t(lang, 'تعديل:', 'Edit:')} ${editing.titleAr}` : t(lang, 'دورة جديدة', 'New Academy Course')}
            </h3>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-xs text-neutral-500 hover:text-rose-600 cursor-pointer"
            >
              {t(lang, 'إغلاق', 'Close')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">{t(lang, 'عنوان الدورة (عربي) *', 'Course Title (AR) *')}</label>
              <input
                required
                value={editing.titleAr}
                onChange={(e) => setEditing({ ...editing, titleAr: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t(lang, 'عنوان الدورة (إنجليزي)', 'Course Title (EN)')}</label>
              <input
                value={editing.titleEn}
                onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t(lang, 'المسار التقني', 'Track')}</label>
              <select
                value={editing.track}
                onChange={(e) => setEditing({ ...editing, track: e.target.value as AcademyTrack })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
              >
                {TRACK_OPTIONS.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {lang === 'ar' ? tr.ar : tr.en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t(lang, 'المستوى', 'Level')}</label>
              <select
                value={editing.level}
                onChange={(e) => setEditing({ ...editing, level: e.target.value as AcademyLevel })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
              >
                <option value="beginner">{t(lang, 'مبتدئ', 'Beginner')}</option>
                <option value="intermediate">{t(lang, 'متوسط', 'Intermediate')}</option>
                <option value="advanced">{t(lang, 'متقدم', 'Advanced')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t(lang, 'اسم المدرب *', 'Instructor Name *')}</label>
              <input
                required
                value={editing.instructorName}
                onChange={(e) => setEditing({ ...editing, instructorName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold mb-1">{t(lang, 'المدة (د)', 'Mins')}</label>
                <input
                  type="number"
                  min={5}
                  value={editing.durationMinutes}
                  onChange={(e) => setEditing({ ...editing, durationMinutes: Number(e.target.value) })}
                  className="w-full px-2.5 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">{t(lang, 'النقاط', 'Points')}</label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={editing.pointsReward}
                  onChange={(e) => setEditing({ ...editing, pointsReward: Number(e.target.value) })}
                  className="w-full px-2.5 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">{t(lang, 'النجاح %', 'Pass %')}</label>
                <input
                  type="number"
                  min={40}
                  max={100}
                  value={editing.passingScorePercent}
                  onChange={(e) => setEditing({ ...editing, passingScorePercent: Number(e.target.value) })}
                  className="w-full px-2.5 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg font-mono-num"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">{t(lang, 'وصف الدورة المختصر', 'Course Description')}</label>
            <textarea
              rows={2}
              value={editing.descriptionAr || ''}
              onChange={(e) => setEditing({ ...editing, descriptionAr: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
            />
          </div>

          <ImageUploader
            label={t(lang, 'صورة الغلاف', 'Thumbnail Image')}
            value={editing.thumbnailUrl || ''}
            onChange={(url) => setEditing({ ...editing, thumbnailUrl: url })}
          />

          {/* Dynamic Lessons Builder */}
          <div className="space-y-3 border-t border-[#F0F0EC] dark:border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold">{t(lang, 'دروس الدورة', 'Course Lessons')} ({editing.lessons.length})</h4>
              <button
                type="button"
                onClick={addLessonRow}
                className="px-3 py-1.5 rounded-lg border border-[#C89D3C] text-xs font-bold text-[#9E7822] dark:text-[#D4AF37] inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t(lang, 'إضافة درس', 'Add Lesson')}</span>
              </button>
            </div>

            {editing.lessons.map((les, idx) => {
              const videoParsed = parseYouTubeVideo(les.videoUrl);
              const showPreview = Boolean(previewLessonIds[les.id]);
              return (
                <div
                  key={les.id}
                  className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#9E7822] dark:text-[#D4AF37]">
                      {t(lang, `الدرس #${idx + 1}`, `Lesson #${idx + 1}`)}
                    </span>
                    {editing.lessons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLessonRow(idx)}
                        className="text-rose-600 text-xs hover:underline cursor-pointer"
                      >
                        {t(lang, 'حذف', 'Remove')}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      required
                      value={les.titleAr}
                      onChange={(e) => updateLessonRow(idx, { titleAr: e.target.value })}
                      placeholder={t(lang, 'عنوان الدرس (عربي) *', 'Lesson Title (AR) *')}
                      className="md:col-span-3 px-3 py-1.5 text-xs bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
                    />
                    <input
                      type="number"
                      min={1}
                      value={les.durationMinutes}
                      onChange={(e) => updateLessonRow(idx, { durationMinutes: Number(e.target.value) })}
                      placeholder={t(lang, 'الدقائق', 'Mins')}
                      className="px-3 py-1.5 text-xs bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-lg font-mono-num"
                    />
                  </div>

                  {/* Smart YouTube Link Input + Auto Validation + Pre-publish Preview */}
                  <div className="p-3 rounded-lg bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-[11px] font-bold text-[#0E0E10] dark:text-white inline-flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-[#C89D3C]" />
                        <span>{t(lang, 'رابط فيديو YouTube للدرس (اختياري)', 'Lesson YouTube Video URL (Optional)')}</span>
                      </label>
                      {videoParsed.isValid && (
                        <button
                          type="button"
                          onClick={() => toggleLessonPreview(les.id)}
                          className="px-2.5 py-1 rounded-md border border-[#C89D3C]/60 bg-[#FAF5E8] dark:bg-[#C89D3C]/15 text-[#9E7822] dark:text-[#D4AF37] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer hover:bg-[#C89D3C] hover:text-[#0E0E10]"
                        >
                          {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>
                            {showPreview
                              ? t(lang, 'إخفاء المعاينة', 'Hide Preview')
                              : t(lang, 'معاينة الفيديو قبل النشر', 'Preview Video')}
                          </span>
                        </button>
                      )}
                    </div>

                    <input
                      value={les.videoUrl || ''}
                      onChange={(e) => {
                        setFormError(null);
                        updateLessonRow(idx, { videoUrl: e.target.value });
                      }}
                      placeholder="https://www.youtube.com/watch?v=... | https://youtu.be/... | m.youtube | shorts | live"
                      className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg font-mono-num"
                      dir="ltr"
                    />

                    {videoParsed.kind === 'empty' && (
                      <p className="text-[11px] text-neutral-500">
                        {t(
                          lang,
                          'الصق أي رابط YouTube عادي (watch / m.youtube / youtu.be / Shorts / Live) — سيُحفظ الرابط الأصلي ويُحوّل تلقائياً إلى مشغل التضمين الآمن عند العرض.',
                          'Paste any standard YouTube link (watch / m.youtube / youtu.be / Shorts / Live). The original URL is stored and auto-converted to youtube-nocookie on playback.'
                        )}
                      </p>
                    )}

                    {videoParsed.kind === 'youtube' && videoParsed.isValid && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400">
                        <span className="inline-flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t(lang, 'تم التحقق من الرابط تلقائياً', 'Valid YouTube Link')}</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 font-mono-num" dir="ltr">
                          ID: {videoParsed.videoId}
                        </span>
                        <span className="text-neutral-500 dark:text-neutral-400">
                          · {t(lang, 'التشغيل عبر youtube-nocookie.com', 'Renders via youtube-nocookie.com')}
                        </span>
                      </div>
                    )}

                    {videoParsed.kind === 'direct_video' && videoParsed.isValid && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t(lang, 'ملف فيديو مباشر صالح', 'Valid direct video URL')}</span>
                      </div>
                    )}

                    {videoParsed.kind === 'invalid' && (
                      <div className="flex items-start gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{lang === 'ar' ? videoParsed.errorAr : videoParsed.errorEn}</span>
                      </div>
                    )}

                    {showPreview && videoParsed.isValid && (
                      <div className="pt-2 border-t border-[#F0F0EC] dark:border-white/10">
                        <AcademyVideoPlayer
                          key={`preview_${les.id}_${videoParsed.videoId || les.videoUrl}`}
                          url={les.videoUrl}
                          title={les.titleAr || les.titleEn || `Lesson ${idx + 1}`}
                          posterUrl={editing.thumbnailUrl}
                          compact
                        />
                      </div>
                    )}
                  </div>

                  <textarea
                    required
                    rows={3}
                    value={les.contentAr}
                    onChange={(e) => updateLessonRow(idx, { contentAr: e.target.value })}
                    placeholder={t(lang, 'محتوى الدرس الشارح وأوامر التطبيق...', 'Lesson content & configuration commands...')}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
                  />
                </div>
              );
            })}
          </div>

          {/* Dynamic Quiz Builder */}
          <div className="space-y-3 border-t border-[#F0F0EC] dark:border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold">{t(lang, 'أسئلة الاختبار النهائي', 'Final Quiz Questions')} ({editing.quizQuestions.length})</h4>
              <button
                type="button"
                onClick={addQuestionRow}
                className="px-3 py-1.5 rounded-lg border border-[#C89D3C] text-xs font-bold text-[#9E7822] dark:text-[#D4AF37] inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t(lang, 'إضافة سؤال', 'Add Question')}</span>
              </button>
            </div>

            {editing.quizQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">
                    {t(lang, `سؤال #${idx + 1}`, `Question #${idx + 1}`)}
                  </span>
                  {editing.quizQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestionRow(idx)}
                      className="text-rose-600 text-xs hover:underline cursor-pointer"
                    >
                      {t(lang, 'حذف', 'Remove')}
                    </button>
                  )}
                </div>
                <input
                  required
                  value={q.questionAr}
                  onChange={(e) => updateQuestionRow(idx, { questionAr: e.target.value })}
                  placeholder={t(lang, 'نص السؤال...', 'Question prompt...')}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct_${q.id}`}
                        checked={q.correctIndex === optIdx}
                        onChange={() => updateQuestionRow(idx, { correctIndex: optIdx })}
                        title={t(lang, 'الإجابة الصحيحة', 'Correct option')}
                      />
                      <input
                        required
                        value={opt}
                        onChange={(e) => {
                          const nextOpts = [...q.options];
                          nextOpts[optIdx] = e.target.value;
                          updateQuestionRow(idx, { options: nextOpts });
                        }}
                        placeholder={`${t(lang, 'خيار', 'Option')} ${optIdx + 1}`}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/40 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={editing.isPublished}
                onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })}
              />
              <span>{t(lang, 'نشر الدورة فوراً في الأكاديمية', 'Published in Academy')}</span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] cursor-pointer"
            >
              {saving ? t(lang, 'جاري الحفظ...', 'Saving...') : t(lang, 'حفظ الدورة', 'Save Course')}
            </button>
          </div>
        </form>
      )}

      {subTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {academyCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-[#FAF5E8] dark:bg-[#C89D3C]/20 text-[#9E7822] dark:text-[#D4AF37] font-bold">
                    {course.track} · {course.level}
                  </span>
                  <span className={course.isPublished ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    {course.isPublished ? t(lang, 'منشورة', 'Published') : t(lang, 'مسودة', 'Draft')}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#0E0E10] dark:text-white">
                  {lang === 'ar' ? course.titleAr : course.titleEn}
                </h3>
                <p className="text-xs text-neutral-500">
                  {course.instructorName} · {course.lessons.length} {t(lang, 'دروس', 'lessons')} ·{' '}
                  {course.quizQuestions.length} {t(lang, 'أسئلة', 'questions')} · +{course.pointsReward} pts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setPreviewLessonIds({});
                    setEditing({ ...course });
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t(lang, 'تعديل', 'Edit')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void removeAcademyCourse(course.id)}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t(lang, 'حذف', 'Delete')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'enrollments' && (
        <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-[#F8F8F7] dark:bg-[#0E0E10] border-b border-[#E5E5E0] dark:border-white/10">
              <tr>
                <th className="py-3 px-4 text-start">{t(lang, 'المتدرب', 'Student')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'الدورة', 'Course')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'التقدم', 'Progress')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'أعلى درجة', 'Best Score')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'الشهادة', 'Certificate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0EC] dark:divide-white/10">
              {enrollments.map((enr) => (
                <tr key={enr.id}>
                  <td className="py-2.5 px-4 font-semibold">{enr.studentName}</td>
                  <td className="py-2.5 px-4">{enr.courseTitleAr}</td>
                  <td className="py-2.5 px-4 font-mono-num">{enr.progressPercent}%</td>
                  <td className="py-2.5 px-4 font-mono-num">{enr.bestQuizScore}%</td>
                  <td className="py-2.5 px-4 font-mono-num font-bold text-[#9E7822] dark:text-[#D4AF37]">
                    {enr.certificateCode || '—'}
                  </td>
                </tr>
              ))}
              {enrollments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    {t(lang, 'لا توجد تسجيلات متدربين حتى الآن.', 'No student enrollments recorded yet.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'certificates' && (
        <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-[#F8F8F7] dark:bg-[#0E0E10] border-b border-[#E5E5E0] dark:border-white/10">
              <tr>
                <th className="py-3 px-4 text-start">{t(lang, 'رمز الشهادة', 'Certificate Code')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'اسم الخريج', 'Graduate')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'الدورة', 'Course')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'النتيجة', 'Score')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'الحالة', 'Status')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'تحكم', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0EC] dark:divide-white/10">
              {certificates.map((cert) => (
                <tr key={cert.id}>
                  <td className="py-2.5 px-4 font-mono-num font-bold text-[#9E7822] dark:text-[#D4AF37]">
                    {cert.certificateCode}
                  </td>
                  <td className="py-2.5 px-4 font-semibold">{cert.studentName}</td>
                  <td className="py-2.5 px-4">{cert.courseTitleAr}</td>
                  <td className="py-2.5 px-4 font-mono-num">{cert.scorePercent}%</td>
                  <td className="py-2.5 px-4">
                    {cert.isValid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t(lang, 'سارية ومعتمدة', 'Valid')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>{t(lang, 'ملغاة', 'Revoked')}</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => void toggleCertificateValidity(cert.id, !cert.isValid)}
                      className="px-2.5 py-1 rounded border border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        {cert.isValid
                          ? t(lang, 'إيقاف الصلاحية', 'Revoke')
                          : t(lang, 'إعادة التفعيل', 'Restore')}
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
              {certificates.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    {t(lang, 'لم تصدر شهادات بعد.', 'No certificates issued yet.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
