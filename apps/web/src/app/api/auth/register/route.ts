import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "~/server/db";

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const json = await req.json();
        const body = registerSchema.parse(json);

        const exists = await db.user.findUnique({
            where: { email: body.email },
        });

        if (exists) {
            return NextResponse.json(
                { error: "User already exists" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(body.password, 10);

        const user = await db.user.create({
            data: {
                email: body.email,
                password: hashedPassword,
                name: body.name,
                systemRoles: {
                    create: { role: "USER" }
                }
            },
        });

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
