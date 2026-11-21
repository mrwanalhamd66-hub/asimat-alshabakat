import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Flag,
  FlaskConical,
  MapPin,
  MessageSquare,
  Phone,
  Pin,
  Plus,
  Search,
  ShieldCheck,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { YEMEN_GOVERNORATES, t } from '../i18n/translations.ts';
import {
  addPostComment,
  createCommunityPost,
  incrementLabCopyCount,
  markCommentAsSolution,
  submitCommunityReport,
  submitLabResource,
  subscribeCommunityPosts,
  subscribePostComments,
  subscribePublicEngineers,
  toggleHelpfulPost,
} from '../services/firestoreService.ts';
import type {
  CommunityCategory,
  CommunityComment,
  CommunityPost,
  EngineerProfile,
  LabResource,
  LabResourceType,
} from '../types/index.ts';
import { ImageUploader } from '../components/ImageUploader.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';

type CommTab = 'community' | 'lab' | 'directory';

const COMMUNITY_CATEGORIES: { id: 'all' | CommunityCategory; ar: string; en: string }[] = [
  { id: 'all', ar: 'جميع الأقسام', en: 'All Topics' },
  { id: 'mikrotik', ar: 'MikroTik', en: 'MikroTik' },
  { id: 'ubiquiti', ar: 'Ubiquiti', en: 'Ubiquiti' },
  { id: 'wireless', ar: 'الربط اللاسلكي', en: 'Wireless' },
  { id: 'fiber', ar: 'الألياف الضوئية', en: 'Fiber Optics' },
  { id: 'cctv', ar: 'كاميرات المراقبة', en: 'CCTV' },
  { id: 'servers', ar: 'السيرفرات', en: 'Servers' },
  { id: 'general', ar: 'استفسارات عامة', en: 'General' },
];

const LAB_TYPES: { id: 'all' | LabResourceType; ar: string; en: string }[] = [
  { id: 'all', ar: 'الكل', en: 'All' },
  { id: 'mikrotik_script', ar: 'سكربتات مايكروتك', en: 'MikroTik Scripts' },
  { id: 'config_file', ar: 'ملفات إعدادات', en: 'Configs' },
  { id: 'routeros_guide', ar: 'أدلة RouterOS', en: 'RouterOS Guides' },
  { id: 'fault_solution', ar: 'حلول الأعطال', en: 'Fault Solutions' },
  { id: 'manual', ar: 'أدلة الاستخدام', en: 'Manuals' },
  { id: 'tool_driver', ar: 'أدوات وتعريفات', en: 'Tools & Drivers' },
];

