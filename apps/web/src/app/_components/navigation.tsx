"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTeam } from "./team-context";
import { trpc } from "~/lib/trpc";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { RouterOutputs } from "~/trpc/types";

type MenuNode = RouterOutputs["menu"]["getUserMenus"][number];

export function Navigation() {
    const { data: session } = useSession();
    const { currentTeam } = useTeam();
    const pathname = usePathname();
    const [menus, setMenus] = useState<MenuNode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session?.user?.id) {
            trpc.menu.getUserMenus.query({
                userId: session.user.id,
                teamId: currentTeam?.id
            })
                .then((data) => {
                    setMenus(data as MenuNode[]);
                    setLoading(false);
                })
                .catch((err) => {
                    console.error("Failed to load menus", err);
                    setLoading(false);
                });
        }
    }, [session, currentTeam]);

    if (!session) return null;

    if (loading) {
        return <div className="animate-pulse h-6 w-32 bg-gray-700 rounded"></div>;
    }

    // 渲染菜单项（移除下拉逻辑，仅作为链接）
    const renderMenuItem = (menu: MenuNode) => {
        const isActive = pathname.startsWith(menu.path);

        return (
            <Link
                key={menu.id}
                href={menu.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
            >
                {menu.name}
            </Link>
        );
    };

    return (
        <nav className="flex items-center gap-2">
            <Link
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === "/"
                    ? "bg-white/10 text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
            >
                首页
            </Link>

            {menus.map((menu) => renderMenuItem(menu))}
        </nav>
    );
}
