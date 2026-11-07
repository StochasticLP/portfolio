import Image from "next/image";
import type { Metadata } from "next";
import { ShadowCutStatus } from "./status";

export const metadata: Metadata = {
  title: "ShadowCut",
  description:
    "Take one photo of loose tools and get laser-cut foam files for your drawer. The tools do not need to be in their final arrangement.",
};

const steps = [
  "Four printed markers set the true scale and remove camera tilt.",
  "SAM 2 finds every object. A colour and texture rule separates tools from the surface.",
  "A nesting search rotates and places each pocket, then checks the result with exact geometry.",
  "You check each outline on your phone, then download DXF and SVG cut files with kerf compensation, finger notches, and engraved names.",
];

export default function ShadowCutPage() {
  return (
    <section className="mx-auto mt-12 w-full px-4 md:w-3/5">
      <h1 className="mb-4 text-3xl font-medium tracking-tighter text-[var(--text-primary)]">
        ShadowCut
      </h1>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        Take one photo of loose tools and get laser-cut foam files for your
        drawer. The tools do not need to be in their final arrangement.
      </p>

      <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <Image
          src="/shadowcut.jpg"
          alt="Seven wrenches with green measured outlines beside a printed calibration page"
          fill
          sizes="(max-width: 768px) 100vw, 60vw"
          className="object-contain"
          priority
        />
      </div>

      <div className="mt-8">
        <ShadowCutStatus />
      </div>

      <h2 className="mb-4 mt-12 text-xl font-medium text-[var(--text-primary)]">
        How it works
      </h2>
      <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[var(--text-secondary)]">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <h2 className="mb-4 mt-12 text-xl font-medium text-[var(--text-primary)]">
        Results
      </h2>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        On a tilted test photo with known sizes, it found 7 of 7 tools. Length
        errors were under 2 mm.
      </p>
      <p className="mt-8 text-sm leading-relaxed text-[var(--text-secondary)]">
        This runs on one desktop PC, so it is only live when that PC is on. A
        measurement takes about two minutes. The sample photo is instant.
      </p>
    </section>
  );
}