export function CommunityAndLabPage() {
  const {
    lang,
    route,
    firebaseUser,
    userProfile,
    signInWithGoogle,
    isAdminOrStaff,
    labResources,
  } = useApp();

  const initialTab = (): CommTab => {
    const p = new URLSearchParams(window.location.search).get('tab');
    if (p === 'lab' || p === 'directory') return p;
    return 'community';
  };

  const [tab, setTab] = useState<CommTab>(initialTab);

  useEffect(() => {
    const q = route.includes('?') ? route.split('?')[1] : window.location.search;
    const p = new URLSearchParams(q).get('tab');
    if (p === 'lab' || p === 'directory' || p === 'community') setTab(p);
  }, [route]);

  // =========================================================================
  // 1. COMMUNITY STATE
  // =========================================================================
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [catFilter, setCatFilter] = useState<'all' | CommunityCategory>('all');
  const [searchQ, setSearchQ] = useState('');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [postForm, setPostForm] = useState({
    category: 'mikrotik' as CommunityCategory,
    title: '',
    content: '',
    imageUrl: '',
  });
  const [reportTarget, setReportTarget] = useState<{
    type: 'post' | 'comment' | 'lab_resource';
    id: string;
    postId?: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('محتوى مخالف / غير تقني');
  const [reportMsg, setReportMsg] = useState('');

  // =========================================================================
  // 2. TECHNICAL LAB STATE
  // =========================================================================
  const [labTypeFilter, setLabTypeFilter] = useState<'all' | LabResourceType>('all');
  const [labSearch, setLabSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [labSubmitOpen, setLabSubmitOpen] = useState(false);
  const [labNotice, setLabNotice] = useState('');
  const [labForm, setLabForm] = useState({
    title: '',
    summary: '',
    resourceType: 'mikrotik_script' as LabResourceType,
    category: 'MikroTik / RouterOS',
    deviceModels: '',
    contentBody: '',
  });

  // =========================================================================
  // 3. OPT-IN ENGINEERS DIRECTORY STATE
  // =========================================================================
  const [engineers, setEngineers] = useState<EngineerProfile[]>([]);
  const [dirSearch, setDirSearch] = useState('');
  const [dirGov, setDirGov] = useState('all');

  useEffect(() => {
    const u1 = subscribeCommunityPosts(isAdminOrStaff, setPosts);
    const u2 = subscribePublicEngineers(false, setEngineers);
    return () => {
      u1();
      u2();
    };
  }, [isAdminOrStaff]);

  useEffect(() => {
    if (!selectedPost) {
      setComments([]);
      return;
    }
    return subscribePostComments(selectedPost.id, setComments);
  }, [selectedPost]);

  const filteredPosts = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return posts.filter((p) => {
      if (catFilter !== 'all' && p.category !== catFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q)
      );
    });
  }, [posts, catFilter, searchQ]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile) {
      await signInWithGoogle();
      return;
    }
    const now = new Date().toISOString();
    const post: CommunityPost = {
      id: `post_${Date.now()}`,
      authorUid: firebaseUser.uid,
      authorName: userProfile.displayName,
      category: postForm.category,
      title: postForm.title.trim(),
      content: postForm.content.trim(),
      imageUrl: postForm.imageUrl.trim() || undefined,
      helpfulCount: 0,
      commentCount: 0,
      isPinned: false,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    await createCommunityPost(post);
    setPostForm({ category: 'mikrotik', title: '', content: '', imageUrl: '' });
    setNewPostOpen(false);
    setSelectedPost(post);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !commentText.trim()) return;
    if (!firebaseUser || !userProfile) {
      await signInWithGoogle();
      return;
    }
    const comment: CommunityComment = {
      id: `cmt_${Date.now()}`,
      postId: selectedPost.id,
      authorUid: firebaseUser.uid,
      authorName: userProfile.displayName,
      content: commentText.trim(),
      isSolution: false,
      createdAt: new Date().toISOString(),
    };
    await addPostComment(selectedPost, comment);
    setCommentText('');
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget || !firebaseUser || !userProfile) return;
    const now = new Date().toISOString();
    await submitCommunityReport({
      id: `rep_${Date.now()}`,
      targetType: reportTarget.type,
      targetId: reportTarget.id,
      postId: reportTarget.postId,
      reporterUid: firebaseUser.uid,
      reporterName: userProfile.displayName,
      reason: reportReason,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
    setReportTarget(null);
    setReportMsg(t(lang, 'تم استلام البلاغ وسيتم مراجعته من المشرفين.', 'Report submitted for moderator review.'));
    window.setTimeout(() => setReportMsg(''), 3000);
  };

  const filteredLab = useMemo(() => {
    const q = labSearch.trim().toLowerCase();
    return labResources.filter((r) => {
      if (r.status !== 'approved') return false;
      if (labTypeFilter !== 'all' && r.resourceType !== labTypeFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        (r.deviceModels || '').toLowerCase().includes(q)
      );
    });
  }, [labResources, labTypeFilter, labSearch]);

  const handleCopyLab = (res: LabResource) => {
    navigator.clipboard?.writeText(res.contentBody).catch(() => null);
    setCopiedId(res.id);
    void incrementLabCopyCount(res);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  const handleLabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile) {
      await signInWithGoogle();
      return;
    }
    const now = new Date().toISOString();
    await submitLabResource({
      id: `lab_${Date.now()}`,
      title: labForm.title.trim(),
      summary: labForm.summary.trim(),
      resourceType: labForm.resourceType,
      category: labForm.category.trim() || 'Networking',
      deviceModels: labForm.deviceModels.trim(),
      contentBody: labForm.contentBody.trim(),
      authorUid: firebaseUser.uid,
      authorName: userProfile.displayName,
      status: 'pending_review',
      copyCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    setLabForm({
      title: '',
      summary: '',
      resourceType: 'mikrotik_script',
      category: 'MikroTik / RouterOS',
      deviceModels: '',
      contentBody: '',
    });
    setLabSubmitOpen(false);
    setLabNotice(
      t(
        lang,
        'تم إرسال مساهمتك بنجاح وهي بانتظار موافقة الإدارة قبل النشر العام في المختبر.',
        'Contribution submitted! It is pending admin approval before public release.'
      )
    );
  };

  const filteredEngineers = useMemo(() => {
    const q = dirSearch.trim().toLowerCase();
    return engineers.filter((eng) => {
      if (dirGov !== 'all' && eng.governorate !== dirGov) return false;
      if (!q) return true;
      return (
        eng.fullName.toLowerCase().includes(q) ||
        eng.specialty.toLowerCase().includes(q) ||
        eng.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [engineers, dirSearch, dirGov]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Banner */}
      <div className="bg-[#0E0E10] text-white rounded-2xl p-6 sm:p-8 border border-[#C89D3C]/35 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-semibold text-[#D4AF37]">
            {t(lang, 'بيئة المهندسين والفنيين · عاصمة الشبكات', 'Engineering Ecosystem · ASEMA NETWORKS')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">
            {t(
              lang,
              'المجتمع التقني، المختبر، ودليل المهندسين',
              'Engineers Community, Technical Lab & Directory'
            )}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            {t(
              lang,
              'شارك مشاريعك واستفساراتك، انسخ سكربتات مايكروتك وملفات الإعداد الموثوقة من المختبر، وتواصل مع مهندسي الشبكات المعتمدين في اليمن.',
              'Discuss networking architectures, copy verified RouterOS scripts & configurations from the Technical Lab, and discover opted-in engineers.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 bg-[#17171B] p-1.5 rounded-xl border border-white/10 shrink-0">
          {[
            { id: 'community' as CommTab, ar: 'مجتمع المهندسين', en: 'Community', icon: MessageSquare },
            { id: 'lab' as CommTab, ar: 'مختبر الشبكات', en: 'Technical Lab', icon: FlaskConical },
            { id: 'directory' as CommTab, ar: 'دليل المهندسين', en: 'Directory', icon: Users },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-2 cursor-pointer ${
                  tab === item.id
                    ? 'bg-[#C89D3C] text-[#0E0E10]'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{lang === 'ar' ? item.ar : item.en}</span>
              </button>
            );
          })}
        </div>
      </div>

      {reportMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {reportMsg}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: COMMUNITY Q&A AND PROJECT SHARING                            */}
      {/* =================================================================== */}
      {tab === 'community' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {COMMUNITY_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCatFilter(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    catFilter === c.id
                      ? 'bg-[#0E0E10] text-[#D4AF37] border-[#C89D3C]'
                      : 'bg-white dark:bg-[#17171B] border-[#E5E5E0] dark:border-white/10'
                  }`}
                >
                  {lang === 'ar' ? c.ar : c.en}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute top-1/2 -translate-y-1/2 start-3" />
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder={t(lang, 'بحث في المشاركات...', 'Search posts...')}
                  className="ps-8 pe-3 py-2 text-xs bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!firebaseUser) {
                    void signInWithGoogle();
                    return;
                  }
                  setNewPostOpen((v) => !v);
                }}
                className="px-4 py-2 rounded-lg bg-[#C89D3C] text-[#0E0E10] hover:bg-[#D4AF37] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t(lang, 'مشاركة / سؤال جديد', 'New Post')}</span>
              </button>
            </div>
          </div>

          {newPostOpen && (
            <form
              onSubmit={handleCreatePost}
              className="bg-white dark:bg-[#17171B] border border-[#C89D3C]/40 rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-base font-bold">
                {t(lang, 'نشر استفسار أو مشاركة مشروع شبكات', 'Publish Question or Project Showcase')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">{t(lang, 'القسم', 'Category')}</label>
                  <select
                    value={postForm.category}
                    onChange={(e) =>
                      setPostForm({ ...postForm, category: e.target.value as CommunityCategory })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                  >
                    {COMMUNITY_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'ar' ? c.ar : c.en}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">{t(lang, 'العنوان *', 'Title *')}</label>
                  <input
                    required
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder={t(
                      lang,
                      'مثال: تجربة ربط مبنيين مسافة 4 كم باستخدام MikroTik وUbiquiti',
                      'e.g. 4km PtP Bridge Deployment Guide'
                    )}
                    className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">{t(lang, 'التفاصيل التقنية *', 'Technical Details *')}</label>
                <textarea
                  required
                  rows={4}
                  value={postForm.content}
                  onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                />
              </div>
              <ImageUploader
                label={t(lang, 'إرفاق صورة للمشروع أو المخطط (اختياري)', 'Attach Project / Topology Photo (Optional)')}
                value={postForm.imageUrl}
                onChange={(url) => setPostForm({ ...postForm, imageUrl: url })}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewPostOpen(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                >
                  {t(lang, 'إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold cursor-pointer"
                >
                  {t(lang, 'نشر الآن', 'Publish Post')}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Posts List */}
            <div className="lg:col-span-6 space-y-3">
              {filteredPosts.length === 0 ? (
                <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-8 text-center text-xs text-neutral-500">
                  {t(
                    lang,
                    'لا توجد مشاركات في هذا القسم بعد. كن أول من يبدأ النقاش الهندسي!',
                    'No posts in this category yet. Start the engineering discussion!'
                  )}
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <article
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className={`bg-white dark:bg-[#17171B] border rounded-2xl p-5 space-y-3 cursor-pointer transition-colors ${
                      selectedPost?.id === post.id
                        ? 'border-[#C89D3C]'
                        : 'border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <div className="flex items-center gap-2">
                        {post.isPinned && <Pin className="w-3.5 h-3.5 text-[#C89D3C]" />}
                        <span className="font-bold text-[#9E7822] dark:text-[#D4AF37] uppercase">
                          {post.category}
                        </span>
                        <span>·</span>
                        <span>{post.authorName}</span>
                      </div>
                      <span className="font-mono-num">{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>

                    <h3 className="text-base font-bold">{post.title}</h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                      {post.content}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-[#F0F0EC] dark:border-white/10 text-xs">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleHelpfulPost(post);
                          }}
                          className="inline-flex items-center gap-1 hover:text-[#C89D3C] cursor-pointer"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span className="font-mono-num">{post.helpfulCount || 0}</span>
                        </button>
                        <span className="inline-flex items-center gap-1 text-neutral-500">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="font-mono-num">{post.commentCount || 0}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!firebaseUser) {
                            void signInWithGoogle();
                            return;
                          }
                          setReportTarget({ type: 'post', id: post.id });
                        }}
                        className="text-neutral-400 hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Flag className="w-3 h-3" />
                        <span>{t(lang, 'إبلاغ', 'Report')}</span>
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            {/* Thread Details & Comments */}
            <div className="lg:col-span-6 bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-5">
              {!selectedPost ? (
                <div className="py-12 text-center text-xs text-neutral-500">
                  {t(
                    lang,
                    'اختر مشاركة من القائمة لعرض التفاصيل والردود الهندسية.',
                    'Select a post from the feed to read technical details and replies.'
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-3 border-b border-[#E5E5E0] dark:border-white/10 pb-4">
                    <div className="text-xs font-bold text-[#9E7822] dark:text-[#D4AF37]">
                      {selectedPost.authorName} · {selectedPost.category.toUpperCase()}
                    </div>
                    <h2 className="text-lg font-bold">{selectedPost.title}</h2>
                    {selectedPost.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-[#E5E5E0] dark:border-white/10 max-h-64">
                        <ResilientImage
                          src={selectedPost.imageUrl}
                          alt={selectedPost.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-line text-neutral-700 dark:text-neutral-200">
                      {selectedPost.content}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-neutral-500">
                      {t(lang, 'الردود والحلول الهندسية', 'Engineering Replies')} ({comments.length})
                    </h3>
                    {comments.map((cmt) => {
                      const canMarkSolution =
                        isAdminOrStaff || firebaseUser?.uid === selectedPost.authorUid;
                      return (
                        <div
                          key={cmt.id}
                          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                            cmt.isSolution
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/40'
                              : 'bg-[#F8F8F7] dark:bg-[#0E0E10] border-[#E5E5E0] dark:border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold">{cmt.authorName}</span>
                            <div className="flex items-center gap-2">
                              {cmt.isSolution && (
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {t(lang, 'حل معتمد', 'Accepted Solution')}
                                </span>
                              )}
                              {canMarkSolution && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void markCommentAsSolution(selectedPost.id, cmt.id, !cmt.isSolution)
                                  }
                                  className="underline text-[#9E7822] dark:text-[#D4AF37] cursor-pointer"
                                >
                                  {cmt.isSolution
                                    ? t(lang, 'إلغاء الاعتماد', 'Unmark')
                                    : t(lang, 'اعتماد كحل', 'Mark Solution')}
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="leading-relaxed whitespace-pre-line">{cmt.content}</p>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleAddComment} className="space-y-2 pt-2">
                    <textarea
                      rows={2}
                      required
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={t(lang, 'أضف ردك أو تجربتك الهندسية...', 'Write a technical reply...')}
                      className="w-full px-3.5 py-2.5 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-xl"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold cursor-pointer"
                    >
                      {t(lang, 'إرسال الرد', 'Post Reply')}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: TECHNICAL LAB                                                */}
      {/* =================================================================== */}
      {tab === 'lab' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {LAB_TYPES.map((lt) => (
                <button
                  key={lt.id}
                  type="button"
                  onClick={() => setLabTypeFilter(lt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    labTypeFilter === lt.id
                      ? 'bg-[#0E0E10] text-[#D4AF37] border-[#C89D3C]'
                      : 'bg-white dark:bg-[#17171B] border-[#E5E5E0] dark:border-white/10'
                  }`}
                >
                  {lang === 'ar' ? lt.ar : lt.en}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={labSearch}
                onChange={(e) => setLabSearch(e.target.value)}
                placeholder={t(lang, 'ابحث عن سكربت أو موديل...', 'Search scripts or models...')}
                className="px-3 py-2 text-xs bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  if (!firebaseUser) {
                    void signInWithGoogle();
                    return;
                  }
                  setLabSubmitOpen((v) => !v);
                }}
                className="px-4 py-2 rounded-lg bg-[#C89D3C] text-[#0E0E10] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t(lang, 'إرسال مساهمة للمراجعة', 'Submit Resource')}</span>
              </button>
            </div>
          </div>

          {labNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              {labNotice}
            </div>
          )}

          {labSubmitOpen && (
            <form
              onSubmit={handleLabSubmit}
              className="bg-white dark:bg-[#17171B] border border-[#C89D3C]/40 rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-base font-bold">
                {t(
                  lang,
                  'إرسال سكربت أو حل تقني لمختبر عاصمة الشبكات (يُراجع إدارياً قبل النشر)',
                  'Submit Script or Technical Guide (Admin Review Required)'
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">{t(lang, 'نوع المورد', 'Type')}</label>
                  <select
                    value={labForm.resourceType}
                    onChange={(e) =>
                      setLabForm({ ...labForm, resourceType: e.target.value as LabResourceType })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                  >
                    {LAB_TYPES.filter((tItem) => tItem.id !== 'all').map((tItem) => (
                      <option key={tItem.id} value={tItem.id}>
                        {lang === 'ar' ? tItem.ar : tItem.en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t(lang, 'الأجهزة المتوافقة', 'Models')}</label>
                  <input
                    value={labForm.deviceModels}
                    onChange={(e) => setLabForm({ ...labForm, deviceModels: e.target.value })}
                    placeholder="RB5009, hAP ax3..."
                    className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t(lang, 'التصنيف', 'Category')}</label>
                  <input
                    value={labForm.category}
                    onChange={(e) => setLabForm({ ...labForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">{t(lang, 'العنوان *', 'Title *')}</label>
                <input
                  required
                  value={labForm.title}
                  onChange={(e) => setLabForm({ ...labForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">{t(lang, 'ملخص مختصر *', 'Summary *')}</label>
                <input
                  required
                  value={labForm.summary}
                  onChange={(e) => setLabForm({ ...labForm, summary: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">{t(lang, 'السكربت / الإعداد / الدليل *', 'Script / Configuration Body *')}</label>
                <textarea
                  required
                  rows={5}
                  dir="ltr"
                  value={labForm.contentBody}
                  onChange={(e) => setLabForm({ ...labForm, contentBody: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono-num bg-[#0E0E10] text-emerald-300 border border-white/15 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLabSubmitOpen(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                >
                  {t(lang, 'إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold cursor-pointer"
                >
                  {t(lang, 'إرسال للمراجعة', 'Submit for Review')}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredLab.map((res) => (
              <div
                key={res.id}
                className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#9E7822] dark:text-[#D4AF37] inline-flex items-center gap-1">
                      <Code2 className="w-3.5 h-3.5" />
                      {res.category}
                    </span>
                    <span className="text-neutral-500 font-mono-num">
                      {res.copyCount || 0} {t(lang, 'نسخ', 'copies')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold">{res.title}</h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {res.summary}
                  </p>
                  {res.deviceModels && (
                    <div className="text-[11px] font-mono-num text-neutral-500">
                      {t(lang, 'الأجهزة:', 'Devices:')} {res.deviceModels}
                    </div>
                  )}
                  <pre
                    dir="ltr"
                    className="p-4 rounded-xl bg-[#0E0E10] text-emerald-300 text-[11px] font-mono-num overflow-x-auto max-h-56 leading-relaxed"
                  >
                    {res.contentBody}
                  </pre>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#F0F0EC] dark:border-white/10 text-xs">
                  <span className="text-neutral-500">{res.authorName}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyLab(res)}
                    className="px-3.5 py-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === res.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === res.id ? t(lang, 'تم النسخ', 'Copied') : t(lang, 'نسخ الكود', 'Copy Script')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: OPT-IN ENGINEERS DIRECTORY                                   */}
      {/* =================================================================== */}
      {tab === 'directory' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 flex-1">
              <input
                value={dirSearch}
                onChange={(e) => setDirSearch(e.target.value)}
                placeholder={t(
                  lang,
                  'ابحث بالاسم، التخصص، أو المهارة (MikroTik, Fiber, Wi-Fi 6)...',
                  'Search by name, specialty, or skill...'
                )}
                className="flex-1 min-w-[240px] px-4 py-2.5 text-xs bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl"
              />
              <select
                value={dirGov}
                onChange={(e) => setDirGov(e.target.value)}
                className="px-3.5 py-2.5 text-xs bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl"
              >
                <option value="all">{t(lang, 'جميع المحافظات', 'All Governorates')}</option>
                {YEMEN_GOVERNORATES.map((g) => (
                  <option key={g.ar} value={g.ar}>
                    {lang === 'ar' ? g.ar : g.en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredEngineers.length === 0 ? (
            <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-10 text-center space-y-2">
              <Users className="w-8 h-8 text-[#C89D3C] mx-auto" />
              <div className="text-sm font-bold">
                {t(lang, 'لا يوجد مهندسون مدرجون في الدليل حالياً', 'No Opted-In Engineers Listed Yet')}
              </div>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                {t(
                  lang,
                  'يمكن للمهندسين والفنيين تفعيل خيار الظهور في الدليل من صفحة "هويتي المهنية" داخل حسابهم الشخصي.',
                  'Engineers can activate their directory visibility from "My Professional Identity" inside their account.'
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEngineers.map((eng) => (
                <div
                  key={eng.uid}
                  className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 space-y-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-14 h-14 rounded-xl bg-[#0E0E10] text-[#D4AF37] font-bold text-xl flex items-center justify-center overflow-hidden shrink-0 border border-[#C89D3C]/50">
                      {eng.photoUrl ? (
                        <ResilientImage src={eng.photoUrl} alt={eng.fullName} className="w-full h-full object-cover" />
                      ) : (
                        eng.fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold truncate">م. {eng.fullName}</h3>
                        {eng.isVerified && (
                          <span
                            title={eng.verificationBadge || t(lang, 'مهندس معتمد', 'Verified Engineer')}
                            className="text-[#C89D3C] shrink-0"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-[#9E7822] dark:text-[#D4AF37]">
                        {eng.specialty}
                      </div>
                      <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {eng.governorate || t(lang, 'اليمن', 'Yemen')}
                        </span>
                        <span>·</span>
                        <span className="font-mono-num">
                          {eng.yearsExperience} {t(lang, 'سنوات خبرة', 'yrs exp')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {eng.skills.length > 0 && (
                    <div className="text-xs text-neutral-600 dark:text-neutral-300">
                      {eng.skills.slice(0, 5).join(' · ')}
                    </div>
                  )}

                  {eng.projectsSummary && (
                    <p className="text-xs text-neutral-500 line-clamp-2">{eng.projectsSummary}</p>
                  )}

                  {eng.contactPhone && (
                    <div className="pt-3 border-t border-[#F0F0EC] dark:border-white/10 flex items-center justify-between text-xs">
                      <span className="font-mono-num text-neutral-500">{eng.membershipId}</span>
                      <a
                        href={`tel:${eng.contactPhone}`}
                        className="px-3 py-1.5 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] font-bold inline-flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{t(lang, 'تواصل', 'Contact')}</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Report Modal */}
      {reportTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSubmitReport}
            className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/15 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold">
              {t(lang, 'إرسال بلاغ للمشرفين', 'Submit Moderation Report')}
            </h3>
            <div>
              <label className="block text-xs font-semibold mb-1">{t(lang, 'سبب البلاغ', 'Reason')}</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border rounded-lg"
              >
                <option value="محتوى مخالف / غير تقني">محتوى مخالف / غير تقني</option>
                <option value="إعلان ترويجي غير مصرح">إعلان ترويجي غير مصرح</option>
                <option value="معلومات تقنية خاطئة قد تضر الأجهزة">معلومات تقنية خاطئة قد تضر الأجهزة</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="px-4 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
              >
                {t(lang, 'إلغاء', 'Cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                {t(lang, 'تأكيد البلاغ', 'Submit Report')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
