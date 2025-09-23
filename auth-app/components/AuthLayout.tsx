"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const isAuthPage = pathname.startsWith("/auth");

  const contentClasses = isAuthPage
    ? "min-h-screen flex flex-col"
    : "w-full mx-auto max-w-4xl px-4 py-10";

  return (
    <main className={contentClasses}>
      {isAuthPage ? (
        children
      ) : (
        <div className="rounded-2xl border border-orange-200/70 bg-white/80 shadow-xl shadow-orange-900/10">
          <div className="p-5 sm:p-7">
            {children}
          </div>
        </div>
      )}
    </main>
  );
}
