"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth";
import { DISCLAIMER } from "@/lib/utils";

const rooms = [
  ["precious-metals", "Gold, silver, and the receipts people will show."],
  ["stocks-etfs", "Listed shares and funds. Manual records only."],
  ["commodities", "Metals, energy, and other physical positions."],
  ["collectibles", "Cards, coins, watches, and art catalogued by hand."],
  ["general", "Everything that does not fit a room yet."],
];

const steps = [
  ["01", "Write the position", "A holding or a closed trade, in shares, kilograms, ounces, or a single graded card."],
  ["02", "Show the proof", "Upload a receipt or photo. The label stays public: not verified by the platform."],
  ["03", "Stay in the room", "Topic rooms, direct messages, and groups of up to 50. Follow the people whose records you trust."],
];

export default function LandingPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) router.replace("/home");
  }, [ready, user, router]);

  return (
    <div className="min-h-screen bg-[#fffdfb] text-[#1c140c] [background-image:radial-gradient(ellipse_80%_50%_at_100%_-10%,rgba(246,180,41,0.28),transparent)]">
      <header className="sticky top-0 z-30 border-b border-[#f0e6d8] bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-3 sm:px-8">
          <Logo />
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/login" className="whitespace-nowrap rounded-full px-3 py-2 text-sm text-[#1c140c] hover:bg-[#fff1dc] sm:px-4">
              Sign in
            </Link>
            <Link href="/register" className="gold-fill whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold sm:px-4">
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">Create account</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
          <div>
            <h1 className="max-w-[16ch] font-serif text-[2.7rem] font-normal uppercase leading-[0.98] tracking-[0.01em] text-[#1a140f] sm:text-[3.35rem]">
              Share your
              <br />
              investment
              <br />
              experience and
              <br />
              ideas
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-7 text-[#8a8178]">
              Finazza is a social media for investors, where users can enter their past investments and current portfolio into their personal profiles.
            </p>
            <p className="mt-4 max-w-md text-[15px] font-medium leading-7 text-[#1a140f]">
              Let&apos;s talk about stocks, derivatives, commodities and collectibles!
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/register" className="gold-fill rounded-full px-6 py-3.5 text-center text-[15px] font-semibold shadow-[0_12px_30px_-16px_rgba(180,100,10,0.9)] sm:text-left">
                Join the web app
              </Link>
              <Link href="/login" className="rounded-full border border-[#eadcc8] bg-white px-6 py-3.5 text-center text-[15px] hover:border-[#f0a020] sm:text-left">
                Open a demo account
              </Link>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-[#f0e6d8] pt-6 text-sm">
              <div>
                <dt className="font-serif text-2xl">Any unit</dt>
                <dd className="mt-1 text-[#6b6258]">Shares, kg, oz, cards</dd>
              </div>
              <div>
                <dt className="font-serif text-2xl">Public</dt>
                <dd className="mt-1 text-[#6b6258]">Proof stays visible</dd>
              </div>
              <div>
                <dt className="font-serif text-2xl">50</dt>
                <dd className="mt-1 text-[#6b6258]">Member group limit</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -left-8 top-8 hidden h-40 w-40 rounded-full bg-[#ffe7b8] blur-3xl lg:block" />
            <FeedPreview />
            <ul className="relative z-10 mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["AAPL", "bought $160"],
                ["Silver", "5 kg · $30/oz"],
                ["TSLA", "+33%"],
                ["Card", "holding"],
              ].map(([name, detail]) => (
                <li key={name} className="rounded-2xl border border-[#f0e6d8] bg-white px-3 py-3 shadow-[0_16px_40px_-28px_rgba(80,40,0,0.7)]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#a16207]">{name}</p>
                  <p className={`mt-1 text-sm font-medium ${name === "TSLA" ? "text-[#15803d]" : "text-[#1c140c]"}`}>{detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="feed" className="scroll-mt-20 border-y border-[#f0e6d8] bg-white">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#a16207]">The feed</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">A timeline of positions, not headlines.</h2>
            </div>
            <p className="max-w-xl text-lg leading-8 text-[#6b6258]">
              Follow people, reply, like, and repost. Mention someone with @username. Explore is the wider room. Nothing here is a live quote or a brokerage connection.
            </p>
          </div>
          <ol className="mx-auto grid max-w-[1200px] gap-px overflow-hidden border-t border-[#f0e6d8] bg-[#f0e6d8] px-0 sm:grid-cols-3">
            {steps.map(([number, title, copy]) => (
              <li key={number} className="bg-white px-5 py-8 sm:px-8">
                <p className="font-serif text-3xl text-[#e39b12]">{number}</p>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6b6258]">{copy}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="rooms" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 py-20 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#a16207]">Topic rooms</p>
              <h2 className="mt-3 max-w-xl font-serif text-4xl leading-tight sm:text-5xl">Five rooms on day one. More when an admin opens them.</h2>
            </div>
            <Link href="/login" className="text-sm font-medium text-[#a16207] underline decoration-[#f0d7a4] underline-offset-4">
              Read them in the demo
            </Link>
          </div>
          <ul className="mt-10 divide-y divide-[#f0e6d8] border-y border-[#f0e6d8]">
            {rooms.map(([slug, description]) => (
              <li key={slug} className="grid gap-2 py-5 sm:grid-cols-[240px_1fr] sm:items-baseline">
                <p className="font-serif text-2xl">#{slug}</p>
                <p className="text-[#6b6258]">{description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="proof" className="scroll-mt-20 px-5 pb-20 sm:px-8">
          <div className="mx-auto grid max-w-[1200px] overflow-hidden rounded-[28px] bg-[#1c140c] text-[#fff7ea] lg:grid-cols-[1.1fr_0.9fr]">
            <div className="px-8 py-12 sm:px-12 sm:py-16">
              <p className="text-xs uppercase tracking-[0.18em] text-[#f6b429]">Proof</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">The receipt is public. The checkmark is not.</h2>
              <p className="mt-5 max-w-md text-[#e7d7c3]">
                Before an upload, three redaction boxes have to be checked. FINAZZA never calls a file verified. The label on every proof is the same sentence.
              </p>
            </div>
            <div className="flex items-center bg-[#2a2118] px-8 py-12 sm:px-12">
              <div className="w-full rounded-2xl border border-[#f6b429]/30 bg-[#1c140c] p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-[#f6b429]">Silver · 5 kg · $30/oz</p>
                <p className="mt-4 font-serif text-3xl leading-snug">Proof uploaded — not verified by the platform</p>
                <p className="mt-4 text-sm text-[#e7d7c3]">Dealer name, account number, and location removed before upload.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-8">
          <div className="rounded-[28px] border border-[#f0e6d8] bg-white px-8 py-12 sm:px-12">
            <h2 className="max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">Open the demo and read the silver thread.</h2>
            <p className="mt-4 max-w-xl text-[#6b6258]">Password for every sample account is password123. Alex has the portfolio. Jordan has the chart. Sam has the card.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="gold-fill rounded-full px-6 py-3.5 font-semibold">
                Sign in as Alex
              </Link>
              <Link href="/register" className="rounded-full border border-[#eadcc8] px-6 py-3.5 hover:border-[#f0a020]">
                Create your own account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer id="footer" className="border-t border-[#f0e6d8] bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-[#f0e6d8] p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-[#a16207]">Co-founder</p>
            <div className="mt-5 flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#fff1dc] font-serif text-2xl text-[#a16207]">WT</span>
              <div>
                <h2 className="font-serif text-3xl">Winson Tse</h2>
                <p className="text-sm text-[#6b6258]">Co-founder of Finazza</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-[#6b6258]">
              Winson Tse started FINAZZA in Hong Kong to give investors a public place for discussions about stocks, derivatives, commodities and collectibles. He leads the development of FINAZZA with his team of professional programmers.
            </p>
            <p className="mt-5 text-sm">
              <span className="text-[#8a7f74]">Email: </span>
              <a href="mailto:w@finazza.app" className="text-[#a16207]">
                w@finazza.app
              </a>
            </p>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-[#f0e6d8]">
            <div className="flex items-end justify-between gap-4 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#a16207]">Where FINAZZA started</p>
                <h2 className="mt-1 font-serif text-3xl">Hong Kong</h2>
              </div>
              <a
                href="https://www.openstreetmap.org/#map=11/22.3193/114.1694"
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-sm text-[#a16207]"
              >
                Open map
              </a>
            </div>
            <iframe
              title="Map of Hong Kong, where FINAZZA started"
              src="https://www.openstreetmap.org/export/embed.html?bbox=113.825%2C22.190%2C114.430%2C22.570&layer=mapnik"
              className="h-80 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
        <div className="border-t border-[#f0e6d8]">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 py-6 text-sm text-[#6b6258] sm:px-8 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl">{DISCLAIMER}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/privacy" className="text-[#a16207]">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-[#a16207]">
                Terms of Use
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
function FeedPreview() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#f0e6d8] bg-white shadow-[0_40px_80px_-48px_rgba(80,40,0,0.55)]">
      <div className="flex items-center justify-between border-b border-[#f3ece3] px-5 py-4">
        <p className="text-sm font-semibold">Home</p>
        <p className="text-xs text-[#a16207]">People you follow</p>
      </div>
      <article className="border-b border-[#f3ece3] px-5 py-4">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fff1dc] text-sm font-semibold text-[#a16207]">A</span>
          <div className="min-w-0">
            <p className="text-sm">
              <span className="font-semibold">Alex Morgan</span> <span className="text-[#8a7f74]">@alex</span>
            </p>
            <p className="mt-1 text-[15px] leading-6">Added 5 kg of silver bullion. The receipt is public proof, with the dealer details removed.</p>
          </div>
        </div>
      </article>
      <article className="px-5 py-4">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fff1dc] text-sm font-semibold text-[#a16207]">J</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-semibold">Jordan Lee</span> <span className="text-[#8a7f74]">@jordan</span>
            </p>
            <p className="mt-1 text-[15px] leading-6">Annotated gold chart from today. A drawing on an upload, not a live price.</p>
            <svg viewBox="0 0 320 110" className="mt-3 h-24 w-full rounded-xl bg-[#1c140c]" aria-hidden="true">
              <polyline
                fill="none"
                stroke="#f6b429"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points="16,82 58,70 96,74 140,48 176,56 214,34 258,28 304,16"
              />
              <circle cx="304" cy="16" r="4" fill="#f6b429" />
            </svg>
          </div>
        </div>
      </article>
    </div>
  );
}

