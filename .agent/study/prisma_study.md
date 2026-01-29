# Prisma 学习笔记

> 基于项目 `t3_stack_demo` 的实践整理

---

## 一、什么是 Prisma

### 定义

Prisma 是一个**后端专用的数据库工具**，为 Node.js 和 TypeScript 提供类型安全的数据库访问。

### 核心组件

| 组件 | 作用 |
|------|------|
| **Prisma Schema** | 定义数据模型（`schema.prisma` 文件） |
| **Prisma Client** | 自动生成的类型安全数据库客户端 |
| **Prisma Migrate** | 数据库迁移管理 |
| **Prisma Studio** | 可视化数据库管理工具 |

### 服务对象

```
浏览器（前端）          服务器（后端）           数据库
    │                     │                    │
    │    HTTP 请求        │    Prisma 操作     │
    └─────────────────────┼────────────────────┘
                          ↑
                    Prisma 只在这里工作
```

**Prisma 是后端工具，前端不能直接使用！**

---

## 二、Prisma Schema 语法

### 配置块

#### generator - 生成器配置

```prisma
generator client {
    provider = "prisma-client-js"
    output   = "./generated/client"
}
```

| 属性 | 说明 |
|------|------|
| `provider` | 生成器类型（固定为 `prisma-client-js`） |
| `output` | 生成代码的输出目录 |

#### datasource - 数据源配置

```prisma
datasource db {
    provider = "sqlite"
    url      = env("DATABASE_URL")
}
```

| 属性 | 说明 |
|------|------|
| `provider` | 数据库类型：`sqlite`、`mysql`、`postgresql`、`mongodb` |
| `url` | 连接字符串，`env("XXX")` 表示从环境变量读取 |

---

### Model - 数据模型

#### 基本语法

```prisma
model 模型名 {
    字段名    类型    修饰符?    @属性()
}
```

#### 数据类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `String` | 字符串 | `name String` |
| `Int` | 整数 | `age Int` |
| `Float` | 浮点数 | `price Float` |
| `Boolean` | 布尔值 | `isActive Boolean` |
| `DateTime` | 日期时间 | `createdAt DateTime` |
| `Json` | JSON 对象 | `metadata Json` |

#### 类型修饰符

| 修饰符 | 说明 | 示例 |
|--------|------|------|
| `?` | 可空（可选） | `name String?` |
| `[]` | 数组（一对多关系） | `posts Post[]` |

---

### 字段属性（@ 开头）

| 属性 | 说明 | 示例 |
|------|------|------|
| `@id` | 主键 | `id String @id` |
| `@unique` | 唯一约束 | `email String @unique` |
| `@default()` | 默认值 | `role String @default("user")` |
| `@updatedAt` | 自动更新时间 | `updatedAt DateTime @updatedAt` |
| `@relation()` | 定义关系 | 见下文 |
| `@map()` | 映射列名 | `userName String @map("user_name")` |

#### @default() 常用函数

| 函数 | 说明 |
|------|------|
| `cuid()` | 生成 CUID 字符串 |
| `uuid()` | 生成 UUID 字符串 |
| `now()` | 当前时间 |
| `autoincrement()` | 自增整数 |

---

### 模型属性（@@ 开头）

| 属性 | 说明 | 示例 |
|------|------|------|
| `@@id([])` | 复合主键 | `@@id([a, b])` |
| `@@unique([])` | 联合唯一 | `@@unique([provider, providerAccountId])` |
| `@@index([])` | 创建索引 | `@@index([name])` |
| `@@map()` | 映射表名 | `@@map("users")` |

---

### 关系定义

#### 一对多关系

```prisma
model User {
    id    String  @id @default(cuid())
    posts Post[]                         // 一个用户有多个文章
}

model Post {
    id          Int    @id @default(autoincrement())
    createdBy   User   @relation(fields: [createdById], references: [id])
    createdById String                   // 外键字段
}
```

#### @relation 语法

```
@relation(fields: [本表外键], references: [关联表主键])
```

#### 级联删除

```prisma
user User @relation(..., onDelete: Cascade)
```

---

## 三、完整示例

### Schema 定义

```prisma
// schema.prisma

generator client {
    provider = "prisma-client-js"
    output   = "./generated/client"
}

datasource db {
    provider = "sqlite"
    url      = env("DATABASE_URL")
}

model User {
    id            String    @id @default(cuid())
    name          String?
    email         String?   @unique
    password      String?
    role          String    @default("user")
    status        String    @default("active")
    createdAt     DateTime  @default(now())
    updatedAt     DateTime  @updatedAt
    posts         Post[]
}

model Post {
    id          Int      @id @default(autoincrement())
    name        String
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
    createdBy   User     @relation(fields: [createdById], references: [id])
    createdById String

    @@index([name])
}
```

### 代码使用

```typescript
import { db } from "@repo/database";

// 查询所有用户
const users = await db.user.findMany();

// 查询单个用户
const user = await db.user.findUnique({
    where: { id: "xxx" }
});

// 创建用户
const newUser = await db.user.create({
    data: {
        name: "张三",
        email: "zhangsan@example.com",
        password: "hashedPassword"
    }
});

// 更新用户
await db.user.update({
    where: { id: "xxx" },
    data: { name: "李四" }
});

// 删除用户
await db.user.delete({
    where: { id: "xxx" }
});

// 带条件查询
const admins = await db.user.findMany({
    where: { role: "admin", status: "active" },
    select: { id: true, name: true, email: true }
});
```

---

## 四、类型生成

### 生成位置

```
packages/database/prisma/generated/client/
├── index.d.ts     ← 类型定义文件
├── index.js       ← 运行时代码
└── ...
```

### 生成的类型

```typescript
// Prisma 自动生成（包含所有字段）
export type User = {
    id: string;
    name: string | null;
    email: string | null;
    password: string | null;    // ⚠️ 包含敏感字段
    role: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
};
```

### Prisma 类型 vs API 类型

| 类型 | 位置 | 用途 |
|------|------|------|
| **Prisma 生成** | `generated/client/` | 后端数据库操作（含敏感字段） |
| **手动定义** | `packages/types/` | API 接口（排除敏感字段） |

```typescript
// Prisma 类型（后端用）
type PrismaUser = { id, name, email, password, ... }

// API 类型（前后端共用）
interface ApiUser { id, name, email, role }  // 无 password
```

---

## 五、常用命令

| 命令 | 说明 |
|------|------|
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:push` | 推送 Schema 到数据库（开发用） |
| `pnpm db:migrate` | 创建并应用迁移（生产用） |
| `pnpm db:studio` | 打开可视化管理工具 |
| `pnpm db:seed` | 运行种子脚本 |

---

## 六、核心价值

| 方面 | 没有 Prisma | 有 Prisma |
|------|------------|-----------|
| 查询方式 | 手写 SQL | 类型安全的 API |
| 返回类型 | `any` | 自动推导 |
| 字段检查 | 运行时报错 | 编译时报错 |
| IDE 支持 | 无 | 完整自动补全 |
| 模式同步 | 手动维护 | 自动生成 |

---

## 七、总结

| 问题 | 答案 |
|------|------|
| Prisma 是什么？ | 后端专用的类型安全数据库工具 |
| 前端能用吗？ | ❌ 不能，只能后端使用 |
| 核心价值？ | 类型安全 + 自动生成 + IDE 支持 |
| 类型在哪？ | `prisma/generated/client/index.d.ts` |
| 为什么还要 @repo/types？ | 控制 API 暴露字段，排除敏感信息 |

---

*整理于 2026-01-29*
