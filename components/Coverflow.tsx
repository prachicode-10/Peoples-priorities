"use client";

import React, { useState, useEffect, useRef } from "react";

interface CoverflowItem {
  number: string;
  icon: string;
  title: Record<string, string>;
  text: Record<string, string>;
}

interface CoverflowProps {
  items: CoverflowItem[];
  language: string;
}

export default function Coverflow({ items, language }: CoverflowProps) {
  const [activeIndex, setActiveIndex] = useState(2); // Start in the middle
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef<number>(0);

  // Mouse wheel scroll navigation support
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastScrollTime.current < 450) {
        // Cooldown period - prevent page scrolling while interacting
        e.preventDefault();
        return;
      }

      const deltaX = e.deltaX;
      const deltaY = e.deltaY;

      // Threshold check to avoid micro-scroll jitter
      if (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15) {
        e.preventDefault(); // Intercept and handle horizontal/vertical scroll
        
        if (deltaX > 15 || deltaY > 15) {
          setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
        } else {
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        lastScrollTime.current = now;
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [items.length]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
  };

  // Swipe support for touch devices
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div className="relative w-full overflow-hidden py-12 px-4 flex flex-col items-center select-none">
      {/* 3D Viewport Container */}
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl h-[420px] flex items-center justify-center overflow-visible"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          perspective: "1200px",
          transformStyle: "preserve-3d",
        }}
      >
        {items.map((item, idx) => {
          const offset = idx - activeIndex;
          const absOffset = Math.abs(offset);

          // Calculate offset position and scaling factors dynamically
          let translateX = offset * 240; // Increased gap for larger cards
          let rotateY = 0;
          let scale = 1;
          let zIndex = 100 - absOffset;
          let opacity = 1;
          let translateZ = -absOffset * 90;

          if (offset < 0) {
            rotateY = 35; // Rotate leftwards (slightly lower angle for larger card visibility)
            translateX = translateX - 50; // Add extra push left
            scale = 0.85;
            opacity = 0.6;
          } else if (offset > 0) {
            rotateY = -35; // Rotate rightwards
            translateX = translateX + 50; // Add extra push right
            scale = 0.85;
            opacity = 0.6;
          }

          // Cull cards that are too far away visually
          if (absOffset > 2) {
            opacity = 0.05;
          }

          return (
            <div
              key={item.number}
              onClick={() => setActiveIndex(idx)}
              className={`absolute w-[300px] sm:w-[420px] h-[360px] rounded-3xl p-8 border transition-all duration-500 ease-out cursor-pointer flex flex-col justify-between select-none ${
                offset === 0
                  ? "bg-white border-[#173f2a] shadow-[0_25px_60px_rgba(23,63,42,0.15)] ring-1 ring-[#173f2a]/10"
                  : "bg-white/85 border-[#dfe6df]/85 shadow-md backdrop-blur-sm"
              }`}
              style={{
                transform: `translateX(${translateX}px) scale(${scale}) rotateY(${rotateY}deg) translateZ(${translateZ}px)`,
                zIndex,
                opacity,
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
              }}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-extrabold tracking-[0.2em] px-2.5 py-1 rounded-full ${
                  offset === 0 
                    ? "bg-[#e9f4ea] text-[#173f2a]" 
                    : "bg-[#f0f3f0] text-[#7b877f]"
                }`}>
                  {item.number}
                </span>

                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-colors duration-500 ${
                  offset === 0 ? "bg-[#e9f4ea] shadow-sm" : "bg-[#f5faf5]/40"
                }`}>
                  {item.icon}
                </div>
              </div>

              {/* Card Body */}
              <div className="mt-6 flex-1 flex flex-col justify-center">
                <h3 className={`text-xl sm:text-2xl font-bold transition-colors duration-500 ${
                  offset === 0 ? "text-[#173f2a]" : "text-[#3a4e41]"
                }`}>
                  {item.title[language] || item.title["en"]}
                </h3>

                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#68736b] line-clamp-4">
                  {item.text[language] || item.text["en"]}
                </p>
              </div>

              {/* Bottom indicator for active slide */}
              {offset === 0 && (
                <div className="mt-4 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#397149] animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#397149]" />
                  Active Layer
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-6 mt-6">
        <button
          onClick={handlePrev}
          disabled={activeIndex === 0}
          aria-label="Previous layer"
          className="h-11 w-11 rounded-full border border-[#cbd5cc] bg-white flex items-center justify-center text-sm text-[#173f2a] transition duration-300 hover:bg-[#eef3ee] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
        >
          ←
        </button>

        {/* Dynamic dot indicators */}
        <div className="flex gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to layer ${idx + 1}`}
              className={`h-2.5 rounded-full transition-all duration-500 ${
                idx === activeIndex ? "w-8 bg-[#173f2a]" : "w-2.5 bg-[#cbd5cc]"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={activeIndex === items.length - 1}
          aria-label="Next layer"
          className="h-11 w-11 rounded-full border border-[#cbd5cc] bg-white flex items-center justify-center text-sm text-[#173f2a] transition duration-300 hover:bg-[#eef3ee] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
        >
          →
        </button>
      </div>
    </div>
  );
}
