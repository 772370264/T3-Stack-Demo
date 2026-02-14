# 角色管理模块设计

> 日期: 2026-02-12
> 状态: 设计中

## 概述

新增角色管理页面 `/admin/roles`（与用户管理同级），统一展示系统角色和团队角色，支持团队角色的增删改和路由权限分配。同时调整菜单可见性逻辑。

## 一、数据模型变更

### TeamRole 新增 `code` 字段

```diff
 model TeamRole {
     id      String  @id @default(cuid())
+    code    String               // 角色编码（如 "dev", "ops"）
     name    String
     teamId  String
     isAdmin Boolean @default(false)
+    @@unique([teamId, code])     // 同团队内编码唯一
 }
```

- 创建团队角色时必须填写 `code`
- Seed 中已有的默认角色（"团队管理员"、"开发者"）需补充 `code` 值（如 `team_admin`、`developer`）
- 系统角色无 code 字段，列表展示时直接用 `role` 值（ADMIN/USER）

## 二、后端 API

### 新增 `role.getAll` 端点

返回所有角色的统一列表：

```typescript
// 返回结构
type RoleListItem = {
    id: string;
    name: string;
    code: string;
    type: "system" | "team";     // 角色类型
    teamName: string | null;     // 所属团队名（系统级为 null）
    isAdmin: boolean;
    memberCount: number;
};
```

实现方式：
1. 查询 `UserSystemRole` 的 distinct roles → 转为 `{ type: "system" }` 格式
2. 查询所有 `TeamRole`（含 team.name 和 _count.members）→ 转为 `{ type: "team" }` 格式
3. 合并返回

### 修改现有 `role.create` / `role.update`

- `create` 新增必填 `code` 参数
- `update` 支持修改 `code`
- 创建团队角色时自动复制 `SystemRoleMenu(USER)` 的菜单作为默认路由权限

### 修改 `menu.getUserMenus`

```
ADMIN → 所有菜单（不变）
USER + 有团队 → 仅当前团队角色菜单（去掉 SystemRoleMenu 并集）
USER + 无团队 → SystemRoleMenu(USER) 作为保底
```

## 三、前端页面

### `/admin/roles` 页面

| 区域 | 内容 |
|------|------|
| **顶部** | 标题"角色管理" + "新建团队角色"按钮 |
| **列表** | 表格显示：角色名、编码、类型 badge、所属团队、成员数 |
| **操作列** | 系统角色：只读；团队角色：编辑、配置路由、删除 |
| **模态框** | 创建/编辑角色（name + code + 所属团队 + isAdmin） |
| **路由配置** | 点击"配置路由"→ 弹窗中用 checkbox 树选择可见菜单（复用 `role.getMenus` / `role.updateMenus`） |

### 菜单 Seed 变更

需在 Seed 中为"角色管理"添加菜单记录（path: `/admin/roles`），挂在"系统管理"下。

## 四、文件清单

| 操作 | 文件 |
|------|------|
| **[MODIFY]** | `packages/database/prisma/schema.prisma` — TeamRole 加 code |
| **[MODIFY]** | `packages/database/prisma/seed.ts` — 补 code + 新增角色管理菜单 |
| **[MODIFY]** | `apps/admin-service/src/routers/role.ts` — 新增 getAll, 修改 create/update |
| **[MODIFY]** | `apps/admin-service/src/routers/menu.ts` — 修改 getUserMenus 逻辑 |
| **[NEW]** | `apps/web/src/app/admin/roles/page.tsx` — 角色管理页面 |

## 五、验证计划

1. 角色列表能看到系统角色（ADMIN/USER）和所有团队角色
2. 新建团队角色填写 name + code，默认路由与 USER 一致
3. 配置团队角色路由后，该角色成员的导航栏正确更新
4. ADMIN 用户始终看到所有路由
5. USER 用户切换到无路由配置的团队，显示保底菜单
6. USER 用户不在任何团队时，显示 SystemRoleMenu(USER) 保底菜单
