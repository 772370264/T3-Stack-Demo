"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage("");

        if (password !== confirmPassword) {
            setErrorMessage("两次输入的密码不一致");
            return;
        }

        if (password.length < 6) {
            setErrorMessage("密码至少需要6个字符");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error ?? "注册失败");
            }

            // 注册成功，跳转到登录页
            router.push("/auth/signin?registered=true");
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "注册失败，请重试");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--color-gh-bg)" }}>
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-6">
                    <svg className="mx-auto" height="48" viewBox="0 0 16 16" width="48" fill="#c9d1d9">
                        <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                    </svg>
                    <h1 className="text-2xl font-light mt-4" style={{ color: "var(--color-gh-text)" }}>
                        创建账户
                    </h1>
                </div>

                {/* Register Form Card */}
                <div className="card p-4">
                    {errorMessage && (
                        <div className="mb-4 p-3 rounded-md text-sm" style={{
                            backgroundColor: "rgba(218, 54, 51, 0.1)",
                            border: "1px solid var(--color-gh-danger)",
                            color: "var(--color-gh-danger-emphasis)"
                        }}>
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name">用户名</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoComplete="name"
                                autoFocus
                                minLength={2}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">邮箱地址</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">密码</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                minLength={6}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">确认密码</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary w-full mt-4"
                            style={{ padding: "8px 16px" }}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }}></span>
                                    注册中...
                                </>
                            ) : (
                                "注册"
                            )}
                        </button>
                    </form>
                </div>

                {/* Login Link */}
                <div className="card p-4 mt-4 text-center text-sm" style={{ color: "var(--color-gh-text)" }}>
                    已有账户？{" "}
                    <Link
                        href="/auth/signin"
                        className="hover:underline"
                        style={{ color: "var(--color-gh-accent)" }}
                    >
                        立即登录
                    </Link>
                </div>

                {/* Footer Links */}
                <div className="mt-6 text-center text-xs" style={{ color: "var(--color-gh-text-muted)" }}>
                    <Link href="/" className="hover:underline" style={{ color: "var(--color-gh-accent)" }}>
                        返回首页
                    </Link>
                </div>
            </div>
        </div>
    );
}
