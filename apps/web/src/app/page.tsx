"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-gh-bg)" }}>
      {/* Header */}
      <header className="gh-header">
        <div className="flex items-center gap-4">
          <Link href="/">
            <svg height="32" viewBox="0 0 16 16" width="32" fill="#c9d1d9">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
            </svg>
          </Link>
          <nav className="flex items-center gap-4 text-sm" style={{ color: "var(--color-gh-text)" }}>
            <Link href="/" className="px-2 py-1 rounded-md bg-white/10">首页</Link>
            <Link href="/admin/users" className="px-2 py-1 rounded-md hover:bg-white/10">用户管理</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="spinner" style={{ width: "20px", height: "20px" }}></div>
          ) : session ? (
            <>
              <span className="text-sm" style={{ color: "var(--color-gh-text-muted)" }}>
                {session.user.name ?? session.user.email}
              </span>
              <button
                onClick={() => void signOut()}
                className="btn btn-secondary"
                style={{ padding: "4px 12px", fontSize: "12px" }}
              >
                退出登录
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: "12px" }}>
                登录
              </Link>
              <Link href="/auth/register" className="btn btn-primary" style={{ padding: "4px 12px", fontSize: "12px" }}>
                注册
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="py-20 px-4" style={{
          background: "linear-gradient(180deg, rgba(13, 17, 23, 0) 0%, rgba(22, 27, 34, 0.5) 100%)"
        }}>
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6" style={{ color: "var(--color-gh-text)" }}>
              T3 Stack{" "}
              <span style={{
                background: "linear-gradient(90deg, #58a6ff, #3fb950)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>
                CRUD Demo
              </span>
            </h1>
            <p className="text-xl mb-2" style={{ color: "var(--color-gh-text-muted)" }}>
              基于 Next.js、tRPC、Prisma、NextAuth.js 构建的现代化全栈应用示例
            </p>
            <p className="text-sm mb-8" style={{ color: "var(--color-gh-accent)" }}>
              🚀 纯 CSR (Client-Side Rendering) 模式
            </p>
            <div className="flex items-center justify-center gap-4">
              {session ? (
                <Link href="/admin/users" className="btn btn-primary" style={{ padding: "12px 24px", fontSize: "16px" }}>
                  进入用户管理
                </Link>
              ) : (
                <>
                  <Link href="/auth/signin" className="btn btn-primary" style={{ padding: "12px 24px", fontSize: "16px" }}>
                    开始使用
                  </Link>
                  <Link href="/auth/register" className="btn btn-secondary" style={{ padding: "12px 24px", fontSize: "16px" }}>
                    创建账户
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ color: "var(--color-gh-text)" }}>
              技术栈
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Next.js */}
              <div className="card p-6 transition-transform hover:scale-105">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: "var(--color-gh-bg)" }}>
                  <svg width="24" height="24" viewBox="0 0 180 180" fill="none">
                    <mask id="mask0" maskUnits="userSpaceOnUse" x="0" y="0" width="180" height="180">
                      <circle cx="90" cy="90" r="90" fill="white" />
                    </mask>
                    <g mask="url(#mask0)">
                      <circle cx="90" cy="90" r="90" fill="black" />
                      <path d="M149.508 157.52L69.142 54H54v71.97h12.114V69.384l73.885 95.461a90.304 90.304 0 009.509-7.325z" fill="url(#gradient1)" />
                      <rect x="115" y="54" width="12" height="72" fill="url(#gradient2)" />
                    </g>
                    <defs>
                      <linearGradient id="gradient1" x1="109" y1="116.5" x2="144.5" y2="160.5" gradientUnits="userSpaceOnUse">
                        <stop stopColor="white" />
                        <stop offset="1" stopColor="white" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="gradient2" x1="121" y1="54" x2="120.799" y2="106.875" gradientUnits="userSpaceOnUse">
                        <stop stopColor="white" />
                        <stop offset="1" stopColor="white" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-gh-text)" }}>Next.js 15</h3>
                <p className="text-sm" style={{ color: "var(--color-gh-text-muted)" }}>
                  React 全栈框架，CSR 模式运行
                </p>
              </div>

              {/* tRPC */}
              <div className="card p-6 transition-transform hover:scale-105">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: "var(--color-gh-bg)" }}>
                  <svg width="24" height="24" viewBox="0 0 512 512" fill="#398ccb">
                    <rect width="512" height="512" rx="150" fill="none" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M255.446 75L326.523 116.008V138.556L412.554 188.238V289.804L334.467 335.259V378.017L255.446 423.496L176.426 378.017V335.259L98.3388 289.804V188.238L184.37 138.556V116.008L255.446 75ZM326.523 237.206V199.02L255.446 158.011L184.369 199.02V237.206L255.446 278.215L326.523 237.206ZM206.039 349.752V319.836L255.446 347.488L304.854 319.836V349.752L255.446 378.017L206.039 349.752ZM184.369 273.238V311.424L126.409 277.29V205.108L184.369 239.241V273.238ZM326.523 239.241L384.483 205.108V277.29L326.523 311.424V278.217V239.241ZM227.196 130.552V98.0172L255.446 116.008L283.697 98.0172V130.552L255.446 148.544L227.196 130.552Z" fill="#398ccb" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-gh-text)" }}>tRPC</h3>
                <p className="text-sm" style={{ color: "var(--color-gh-text-muted)" }}>
                  端到端类型安全的 API 层，无需手动定义接口
                </p>
              </div>

              {/* Prisma */}
              <div className="card p-6 transition-transform hover:scale-105">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: "var(--color-gh-bg)" }}>
                  <svg width="24" height="24" viewBox="0 0 159 194" fill="#c9d1d9">
                    <path fillRule="evenodd" clipRule="evenodd" d="M2.39749 122.867C-1.04697 115.628 -0.690347 107.197 3.32406 100.301L48.5726 23.2436C52.5874 16.3471 59.5193 11.7081 67.4251 10.5963L142.518 0.0414461C153.253 -1.47027 162.868 6.5174 162.868 17.3397V145.551C162.868 153.942 157.959 161.585 150.277 165.255L88.9415 194.562C77.2533 200.148 63.4406 194.047 59.6527 181.624L2.39749 122.867ZM82.7505 49.4684C80.9339 43.2943 87.5647 37.9556 93.0948 41.2361L140.259 69.214C145.059 72.0621 145.747 78.7363 141.592 82.4424L79.7489 137.639C74.9122 141.953 67.354 138.45 67.7085 132.085L70.8818 75.1226C71.0508 72.0909 72.1619 69.1863 74.0614 66.8298L82.7505 49.4684Z" fill="#c9d1d9" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-gh-text)" }}>Prisma</h3>
                <p className="text-sm" style={{ color: "var(--color-gh-text-muted)" }}>
                  现代化 ORM，类型安全的数据库操作
                </p>
              </div>

              {/* NextAuth.js */}
              <div className="card p-6 transition-transform hover:scale-105">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: "var(--color-gh-bg)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#c9d1d9">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-15a3 3 0 100 6 3 3 0 000-6zm-5 10a5 5 0 0110 0H7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-gh-text)" }}>NextAuth.js</h3>
                <p className="text-sm" style={{ color: "var(--color-gh-text-muted)" }}>
                  完整的认证解决方案，支持多种登录方式
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Status Section */}
        {session && (
          <section className="py-8 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: "var(--color-gh-success)", color: "var(--color-gh-white)" }}>
                    {session.user.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: "var(--color-gh-text)" }}>
                      欢迎回来，{session.user.name ?? "用户"}！
                    </h3>
                    <p className="text-sm" style={{ color: "var(--color-gh-text-muted)" }}>
                      {session.user.email}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className="badge badge-success">已登录</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Quick Links */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8" style={{ color: "var(--color-gh-text)" }}>
              快速开始
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/auth/signin" className="card p-6 hover:border-blue-500 transition-colors group">
                <div className="flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ color: "var(--color-gh-accent)" }}>
                    <path d="M2 2.75A2.75 2.75 0 014.75 0h6.5A2.75 2.75 0 0114 2.75v10.5A2.75 2.75 0 0111.25 16h-6.5A2.75 2.75 0 012 13.25zm9.47 2.72a.75.75 0 00-1.06-1.06l-3.25 3.25a.75.75 0 000 1.06l3.25 3.25a.75.75 0 101.06-1.06L9.012 8.5h4.738a.75.75 0 000-1.5H9.012z" />
                  </svg>
                  <span className="font-medium group-hover:text-blue-400" style={{ color: "var(--color-gh-text)" }}>
                    用户登录
                  </span>
                </div>
              </Link>
              <Link href="/auth/register" className="card p-6 hover:border-green-500 transition-colors group">
                <div className="flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ color: "var(--color-gh-success)" }}>
                    <path d="M10.75 8a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5H10v-1.5a.75.75 0 01.75-.75zm-8.5-4h5.5a.75.75 0 010 1.5h-5.5a.75.75 0 010-1.5zm0 3h5.5a.75.75 0 010 1.5h-5.5a.75.75 0 010-1.5zm0 3h3.5a.75.75 0 010 1.5h-3.5a.75.75 0 010-1.5z" />
                  </svg>
                  <span className="font-medium group-hover:text-green-400" style={{ color: "var(--color-gh-text)" }}>
                    用户注册
                  </span>
                </div>
              </Link>
              <Link href="/admin/users" className="card p-6 hover:border-purple-500 transition-colors group">
                <div className="flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ color: "#a855f7" }}>
                    <path d="M5.5 3.5a2 2 0 100 4 2 2 0 000-4zM2 5.5a3.5 3.5 0 115.898 2.549 5.508 5.508 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.49 3.49 0 012 5.5zM11 4a.75.75 0 100 1.5 1.5 1.5 0 01.666 2.844.75.75 0 00-.416.672v.352a.75.75 0 00.574.73c1.2.289 2.162 1.2 2.522 2.372a.75.75 0 101.434-.44 5.01 5.01 0 00-2.56-3.012A3 3 0 0011 4z" />
                  </svg>
                  <span className="font-medium group-hover:text-purple-400" style={{ color: "var(--color-gh-text)" }}>
                    用户管理
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* CSR Info Banner */}
        <section className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="card p-4" style={{ borderColor: "var(--color-gh-accent)" }}>
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ color: "var(--color-gh-accent)" }}>
                  <path d="M0 1.75A.75.75 0 01.75 1h4.253c1.227 0 2.317.59 3 1.501A3.744 3.744 0 0111.006 1h4.245a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75h-4.507a2.25 2.25 0 00-1.591.659l-.622.621a.75.75 0 01-1.06 0l-.622-.621A2.25 2.25 0 005.258 13H.75a.75.75 0 01-.75-.75zm7.251 10.324l.004-5.073-.002-2.253A2.25 2.25 0 005.003 2.5H1.5v9h3.757a3.75 3.75 0 011.994.574zM8.755 4.75l-.004 7.322a3.752 3.752 0 011.992-.572H14.5v-9h-3.495a2.25 2.25 0 00-2.25 2.25z" />
                </svg>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-gh-text)" }}>
                    纯客户端渲染 (CSR) 模式
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-gh-text-muted)" }}>
                    所有页面均使用 &quot;use client&quot; 指令，在浏览器端渲染
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t" style={{ borderColor: "var(--color-gh-border)" }}>
        <div className="max-w-6xl mx-auto text-center text-sm" style={{ color: "var(--color-gh-text-muted)" }}>
          <p>© 2026 T3 Stack Demo. 基于 create-t3-app 创建。</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <a href="https://create.t3.gg" target="_blank" rel="noopener noreferrer"
              className="hover:underline" style={{ color: "var(--color-gh-accent)" }}>
              T3 Stack
            </a>
            <span>·</span>
            <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer"
              className="hover:underline" style={{ color: "var(--color-gh-accent)" }}>
              Next.js
            </a>
            <span>·</span>
            <a href="https://prisma.io" target="_blank" rel="noopener noreferrer"
              className="hover:underline" style={{ color: "var(--color-gh-accent)" }}>
              Prisma
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
