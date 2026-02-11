import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  if (!host) return NextResponse.next();

  if (host.startsWith("www.")) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = host.replace(/^www\./, "");
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
