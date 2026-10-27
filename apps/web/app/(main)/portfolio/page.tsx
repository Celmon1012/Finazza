"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function PortfolioPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) router.replace(`/u/${user.username}?tab=investment`);
  }, [ready, user, router]);

  return <Spinner />;
}
