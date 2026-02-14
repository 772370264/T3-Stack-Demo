"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeamDetailRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/admin/teams");
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="spinner"></div>
        </div>
    );
}
