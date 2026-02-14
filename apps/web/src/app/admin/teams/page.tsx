"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { trpc } from "~/lib/trpc";
import type { RouterOutputs } from "~/trpc/types";

// 类型定义
type User = RouterOutputs["user"]["getAll"][number];
type AllTeams = RouterOutputs["team"]["getAll"];
type Team = AllTeams[number];
type TeamDetail = RouterOutputs["team"]["getById"];
type TeamMember = NonNullable<TeamDetail>["members"][number];

// 团队角色
// 获取角色颜色
const getRoleColor = (isAdmin: boolean) => {
    return isAdmin ? "#da3633" : "#58a6ff";
};

export default function TeamsPage() {
    const { data: session, status: sessionStatus } = useSession();

    const [teams, setTeams] = useState<AllTeams>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // 权限状态
    const [isSystemAdminUser, setIsSystemAdminUser] = useState(false);
    const [adminTeamIds, setAdminTeamIds] = useState<Set<string>>(new Set());

    // 获取所有团队和用户
    const fetchData = useCallback(async () => {
        if (!session?.user?.id) return;
        try {
            setLoading(true);
            const [teamsData, usersData, userInfo] = await Promise.all([
                trpc.team.getAll.query({ userId: session.user.id }),
                trpc.user.getAll.query(),
                trpc.user.getById.query({ id: session.user.id }),
            ]);
            setTeams(teamsData);
            setAllUsers(usersData as User[]);

            // 检查系统管理员身份
            const isSysAdmin = userInfo.systemRoles?.some((r: { role: string }) => r.role === "ADMIN") ?? false;
            setIsSystemAdminUser(isSysAdmin);

            // 获取用户在各团队的管理员状态
            const userTeams = await trpc.team.getUserTeams.query({ userId: session.user.id });
            const directAdminIds = userTeams.filter((t: { isAdmin: boolean }) => t.isAdmin).map((t: { id: string }) => t.id);

            // 将管理员权限传播到所有子团队
            const adminIds = new Set(directAdminIds);
            function addChildIds(parentIds: string[]) {
                const childIds = teamsData.filter(t => t.parentId && parentIds.includes(t.parentId)).map(t => t.id).filter(id => !adminIds.has(id));
                for (const id of childIds) adminIds.add(id);
                if (childIds.length > 0) addChildIds(childIds);
            }
            addChildIds(directAdminIds);
            setAdminTeamIds(adminIds);

            // 默认选中根团队或第一个团队
            if (teamsData.length > 0 && !selectedTeamId) {
                const rootTeam = teamsData.find(t => !t.parentId) || teamsData[0];
                if (rootTeam) {
                    setSelectedTeamId(rootTeam.id);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "获取数据失败");
        } finally {
            setLoading(false);
        }
    }, [session, selectedTeamId]);

    // 获取选中团队的详情
    const fetchTeamDetail = useCallback(async (id: string) => {
        try {
            setDetailLoading(true);
            const data = await trpc.team.getById.query({ id });
            setSelectedTeam(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "获取详情失败");
        } finally {
            setDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session) {
            void fetchData();
        }
    }, [session, fetchData]);

    useEffect(() => {
        if (selectedTeamId) {
            void fetchTeamDetail(selectedTeamId);
        }
    }, [selectedTeamId, fetchTeamDetail]);

    // 团队模态框状态
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [teamFormData, setTeamFormData] = useState({ name: "", description: "", parentId: "" });

    // 成员模态框状态
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [selectedMemberRole, setSelectedMemberRole] = useState("");
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [editMemberRole, setEditMemberRole] = useState("");

    // 提交团队表单
    const handleTeamSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            if (editingTeam) {
                await trpc.team.update.mutate({
                    id: editingTeam.id,
                    name: teamFormData.name,
                    description: teamFormData.description || undefined,
                    parentId: teamFormData.parentId || undefined,
                });
            } else {
                await trpc.team.create.mutate({
                    name: teamFormData.name,
                    description: teamFormData.description || undefined,
                    parentId: teamFormData.parentId || undefined,
                    operatorId: session?.user?.id ?? "",
                });
            }
            setShowTeamModal(false);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "操作失败");
        } finally {
            setSubmitting(false);
        }
    };

    // 删除团队
    const handleTeamDelete = async (team: Team) => {
        if (!confirm(`确定要删除团队 "${team.name}" 吗？`)) return;
        try {
            await trpc.team.delete.mutate({ id: team.id });
            if (selectedTeamId === team.id) setSelectedTeamId(null);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "删除失败");
        }
    };

    // 添加成员
    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeamId || !selectedUserId || !selectedMemberRole) return;
        setSubmitting(true);
        setError("");
        try {
            await trpc.team.addMember.mutate({
                teamId: selectedTeamId,
                userId: selectedUserId,
                teamRoleId: selectedMemberRole,
                operatorId: session?.user?.id ?? "",
            });
            setShowAddMemberModal(false);
            setSelectedUserId("");
            setSelectedMemberRole("");
            await fetchTeamDetail(selectedTeamId);
        } catch (err) {
            setError(err instanceof Error ? err.message : "添加成员失败");
        } finally {
            setSubmitting(false);
        }
    };

    // 更新成员角色
    const handleUpdateMemberRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeamId || !editingMember || !editMemberRole) return;
        setSubmitting(true);
        setError("");
        try {
            await trpc.team.updateMemberRole.mutate({
                teamId: selectedTeamId,
                userId: editingMember.userId,
                teamRoleId: editMemberRole,
                operatorId: session?.user?.id ?? "",
            });
            setEditingMember(null);
            await fetchTeamDetail(selectedTeamId);
        } catch (err) {
            setError(err instanceof Error ? err.message : "更新角色失败");
        } finally {
            setSubmitting(false);
        }
    };

    // 移除成员
    const handleRemoveMember = async (member: TeamMember) => {
        if (!selectedTeamId || !confirm(`确定要移除成员 "${member.user.name ?? member.user.email}" 吗？`)) return;
        try {
            await trpc.team.removeMember.mutate({
                teamId: selectedTeamId,
                userId: member.userId,
                operatorId: session?.user?.id ?? "",
            });
            await fetchTeamDetail(selectedTeamId);
        } catch (err) {
            setError(err instanceof Error ? err.message : "移除成员失败");
        }
    };

    // 计算可见的团队 ID 集合（用于判断父节点是否存在于列表中）
    const visibleTeamIds = useMemo(() => new Set(teams.map(t => t.id)), [teams]);

    // 计算根团队：parentId 为 null 或 parentId 不在可见列表中的团队
    const rootTeams = useMemo(() => teams.filter(t => !t.parentId || !visibleTeamIds.has(t.parentId)), [teams, visibleTeamIds]);

    // 构建树形结构组件
    const TeamNode = ({ parentTeams, depth = 0 }: { parentTeams: Team[], depth?: number }) => {
        if (parentTeams.length === 0) return null;

        return (
            <div className={depth > 0 ? "ml-4 pl-2 border-l border-gray-700 mt-1" : "space-y-1"}>
                {parentTeams.map(t => {
                    const childTeams = teams.filter(c => c.parentId === t.id);
                    return (
                        <div key={t.id}>
                            <div
                                onClick={() => setSelectedTeamId(t.id)}
                                className={`flex items-center justify-between group px-3 py-2 rounded-md cursor-pointer transition-colors ${selectedTeamId === t.id ? "bg-blue-600/20 text-blue-400" : "hover:bg-white/5 text-gray-300"
                                    }`}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 opacity-70">
                                        <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Z"></path>
                                    </svg>
                                    <span className="truncate text-sm font-medium">{t.name}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {t.id !== "admin-team" && (isSystemAdminUser || adminTeamIds.has(t.id)) && (
                                        <button onClick={(e) => { e.stopPropagation(); setEditingTeam(t); setTeamFormData({ name: t.name, description: t.description ?? "", parentId: t.parentId ?? "" }); setShowTeamModal(true); }} className="p-1 hover:text-white" title="编辑团队">
                                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M11.013 1.427a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 0 1 0 1.06l-1.5 1.5-3.56-3.56 1.5-1.5Zm-2.03 2.03L2.5 9.941v3.559h3.559l6.471-6.47-3.546-3.547Z"></path></svg>
                                        </button>
                                    )}
                                    {(isSystemAdminUser || adminTeamIds.has(t.id)) && (
                                        <button onClick={(e) => { e.stopPropagation(); setTeamFormData({ name: "", description: "", parentId: t.id }); setShowTeamModal(true); }} className="p-1 hover:text-white" title="添加子团队">
                                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z"></path></svg>
                                        </button>
                                    )}
                                    {t.id !== "admin-team" && (isSystemAdminUser || adminTeamIds.has(t.id)) && (
                                        <button onClick={(e) => { e.stopPropagation(); handleTeamDelete(t); }} className="p-1 hover:text-red-400" title="删除团队">
                                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675a.75.75 0 1 0-1.492.15l.66 6.6A1.75 1.75 0 0 0 5.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 0 0-1.492-.149l-.66 6.601a.25.25 0 0 1-.248.225h-5.19a.25.25 0 0 1-.248-.225l-.66-6.601Z"></path></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                            {childTeams.length > 0 && <TeamNode parentTeams={childTeams} depth={depth + 1} />}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (sessionStatus === "loading") return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="spinner"></div></div>;
    if (!session) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><Link href="/auth/signin" className="btn btn-primary">请先登录</Link></div>;

    return (
        <div className="flex flex-1 overflow-hidden text-gray-200">
            {/* Sidebar Tree View */}
            <aside className="w-64 border-r border-gray-800 flex flex-col shrink-0">
                <div className="p-4 flex items-center justify-between">
                    <span className="font-bold text-sm tracking-wide uppercase opacity-60">团队列表</span>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-4">
                    {loading ? <div className="p-4 opacity-50 text-xs">加载中...</div> : <TeamNode parentTeams={rootTeams} />}
                </div>
            </aside>

            {/* Right Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden bg-gray-900/50">
                {selectedTeamId ? (
                    detailLoading ? (
                        <div className="flex-1 flex items-center justify-center"><div className="spinner"></div></div>
                    ) : selectedTeam ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Team Info Header */}
                            <div className="p-6 border-b border-gray-800 shrink-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                                            {selectedTeam.name}
                                            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Team</span>
                                        </h1>
                                        <p className="text-sm text-gray-400">{selectedTeam.description || "暂无团队描述"}</p>
                                    </div>
                                    {(isSystemAdminUser || adminTeamIds.has(selectedTeamId!)) && (
                                        <button onClick={() => setShowAddMemberModal(true)} className="btn btn-primary btn-sm flex items-center gap-1">
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z"></path></svg>
                                            添加成员
                                        </button>
                                    )}
                                </div>
                                {error && <div className="mt-4 p-2 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded">{error}</div>}
                            </div>

                            {/* Members List */}
                            <div className="flex-1 overflow-y-auto p-6 pt-0">
                                {!selectedTeam.members || selectedTeam.members.length === 0 ? (
                                    <div className="mt-8 text-center opacity-50 py-12 bg-white/5 rounded-lg border border-dashed border-gray-700">
                                        <p className="text-sm mb-4">该团队还未添加成员</p>
                                        {(isSystemAdminUser || adminTeamIds.has(selectedTeamId!)) && (
                                            <button onClick={() => setShowAddMemberModal(true)} className="btn btn-secondary btn-sm">立即添加</button>
                                        )}
                                    </div>
                                ) : (
                                    <table className="w-full mt-6">
                                        <thead className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-800">
                                            <tr>
                                                <th className="text-left py-3 font-medium">成员信息</th>
                                                <th className="text-left py-3 font-medium">团队角色</th>
                                                <th className="text-left py-3 font-medium">加入时间</th>
                                                <th className="text-right py-3 font-medium">管理操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {selectedTeam.members.map((member: TeamMember) => {
                                                const roleName = member.teamRole?.name || "Unknown";
                                                const roleColor = getRoleColor(member.teamRole?.isAdmin || false);
                                                return (
                                                    <tr key={member.id} className="group hover:bg-white/5 transition-colors">
                                                        <td className="py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                                                                    {member.user.name?.charAt(0).toUpperCase() || "U"}
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-200">{member.user.name || "未设置姓名"}</div>
                                                                    <div className="text-xs text-gray-500">{member.user.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4">
                                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm" style={{ backgroundColor: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}30` }}>
                                                                {roleName}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 text-xs text-gray-500">
                                                            {new Date(member.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="py-4 text-right">
                                                            {(isSystemAdminUser || adminTeamIds.has(selectedTeamId!)) && (
                                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {/* 管理员角色的成员不显示修改按钮 */}
                                                                    {!member.teamRole?.isAdmin && (
                                                                        <button onClick={() => { setEditingMember(member); setEditMemberRole(member.teamRole.id); }} className="px-2 py-1 text-[10px] bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">修改</button>
                                                                    )}
                                                                    <button onClick={() => handleRemoveMember(member)} className="px-2 py-1 text-[10px] bg-red-900/20 text-red-400 hover:bg-red-900/30 rounded border border-red-900/30">移除</button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    ) : <div className="flex-1 flex items-center justify-center text-gray-500">无详情信息</div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                        <svg width="64" height="64" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Z"></path></svg>
                        <p className="mt-4 text-lg">请在左侧选择一个团队进行管理</p>
                    </div>
                )}
            </main>

            {/* Team Edit/Create Modal */}
            {showTeamModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-gray-800 border border-gray-700 w-full max-w-sm rounded-xl shadow-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">{editingTeam ? '编辑团队' : '创建新团队'}</h2>
                        <form onSubmit={handleTeamSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-400">团队名称</label>
                                <input value={teamFormData.name} onChange={e => setTeamFormData({ ...teamFormData, name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="例如: 核心架构组" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-400">描述</label>
                                <textarea value={teamFormData.description} onChange={e => setTeamFormData({ ...teamFormData, description: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" rows={3} placeholder="简要说明团队职责" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowTeamModal(false)} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-700 rounded-md hover:bg-gray-700 transition-colors">取消</button>
                                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 rounded-md hover:bg-blue-700 transition-colors text-white disabled:opacity-50">保存</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {showAddMemberModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-gray-800 border border-gray-700 w-full max-w-sm rounded-xl shadow-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">添加团队成员</h2>
                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-400">选择用户</label>
                                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none" required>
                                    <option value="">点击选择...</option>
                                    {allUsers.filter(u => !selectedTeam?.members?.some(m => m.userId === u.id)).map(u => (
                                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-400">初始角色</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(selectedTeam?.roles || []).map(r => {
                                        const color = getRoleColor(r.isAdmin);
                                        return (
                                            <button key={r.id} type="button" onClick={() => setSelectedMemberRole(r.id)} className={`text-[10px] py-2 border rounded-md transition-all ${selectedMemberRole === r.id ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                                                {r.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowAddMemberModal(false)} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-700 rounded-md hover:bg-gray-700 transition-colors">取消</button>
                                <button type="submit" disabled={submitting || !selectedUserId} className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 rounded-md hover:bg-blue-700 transition-colors text-white disabled:opacity-50">确认添加</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Role Modal */}
            {editingMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-gray-800 border border-gray-700 w-full max-w-sm rounded-xl shadow-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-2">修改角色</h2>
                        <p className="text-xs text-gray-500 mb-6 font-medium">成员: {editingMember.user.name || editingMember.user.email}</p>
                        <form onSubmit={handleUpdateMemberRole} className="space-y-6">
                            <div className="grid grid-cols-1 gap-3">
                                {(selectedTeam?.roles || []).map(r => {
                                    const color = getRoleColor(r.isAdmin);
                                    return (
                                        <label key={r.id} className={`flex items-center justify-between px-4 py-3 border rounded-lg cursor-pointer transition-all ${editMemberRole === r.id ? 'bg-blue-600/10 border-blue-500/50' : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                                                <span className="text-sm font-medium">{r.name}</span>
                                            </div>
                                            <input type="radio" name="memberRole" checked={editMemberRole === r.id} onChange={() => setEditMemberRole(r.id)} className="w-4 h-4 accent-blue-500" />
                                        </label>
                                    );
                                })}
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setEditingMember(null)} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-700 rounded-md hover:bg-gray-700 transition-colors">取消</button>
                                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 rounded-md hover:bg-blue-700 transition-colors text-white disabled:opacity-50">保存变更</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
