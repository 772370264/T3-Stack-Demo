# Turborepo 学习笔记

> 基于 Monorepo 项目实践整理

---

## 一、什么是 Turborepo

Turborepo 是一个用于 JavaScript/TypeScript Monorepo 的高性能构建系统，核心功能是**增量构建**和**缓存**。

---

## 二、配置文件

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

### 配置说明

| 字段 | 说明 |
|------|------|
| `tasks` | 定义可运行的任务 |
| `dependsOn` | 任务依赖（`^` 表示先构建依赖的包） |
| `outputs` | 任务输出目录（用于缓存） |
| `cache` | 是否缓存（dev 任务通常设为 false） |
| `persistent` | 是否持久运行（如 dev server） |

---

## 三、.turbo 目录

### 位置和内容

```
.turbo/
├── cache/              # 构建缓存
│   ├── abc123.tar.zst  # 压缩的缓存包
│   └── def456.tar.zst
└── daemon/             # 守护进程文件
```

### .turbo 是什么？

| 方面 | 说明 |
|------|------|
| **内容** | 构建任务的缓存（压缩后的产物快照） |
| **用途** | 加速增量构建 |
| **是否是构建产物** | ❌ 不是，是缓存元数据 |
| **可否删除** | ✅ 随时可删，只影响构建速度 |
| **应否 Git 忽略** | ✅ 应该加入 .gitignore |

### 与 dist/build 目录的区别

| 目录 | 作用 | 类比 |
|------|------|------|
| `.turbo/cache` | 构建**元数据**缓存 | 类似 `.git` |
| `dist/` / `build/` | 实际构建**产物** | 编译后的可运行代码 |

---

## 四、缓存工作原理

### 构建流程

```
pnpm build
    ↓
Turborepo 计算每个包的输入哈希（源码 + 依赖）
    ↓
检查 .turbo/cache 是否有匹配的哈希
    ↓
┌─ 有缓存 → 直接解压，跳过构建 ⚡
└─ 无缓存 → 执行构建，并缓存结果
```

### 性能对比

```
没有 Turborepo：
每次构建: 57 秒（所有包都重新构建）

有 Turborepo，只改了 web：
web:             30 秒（重新构建）
admin-service:   0.1 秒（从缓存恢复）⚡
runtime-service: 0.1 秒（从缓存恢复）⚡
database:        0.1 秒（从缓存恢复）⚡
总计:            30.4 秒（节省 47%）
```

---

## 五、缓存类型

### 本地缓存

- 存储在 `.turbo/cache`
- 同一台机器上的构建可复用
- 切换分支后仍可使用

### 远程缓存（可选）

```bash
# 配置 Vercel 远程缓存
npx turbo login
npx turbo link
```

| 场景 | 效果 |
|------|------|
| 团队成员 A 构建了 database | 缓存上传到云端 |
| 团队成员 B 拉取代码构建 | 直接下载 A 的缓存，无需重新构建 |
| CI/CD 构建 | 复用之前的构建缓存 |

---

## 六、常用命令

| 命令 | 说明 |
|------|------|
| `pnpm build` | 构建所有包（通过 turbo） |
| `pnpm dev` | 启动所有开发服务器 |
| `turbo run build --filter=web` | 只构建 web |
| `turbo run build --dry` | 预览哪些任务会运行 |
| `turbo run build --force` | 忽略缓存，强制重建 |

---

## 七、任务依赖

### dependsOn 语法

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"]  // 先构建依赖的包
    },
    "test": {
      "dependsOn": ["build"]   // 先执行本包的 build
    }
  }
}
```

| 语法 | 含义 |
|------|------|
| `^taskName` | 先执行**依赖包**的该任务 |
| `taskName` | 先执行**本包**的该任务 |

### 执行顺序示例

```
web 依赖 database
    ↓
turbo build
    ↓
1. 先构建 database（因为 ^build）
2. 再构建 web
```

---

## 八、.gitignore 配置

```gitignore
# Turborepo
.turbo

# 构建产物
dist
build
.next

# 依赖
node_modules
```

---

## 九、核心价值总结

| 价值 | 说明 |
|------|------|
| **增量构建** | 只重建变更的包 |
| **缓存复用** | 未变更的包直接用缓存 |
| **并行执行** | 无依赖关系的任务并行运行 |
| **团队共享** | 远程缓存让团队共享构建结果 |

**一句话**：Turborepo 让构建从 O(n) 变成 O(变更数)。

---

*整理于 2026-01-29*
