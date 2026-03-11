import type { DefaultSession, NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

type SessionUser = NonNullable<DefaultSession["user"]> & {
    id?: string;
    role?: string;
};

type SessionWithRole = DefaultSession & {
    user: SessionUser;
};

type JwtWithRole = JWT & {
    role?: string;
};

type AuthorizedUser = {
    id: string;
    role?: string;
};

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const identifier = credentials.email.trim();
                if (!identifier) return null;

                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: { equals: identifier, mode: 'insensitive' } },
                            { name: { equals: identifier, mode: 'insensitive' } }
                        ]
                    }
                });

                if (!user) {
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async session({ session, token }: { session: SessionWithRole; token: JwtWithRole }) {
            if (token && session.user) {
                session.user.id = typeof token.sub === "string" ? token.sub : "";
                session.user.role = typeof token.role === "string" ? token.role : undefined;
            }
            return session;
        },
        async jwt({ token, user }: { token: JwtWithRole; user?: AuthorizedUser | null }) {
            if (user) {
                token.sub = user.id;
                token.role = user.role;
            }
            return token;
        },
    },
};
