"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "~/lib/trpc";
import { useTeam } from "./team-context";
import type { RouterOutputs } from "~/trpc/types";

type MenuNode = RouterOutputs["menu"]["getUserMenus"][number];

export function AdminSidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { currentTeam } = useTeam();
    const [adminMenu, setAdminMenu] = useState<MenuNode | null>(null);

    useEffect(() => {
        if (session?.user?.id) {
            trpc.menu.getUserMenus.query({
                userId: session.user.id,
                teamId: currentTeam?.id
            })
                .then((data) => {
                    // Find the "System Management" menu (path: /admin)
                    const systemMenu = data.find(m => m.path === "/admin");
                    setAdminMenu(systemMenu || null);
                })
                .catch(console.error);
        }
    }, [session, currentTeam]);

    if (!adminMenu || !adminMenu.children || adminMenu.children.length === 0) {
        return null;
    }

    return (
        <aside className="w-64 border-r border-gray-800 bg-[#0d1117] flex flex-col h-full">
            <div className="p-4 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    {adminMenu.name}
                </h2>
            </div>
            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                {adminMenu.children.map((item) => (
                    <Link
                        key={item.id}
                        href={item.path}
                        className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${pathname.startsWith(item.path)
                                ? "bg-blue-600/10 text-blue-400"
                                : "text-gray-300 hover:bg-gray-800 hover:text-white"
                            }`}
                    >
                        {item.icon && <i className={`icon-${item.icon} mr-3 text-opacity-70 ${pathname.startsWith(item.path) ? "text-blue-400" : "text-gray-400 group-hover:text-gray-300"
                            }`}></i>}
                        {item.name}
                    </Link>
                ))}
            </nav>
        </aside>
    );
}
