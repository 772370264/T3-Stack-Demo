"use client";

import { useEffect, useState } from "react";
import { trpc } from "~/lib/trpc";
import { useSession } from "next-auth/react";

type MenuNode = {
    id: string;
    name: string;
    children?: MenuNode[];
};

export default function AdminMenusPage() {
    const { data: session } = useSession();
    const [menus, setMenus] = useState<MenuNode[]>([]);
    const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (session) {
            Promise.all([
                trpc.menu.getAll.query(),
                trpc.menu.getUserRoleMenuIds.query(),
            ])
                .then(([allMenus, userMenuIds]) => {
                    setMenus(allMenus as MenuNode[]);
                    setSelectedMenuIds(userMenuIds);
                    setLoading(false);
                })
                .catch((err) => {
                    console.error("Failed to load data", err);
                    setLoading(false);
                });
        }
    }, [session]);

    const handleToggle = (menuId: string) => {
        setSelectedMenuIds((prev) =>
            prev.includes(menuId)
                ? prev.filter((id) => id !== menuId)
                : [...prev, menuId]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage("");
        try {
            await trpc.menu.updateUserRoleMenus.mutate({ menuIds: selectedMenuIds });
            setMessage("保存成功");
        } catch (err) {
            setMessage("保存失败");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    // 递归渲染菜单树
    const renderTree = (nodes: MenuNode[], level = 0) => {
        return nodes.map((node) => (
            <div key={node.id} className="ml-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={selectedMenuIds.includes(node.id)}
                        onChange={() => handleToggle(node.id)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600"
                    />
                    <span style={{ color: "var(--color-gh-text)" }}>{node.name}</span>
                </label>
                {node.children && node.children.length > 0 && (
                    <div className="border-l border-gray-700 ml-2">
                        {renderTree(node.children, level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--color-gh-bg)" }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: "var(--color-gh-text)" }}>菜单权限配置</h1>
                    <p className="text-sm mt-1" style={{ color: "var(--color-gh-text-muted)" }}>
                        配置 <strong>普通用户 (USER)</strong> 默认可见的系统菜单
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                >
                    {saving ? "保存中..." : "保存配置"}
                </button>
            </div>

            {message && (
                <div className={`mb - 4 p - 3 rounded - md text - sm ${message.includes("失败") ? "bg-red-900/20 text-red-400 border border-red-900" : "bg-green-900/20 text-green-400 border border-green-900"} `}>
                    {message}
                </div>
            )}

            <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4 border-b border-gray-700 pb-2" style={{ color: "var(--color-gh-text)" }}>
                    系统菜单列表
                </h3>
                <div className="space-y-2">
                    {renderTree(menus)}
                </div>
            </div>
        </div>
    );
}
