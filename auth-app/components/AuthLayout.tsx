"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const isAuthPage = pathname.startsWith("/auth");

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      {isAuthPage ? (
        children
      ) : (
        <div className="rounded-2xl border border-orange-200/70 bg-white/80 shadow-xl shadow-orange-900/10">
          <div className="p-5 sm:p-7">{children}</div>
        </div>
      )}
    </main>
  );
}