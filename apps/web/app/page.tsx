"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { useAuth } from "@/lib/auth";
import { cn, DISCLAIMER } from "@/lib/utils";

const rooms = [
  ["stocks-etfs", "Listed shares and funds."],
  ["derivatives", "Options, futures and other types of derivatives."],
  ["commodities", "Metals, energy, and other physical positions."],
  ["collectibles", "Cards, coins, watches, and art catalogued by hand."],
  ["general", "Everything that does not fit a room yet."],
];

const steps = [
  ["1", "Write down your positions", "Enter your closed trades and current portfolio into your investment profile."],
  [
    "2",
    "Show the proof of investment",
    "Upload a receipt or any photo that proves your investment. The proof stays public and therefore can be viewed by everyone.",
  ],
  [
    "3",
    "Stay in the chatroom",
    "One-to-one direct messages, group messages and messages in topical chatroom. Tell people your ideas about the market right now.",
  ],
];

export default function LandingPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) router.replace("/home");
  }, [ready, user, router]);

  const progressRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${ratio})`;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#1c140c]">
      <header
        className={cn(
          "sticky top-0 z-30 border-b bg-white transition-[box-shadow,border-color] duration-300",
          scrolled ? "border-[#f0e6d8] shadow-[0_12px_30px_-22px_rgba(120,70,0,0.5)]" : "border-transparent",
        )}
      >
        <div
          ref={progressRef}
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-[#F5A623] via-[#FFB733] to-[#FFC940]"
        />
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

      <main className="overflow-x-clip">
        <section className="bg-white bg-[url('/bg/hero-bg.svg')] bg-cover bg-[position:70%_100%] bg-no-repeat md:bg-right-bottom">
          <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
            <div>
              <Reveal variant="left">
                <h1 className="max-w-[16ch] font-serif text-[2.7rem] font-normal uppercase leading-[0.98] tracking-[0.01em] text-[#1a140f] sm:text-[3.35rem]">
                  Share your
                  <br />
                  investment
                  <br />
                  experience and
                  <br />
                  ideas
                </h1>
              </Reveal>
              <Reveal variant="left" delay={150}>
                <p className="mt-6 max-w-md text-[15px] leading-7 text-[#8a8178]">
                  Finazza is a social media for investors, where users can enter their past investments and current portfolio into their personal profiles.
                </p>
              </Reveal>
              <Reveal variant="left" delay={250}>
                <p className="mt-4 max-w-md text-[15px] font-medium leading-7 text-[#1a140f]">
                  Let&apos;s talk about stocks, derivatives, commodities and collectibles!
                </p>
              </Reveal>
              <Reveal variant="up" delay={380}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href="/register"
                    className="gold-fill rounded-full px-6 py-3.5 text-center text-[15px] font-semibold shadow-[0_12px_30px_-16px_rgba(180,100,10,0.9)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-16px_rgba(180,100,10,0.95)] sm:text-left"
                  >
                    Join the web app
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-full border border-[#eadcc8] bg-white px-6 py-3.5 text-center text-[15px] transition duration-300 hover:-translate-y-0.5 hover:border-[#f0a020] sm:text-left"
                  >
                    Sign in
                  </Link>
                </div>
              </Reveal>
            </div>

            <div className="relative">
              <Reveal variant="right" delay={200}>
                <div className="float-soft">
                  <FeedPreview />
                </div>
              </Reveal>
              <ul className="relative z-10 mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["AAPL", "bought $160"],
                  ["Silver", "5 kg · $30/oz"],
                  ["TSLA", "+33%"],
                  ["Card", "holding"],
                ].map(([name, detail], index) => (
                  <Reveal as="li" key={name} variant="scale" delay={600 + index * 110}>
                    <div className="rounded-2xl border border-[#f5dfb8] bg-white/90 px-3 py-3 shadow-[0_16px_40px_-26px_rgba(245,166,35,0.75)] backdrop-blur-sm transition duration-300 hover:-translate-y-1">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#a16207]">{name}</p>
                      <p className={`mt-1 text-sm font-medium ${name === "TSLA" ? "text-[#15803d]" : "text-[#1c140c]"}`}>{detail}</p>
                    </div>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="feed" className="scroll-mt-20 bg-[linear-gradient(180deg,#FFF1D9_0%,#FFFFFF_38%)]">
          <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8">
            <Reveal>
              <h2 className="max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
                Tell others your past investment, current holdings and what you are thinking about the market.
              </h2>
            </Reveal>
            <ol className="mt-10 grid gap-4 sm:grid-cols-3">
              {steps.map(([number, title, copy], index) => (
                <Reveal as="li" key={number} delay={index * 140}>
                  <div className="group h-full rounded-3xl border border-[#f0e6d8] bg-white p-6 shadow-[0_24px_50px_-36px_rgba(120,70,0,0.55)] transition duration-300 hover:-translate-y-1.5 hover:border-[#f5d9a8] hover:shadow-[0_30px_60px_-34px_rgba(245,166,35,0.7)] sm:p-7">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#F5A623] to-[#FFC940] font-serif text-xl text-[#1c140c] transition duration-300 group-hover:rotate-[-6deg] group-hover:scale-110">
                      {number}
                    </span>
                    <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#6b6258]">{copy}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section id="rooms" className="scroll-mt-20 bg-white bg-[url('/bg/chatrooms-bg.svg')] bg-cover bg-center bg-no-repeat">
          <div className="mx-auto max-w-[1200px] px-5 py-24 text-center sm:px-8">
            <Reveal variant="scale">
              <p className="inline-block rounded-full border border-[#f5d9a8] bg-[#fff1dc] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#a16207]">
                Topical chatrooms
              </p>
            </Reveal>
            <Reveal delay={120}>
              <h2 className="mx-auto mt-4 max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">Five topical chatrooms on day one. More when admin opens new ones.</h2>
            </Reveal>
            <Reveal delay={220}>
              <Link href="/register" className="mt-5 inline-block text-sm font-medium text-[#a16207] underline decoration-[#f0d7a4] underline-offset-4 hover:decoration-[#e39b12]">
                Join the conversation
              </Link>
            </Reveal>
            <ul className="mt-10 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-5">
              {rooms.map(([slug, description], index) => (
                <Reveal as="li" key={slug} variant="scale" delay={index * 100}>
                  <div className="h-full rounded-2xl border border-[#f0e6d8] bg-white/90 p-5 shadow-[0_20px_44px_-34px_rgba(120,70,0,0.6)] backdrop-blur-sm transition duration-300 hover:-translate-y-1.5 hover:border-[#f5d9a8] hover:shadow-[0_28px_54px_-32px_rgba(245,166,35,0.75)]">
                    <p className="font-semibold text-[#d97706]">#{slug}</p>
                    <p className="mt-2 text-sm leading-6 text-[#6b6258]">{description}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        <section
          className="bg-cover bg-bottom bg-no-repeat"
          style={{ backgroundImage: "url(/bg/cta-overlay.svg), linear-gradient(120deg, #F5A623 0%, #FFB733 55%, #FFC940 100%)" }}
        >
          <Reveal variant="scale" className="mx-auto max-w-[1200px] px-5 py-20 text-center sm:px-8 sm:py-24">
            <h2 className="mx-auto max-w-2xl font-serif text-4xl leading-tight text-[#1a140f] sm:text-5xl">Start sharing your investments today.</h2>
            <p className="mx-auto mt-4 max-w-xl text-[#3b2a12]">
              Create a free account, enter your closed trades and current portfolio, upload proof of investment and join the topical chatrooms.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="rounded-full bg-[#0F1419] px-6 py-3.5 font-semibold text-white shadow-[0_14px_30px_-14px_rgba(15,20,25,0.8)] transition duration-300 hover:-translate-y-0.5 hover:bg-black"
              >
                Create your account
              </Link>
              <Link href="/login" className="rounded-full bg-white px-6 py-3.5 font-medium text-[#1c140c] transition duration-300 hover:-translate-y-0.5 hover:bg-[#fff8ec]">
                Sign in
              </Link>
            </div>
          </Reveal>
        </section>

        <section className="bg-white bg-[url('/bg/founder-hk-bg.svg')] bg-cover bg-bottom bg-no-repeat">
          <div className="mx-auto grid max-w-[1200px] items-start gap-10 px-5 pb-40 pt-20 sm:px-8 md:pb-[220px] lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal variant="left">
              <p className="inline-block rounded-full border border-[#f5d9a8] bg-[#fff1dc] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#a16207]">Co-founder</p>
              <div className="mt-5 flex items-center gap-4">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#fff1dc] font-serif text-2xl text-[#a16207]">WT</span>
                <div>
                  <h2 className="font-serif text-3xl">Winson Tse</h2>
                  <p className="text-sm text-[#6b6258]">Co-founder of Finazza</p>
                </div>
              </div>
              <p className="mt-5 max-w-md text-sm leading-6 text-[#6b6258]">
                Winson Tse started FINAZZA in Hong Kong to give investors a public place for discussions about stocks, derivatives, commodities and collectibles. He leads the development of FINAZZA with his team of professional programmers.
              </p>
              <p className="mt-5 text-sm">
                <span className="text-[#8a7f74]">Email: </span>
                <a href="mailto:w@finazza.app" className="text-[#a16207]">
                  w@finazza.app
                </a>
              </p>
            </Reveal>

            <Reveal variant="right" delay={150} className="overflow-hidden rounded-[28px] border border-[#f0e6d8] bg-white shadow-[0_30px_60px_-40px_rgba(120,70,0,0.55)]">
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
            </Reveal>
          </div>
        </section>
      </main>

      <footer id="footer" className="bg-[#0F1419]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 py-8 text-sm text-[#9aa3ab] sm:px-8 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl">{DISCLAIMER}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="text-white hover:text-[#FFC940]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-white hover:text-[#FFC940]">
              Terms of Use
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
function FeedPreview() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#f5dfb8] bg-white/85 shadow-[0_40px_80px_-36px_rgba(245,166,35,0.6)] backdrop-blur-sm">
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
                className="draw-line"
                fill="none"
                stroke="#f6b429"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points="16,82 58,70 96,74 140,48 176,56 214,34 258,28 304,16"
              />
              <circle className="draw-dot" cx="304" cy="16" r="4" fill="#f6b429" />
            </svg>
          </div>
        </div>
      </article>
    </div>
  );
}

