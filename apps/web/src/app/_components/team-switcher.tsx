"use client";

import { useState, useRef, useEffect } from "react";
import { useTeam } from "./team-context";
import { trpc } from "~/lib/trpc";
import { useSession } from "next-auth/react";

type Team = {
    id: string;
    name: string;
    teamRole: string;
    isAdmin: boolean;
};

export function TeamSwitcher() {
    const { data: session } = useSession();
    const { currentTeam, setCurrentTeam } = useTeam();
    const [isOpen, setIsOpen] = useState(false);
    const [teams, setTeams] = useState<Team[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Fetch teams
    useEffect(() => {
        if (session?.user?.id && isOpen) {
            trpc.team.getUserTeams.query({ userId: session.user.id })
                .then(setTeams)
                .catch(console.error);
        }
    }, [session, isOpen]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!session) return null;

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors text-sm"
                style={{ color: "var(--color-gh-text)" }}
            >
                <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                        {currentTeam?.name?.charAt(0).toUpperCase() ?? "T"}
                    </span>
                    <span className="max-w-[120px] truncate">
                        {currentTeam?.name ?? "选择团队"}
                    </span>
                </div>
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                    style={{ opacity: 0.7 }}
                >
                    <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-md shadow-lg py-1 z-50 border"
                    style={{
                        backgroundColor: "var(--color-gh-bg)",
                        borderColor: "var(--color-gh-border)",
                    }}
                >
                    <div className="px-3 py-2 text-xs font-semibold border-b mb-1"
                        style={{ color: "var(--color-gh-text-muted)", borderColor: "var(--color-gh-border)" }}>
                        切换团队
                    </div>

                    {teams.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-center" style={{ color: "var(--color-gh-text-muted)" }}>
                            加载中...
                        </div>
                    ) : (
                        teams.map((team) => (
                            <button
                                key={team.id}
                                onClick={() => {
                                    setCurrentTeam(team);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 flex items-center justify-between"
                                style={{ color: "var(--color-gh-text)" }}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded bg-gray-600 flex items-center justify-center text-[10px] font-bold text-white">
                                        {team.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span>{team.name}</span>
                                </div>
                                {currentTeam?.id === team.id && (
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="var(--color-gh-success)">
                                        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                                    </svg>
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
