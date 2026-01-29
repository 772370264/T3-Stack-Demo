// 用户相关类型
export interface User {
    id: string;
    name: string | null;
    email: string | null;
    role: "admin" | "user";
    status: "active" | "inactive" | "suspended";
    createdAt: Date;
    updatedAt: Date;
    image: string | null;
}

export interface CreateUserInput {
    name: string;
    email: string;
    password: string;
    role?: "admin" | "user";
}

export interface UpdateUserInput {
    id: string;
    name?: string;
    email?: string;
    password?: string;
    role?: "admin" | "user";
    status?: "active" | "inactive" | "suspended";
}

// 用户统计类型
export interface UserStats {
    total: number;
    active: number;
    inactive: number;
    admins: number;
}

// API 响应类型
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// 认证相关类型
export interface LoginInput {
    email: string;
    password: string;
}

export interface RegisterInput {
    name: string;
    email: string;
    password: string;
}
