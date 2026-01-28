import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token");
    const bypass = process.env.ADMIN_BYPASS_TOKEN;

    if (!bypass || !token || token !== bypass) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = NextResponse.redirect(new URL("/admin", request.url));
    response.cookies.set({
        name: "admin_bypass",
        value: token,
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 2,
    });

    return response;
}
