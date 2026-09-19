"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#fcfdfa] text-[#173f2a] flex flex-col selection:bg-[#173f2a] selection:text-white">
      {/* 1. TOP NATIONAL UTILITY BAR */}
      <div className="bg-[#173f2a] text-[#d6e5d8] text-[11px] py-1.5 px-4 border-b border-[#205237]">
        <div className="mx-auto max-w-7xl flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">
              {t.common.govtInterface}
            </span>
            <span className="hidden sm:inline text-[#7aa585]">|</span>
            <span className="hidden sm:inline text-[#a9c7b1]">
              {t.common.civicPortal}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#main-content"
              className="text-[#b9d3bf] hover:text-white transition"
            >
              {t.common.skipToContent}
            </a>
          </div>
        </div>
      </div>

      {/* 2. GOVERNMENT-STYLE NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#ffffff]/95 backdrop-blur-md border-b border-[#d8e2d8] shadow-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between gap-4">
            {/* National Emblem & Portal Branding */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-[#173f2a] text-white font-bold text-lg sm:text-xl shadow-xs group-hover:bg-[#1f5337] transition">
                P
              </div>
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-extrabold tracking-wider text-[#173f2a]">
                  {t.common.siteName}
                </span>
                <span className="text-[10px] sm:text-xs text-[#526456] leading-tight">
                  {t.common.portalTagline}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-semibold text-[#324b37]">
              <Link
                href="/"
                className="transition hover:text-[#173f2a] py-1 border-b-2 border-transparent hover:border-[#173f2a]"
              >
                {t.common.home}
              </Link>
              <Link
                href="/citizen"
                className="transition hover:text-[#173f2a] py-1 border-b-2 border-transparent hover:border-[#173f2a]"
              >
                {t.common.citizenServices}
              </Link>
              <Link
                href="/track"
                className="transition hover:text-[#173f2a] py-1 border-b-2 border-transparent hover:border-[#173f2a]"
              >
                {t.common.trackComplaint}
              </Link>
              <Link
                href="/dashboard"
                className="transition hover:text-[#173f2a] py-1 border-b-2 border-transparent hover:border-[#173f2a]"
              >
                {t.common.adminDashboard}
              </Link>
              <Link
                href="/about"
                className="transition text-[#173f2a] py-1 border-b-2 border-[#173f2a]"
              >
                {t.common.about}
              </Link>
            </nav>

            {/* Right Action Group */}
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link
                href="/citizen"
                className="hidden sm:inline-flex rounded-lg bg-[#173f2a] hover:bg-[#20583b] px-4 py-2 text-xs font-bold text-white shadow-xs transition"
              >
                {t.cta.submitBtn}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 3. MAIN CONTENT */}
      <main id="main-content" className="flex-1">
        {/* Banner Section */}
        <section className="bg-gradient-to-b from-[#f2f7f3] to-[#fcfdfa] border-b border-[#dbe6dc] py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3efe4] px-3.5 py-1 text-xs font-bold tracking-wide text-[#1b4b2e] border border-[#bcd7c0]">
              <span>🏛️</span> CIVIC INNOVATION &amp; GOVERNANCE INTELLIGENCE
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#173f2a] tracking-tight">
              About People&apos;s Priorities
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#465f4d] leading-relaxed max-w-2xl mx-auto">
              Bridging the gap between raw citizen grievances and explainable, evidence-backed priority rankings for constituency development.
            </p>
          </div>
        </section>

        {/* 4. MEET THE TEAM SECTION (EXACT REFERENCE DESIGN) */}
        <section
          id="about"
          className="bg-[#0f2e1e] py-20 sm:py-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden border-t border-[#18462b]"
        >
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#1a4a32]/25 blur-[120px] rounded-full pointer-events-none" />

          <div className="mx-auto max-w-7xl relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                Meet the Team
              </h2>
            </div>

            <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
              {/* Pratik Ranjan Panigraghi */}
              <div className="rounded-2xl sm:rounded-3xl bg-[#143d28] border border-[#1e4e34] shadow-xl p-8 sm:p-9 flex flex-col items-center text-center transition-all duration-300 hover:border-[#38a169] hover:-translate-y-1.5 hover:shadow-2xl">
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-[#2b593f] shadow-lg mb-6 relative bg-[#0b2215] shrink-0">
                  <img
                    src="/team/pratik.jpg"
                    alt="Pratik Ranjan Panigraghi"
                    className="w-full h-full object-cover scale-105"
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                  Pratik Ranjan Panigraghi
                </h3>
                <p className="mt-2 text-xs sm:text-[13px] font-bold uppercase tracking-widest text-[#7dd39f]">
                  TEAM LEADER
                </p>
                <p className="mt-6 text-sm sm:text-[15px] text-[#cbd5e1] italic font-normal leading-relaxed max-w-xs">
                  &ldquo;True development begins when we give every citizen a verifiable voice in the decision-making process.&rdquo;
                </p>
              </div>

              {/* Prachi Sharma */}
              <div className="rounded-2xl sm:rounded-3xl bg-[#143d28] border border-[#1e4e34] shadow-xl p-8 sm:p-9 flex flex-col items-center text-center transition-all duration-300 hover:border-[#38a169] hover:-translate-y-1.5 hover:shadow-2xl">
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-[#2b593f] shadow-lg mb-6 relative bg-[#0b2215] shrink-0">
                  <img
                    src="/team/prachi.jpg"
                    alt="Prachi Sharma"
                    className="w-full h-full object-cover scale-105"
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                  Prachi Sharma
                </h3>
                <p className="mt-2 text-xs sm:text-[13px] font-bold uppercase tracking-widest text-[#7dd39f]">
                  DEVELOPER
                </p>
                <p className="mt-6 text-sm sm:text-[15px] text-[#cbd5e1] italic font-normal leading-relaxed max-w-xs">
                  &ldquo;Transforming raw civic data into explainable signals that drive immediate community action.&rdquo;
                </p>
              </div>

              {/* Anisha Das */}
              <div className="rounded-2xl sm:rounded-3xl bg-[#143d28] border border-[#1e4e34] shadow-xl p-8 sm:p-9 flex flex-col items-center text-center transition-all duration-300 hover:border-[#38a169] hover:-translate-y-1.5 hover:shadow-2xl">
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-[#2b593f] shadow-lg mb-6 relative bg-[#0b2215] shrink-0">
                  <img
                    src="/team/anisha.jpg"
                    alt="Anisha Das"
                    className="w-full h-full object-cover scale-105"
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                  Anisha Das
                </h3>
                <p className="mt-2 text-xs sm:text-[13px] font-bold uppercase tracking-widest text-[#7dd39f]">
                  DEVELOPER
                </p>
                <p className="mt-6 text-sm sm:text-[15px] text-[#cbd5e1] italic font-normal leading-relaxed max-w-xs">
                  &ldquo;Building interfaces that bridge the gap between people&apos;s priorities and actionable governance.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. CORE ARCHITECTURAL PILLARS */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#173f2a]">
              Architectural Pillars
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#526456]">
              Designed from first principles for Indian public governance and rural digital inclusion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-[#d6e3d7] bg-white p-6 shadow-xs">
              <span className="text-2xl">🎙️</span>
              <h3 className="mt-3 text-base font-bold text-[#173f2a]">
                Voice &amp; 12 Indian Languages
              </h3>
              <p className="mt-2 text-xs text-[#526456] leading-relaxed">
                Empowering every citizen to speak grievances in their native tongue with automated live transcription, transliteration, and translation.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d6e3d7] bg-white p-6 shadow-xs">
              <span className="text-2xl">📍</span>
              <h3 className="mt-3 text-base font-bold text-[#173f2a]">
                Verified PIN-Code Intelligence
              </h3>
              <p className="mt-2 text-xs text-[#526456] leading-relaxed">
                Direct integration with official Postal Index Numbers across all States and Union Territories ensuring genuine geographical origin.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d6e3d7] bg-white p-6 shadow-xs">
              <span className="text-2xl">🧠</span>
              <h3 className="mt-3 text-base font-bold text-[#173f2a]">
                Explainable Context-Aware AI
              </h3>
              <p className="mt-2 text-xs text-[#526456] leading-relaxed">
                Disambiguates root civic causes from health consequences with full auditability, zero black-box scoring, and transparent reasoning.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 6. CLEAN FOOTER */}
      <footer className="bg-[#f8faf5] border-t border-[#dce3dc] text-[#334237] py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5a6b5e]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#173f2a]">
              {t.common.siteName}
            </span>
            <span>&copy; {new Date().getFullYear()} All Rights Reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#173f2a]">
              {t.common.home}
            </Link>
            <Link href="/citizen" className="hover:text-[#173f2a]">
              {t.common.citizenServices}
            </Link>
            <Link href="/track" className="hover:text-[#173f2a]">
              {t.common.trackComplaint}
            </Link>
            <Link href="/dashboard" className="hover:text-[#173f2a]">
              {t.common.adminDashboard}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
