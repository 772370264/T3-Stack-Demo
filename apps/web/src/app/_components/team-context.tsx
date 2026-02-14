"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Team = {
    id: string;
    name: string;
};

interface TeamContextType {
    currentTeam: Team | null;
    setCurrentTeam: (team: Team) => void;
    isLoading: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

function getStorageKey(userId: string) {
    return `currentTeam_${userId}`;
}

export function TeamProvider({ children }: { children: ReactNode }) {
    const [currentTeam, setCurrentTeamState] = useState<Team | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { data: session, status } = useSession();

    // 初始化：从 localStorage 读取（按用户隔离）
    useEffect(() => {
        if (status === "loading") return;

        if (session?.user?.id) {
            const key = getStorageKey(session.user.id);
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    setCurrentTeamState(JSON.parse(stored));
                } catch (e) {
                    console.error("Failed to parse stored team", e);
                }
            } else {
                setCurrentTeamState(null);
            }
        } else {
            // 未登录时清空
            setCurrentTeamState(null);
        }
        setIsLoading(false);
    }, [session, status]);

    const setCurrentTeam = (team: Team) => {
        setCurrentTeamState(team);
        if (session?.user?.id) {
            const key = getStorageKey(session.user.id);
            localStorage.setItem(key, JSON.stringify(team));
        }
        router.refresh();
    };

    return (
        <TeamContext.Provider value={{ currentTeam, setCurrentTeam, isLoading }}>
            {children}
        </TeamContext.Provider>
    );
}

export function useTeam() {
    const context = useContext(TeamContext);
    if (context === undefined) {
        throw new Error("useTeam must be used within a TeamProvider");
    }
    return context;
}
