"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "~/lib/trpc";
import { useTeam } from "./team-context";
import type { RouterOutputs } from "~/trpc/types";

type MenuNode = RouterOutputs["menu"]["getUserMenus"][number];

export function AdminSubnav() {
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
        <nav className="flex items-center gap-1 px-6 py-2 border-b border-gray-800 bg-[#161b22]">
            {adminMenu.children.map((item) => (
                <Link
                    key={item.id}
                    href={item.path}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname.startsWith(item.path)
                            ? "bg-blue-600/15 text-blue-400"
                            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                        }`}
                >
                    {item.name}
                </Link>
            ))}
        </nav>
    );
}
