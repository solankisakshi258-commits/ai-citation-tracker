import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Citation Tracker",
  description:
    "Track Google AI Overview citations for keywords and compare them against organic search rankings.",
};

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/keywords", label: "Keywords" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-muted/30 antialiased">
        <header className="border-b bg-background">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              AI Citation Tracker
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
