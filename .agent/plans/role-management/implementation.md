# 角色管理模块 — 实施方案

> 创建时间: 2026-02-11
> 前置文档: [design.md](./design.md)

---

## 阶段一：数据层

### 1.1 修改 Prisma Schema

**文件**: `packages/database/prisma/schema.prisma`

新增 4 个 model：

```prisma
model Menu {
    id        String   @id @default(cuid())
    name      String
    path      String   @unique
    icon      String?
    parentId  String?
    sortOrder Int      @default(0)
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    parent          Menu?            @relation("MenuHierarchy", fields: [parentId], references: [id])
    children        Menu[]           @relation("MenuHierarchy")
    systemRoleMenus SystemRoleMenu[]
    teamRoleMenus   TeamRoleMenu[]

    @@index([parentId])
}

model SystemRoleMenu {
    id     String @id @default(cuid())
    role   String // "USER"
    menuId String
    menu   Menu   @relation(fields: [menuId], references: [id], onDelete: Cascade)

    @@unique([role, menuId])
}

model TeamRole {
    id        String       @id @default(cuid())
    name      String
    teamId    String
    isAdmin   Boolean      @default(false)
    createdAt DateTime     @default(now())
    updatedAt DateTime     @updatedAt

    team    Team           @relation(fields: [teamId], references: [id], onDelete: Cascade)
    menus   TeamRoleMenu[]
    members TeamMember[]

    @@unique([teamId, name])
    @@index([teamId])
}

model TeamRoleMenu {
    id         String   @id @default(cuid())
    teamRoleId String
    menuId     String
    teamRole   TeamRole @relation(fields: [teamRoleId], references: [id], onDelete: Cascade)
    menu       Menu     @relation(fields: [menuId], references: [id], onDelete: Cascade)

    @@unique([teamRoleId, menuId])
}
```

修改 `TeamMember`：
```diff
 model TeamMember {
     id        String   @id @default(cuid())
     userId    String
     teamId    String
-    role      String   // TEAM_ADMIN, DEVELOPER, OPERATOR
+    teamRoleId String
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt

     user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
     team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
+    teamRole  TeamRole @relation(fields: [teamRoleId], references: [id])

     @@unique([userId, teamId])
     @@index([userId])
     @@index([teamId])
+    @@index([teamRoleId])
 }
```

在 `Team` model 中添加 `TeamRole` 关联：
```diff
 model Team {
     ...
     members     TeamMember[]
+    roles       TeamRole[]
     ...
 }
```

### 1.2 创建 Seed 脚本

**文件**: `packages/database/prisma/seed.ts`

```typescript
import { PrismaClient } from "./generated/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

async function main() {
    // 1. 创建 ADMIN 用户
    const adminPassword = await hash(process.env.ADMIN_PASSWORD || "admin", 12);
    const admin = await db.user.upsert({
        where: { email: "admin@system.com" },
        update: {},
        create: {
            name: "系统管理员",
            email: "admin@system.com",
            password: adminPassword,
            status: "active",
        },
    });

    // 2. 分配 ADMIN 角色
    await db.userSystemRole.upsert({
        where: { userId_role: { userId: admin.id, role: "ADMIN" } },
        update: {},
        create: { userId: admin.id, role: "ADMIN" },
    });

    // 3. 初始化菜单
    const menus = [
        { name: "用户管理", path: "/admin/users", icon: "users", sortOrder: 1 },
        { name: "团队管理", path: "/admin/teams", icon: "building", sortOrder: 2 },
        { name: "菜单管理", path: "/admin/menus", icon: "menu", sortOrder: 3 },
    ];

    for (const menu of menus) {
        await db.menu.upsert({
            where: { path: menu.path },
            update: {},
            create: menu,
        });
    }

    console.log("Seed completed!");
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect());
```

**文件**: `packages/database/package.json` — 添加 seed 配置

### 1.3 验证

```bash
pnpm --filter database db:push
pnpm --filter database db:seed
```

---

## 阶段二：后端 API

### 2.1 新增菜单路由

**文件**: `apps/admin-service/src/routers/menu.ts`

