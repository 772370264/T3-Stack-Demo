"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "~/lib/trpc";
import { useTeam } from "~/app/_components/team-context";
import type { RouterOutputs } from "~/trpc/types";

type MenuNode = RouterOutputs["menu"]["getUserMenus"][number];
export default function AdminPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { currentTeam } = useTeam();

    // State for menus
    const [menus, setMenus] = useState<MenuNode[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (session?.user?.id) {
            trpc.menu.getUserMenus.query({
                userId: session.user.id,
                teamId: currentTeam?.id
            })
                .then((data) => {
                    setMenus(data);
                    setIsLoading(false);
                })
                .catch((err) => {
                    console.error(err);
                    setIsLoading(false);
                });
        } else if (!session?.user?.id && !isLoading) {
            // If session user ID becomes null/undefined and we're not already loading,
            // reset menus and set loading to true to prevent premature redirection logic
            setMenus([]);
            setIsLoading(true);
        }
    }, [session, currentTeam, isLoading]); // Added isLoading to dependencies to handle the else if condition correctly

    useEffect(() => {
        if (!isLoading && menus && menus.length > 0) {
            // Find System Management menu (path: /admin)
            const adminMenu = menus.find(m => m.path === "/admin");

            if (adminMenu && adminMenu.children && adminMenu.children.length > 0) {
                // Redirect to the first child
                const firstChildPath = adminMenu.children[0]?.path;
                if (firstChildPath) {
                    router.replace(firstChildPath);
                }
            } else {
                // Fallback if no children or admin menu not found
                // router.replace("/"); 
            }
        }
    }, [isLoading, menus, router]);

    return (
        <div className="flex items-center justify-center h-full text-gray-500">
            Redirecting...
        </div>
    );
}
