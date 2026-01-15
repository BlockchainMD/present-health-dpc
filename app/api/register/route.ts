import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getOrCreateAttributionSession } from "@/lib/attribution";
import { recordConversionEvent } from "@/lib/conversion";

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

        console.log("Checking for existing lead...");
        const lead = await prisma.lead.findFirst({
            where: { email },
            orderBy: { createdAt: "desc" },
        });

        const sessionId = await getOrCreateAttributionSession(req);

        console.log("Creating user in DB...");
        const user = await prisma.user.create({
            data: {
                name: `${firstName} ${lastName}`,
                email,
                password: hashedPassword,
                leadId: lead?.id,
                attributionSessionId: sessionId,
            },
        });
        console.log("User created:", user.id);

        // Record Conversion Event
        await recordConversionEvent({
            type: 'REGISTERED',
            attributionSessionId: sessionId,
            userId: user.id,
            metadata: { source: 'RegisterAPI', leadId: lead?.id }
        });

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
