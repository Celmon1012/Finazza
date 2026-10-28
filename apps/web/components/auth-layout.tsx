import Link from "next/link";
import { Logo } from "./logo";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-[#fffaf2] px-4 py-10 text-[#1c140c] sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[url('/bg/auth-bg.svg')] bg-cover bg-center bg-no-repeat" />
      <div className="auth-rise w-full max-w-md rounded-[28px] border border-[#f0e6d8] bg-white/90 p-6 shadow-[0_40px_80px_-40px_rgba(120,70,0,0.55)] backdrop-blur-sm sm:p-8">
        <Link href="/" aria-label="FINAZZA home" className="inline-flex">
          <Logo />
        </Link>
        {children}
      </div>
    </main>
  );
}
