import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "./logo";

export type LegalBlock = string | { bullets: string[] };

export function LegalDocument({
  title,
  meta,
  notice,
  sections,
  otherHref,
  otherLabel,
}: {
  title: string;
  meta: string;
  notice: string;
  sections: { heading: string; blocks: LegalBlock[] }[];
  otherHref: string;
  otherLabel: string;
}) {
  return (
    <main className="min-h-screen bg-white text-[#1c140c]">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex">
            <Logo />
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#eadcc8] px-4 py-2 text-sm hover:bg-[#fff8ee]">
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
        <p className="mt-8 text-xs uppercase tracking-[0.18em] text-[#a16207]">Legal</p>
        <h1 className="mt-2 font-serif text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-[#6b6258]">{meta}</p>
        <p className="mt-6 rounded-2xl border border-[#f0e6d8] bg-[#fff8ee] p-4 text-sm leading-6 text-[#6b6258]">{notice}</p>
        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold">{section.heading}</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[#3d342c]">
                {section.blocks.map((block, index) =>
                  typeof block === "string" ? (
                    <p key={index}>{block}</p>
                  ) : (
                    <ul key={index} className="list-disc space-y-2 pl-5">
                      {block.bullets.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-[#f0e6d8] pt-6 text-sm">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#eadcc8] px-4 py-2 hover:bg-[#fff8ee]">
            <ArrowLeft size={16} />
            Back
          </Link>
          <Link href={otherHref} className="text-[#a16207]">
            {otherLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
