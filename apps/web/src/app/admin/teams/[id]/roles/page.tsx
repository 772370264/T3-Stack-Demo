"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/lib/trpc";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Role = {
    id: string;
    name: string;
    isAdmin: boolean;
    _count: { members: number };
};

type MenuNode = {
    id: string;
    name: string;
    children?: MenuNode[];
};

export default function TeamRolesPage() {
    const params = useParams();
    const router = useRouter();
    const teamId = params.id as string;
    const { data: session } = useSession();

    const [team, setTeam] = useState<{ id: string; name: string } | null>(null);
    const [roles, setRoles] = useState<Role[]>([]);
    const [menus, setMenus] = useState<MenuNode[]>([]);

    // UI State
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [roleMenuIds, setRoleMenuIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingMenus, setSavingMenus] = useState(false);

    // Create/Edit Role State
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null); // null = create
    const [roleFormName, setRoleFormName] = useState("");
    const [isSubmittingRole, setIsSubmittingRole] = useState(false);

    // Initial Data Fetch
    useEffect(() => {
        if (session && teamId) {
            Promise.all([
                trpc.team.getById.query({ id: teamId }),
                trpc.role.getByTeam.query({ teamId }),
                trpc.menu.getAll.query(),
            ])
                .then(([teamData, rolesData, menusData]) => {
                    setTeam(teamData);
                    setRoles(rolesData);
                    setMenus(menusData as MenuNode[]);
                    setLoading(false);
                })
                .catch((err) => {
                    console.error("Failed to load data", err);
                    router.push("/admin/teams");
                });
        }
    }, [session, teamId, router]);

    // Fetch Role Menus when role selected
    useEffect(() => {
        if (selectedRoleId) {
            trpc.role.getMenus.query({ roleId: selectedRoleId })
                .then(setRoleMenuIds)
                .catch(console.error);
        } else {
            setRoleMenuIds([]);
        }
    }, [selectedRoleId]);

    // Role CRUD
    const handleCreateRole = () => {
        setEditingRole(null);
        setRoleFormName("");
        setIsRoleModalOpen(true);
    };

    const handleEditRole = (role: Role) => {
        setEditingRole(role);
        setRoleFormName(role.name);
        setIsRoleModalOpen(true);
    };

    const handleDeleteRole = async (role: Role) => {
        if (!confirm(`确定要删除角色 "${role.name}" 吗？`)) return;
        try {
            await trpc.role.delete.mutate({ id: role.id });
            setRoles((prev) => prev.filter((r) => r.id !== role.id));
            if (selectedRoleId === role.id) setSelectedRoleId(null);
        } catch (err: any) {
            alert(err.message || "删除失败");
        }
    };

    const handleRoleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingRole(true);
        try {
            if (editingRole) {
                await trpc.role.update.mutate({ id: editingRole.id, name: roleFormName });
                setRoles((prev) => prev.map(r => r.id === editingRole.id ? { ...r, name: roleFormName } : r));
            } else {
                const newRole = await trpc.role.create.mutate({ teamId, name: roleFormName });
                setRoles((prev) => [...prev, { ...newRole, _count: { members: 0 } }]);
            }
            setIsRoleModalOpen(false);
        } catch (err: any) {
            alert(err.message || "操作失败");
        } finally {
            setIsSubmittingRole(false);
        }
    };

    // Menu Permissions
    const handleMenuToggle = (menuId: string) => {
        setRoleMenuIds((prev) =>
            prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]
        );
    };

    const handleSaveMenus = async () => {
        if (!selectedRoleId) return;
        setSavingMenus(true);
        try {
            await trpc.role.updateMenus.mutate({
                roleId: selectedRoleId,
                menuIds: roleMenuIds,
            });
            alert("权限保存成功");
        } catch (err) {
            console.error(err);
            alert("保存失败");
        } finally {
            setSavingMenus(false);
        }
    };

    const renderMenuTree = (nodes: MenuNode[]) => {
        return nodes.map((node) => (
            <div key={node.id} className="ml-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={roleMenuIds.includes(node.id)}
                        onChange={() => handleMenuToggle(node.id)}
                        disabled={!selectedRoleId}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600"
                    />
                    <span className={!selectedRoleId ? "text-gray-500" : "text-gray-200"}>
                        {node.name}
                    </span>
                </label>
                {node.children && node.children.length > 0 && (
                    <div className="border-l border-gray-700 ml-2">
                        {renderMenuTree(node.children)}
                    </div>
                )}
            </div>
        ));
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-[#0d1117]"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="flex items-center gap-2 mb-6">
                <Link href="/admin/teams" className="text-[#58a6ff] hover:underline text-sm">Teams</Link>
                <span className="text-[#8b949e]">/</span>
                <span className="text-[#c9d1d9] font-semibold">{team?.name}</span>
                <span className="text-[#8b949e]">/</span>
                <span className="text-[#c9d1d9]">角色管理</span>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Roles List */}
                <div className="col-span-4 card p-0 overflow-hidden">
                    <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#161b22]">
                        <h3 className="font-semibold text-[#c9d1d9]">团队角色</h3>
                        <button
                            onClick={handleCreateRole}
                            className="btn btn-primary text-xs px-2 py-1"
                        >
                            新增角色
                        </button>
                    </div>
                    <div className="divide-y divide-[#30363d]">
                        {roles.map((role) => (
                            <div
                                key={role.id}
                                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-[#161b22] transition-colors ${selectedRoleId === role.id ? "bg-[#161b22] border-l-2 border-[#58a6ff]" : ""}`}
                                onClick={() => setSelectedRoleId(role.id)}
                            >
                                <div>
                                    <div className="font-medium text-[#c9d1d9] flex items-center gap-2">
                                        {role.name}
                                        {role.isAdmin && (
                                            <span className="text-xs bg-[#f0883e] text-white px-1.5 rounded">Admin</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-[#8b949e] mt-1">
                                        {role._count.members} 成员
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEditRole(role); }}
                                        className="text-[#8b949e] hover:text-[#58a6ff]"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.928a.75.75 0 01-.927-.927l.928-3.251a1.75 1.75 0 01.445-.756l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064l6.286-6.286z"></path></svg>
                                    </button>
                                    {!role.isAdmin && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                                            className="text-[#8b949e] hover:text-[#da3633]"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675A.75.75 0 015 6h6a.75.75 0 01.5.75v5.5a.75.75 0 01-.75.75h-5a.75.75 0 01-.75-.75v-5.5zm1.5 1.5a.25.25 0 00-.25.25v2.5c0 .138.112.25.25.25h3.5a.25.25 0 00.25-.25v-2.5a.25.25 0 00-.25-.25h-3.5z"></path></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Permissions Config */}
                <div className="col-span-8 card p-6">
                    {selectedRoleId ? (
                        <>
                            <div className="flex items-center justify-between mb-6 border-b border-[#30363d] pb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-[#c9d1d9]">
                                        权限配置 - {roles.find(r => r.id === selectedRoleId)?.name}
                                    </h3>
                                    <p className="text-sm text-[#8b949e] mt-1">
                                        勾选该角色可以看到的菜单。
                                    </p>
                                </div>
                                <button
                                    onClick={handleSaveMenus}
                                    disabled={savingMenus}
                                    className="btn btn-primary"
                                >
                                    {savingMenus ? "保存中..." : "保存权限"}
                                </button>
                            </div>

                            <div className="space-y-2">
                                {renderMenuTree(menus)}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center text-[#8b949e]">
                            请从左侧选择一个角色配置权限
                        </div>
                    )}
                </div>
            </div>
        </main>

            {/* Create/Edit Modal */ }
    {
        isRoleModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="card w-full max-w-md p-6 bg-[#0d1117]">
                    <h2 className="text-xl font-bold mb-4 text-[#c9d1d9]">
                        {editingRole ? "编辑角色" : "新增角色"}
                    </h2>
                    <form onSubmit={handleRoleSubmit}>
                        <div className="form-group mb-4">
                            <label className="block text-sm font-medium text-[#c9d1d9] mb-1">角色名称</label>
                            <input
                                type="text"
                                value={roleFormName}
                                onChange={(e) => setRoleFormName(e.target.value)}
                                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] focus:border-[#58a6ff] outline-none"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsRoleModalOpen(false)}
                                className="btn btn-secondary"
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingRole}
                                className="btn btn-primary"
                            >
                                {isSubmittingRole ? "提交中..." : "确定"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }
        </div >
    );
}
