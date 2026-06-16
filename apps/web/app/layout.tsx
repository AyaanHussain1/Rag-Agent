import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnShift AI",
  description: "Adaptive AI learning prototype for Java OOP"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold tracking-normal text-ink">LearnShift AI</Link>
            <nav className="flex items-center gap-3 text-sm text-slate-600">
              <Link href="/learner" className="hover:text-teal-700">Learner</Link>
              <Link href="/educator" className="hover:text-teal-700">Educator</Link>
              <Link href="/disclosure" className="hover:text-teal-700">Disclosure</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
