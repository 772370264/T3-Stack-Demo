# T3 Stack CRUD Demo

基于 **T3 Stack** 构建的现代化用户管理系统，采用 GitHub 风格的深色主题设计。

## 🚀 技术栈

- **[Next.js 15](https://nextjs.org/)** - React 全栈框架，支持 App Router 和服务端渲染
- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全的 JavaScript
- **[tRPC](https://trpc.io/)** - 端到端类型安全的 API
- **[Prisma](https://www.prisma.io/)** - 现代化 ORM，支持 MySQL
- **[NextAuth.js](https://next-auth.js.org/)** - 完整的认证解决方案
- **[Tailwind CSS](https://tailwindcss.com/)** - 实用优先的 CSS 框架

## ✨ 功能特性

### 用户认证
- ✅ 邮箱/密码登录
- ✅ 用户注册
- ✅ JWT 会话管理
- ✅ 自定义登录/注册页面

### 用户管理 (CRUD)
- ✅ 用户列表展示
- ✅ 创建新用户
- ✅ 编辑用户信息
- ✅ 删除用户
- ✅ 用户状态管理 (active/inactive/suspended)
- ✅ 角色管理 (admin/user)
- ✅ 用户统计仪表盘

### UI/UX
- ✅ GitHub 风格深色主题
- ✅ 响应式设计
- ✅ 模态框交互
- ✅ Loading 状态
- ✅ Toast 消息提示
- ✅ 表单验证

## 📦 快速开始

### 前置要求

- Node.js 18+ 
- MySQL 数据库
- npm 或 yarn

### 安装步骤

1. **克隆项目后安装依赖**

```bash
npm install
```

2. **配置环境变量**

编辑 `.env` 文件，修改数据库连接信息：

```env
# 数据库连接 URL
DATABASE_URL="mysql://用户名:密码@主机:端口/数据库名"

# NextAuth 密钥（已预设，可自行生成新的）
AUTH_SECRET="your-auth-secret"
```

3. **初始化数据库**

```bash
# 推送数据库 Schema
npm run db:push

# 生成 Prisma Client
npx prisma generate

# (可选) 导入种子数据
npm run db:seed
```

4. **启动开发服务器**

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 📋 测试账户

运行 `npm run db:seed` 后，可使用以下测试账户：

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@example.com | admin123 |
| 普通用户 | user@example.com | user123 |
| 演示用户 | zhang@example.com | demo123 |
| 演示用户 | li@example.com | demo123 |
| 演示用户 | wang@example.com | demo123 |

## 🗂️ 项目结构

```
t3_stack_demo/
├── prisma/
│   ├── schema.prisma      # Prisma 数据库模型
│   └── seed.ts            # 数据库种子脚本
├── src/
│   ├── app/
│   │   ├── _components/   # 共享组件
│   │   ├── admin/users/   # 用户管理页面
│   │   ├── auth/          # 认证页面 (登录/注册)
│   │   ├── api/           # API 路由
│   │   ├── layout.tsx     # 根布局
│   │   └── page.tsx       # 首页
│   ├── server/
│   │   ├── api/
│   │   │   ├── routers/
│   │   │   │   ├── post.ts    # Post Router (示例)
│   │   │   │   └── user.ts    # 用户管理 Router
│   │   │   ├── root.ts        # tRPC 根路由
│   │   │   └── trpc.ts        # tRPC 配置
│   │   ├── auth/              # NextAuth 配置
│   │   └── db.ts              # Prisma Client
│   ├── styles/
│   │   └── globals.css        # 全局样式 (GitHub 主题)
│   ├── trpc/                  # tRPC 客户端配置
│   └── env.js                 # 环境变量验证
├── .env                       # 环境变量
├── package.json
└── README.md
```

## 🛠️ 可用脚本

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (Turbopack) |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run db:push` | 推送 Prisma Schema 到数据库 |
| `npm run db:generate` | 生成数据库迁移 |
| `npm run db:seed` | 运行数据库种子脚本 |
| `npm run db:studio` | 打开 Prisma Studio |

## 🔧 数据库配置

### 使用 MySQL

1. 确保 MySQL 服务正在运行
2. 创建数据库：

```sql
CREATE DATABASE t3_stack_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. 更新 `.env` 中的 `DATABASE_URL`

### 数据库模型

```prisma
model User {
    id            String    @id @default(cuid())
    name          String?
    email         String?   @unique
    password      String?
    role          String    @default("user")    // admin, user
    status        String    @default("active")  // active, inactive, suspended
    createdAt     DateTime  @default(now())
    updatedAt     DateTime  @updatedAt
    // ... NextAuth 相关字段
}
```

## 📱 页面路由

| 路由 | 说明 | 权限 |
|------|------|------|
| `/` | 首页 | 公开 |
| `/auth/signin` | 登录页面 | 公开 |
| `/auth/register` | 注册页面 | 公开 |
| `/admin/users` | 用户管理 | 需要登录 |

## 🎨 主题定制

项目使用了 GitHub 风格的深色主题。主要颜色定义在 `src/styles/globals.css`:

```css
--color-gh-bg: #0d1117;           /* 主背景 */
--color-gh-bg-secondary: #161b22; /* 次要背景 */
--color-gh-border: #30363d;       /* 边框 */
--color-gh-text: #c9d1d9;         /* 主文字 */
--color-gh-accent: #58a6ff;       /* 强调色 */
--color-gh-success: #238636;      /* 成功色 */
--color-gh-danger: #da3633;       /* 危险色 */
```

## 📄 License

MIT License

---

由 [create-t3-app](https://create.t3.gg/) 创建
