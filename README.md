# T3 Stack CRUD Demo

基于 **T3 Stack** 构建的现代化用户管理系统，采用 GitHub 风格的深色主题设计。

## 🚀 技术栈

| 层级 | 技术 | 说明 |
|-----|------|------|
| **前端** | Next.js 15 + React | App Router + CSR 模式 |
| **样式** | Tailwind CSS | GitHub 风格深色主题 |
| **认证** | NextAuth.js | 邮箱密码登录 |
| **后端通信** | tRPC | 端到端类型安全 |
| **数据库** | Prisma + SQLite | 支持多系统角色和团队 |

---

## 🏗️ 系统架构

```
┌──────────────────┐     tRPC      ┌───────────────────┐
│                  │ ────────────► │                   │
│   web (前端)      │               │  admin-service    │
│   :3000          │ ◄──────────── │  :4001 (tRPC)     │
│                  │               │                   │
└────────┬─────────┘               └─────────┬─────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
    ┌─────────────────────────────────────────────┐
    │              @repo/database                 │
    │            (Prisma + SQLite)                │
    └─────────────────────────────────────────────┘
```

### 服务分工

| 服务 | 端口 | 协议 | 职责 |
|-----|------|------|------|
| **web** | 3000 | Next.js | 前端 UI + 认证 |
| **admin-service** | 4001 | tRPC | 用户管理 + 团队管理 |
| ~~runtime-service~~ | 4002 | RESTful + axios | 运行时业务（待实现） |

---

## ✨ 功能模块

### 用户认证
- ✅ 邮箱/密码登录 (`/auth/signin`)
- ✅ 用户注册 (`/auth/register`)
- ✅ 忘记密码 (`/auth/forgot-password`)

### 用户管理 (`/admin/users`)
- ✅ 用户列表 + 搜索
- ✅ 多系统角色（SUPER_ADMIN / ADMIN / USER）

### 团队管理 (`/admin/teams`)
- ✅ 团队 CRUD
- ✅ 子团队层级
- ✅ 成员管理（添加 / 修改角色 / 移除）
- ✅ 团队角色（TEAM_ADMIN / DEVELOPER / OPERATOR）

---

## 📦 项目结构

```
t3_stack_demo/                          # Monorepo 根目录
├── apps/
│   ├── web/                            # Next.js 前端
│   │   ├── src/
│   │   │   ├── app/                    # App Router 页面
│   │   │   │   ├── admin/users/        # 用户管理
│   │   │   │   ├── admin/teams/        # 团队管理
│   │   │   │   └── auth/               # 认证页面
│   │   │   ├── lib/trpc.ts             # tRPC Client
│   │   │   └── server/auth/            # NextAuth 配置
│   │   └── .env                        # 环境变量
│   │
│   ├── admin-service/                  # tRPC 后端服务
│   │   └── src/
│   │       ├── trpc.ts                 # tRPC 初始化
│   │       ├── index.ts                # Express + tRPC 适配器
│   │       └── routers/
│   │           ├── _app.ts             # 根路由
│   │           ├── user.ts             # 用户 tRPC 路由
│   │           └── team.ts             # 团队 tRPC 路由
│   │
│   └── runtime-service/                # RESTful 服务（待实现）
│
└── packages/
    ├── database/                       # Prisma Schema + Client
    │   └── prisma/schema.prisma
    └── types/                          # 共享类型定义
```

---

## 🛠️ 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 初始化数据库
pnpm --filter database db:push

# 3. 启动开发服务器
pnpm run dev
```

**访问地址：**
- 前端: http://localhost:3000
- admin-service: http://localhost:4001/trpc

---

## 📊 数据模型

```prisma
model User {
    id          String   @id @default(cuid())
    name        String?
    email       String?  @unique
    password    String?
    status      String   @default("active")
    systemRoles UserSystemRole[]   # 多系统角色
    teamMembers TeamMember[]       # 团队成员关系
}

model UserSystemRole {
    id     String @id @default(cuid())
    userId String
    role   String  # SUPER_ADMIN / ADMIN / USER
    user   User   @relation(...)
}

model Team {
    id          String  @id @default(cuid())
    name        String
    description String?
    parentId    String?
    parent      Team?   @relation("TeamHierarchy", ...)
    children    Team[]  @relation("TeamHierarchy")
    members     TeamMember[]
}

model TeamMember {
    id     String @id @default(cuid())
    userId String
    teamId String
    role   String  # TEAM_ADMIN / DEVELOPER / OPERATOR
}
```

---

## 📄 License

MIT License
