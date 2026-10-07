import { HomepageDataResponse } from '@/lib/api';
import { Target, TriangleAlert, CalendarDays, Sparkles, ArrowRight, Play, Eye, BookmarkPlus, Check, LoaderCircle } from 'lucide-react';
import Link from 'next/link';

export default function PrepDashboardHero({ 
  examOverview, 
  pending_dues, 
  todays_focus,
  studentId,
  onAddToRevision,
  isRevisionAdded = false,
  isAddingRevision = false,
  revisionError,
}: { 
  examOverview: HomepageDataResponse["examOverview"], 
  pending_dues?: HomepageDataResponse["pending_dues"],
  todays_focus?: HomepageDataResponse["todays_focus"],
  studentId?: number,
  onAddToRevision?: () => void | Promise<void>,
  isRevisionAdded?: boolean,
  isAddingRevision?: boolean,
  revisionError?: string | null,
}) {
  // Extract values with safe fallbacks
  const readiness = examOverview?.find(o => o.id === 'readiness') || {
    value: '0%',
    subtitle: '+0% this week',
    iconClassName: 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
  };

  const daysLeft = examOverview?.find(o => o.id === 'days-left') || {
    value: '12',
    subtitle: 'Semester Exam',
    iconClassName: 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
  };

  const totalDues = pending_dues?.total ?? 0;
  const revisionDue = pending_dues?.revision_due ?? 0;
  const quizDue = pending_dues?.quiz_due ?? 0;
  const reasons = pending_dues?.reasons || [];

  const focusTopic = todays_focus?.topic || 'Core Syllabus';
  const focusReason = todays_focus?.reason || 'Ready to study';
  const focusConfidence = todays_focus?.confidence ?? 50;
  const focusStatus = todays_focus?.status;
  const focusIsInRevision = Boolean(todays_focus?.is_in_revision);
  const focusAction = focusIsInRevision
    ? 'Review'
    : focusStatus === 'NOT_STARTED'
      ? 'Start'
      : 'Continue';
  const focusSubject = todays_focus?.subject || '';
  const focusHref = focusIsInRevision || focusStatus !== 'NOT_STARTED'
    ? "/practice?topic=" + encodeURIComponent(focusTopic)
    : "/learning?topic=" + encodeURIComponent(focusTopic) + "&subject=" + encodeURIComponent(focusSubject);
  const tasksHref = studentId ? "/courses?view=pending&student_id=" + studentId : "/courses?view=pending";
  const focusTime = todays_focus?.estimated_time ?? 30;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 rounded-2xl border border-violet-500/10 bg-[#090B1A] p-3">
      
      {/* Left Section - 3 Planner Cards (60% width on desktop) */}
      <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* CARD 1: Exam Readiness */}
        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${readiness.iconClassName}`}>
                <Target className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-semibold text-white/70">Exam Readiness</p>
            </div>
            <p className="text-2xl font-bold tracking-tight text-white">{readiness.value}</p>
          </div>
          <p className="mt-3 text-[10px] text-white/45">{readiness.subtitle}</p>
        </div>

        {/* CARD 2: Pending Dues */}
        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-400 bg-rose-500/10 border border-rose-500/20">
                <TriangleAlert className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-semibold text-white/70">Pending Dues</p>
            </div>
            
            <div>
              <p className="text-2xl font-bold tracking-tight text-white">{totalDues} Pending</p>
              <p className="text-[10px] text-white/45 mt-0.5">
                {revisionDue} Revisions · {quizDue} Quiz Due
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-white/5 space-y-1.5">
            {reasons.slice(0, 1).map((r, i) => (
              <p key={i} className="text-[9px] text-zinc-400 truncate italic">
                • {r}
              </p>
            ))}
            <Link 
              href={tasksHref}
              className="inline-flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 font-medium transition"
            >
              View Tasks <ArrowRight className="h-2.5 w-2.5" />
            </Link>
          </div>
        </div>

        {/* CARD 3: Days to Exam */}
        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${daysLeft.iconClassName}`}>
                <CalendarDays className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-semibold text-white/70">Days to Exam</p>
            </div>
            <p className="text-2xl font-bold tracking-tight text-white">{daysLeft.value} Days</p>
          </div>
          <p className="mt-3 text-[10px] text-white/45">{daysLeft.subtitle}</p>
        </div>

      </div>

      {/* Right Section - Today's Focus (40% width on desktop) */}
      <div className="lg:col-span-4">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-[#111133] via-[#0c1029] to-[#090b1f] p-4 h-full min-h-[170px]">
          {/* Active indicator */}
          <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_3px_rgba(74,222,128,0.7)] animate-pulse" />

          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-500/20">
                <Sparkles className="h-4 w-4 text-violet-400" />
              </div>
              <p className="text-xs font-semibold text-white">Today&apos;s Focus</p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {focusAction} {focusTopic}
              </h3>
              <div className="mt-1.5 space-y-0.5 text-[10px] text-white/75 bg-white/[0.02] border border-white/5 rounded-lg p-2">
                <p><span className="text-white/40">Reason:</span> {focusReason}</p>
                <p><span className="text-white/40">Confidence:</span> {focusConfidence}%</p>
                <p className="pt-1 border-t border-white/5 mt-1 flex items-center justify-between">
                  <span className="text-white/40">Estimated Time:</span>
                  <span className="text-violet-300 font-semibold">{focusTime} mins</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link 
              href={focusHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-2 text-xs font-medium text-white transition hover:opacity-90 shadow-md shadow-violet-500/20"
            >
              <Play className="h-3 w-3 fill-white text-white" /> Start Session
            </Link>

            <Link 
              href="/courses#study-plan"
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-white/70 transition hover:bg-white/[0.05]"
            >
              <Eye className="h-3 w-3" /> See Plan
            </Link>
            {onAddToRevision &&
              focusTopic !== 'Core Syllabus' &&
              !focusIsInRevision && (
              <button
                type="button"
                onClick={onAddToRevision}
                disabled={isRevisionAdded || isAddingRevision}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${isRevisionAdded ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.07] hover:text-white disabled:cursor-wait disabled:opacity-60'}`}
              >
                {isAddingRevision ? (
                  <LoaderCircle className="h-3 w-3 animate-spin" />
                ) : isRevisionAdded ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <BookmarkPlus className="h-3 w-3" />
                )}
                {isAddingRevision ? 'Adding...' : isRevisionAdded ? 'In Revision' : 'Add to Revision'}
              </button>
            )}
          </div>
          {revisionError && (
            <p className="mt-2 text-[10px] text-rose-300" role="status">
              {revisionError}
            </p>
          )}
        </div>
      </div>

    </div>
  );
}