import Link from "next/link";

export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(@[a-zA-Z0-9_]{3,20}|https?:\/\/[^\s]+)/g);
  return (
    <p className={className || "whitespace-pre-wrap break-words text-[15px] leading-6"}>
      {parts.map((part, index) => {
        if (part.startsWith("@") && /^@[a-zA-Z0-9_]{3,20}$/.test(part)) {
          return (
            <Link key={index} href={`/u/${part.slice(1).toLowerCase()}`} className="text-[#c56a00] hover:underline">
              {part}
            </Link>
          );
        }
        if (/^https?:\/\//.test(part)) {
          return (
            <a key={index} href={part} target="_blank" rel="noreferrer" className="text-[#c56a00] hover:underline">
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}