| 接口 | 类型 | 入参 | 说明 |
|------|------|------|------|
| `menu.getAll` | query | — | 获取所有菜单（带层级） |
| `menu.getUserMenus` | query | `userId, teamId?` | 计算用户合并菜单 |
| `menu.updateUserRoleMenus` | mutation | `role, menuIds[]` | ADMIN 配置 USER 菜单 |

### 2.2 新增角色路由

**文件**: `apps/admin-service/src/routers/role.ts`

| 接口 | 类型 | 入参 | 说明 |
|------|------|------|------|
| `role.getByTeam` | query | `teamId` | 获取团队角色列表 |
| `role.create` | mutation | `name, teamId, isAdmin?` | 创建团队角色 |
| `role.update` | mutation | `id, name, isAdmin?` | 更新角色 |
| `role.delete` | mutation | `id` | 删除角色 |
| `role.getMenus` | query | `teamRoleId` | 获取角色菜单 |
| `role.updateMenus` | mutation | `teamRoleId, menuIds[]` | 配置角色菜单 |

### 2.3 修改现有路由

**`team.ts`**:
- `addMember`: 参数 `role` → `teamRoleId`
- `updateMemberRole`: 参数 `role` → `teamRoleId`
- 新增 `getUserTeams`: `query({ userId })` → 返回用户所属团队列表
- 所有 include 补充 `teamRole` 关联
- 删除 `TEAM_ROLES` 常量

**`user.ts`**:
- `SYSTEM_ROLES` 改为 `["ADMIN", "USER"]`（移除 `SUPER_ADMIN`）
- 删除 `updateRoles` 接口（ADMIN 仅通过 Seed/DB 分配，无需 API）
- 删除 `getRoles` 接口（同理，无需通过 UI 查询系统角色）

**`_app.ts`**:
- 注册 `menuRouter` 和 `roleRouter`

---

## 阶段三：前端 — 登录 & 团队切换

### 3.1 TeamContext

**文件**: `apps/web/src/app/_components/team-context.tsx`

```typescript
interface TeamContextType {
    currentTeam: { id: string; name: string } | null;
    setCurrentTeam: (team: { id: string; name: string }) => void;
    userTeams: Array<{ id: string; name: string; teamRole: string }>;
}
```

- 状态持久化到 `localStorage`
- 页面刷新后自动恢复

### 3.2 登录页团队选择

**文件**: `apps/web/src/app/auth/signin/page.tsx`

登录成功后增加步骤：
1. 调用 `team.getUserTeams` 获取团队列表
2. 判断系统角色：ADMIN 直接跳转，USER 进团队选择
3. 单团队自动选中，多团队弹出选择

### 3.3 团队切换组件

**文件**: `apps/web/src/app/_components/team-switcher.tsx`

- 下拉组件，显示在 Header 右侧
- 列出用户所有团队
- 切换时更新 Context + 刷新菜单

### 3.4 Layout 集成

**文件**: `apps/web/src/app/layout.tsx`

包裹 `<TeamProvider>`

---

## 阶段四：前端 — 管理页面

### 4.1 菜单管理页

**文件**: `apps/web/src/app/admin/menus/page.tsx`

ADMIN 专属，功能：
- 查看所有系统菜单
- 勾选 USER 角色的可见菜单
- 使用复选框列表

### 4.2 团队角色管理页

**文件**: `apps/web/src/app/admin/teams/[id]/roles/page.tsx`

TEAM_ADMIN 使用，功能：
- 角色 CRUD（名称、是否管理员）
- 角色-菜单勾选配置
- 使用左右两栏布局：左角色列表，右菜单配置

---

## 阶段五：动态菜单

### 5.1 导航菜单动态化

**文件**: `apps/web/src/app/page.tsx`

Header 导航从硬编码改为调用 `menu.getUserMenus` 动态渲染。

---

## 阶段六：验证

按 5 个测试场景手动验证（详见 design.md 第 5 节流程图）：

1. ✅ Seed 初始化 + ADMIN 登录
2. ✅ ADMIN 配置 USER 菜单
3. ✅ 团队角色创建与菜单分配
4. ✅ 团队选择与切换
5. ✅ 数据隔离
