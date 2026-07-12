import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "纵横四海 — Seaforge",
  description: "单人离线航海贸易经营游戏",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <nav className="flex items-center justify-between bg-ocean-800 border-b border-ocean-600 px-4 py-2 text-sm">
          <span className="text-gold-400 font-bold tracking-wider">
            纵横四海
          </span>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-parchment-dark">
            <Link
              href="/"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              港口
            </Link>
            <Link
              href="/market"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              交易所
            </Link>
            <Link
              href="/ship"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              造船厂
            </Link>
            <Link
              href="/fleet"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              舰队
            </Link>
            <Link
              href="/character"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              人物
            </Link>
            <Link
              href="/tavern"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              酒馆
            </Link>
            <Link
              href="/navigation"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              航海图
            </Link>
            <Link
              href="/dungeon"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              副本
            </Link>
            <Link
              href="/achievements"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              成就
            </Link>
            <Link
              href="/collection"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              图鉴
            </Link>
            <Link
              href="/npc"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              NPC
            </Link>
            <Link
              href="/quests"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              任务
            </Link>
          </div>
        </nav>
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
