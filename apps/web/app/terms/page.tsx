import Link from "next/link";
import { Logo } from "@/components/logo";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 text-neutral-700">
      <Link href="/" className="inline-flex">
        <Logo />
      </Link>
      <h1 className="mt-8 text-3xl font-semibold text-neutral-950">Terms and disclaimer</h1>
      <div className="mt-6 space-y-4 text-sm leading-6">
        <p>FINAZZA is a place for people to publish their own investment notes. Nothing on the platform is financial, tax, or investment advice, and nothing is an offer to buy or sell anything.</p>
        <p>Investment details and proof files are public to signed-in members. Proof is stored and displayed only. FINAZZA does not review it, match it to a broker, or verify that a trade happened. The only label used for a file is “Proof uploaded — not verified by the platform.”</p>
        <p>Before uploading, remove real names, account numbers, and addresses. Image metadata is stripped on upload. You can delete or replace a proof file from your portfolio.</p>
        <p>Returns on completed trades are a simple price change per unit. They ignore fees, taxes, and partial sales. A current holding is not shown as a realized return.</p>
        <p>You can report posts, messages, proof, and accounts. Moderators can hide content and suspend accounts. Blocked people cannot message you or add you to a group.</p>
      </div>
    </main>
  );
}
