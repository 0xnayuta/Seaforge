import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "纵横四海 — Seaforge",
  description: "单人离线航海贸易经营游戏",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full flex flex-col">
        <nav className="flex items-center justify-between bg-ocean-800 border-b border-ocean-600 px-4 py-2 text-sm">
          <span className="text-gold-400 font-bold tracking-wider">
            纵横四海
          </span>
          <div className="flex gap-4 text-parchment-dark">
            <a
              href="/"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              港口
            </a>
            <a
              href="/market"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              交易所
            </a>
            <a
              href="/cargo"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              船舱
            </a>
            <a
              href="/navigation"
              className="hover:text-gold-400 focus-visible:text-gold-400 transition-colors outline-none"
            >
              航海图
            </a>
          </div>
        </nav>
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  )
}
