"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { trpc } from "~/lib/trpc";
import type { RouterOutputs } from "~/trpc/types";

// 类型推导
type RoleListItem = RouterOutputs["role"]["getAll"][number];
type MenuNode = RouterOutputs["menu"]["getAll"][number];

export default function RolesPage() {
    const { data: session, status: sessionStatus } = useSession();

    const [roles, setRoles] = useState<RoleListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // 模态框状态
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleListItem | null>(null);
    const [roleForm, setRoleForm] = useState({ name: "", code: "", isAdmin: false, teamId: "" });

    // 菜单权限状态
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [menuTargetRole, setMenuTargetRole] = useState<RoleListItem | null>(null);
    const [allMenus, setAllMenus] = useState<MenuNode[]>([]);
    const [selectedMenuIds, setSelectedMenuIds] = useState<Set<string>>(new Set());

    // 团队列表（用于创建角色时选择所属团队）
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);

    // 获取数据
    const fetchData = useCallback(async () => {
        if (!session?.user?.id) return;
        try {
            setLoading(true);
            const [rolesData, teamsData] = await Promise.all([
                trpc.role.getAll.query(),
                trpc.team.getAll.query({ userId: session.user.id }),
            ]);
            setRoles(rolesData);
            setTeams(teamsData.map((t) => ({ id: t.id, name: t.name })));
        } catch (err) {
            setError(err instanceof Error ? err.message : "获取数据失败");
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    // —— 角色 CRUD ——

    const openCreateModal = () => {
        setEditingRole(null);
        setRoleForm({ name: "", code: "", isAdmin: false, teamId: teams[0]?.id || "" });
        setShowRoleModal(true);
    };

    const openEditModal = (role: RoleListItem) => {
        setEditingRole(role);
        setRoleForm({ name: role.name, code: role.code, isAdmin: role.isAdmin, teamId: "" });
        setShowRoleModal(true);
    };

    const handleSaveRole = async () => {
        try {
            if (editingRole) {
                if (editingRole.type === "system") return;
                await trpc.role.update.mutate({
                    id: editingRole.id,
                    name: roleForm.name,
                    code: roleForm.code,
                    isAdmin: roleForm.isAdmin,
                });
            } else {
                if (!roleForm.teamId) { alert("请选择所属团队"); return; }
                await trpc.role.create.mutate({
                    teamId: roleForm.teamId,
                    name: roleForm.name,
                    code: roleForm.code,
                    isAdmin: roleForm.isAdmin,
                });
            }
            setShowRoleModal(false);
            void fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : "保存失败");
        }
    };

    const handleDeleteRole = async (role: RoleListItem) => {
        if (role.type === "system") return;
        if (!confirm(`确定要删除角色 "${role.name}" 吗？`)) return;
        try {
            await trpc.role.delete.mutate({ id: role.id });
            void fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : "删除失败");
        }
    };

    // —— 菜单权限配置 ——

    const openMenuModal = async (role: RoleListItem) => {
        setMenuTargetRole(role);
        try {
            const menus = await trpc.menu.getAll.query();
            setAllMenus(menus);

            let currentIds: string[] = [];
            if (role.type === "system" && role.id === "USER") {
                currentIds = await trpc.menu.getUserRoleMenuIds.query();
            } else if (role.type === "team") {
                currentIds = await trpc.role.getMenus.query({ roleId: role.id });
            }
            setSelectedMenuIds(new Set(currentIds));
            setShowMenuModal(true);
        } catch {
            alert("加载菜单数据失败");
        }
    };

    const toggleMenuId = (id: string) => {
        setSelectedMenuIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSaveMenus = async () => {
        if (!menuTargetRole) return;
        try {
            const menuIds = Array.from(selectedMenuIds);
            if (menuTargetRole.type === "system" && menuTargetRole.id === "USER") {
                await trpc.menu.updateUserRoleMenus.mutate({ menuIds });
            } else if (menuTargetRole.type === "team") {
                await trpc.role.updateMenus.mutate({ roleId: menuTargetRole.id, menuIds });
            }
            setShowMenuModal(false);
            alert("权限配置已更新");
        } catch {
            alert("保存失败");
        }
    };

    // 渲染菜单树 checkbox
    const renderMenuTree = (nodes: MenuNode[], depth = 0) => (
        <div style={{ paddingLeft: depth > 0 ? 20 : 0 }}>
            {nodes.map((node) => (
                <div key={node.id} style={{ padding: "4px 0" }}>
                    <label className="flex items-center gap-2" style={{ cursor: "pointer", color: "var(--color-gh-text)" }}>
                        <input
                            type="checkbox"
                            checked={selectedMenuIds.has(node.id)}
                            onChange={() => toggleMenuId(node.id)}
                            style={{ accentColor: "var(--color-gh-accent)" }}
                        />
                        <span>{node.name}</span>
                        <span className="text-xs" style={{ color: "var(--color-gh-text-muted)" }}>({node.path})</span>
                    </label>
                    {node.children && node.children.length > 0 && renderMenuTree(node.children, depth + 1)}
                </div>
            ))}
        </div>
    );

    // —— 加载 / 未登录状态 ——

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

    // —— 主页面 ——

    return (
        <div>
            {/* Title */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: "var(--color-gh-text)" }}>角色管理</h1>
                    <p className="text-sm mt-1" style={{ color: "var(--color-gh-text-muted)" }}>
                        管理系统角色和团队角色及其菜单权限
                    </p>
                </div>
                <button onClick={openCreateModal} className="btn btn-primary">新建团队角色</button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 rounded-md text-sm" style={{
                    backgroundColor: "rgba(218, 54, 51, 0.1)",
                    border: "1px solid var(--color-gh-danger)",
                    color: "var(--color-gh-danger-emphasis)",
                }}>
                    {error}
                    <button onClick={() => setError("")} className="float-right" style={{ color: "var(--color-gh-danger-emphasis)" }}>×</button>
                </div>
            )}

            {/* Role Table */}
            <div className="card">
                {loading ? (
                    <div className="p-8 text-center"><div className="spinner mx-auto"></div></div>
                ) : roles.length === 0 ? (
                    <div className="p-8 text-center" style={{ color: "var(--color-gh-text-muted)" }}>
                        <p>暂无角色数据</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--color-gh-border)" }}>
                                <th className="text-left p-3 text-sm font-medium" style={{ color: "var(--color-gh-text)" }}>角色名称</th>
                                <th className="text-left p-3 text-sm font-medium" style={{ color: "var(--color-gh-text)" }}>编码</th>
                                <th className="text-left p-3 text-sm font-medium" style={{ color: "var(--color-gh-text)" }}>类型</th>
                                <th className="text-left p-3 text-sm font-medium" style={{ color: "var(--color-gh-text)" }}>所属团队</th>
                                <th className="text-left p-3 text-sm font-medium" style={{ color: "var(--color-gh-text)" }}>管理员</th>
                                <th className="text-left p-3 text-sm font-medium" style={{ color: "var(--color-gh-text)" }}>成员数</th>
                                <th className="text-right p-3 text-sm font-medium" style={{ color: "var(--color-gh-text)" }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map((role) => (
                                <tr key={`${role.type}-${role.id}`} style={{ borderBottom: "1px solid var(--color-gh-border)" }} className="hover:bg-white/5">
                                    <td className="p-3 font-medium" style={{ color: "var(--color-gh-text)" }}>{role.name}</td>
                                    <td className="p-3">
                                        <code className="text-xs px-1.5 py-0.5 rounded" style={{
                                            backgroundColor: "var(--color-gh-bg)",
                                            color: "var(--color-gh-text-muted)",
                                            border: "1px solid var(--color-gh-border)",
                                        }}>{role.code}</code>
                                    </td>
                                    <td className="p-3">
                                        {role.type === "system" ? (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                                                backgroundColor: "rgba(163, 113, 247, 0.15)",
                                                color: "#a371f7",
                                            }}>系统级</span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                                                backgroundColor: "rgba(88, 166, 255, 0.15)",
                                                color: "#58a6ff",
                                            }}>团队级</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm" style={{ color: "var(--color-gh-text-muted)" }}>{role.teamName || "—"}</td>
                                    <td className="p-3">
                                        {role.isAdmin ? (
                                            <span className="badge badge-success">是</span>
                                        ) : (
                                            <span className="badge badge-danger">否</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm" style={{ color: "var(--color-gh-text-muted)" }}>{role.memberCount}</td>
                                    <td className="p-3 text-right">
                                        {role.type === "system" && role.id === "ADMIN" ? (
                                            <span className="text-xs" style={{ color: "var(--color-gh-text-muted)" }}>不可编辑</span>
                                        ) : (
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openMenuModal(role)} className="text-xs" style={{ color: "var(--color-gh-accent)" }}>
                                                    配置路由
                                                </button>
                                                {role.type === "team" && (
                                                    <>
                                                        <span style={{ color: "var(--color-gh-border)" }}>|</span>
                                                        <button onClick={() => openEditModal(role)} className="text-xs" style={{ color: "var(--color-gh-text-muted)" }}>
                                                            编辑
                                                        </button>
                                                        <span style={{ color: "var(--color-gh-border)" }}>|</span>
                                                        <button onClick={() => handleDeleteRole(role)} className="text-xs" style={{ color: "var(--color-gh-danger)" }}>
                                                            删除
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create / Edit Role Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                    <div className="card p-6 w-full max-w-md shadow-2xl" style={{ backgroundColor: "var(--color-gh-canvas)" }}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: "var(--color-gh-text)" }}>
                            {editingRole ? "编辑角色" : "新建团队角色"}
                        </h3>
                        <div className="space-y-4">
                            {/* 所属团队（仅创建时显示） */}
                            {!editingRole && (
                                <div>
                                    <label className="block text-xs mb-1" style={{ color: "var(--color-gh-text-muted)" }}>所属团队</label>
                                    <select
                                        className="w-full rounded-md px-3 py-2 text-sm"
                                        style={{
                                            backgroundColor: "var(--color-gh-bg)",
                                            border: "1px solid var(--color-gh-border)",
                                            color: "var(--color-gh-text)",
                                        }}
                                        value={roleForm.teamId}
                                        onChange={(e) => setRoleForm({ ...roleForm, teamId: e.target.value })}
                                    >
                                        <option value="">请选择团队...</option>
                                        {teams.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* 角色名称 */}
                            <div>
                                <label className="block text-xs mb-1" style={{ color: "var(--color-gh-text-muted)" }}>角色名称</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md px-3 py-2 text-sm"
                                    style={{
                                        backgroundColor: "var(--color-gh-bg)",
                                        border: "1px solid var(--color-gh-border)",
                                        color: "var(--color-gh-text)",
                                    }}
                                    value={roleForm.name}
                                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                                    placeholder="例如：开发人员"
                                />
                            </div>

                            {/* 角色编码 */}
                            <div>
                                <label className="block text-xs mb-1" style={{ color: "var(--color-gh-text-muted)" }}>角色编码</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md px-3 py-2 text-sm font-mono"
                                    style={{
                                        backgroundColor: "var(--color-gh-bg)",
                                        border: "1px solid var(--color-gh-border)",
                                        color: "var(--color-gh-text)",
                                    }}
                                    value={roleForm.code}
                                    onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })}
                                    placeholder="例如：dev"
                                />
                                <p className="text-xs mt-1" style={{ color: "var(--color-gh-text-muted)" }}>
                                    同一团队内编码必须唯一
                                </p>
                            </div>

                            {/* 管理员 */}
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isAdmin"
                                    checked={roleForm.isAdmin}
                                    onChange={(e) => setRoleForm({ ...roleForm, isAdmin: e.target.checked })}
                                    style={{ accentColor: "var(--color-gh-accent)" }}
                                />
                                <label htmlFor="isAdmin" className="text-sm" style={{ color: "var(--color-gh-text)", cursor: "pointer" }}>
                                    设为管理员（拥有管理成员权限）
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowRoleModal(false)} className="btn">取消</button>
                            <button onClick={handleSaveRole} className="btn btn-primary">保存</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Menu Permission Modal */}
            {showMenuModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                    <div className="card p-6 w-full max-w-2xl shadow-2xl flex flex-col" style={{ backgroundColor: "var(--color-gh-canvas)", maxHeight: "85vh" }}>
                        <h3 className="text-lg font-bold mb-2" style={{ color: "var(--color-gh-text)" }}>配置菜单权限</h3>
                        <p className="text-sm mb-4" style={{ color: "var(--color-gh-text-muted)" }}>
                            正在配置角色:&nbsp;
                            <span style={{ color: "var(--color-gh-accent)" }}>{menuTargetRole?.name}</span>
                            &nbsp;(<code className="text-xs">{menuTargetRole?.code}</code>)
                        </p>

                        <div className="flex-1 overflow-y-auto rounded-md p-4" style={{
                            backgroundColor: "var(--color-gh-bg)",
                            border: "1px solid var(--color-gh-border)",
                        }}>
                            {renderMenuTree(allMenus)}
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-4" style={{ borderTop: "1px solid var(--color-gh-border)" }}>
                            <span className="text-xs" style={{ color: "var(--color-gh-text-muted)" }}>已选 {selectedMenuIds.size} 项</span>
                            <div className="flex gap-3">
                                <button onClick={() => setShowMenuModal(false)} className="btn">取消</button>
                                <button onClick={handleSaveMenus} className="btn btn-primary">保存配置</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
