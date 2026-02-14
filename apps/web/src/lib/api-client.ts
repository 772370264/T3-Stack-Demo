const RUNTIME_SERVICE_URL = "http://localhost:4002/api";

export const apiClient = {
    async get<T>(path: string): Promise<T> {
        const res = await fetch(`${RUNTIME_SERVICE_URL}${path}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    },

    async post<T>(path: string, data: any): Promise<T> {
        const res = await fetch(`${RUNTIME_SERVICE_URL}${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    },

    async delete<T>(path: string): Promise<T> {
        const res = await fetch(`${RUNTIME_SERVICE_URL}${path}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    },
};
