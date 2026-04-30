"use client";

import { useEffect, useRef, useState } from "react";
import type { GuideStep } from "@/assets/introContent/content";

type GuideSectionProps = {
  title?: string;
  subtitle?: string;
  steps: GuideStep[];
  backgroundVideoSrc?: string;
};

function GuideCard({
  step,
  index,
}: {
  step: GuideStep;
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Reveal card when it enters viewport to create scroll fade-in effect.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <article
      ref={cardRef}
      className={[
        "rounded-2xl border border-white/15 bg-slate-900/40 p-4 backdrop-blur-md sm:p-5",
        "transition-all duration-700",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
      ].join(" ")}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/90">
        Buoc {index + 1}
      </p>
      <h3 className="mt-2 text-xl font-semibold text-white">{step.title}</h3>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-200/95">
        {step.description}
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-slate-800/45">
        <img src={step.image} alt={step.title} className="h-full w-full object-cover" />
      </div>
    </article>
  );
}

export default function GuideSection({
  title = "Huong dan su dung",
  subtitle = "Noi dung huong dan demo - ban co the thay the bang quy trinh chinh thuc sau nay.",
  steps,
  backgroundVideoSrc = "/assets/videos/bieutuong1.mp4",
}: GuideSectionProps) {
  return (
    <section className="relative w-full overflow-hidden py-16 sm:py-20">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={backgroundVideoSrc}
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Overlay layer for contrast and readability. */}
      <div className="absolute inset-0 bg-slate-950/75" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">{title}</h2>
          <p className="mt-4 text-sm leading-7 text-slate-200 sm:text-base">{subtitle}</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step, index) => (
            <GuideCard key={step.id} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
