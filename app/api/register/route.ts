import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        console.log("Register API called");
        const body = await req.json();
        console.log("Request body parsed:", { ...body, password: "***" });
        const { firstName, lastName, email, password } = body;

        if (!firstName || !lastName || !email || !password) {
            console.log("Missing fields");
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        console.log("Checking for existing user...");
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            console.log("User already exists");
            return NextResponse.json(
                { message: "User already exists" },
                { status: 409 }
            );
        }

        console.log("Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log("Creating user in DB...");
        const user = await prisma.user.create({
            data: {
                name: `${firstName} ${lastName}`,
                email,
                password: hashedPassword,
            },
        });
        console.log("User created:", user.id);

        return NextResponse.json(
            { message: "User created successfully", userId: user.id },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error details:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
