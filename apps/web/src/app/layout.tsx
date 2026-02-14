import "~/styles/globals.css";

import { type Metadata } from "next";
import { Inter } from "next/font/google";

import { SessionProvider } from "~/app/_components/session-provider";
import { TeamProvider } from "~/app/_components/team-context";

export const metadata: Metadata = {
  title: "T3 Stack Demo - 用户管理系统",
  description: "基于 T3 Stack 构建的现代化用户管理系统，使用 Next.js、tRPC、Prisma 和 NextAuth.js",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${inter.variable} `}>
      <body>
        <SessionProvider>
          <TeamProvider>
            {children}
          </TeamProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
