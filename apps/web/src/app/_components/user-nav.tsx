"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useTeam } from "./team-context";
import { trpc } from "~/lib/trpc";
import { useState, useEffect } from "react";

export function UserNav() {
    const { data: session, status } = useSession();
    const { currentTeam } = useTeam();
    const isLoading = status === "loading";

    // 系统角色
    const [systemRoles, setSystemRoles] = useState<string[]>([]);
    // 当前团队角色
    const [teamRoleName, setTeamRoleName] = useState<string>("");

    // 获取系统角色
    useEffect(() => {
        if (session?.user?.id) {
            trpc.user.getById.query({ id: session.user.id })
                .then((user) => {
                    const roles = user.systemRoles?.map((r: { role: string }) => r.role) ?? [];
                    setSystemRoles(roles);
                })
                .catch(console.error);
        }
    }, [session]);

    // 获取当前团队中的角色
    useEffect(() => {
        if (session?.user?.id && currentTeam?.id) {
            trpc.team.getUserTeams.query({ userId: session.user.id })
                .then((teams) => {
                    const matched = teams.find((t: { id: string }) => t.id === currentTeam.id);
                    setTeamRoleName(matched?.teamRole ?? "");
                })
                .catch(console.error);
        } else {
            setTeamRoleName("");
        }
    }, [session, currentTeam]);

    if (isLoading) {
        return <div className="spinner" style={{ width: "20px", height: "20px" }}></div>;
    }

    if (session) {
        const systemRoleText = systemRoles.length > 0
            ? `系统身份: ${systemRoles.join(", ")}`
            : "系统身份: 无";

        return (
            <div className="flex items-center gap-3">
                {/* 用户名 - hover 显示系统身份 */}
                <span
                    className="text-sm cursor-default relative group"
                    style={{ color: "var(--color-gh-text-muted)" }}
                    title={systemRoleText}
                >
                    {session.user?.name ?? session.user?.email}
                    {/* Tooltip */}
                    <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 shadow-lg border"
                        style={{
                            backgroundColor: "var(--color-gh-canvas-subtle, #161b22)",
                            borderColor: "var(--color-gh-border, #30363d)",
                            color: "var(--color-gh-text, #c9d1d9)",
                        }}
                    >
                        {systemRoleText}
                    </span>
                </span>

                {/* 当前团队角色 */}
                {teamRoleName && (
                    <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
                        style={{
                            backgroundColor: "rgba(88, 166, 255, 0.1)",
                            borderColor: "rgba(88, 166, 255, 0.2)",
                            color: "#58a6ff",
                        }}
                    >
                        {teamRoleName}
                    </span>
                )}

                {/* 退出登录 */}
                <button
                    onClick={() => void signOut()}
                    className="btn btn-secondary"
                    style={{ padding: "4px 12px", fontSize: "12px" }}
                >
                    退出登录
                </button>
            </div>
        );
    }

    return (
        <>
            <Link href="/auth/signin" className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: "12px" }}>
                登录
            </Link>
            <Link href="/auth/register" className="btn btn-primary" style={{ padding: "4px 12px", fontSize: "12px" }}>
                注册
            </Link>
        </>
    );
}
