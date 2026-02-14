"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { trpc } from "~/lib/trpc";
import type { RouterOutputs } from "~/trpc/types";

// 用户类型 - 使用 tRPC 辅助函数进行类型推导
type User = RouterOutputs["user"]["getAll"][number];

// 系统角色（ADMIN 仅通过 Seed/DB 分配，不提供 UI 修改）
const SYSTEM_ROLES = [
    { value: "ADMIN", label: "管理员", color: "#f0883e" },
    { value: "USER", label: "普通用户", color: "#58a6ff" },
] as const;

export default function UsersPage() {
    const { data: session, status: sessionStatus } = useSession();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // 获取用户列表
    const fetchUsers = useCallback(async () => {
        if (!session) return;
        try {
            setLoading(true);
            const data = await trpc.user.getAll.query();
            setUsers(data as User[]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "获取用户列表失败");
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        if (session) {
            void fetchUsers();
        }
    }, [session, fetchUsers]);

    const [searchQuery, setSearchQuery] = useState("");

    // 过滤用户
    const filteredUsers = useMemo(() => {
        return users.filter((user: User) => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase();
            return (
                (user.name?.toLowerCase().includes(query) || false) ||
                (user.email?.toLowerCase().includes(query) || false)
            );
        });
    }, [users, searchQuery]);

    // 获取角色标签
    const getRoleBadges = (roles: { role: string }[]) => {
        if (!roles || roles.length === 0) {
            return <span className="badge">无角色</span>;
        }
        return roles.map((r) => {
            const roleInfo = SYSTEM_ROLES.find((sr) => sr.value === r.role);
            return (
                <span
                    key={r.role}
                    className="px-2 py-1 rounded-full text-xs font-medium mr-1"
                    style={{
                        backgroundColor: `${roleInfo?.color ?? "#8b949e"}20`,
                        color: roleInfo?.color ?? "#8b949e",
                    }}
                >
                    {roleInfo?.label ?? r.role}
                </span>
            );
        });
    };

    if (sessionStatus === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--color-gh-bg)" }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--color-gh-bg)" }}>
                <div className="text-center">
                    <p style={{ color: "var(--color-gh-text-muted)" }}>请先登录</p>
                    <Link href="/auth/signin" className="btn btn-primary mt-4">登录</Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Title */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: "var(--color-gh-text)" }}>用户管理</h1>
                    <p className="text-sm mt-1" style={{ color: "var(--color-gh-text-muted)" }}>
                        管理系统用户和系统角色
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="输入名称或邮箱搜索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="px-3 py-2 rounded-md text-sm pl-8"
                            style={{
                                backgroundColor: "var(--color-gh-bg)",
                                border: "1px solid var(--color-gh-border)",
                                color: "var(--color-gh-text)",
                                width: "220px",
                            }}
                        />
                        <svg
                            className="absolute left-2.5 top-1/2 -translate-y-1/2"
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="var(--color-gh-text-muted)"
                        >
                        </svg>
                    </div>
                    {searchQuery && (
                        <span className="text-xs" style={{ color: "var(--color-gh-text-muted)" }}>
                            匹配 {filteredUsers.length} 条
                        </span>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 rounded-md text-sm" style={{
                    backgroundColor: "rgba(218, 54, 51, 0.1)",
                    border: "1px solid var(--color-gh-danger)",
                    color: "var(--color-gh-danger-emphasis)"
                }}>
                    {error}
                    <button onClick={() => setError("")} className="float-right" style={{ color: "var(--color-gh-danger-emphasis)" }}>×</button>
                </div>
            )}

            {/* Users List */}
            <div className="card">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="spinner mx-auto"></div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center" style={{ color: "var(--color-gh-text-muted)" }}>
                        <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" className="mx-auto mb-4 opacity-50">
                            <path d="M5.5 3.5a2 2 0 100 4 2 2 0 000-4zM2 5.5a3.5 3.5 0 115.898 2.549 5.508 5.508 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.49 3.49 0 012 5.5z"></path>
                        </svg>
                        <p>{searchQuery ? "没有找到匹配的用户" : "暂无用户"}</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--color-gh-border)" }}>
                                <th className="text-left p-3 text-sm font-medium" style={{ color: "var(--color-gh-text)" }}>用户</th>
                                <th className="text-left p-3 text-sm font-medium" style={{ color: "var(--color-gh-text)" }}>系统角色</th>
                                <th className="text-left p-3 text-sm font-medium" style={{ color: "var(--color-gh-text)" }}>状态</th>
                                <th className="text-left p-3 text-sm font-medium" style={{ color: "var(--color-gh-text)" }}>注册时间</th>
                                <th className="text-right p-3 text-sm font-medium" style={{ color: "var(--color-gh-text)" }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id} style={{ borderBottom: "1px solid var(--color-gh-border)" }} className="hover:bg-white/5">
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                                                style={{ backgroundColor: "var(--color-gh-accent)", color: "white" }}>
                                                {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                                            </div>
                                            <div>
                                                <div className="font-medium" style={{ color: "var(--color-gh-text)" }}>
                                                    {user.name ?? "未设置"}
                                                </div>
                                                <div className="text-sm" style={{ color: "var(--color-gh-text-muted)" }}>
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        {getRoleBadges(user.systemRoles)}
                                    </td>
                                    <td className="p-3">
                                        <span className={`badge ${user.status === "active" ? "badge-success" : "badge-warning"}`}>
                                            {user.status === "active" ? "正常" : user.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-sm" style={{ color: "var(--color-gh-text-muted)" }}>
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-3 text-right">
                                        <span className="text-xs" style={{ color: "var(--color-gh-text-muted)" }}>
                                            系统角色仅通过管理员分配
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Role Legend */}
            <div className="mt-6 card p-4">
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-gh-text)" }}>角色说明</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SYSTEM_ROLES.map((role) => (
                        <div key={role.value} className="flex items-center gap-2">
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: role.color }}
                            ></span>
                            <span className="text-sm font-medium" style={{ color: "var(--color-gh-text)" }}>
                                {role.label}
                            </span>
                            <span className="text-xs" style={{ color: "var(--color-gh-text-muted)" }}>
                                {role.value === "ADMIN" && "- 可管理用户和团队（仅通过 Seed 分配）"}
                                {role.value === "USER" && "- 基础功能权限"}
                            </span>
                        </div>
                    ))}
                </div>
            </div>


        </div>
    );
}
