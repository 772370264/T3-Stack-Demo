# pnpm Workspace 学习笔记

> 基于 Monorepo 项目实践整理

---

## 一、什么是 pnpm Workspace

pnpm Workspace 是 pnpm 包管理器的多包管理功能，允许在一个仓库中管理多个相互关联的项目。

---

## 二、配置文件

### pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"       # 匹配 apps 下所有目录
  - "packages/*"   # 匹配 packages 下所有目录
```

| 字段 | 说明 |
|------|------|
| `packages` | 定义 workspace 包含的路径（支持 glob 模式） |

---

## 三、包命名约定

### @scope/name 格式

```json
// packages/types/package.json
{
  "name": "@repo/types",   // @组织名/包名
  "private": true
}
```

| 部分 | 说明 |
|------|------|
| `@repo` | 组织/命名空间（可自定义如 `@mycompany`） |
| `types` | 包名 |

---

## 四、workspace:* 协议

### 作用

指向本地 workspace 中的包，而不是从 npm 下载。

### 使用方式

```json
// apps/web/package.json
{
  "dependencies": {
    "@repo/types": "workspace:*",    // 引用本地 packages/types
    "@repo/database": "workspace:*"  // 引用本地 packages/database
  }
}
```

### 匹配原理

```
pnpm 看到 "@repo/types": "workspace:*"
    ↓
搜索 workspace 中 name 为 "@repo/types" 的包
    ↓
找到 packages/types/（因为它的 package.json 中 name 是 "@repo/types"）
    ↓
创建软链接到 node_modules/@repo/types
```

**关键点**：匹配的是 `package.json` 中的 `name` 字段，不是目录路径！

---

## 五、目录结构规范

### 典型 Monorepo 结构

```
my-monorepo/
├── apps/                    # 应用层（可独立运行）
│   ├── web/                 # 前端应用
│   ├── api/                 # 后端服务
│   └── docs/                # 文档站
│
├── packages/                # 共享包（被引用）
│   ├── types/               # 类型定义
│   ├── database/            # 数据库访问
│   ├── ui/                  # UI 组件库
│   ├── utils/               # 工具函数
│   └── config/              # 共享配置
│
├── pnpm-workspace.yaml
└── package.json
```

### apps vs packages

| 维度 | `apps/*` | `packages/*` |
|------|----------|--------------|
| 能否独立运行 | ✅ 可以 | ❌ 不能 |
| 是否被引用 | 通常不互相引用 | 被 apps 引用 |
| 例子 | 网站、API 服务 | 组件库、工具函数 |

---

## 六、包引用规则

### ✅ 正确的引用方式

```
apps/web ───────→ packages/types      （app 引用 package）
apps/api ───────→ packages/database   （app 引用 package）
packages/ui ────→ packages/types      （package 引用 package）
```

### ❌ 错误的引用方式

```
apps/web ──✗──→ apps/api              （app 不应引用 app）
```

apps 之间应通过 **HTTP/RPC** 通信，不应直接 import！

---

## 七、必须在 workspace 中才能引用

```yaml
packages:
  - "apps/*"       # apps/web 必须在这里
  - "packages/*"   # 要被引用的包必须在这里
```

| 场景 | 结果 |
|------|------|
| web 在 workspace 范围内 | ✅ 能引用 @repo/types |
| web 不在 workspace 范围内 | ❌ 报错：package not found |

---

## 八、常用命令

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装所有 workspace 的依赖 |
| `pnpm add pkg -w` | 在根目录添加依赖 |
| `pnpm add pkg --filter app` | 给指定包添加依赖 |
| `pnpm --filter app dev` | 在指定包执行命令 |

---

*整理于 2026-01-29*
