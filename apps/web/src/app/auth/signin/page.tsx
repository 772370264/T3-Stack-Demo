"use client";

import { signIn, getSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { trpc } from "~/lib/trpc";
import { useTeam } from "~/app/_components/team-context";

type Team = {
    id: string;
    name: string;
    teamRole: string;
    isAdmin: boolean;
};

function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") ?? "/";
    const error = searchParams.get("error");
    const { setCurrentTeam } = useTeam();

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(error ?? "");

    // 团队选择状态
    const [teams, setTeams] = useState<Team[]>([]);
    const [showTeamSelection, setShowTeamSelection] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage("");

        try {
            const result = await signIn("credentials", {
                identifier,
                password,
                redirect: false,
                callbackUrl,
            });

            if (result?.error) {
                setErrorMessage(result.error);
                setIsLoading(false);
            } else {
                // 登录成功，获取用户信息
                const session = await getSession();
                if (session?.user?.id) {
                    try {
                        // 先检查是否是 ADMIN
                        const userInfo = await trpc.user.getById.query({ id: session.user.id });
                        const isAdmin = userInfo.systemRoles?.some((r) => r.role === "ADMIN");

                        if (isAdmin) {
                            // ADMIN 使用固定的管理员团队，直接进入
                            const adminTeam = { id: "admin-team", name: "系统管理" };
                            localStorage.setItem(`currentTeam_${session.user.id}`, JSON.stringify(adminTeam));
                            router.push(callbackUrl);
                            return;
                        }

                        // USER 流程：获取团队列表
                        const userTeams = await trpc.team.getUserTeams.query({ userId: session.user.id });

                        if (userTeams.length === 0) {
                            router.push(callbackUrl);
                        } else if (userTeams.length === 1 && userTeams[0]) {
                            localStorage.setItem(`currentTeam_${session.user.id}`, JSON.stringify(userTeams[0]));
                            router.push(callbackUrl);
                        } else {
                            setTeams(userTeams);
                            setShowTeamSelection(true);
                            setIsLoading(false);
                        }
                    } catch (err) {
                        console.error("Failed to fetch user info", err);
                        router.push(callbackUrl);
                    }
                } else {
                    router.push(callbackUrl);
                }
            }
        } catch {
            setErrorMessage("登录失败，请重试");
            setIsLoading(false);
        }
    };

    const handleTeamSelect = (team: Team) => {
        setCurrentTeam(team);
        router.push(callbackUrl);
        router.refresh();
    };

    if (showTeamSelection) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--color-gh-bg)" }}>
                <div className="w-full max-w-sm">
                    <div className="text-center mb-6">
                        <svg className="mx-auto" height="48" viewBox="0 0 16 16" width="48" fill="#c9d1d9">
                            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                        </svg>
                        <h1 className="text-2xl font-light mt-4" style={{ color: "var(--color-gh-text)" }}>
                            选择团队
                        </h1>
                        <p className="text-sm mt-2" style={{ color: "var(--color-gh-text-muted)" }}>
                            请选择您要进入的团队工作空间
                        </p>
                    </div>

                    <div className="card divide-y" style={{ borderColor: "var(--color-gh-border)" }}>
                        {teams.map((team) => (
                            <button
                                key={team.id}
                                onClick={() => handleTeamSelect(team)}
                                className="w-full text-left p-4 hover:bg-white/5 transition-colors first:rounded-t-md last:rounded-b-md flex items-center justify-between"
                            >
                                <div>
                                    <div className="font-medium" style={{ color: "var(--color-gh-text)" }}>
                                        {team.name}
                                    </div>
                                    <div className="text-xs mt-0.5" style={{ color: "var(--color-gh-text-muted)" }}>
                                        角色: {team.teamRole}
                                    </div>
                                </div>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--color-gh-text-muted)">
                                    <path fillRule="evenodd" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
                                </svg>
                            </button>
                        ))}
                    </div>

                    <div className="mt-6 text-center text-xs" style={{ color: "var(--color-gh-text-muted)" }}>
                        <button onClick={() => {
                            router.push(callbackUrl);
                            router.refresh();
                        }} className="hover:underline" style={{ color: "var(--color-gh-accent)" }}>
                            跳过选择（直接进入）
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--color-gh-bg)" }}>
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-6">
                    <svg className="mx-auto" height="48" viewBox="0 0 16 16" width="48" fill="#c9d1d9">
                        <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                    </svg>
                    <h1 className="text-2xl font-light mt-4" style={{ color: "var(--color-gh-text)" }}>
                        登录到 T3 Demo
                    </h1>
                </div>

                {/* Login Form Card */}
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
                            <label htmlFor="identifier">用户名或邮箱</label>
                            <input
                                id="identifier"
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                autoComplete="username"
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="password" className="!mb-0">密码</label>
                                <Link
                                    href="/auth/forgot-password"
                                    className="text-sm hover:underline"
                                    style={{ color: "var(--color-gh-accent)" }}
                                >
                                    忘记密码？
                                </Link>
                            </div>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
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
                                    登录中...
                                </>
                            ) : (
                                "登录"
                            )}
                        </button>
                    </form>
                </div>

                {/* Register Link */}
                <div className="card p-4 mt-4 text-center text-sm" style={{ color: "var(--color-gh-text)" }}>
                    还没有账户？{" "}
                    <Link
                        href="/auth/register"
                        className="hover:underline"
                        style={{ color: "var(--color-gh-accent)" }}
                    >
                        创建账户
                    </Link>
                </div>

                {/* Footer Links */}
                <div className="mt-6 text-center text-xs" style={{ color: "var(--color-gh-text-muted)" }}>
                    <Link href="/" className="hover:underline" style={{ color: "var(--color-gh-accent)" }}>
                        返回首页
                    </Link>
                    <span className="mx-2">·</span>
                    <Link href="/admin/users" className="hover:underline" style={{ color: "var(--color-gh-accent)" }}>
                        用户管理
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--color-gh-bg)" }}>
                <div className="spinner"></div>
            </div>
        }>
            <SignInForm />
        </Suspense>
    );
}
