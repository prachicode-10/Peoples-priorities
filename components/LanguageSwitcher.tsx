"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { SupportedLanguage } from "@/lib/translations";

interface LanguageSwitcherProps {
  language?: string;
  setLanguage?: (language: any) => void;
  compact?: boolean;
}

export function LanguageSwitcher({
  language: propLanguage,
  setLanguage: propSetLanguage,
  compact = false,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const context = useLanguage();
  const activeLanguage = (propLanguage || context.language) as SupportedLanguage;
  const changeLanguage = (code: SupportedLanguage) => {
    if (propSetLanguage) {
      propSetLanguage(code);
    }
    context.setLanguage(code);
  };

  const currentLang =
    context.languages.find((item) => item.code === activeLanguage) ||
    context.languages[0];

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: SupportedLanguage) => {
    changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Select Language"
        className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg border border-[#cfdacf] bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#173f2a] shadow-xs hover:bg-[#f4f7f4] hover:border-[#a8baa9] transition-all focus:outline-none focus:ring-2 focus:ring-[#28623c]/40"
      >
        <span className="text-sm">🌐</span>
        {!compact && (
          <span className="hidden sm:inline text-[#556358] font-normal">
            {context.t.common.language}:
          </span>
        )}
        <span className="font-bold">{currentLang.nativeName}</span>
        <svg
          className={`h-3.5 w-3.5 text-[#556358] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-56 origin-top-right rounded-xl border border-[#d6e0d6] bg-white p-1.5 shadow-xl ring-1 ring-black/5 focus:outline-none animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5f7064] border-b border-[#edf2ed] mb-1">
            {context.t.common.chooseLanguage}
          </div>
          <div className="max-h-72 overflow-y-auto space-y-0.5 scrollbar-thin">
            {context.languages.map((item) => {
              const isSelected = item.code === activeLanguage;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelect(item.code)}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-[#eaf3ea] text-[#173f2a] font-bold"
                      : "text-[#2a362f] hover:bg-[#f5f8f5] hover:text-[#173f2a]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[13px]">{item.nativeName}</span>
                    <span className="text-[11px] text-[#718276]">
                      ({item.name})
                    </span>
                  </div>
                  {isSelected && (
                    <span className="text-[#28623c] font-bold text-xs">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;