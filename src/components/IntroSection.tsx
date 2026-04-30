"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { IntroContent } from "@/assets/introContent/content";

type IntroSectionProps = {
  content: IntroContent;
  backgroundVideoSrc?: string;
};

function RevealSection({
  heading,
  paragraphs,
  bullets,
}: {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={[
        "rounded-2xl border border-white/15 bg-slate-900/35 p-5 backdrop-blur-md sm:p-6",
        "transition-all duration-700",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
      ].join(" ")}
    >
      <h2 className="text-2xl font-semibold text-white sm:text-3xl">{heading}</h2>
      <div className="mt-4 space-y-4">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-sm leading-7 text-slate-100/95 sm:text-base">
            {paragraph}
          </p>
        ))}
      </div>
      {bullets && bullets.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {bullets.map((bullet) => (
            <li key={bullet} className="text-sm leading-7 text-cyan-50 sm:text-base">
              • {bullet}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default function IntroSection({
  content,
  backgroundVideoSrc = "/assets/videos/gioithieu.mp4",
}: IntroSectionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger a simple fade-in animation when section mounts.
    const timer = window.setTimeout(() => setIsVisible(true), 120);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={backgroundVideoSrc}
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Dark gradient overlay to keep text readable on top of video. */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/55 to-slate-950/75" />

      {/* Main intro content layer with long-form scroll article. */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <div
            className={[
              "rounded-2xl border border-white/15 bg-slate-900/40 p-6 backdrop-blur-md sm:p-8",
              "transition-all duration-700",
              isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
            ].join(" ")}
          >
            <p className="inline-flex rounded-full border border-cyan-200/40 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              {content.badge}
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              {content.title}
            </h1>
            <p className="mt-4 text-base text-slate-100 sm:text-lg">{content.subtitle}</p>
            <p className="mt-4 text-sm leading-7 text-slate-200/95 sm:text-base">{content.body}</p>

            <ul className="mt-6 space-y-2">
              {content.highlights.map((highlight) => (
                <li key={highlight} className="text-sm text-cyan-50 sm:text-base">
                  • {highlight}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/guide"
                className="rounded-xl border border-emerald-200/50 bg-emerald-400/20 px-5 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/35"
              >
                {content.primaryAction}
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                {content.secondaryAction}
              </Link>
            </div>
          </div>

          {/* Illustration placeholder area for future media replacements. */}
          <div
            className={[
              "rounded-2xl border border-white/15 bg-slate-900/35 p-3 backdrop-blur-md sm:p-4",
              "transition-all delay-100 duration-700",
              isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
            ].join(" ")}
          >
            <div className="h-full min-h-[260px] overflow-hidden rounded-xl border border-white/10 bg-slate-800/40 lg:sticky lg:top-24">
              <img
                src={content.illustration}
                alt="Intro placeholder"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-5 sm:mt-10">
          {content.articleSections.map((section) => (
            <RevealSection
              key={section.id}
              heading={section.heading}
              paragraphs={section.paragraphs}
              bullets={section.bullets}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
