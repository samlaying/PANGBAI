import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  Inter,
  Noto_Serif_SC,
  Playfair_Display,
} from "next/font/google";
import "./globals.css";

const serifSC = Noto_Serif_SC({
  weight: ["400", "600", "700", "900"],
  subsets: ["latin"],
  preload: false,
  variable: "--font-serif-sc",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "旁白 PANGBAI — 你的职场评论员",
  description:
    "旁白是一个持续理解你工作环境的 AI 职场导师：对话、人物、项目、证据、成长。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${serifSC.variable} ${playfair.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
