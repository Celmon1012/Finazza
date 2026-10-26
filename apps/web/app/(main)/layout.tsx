"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullScreenLoader, Shell } from "@/components/shell";
import { useAuth } from "@/lib/auth";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) return <FullScreenLoader />;
  return <Shell>{children}</Shell>;
}
