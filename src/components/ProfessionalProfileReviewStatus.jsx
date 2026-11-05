import React from "react";
import { Clock, Hourglass } from "lucide-react";

const ProfessionalProfileReviewStatus = () => (
  <section className="relative mb-6 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-5 text-white shadow-xl backdrop-blur-xl md:p-6">
    <div className="pointer-events-none absolute -left-20 -top-24 h-44 w-44 rounded-full bg-brand-accent/30 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-24 -right-20 h-44 w-44 rounded-full bg-orange-500/20 blur-3xl" />

    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-brand-accent/40 bg-brand-accent/20 shadow-inner">
        <Clock className="h-7 w-7 animate-pulse text-brand-accent" />
        <span className="absolute -bottom-1 -right-1 rounded-full border-2 border-slate-900 bg-amber-500 p-1 text-slate-950">
          <Hourglass size={11} className="animate-spin" />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black tracking-tight text-white font-heading">
            Professional Profile Under Review
          </h2>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
            <span className="h-2 w-2 animate-ping rounded-full bg-amber-400" />
            Pending Approval
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-300">
          Your professional profile has been submitted and is awaiting admin approval. You can review or update your submitted details while you wait.
        </p>
      </div>
    </div>
  </section>
);

export default ProfessionalProfileReviewStatus;
