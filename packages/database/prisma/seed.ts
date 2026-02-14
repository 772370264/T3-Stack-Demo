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
    // 3. 初始化菜单 - 先创建"系统管理"父菜单
    const systemMenu = await db.menu.upsert({
        where: { path: "/admin" },
        update: {},
        create: { name: "系统管理", path: "/admin", icon: "settings", sortOrder: 1 },
    });

    // 子菜单挂载到"系统管理"下
    const subMenus = [
        { name: "用户管理", path: "/admin/users", icon: "users", sortOrder: 1, parentId: systemMenu.id },
        { name: "团队管理", path: "/admin/teams", icon: "building", sortOrder: 2, parentId: systemMenu.id },
        { name: "菜单管理", path: "/admin/menus", icon: "menu", sortOrder: 3, parentId: systemMenu.id },
    ];

    for (const menu of subMenus) {
        await db.menu.upsert({
            where: { path: menu.path },
            update: { parentId: menu.parentId },
            create: menu,
        });
    }

    // 4. 创建固定的管理员团队
    const adminTeam = await db.team.upsert({
        where: { id: "admin-team" },
        update: {},
        create: {
            id: "admin-team",
            name: "系统管理",
            description: "系统管理员专属团队",
        },
    });

    // 5. 创建管理员团队角色
    const adminTeamRole = await db.teamRole.upsert({
        where: { teamId_name: { teamId: adminTeam.id, name: "管理员" } },
        update: {},
        create: {
            teamId: adminTeam.id,
            name: "管理员",
            isAdmin: true,
        },
    });

    // 6. 将 ADMIN 用户加入管理员团队
    await db.teamMember.upsert({
        where: {
            userId_teamId: { userId: admin.id, teamId: adminTeam.id },
        },
        update: { teamRoleId: adminTeamRole.id },
        create: {
            userId: admin.id,
            teamId: adminTeam.id,
            teamRoleId: adminTeamRole.id,
        },
    });

    console.log("Seed completed!");
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect());
