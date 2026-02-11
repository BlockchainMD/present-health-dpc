import { NextRequest, NextResponse } from "next/server";

import { unsubscribeFromToken } from "@/lib/auto-response";

export const runtime = "nodejs";

function htmlPage(title: string, message: string, ok: boolean) {
    const bg = ok ? "#ecfdf5" : "#fef2f2";
    const border = ok ? "#86efac" : "#fecaca";
    const text = ok ? "#14532d" : "#7f1d1d";

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:24px;background:#f8fafc;color:#0f172a}
    .card{max-width:680px;margin:40px auto;border:1px solid ${border};background:${bg};padding:24px;border-radius:12px}
    h1{margin:0 0 10px 0;font-size:24px;color:${text}}
    p{margin:0;line-height:1.6;color:${text}}
    a{color:#0f766e}
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
    try {
        const token = request.nextUrl.searchParams.get("token") || "";
        const result = await unsubscribeFromToken(token);
        if (!result.ok) {
            return new NextResponse(
                htmlPage(
                    "Unable to Unsubscribe",
                    "This unsubscribe link is invalid or expired. Please reply to any Present Health email and we can help directly.",
                    false
                ),
                {
                    status: 400,
                    headers: { "Content-Type": "text/html; charset=utf-8" },
                }
            );
        }

        return new NextResponse(
            htmlPage(
                "You Have Been Unsubscribed",
                "You will no longer receive marketing auto-response emails from this Present Health form source.",
                true
            ),
            {
                status: 200,
                headers: { "Content-Type": "text/html; charset=utf-8" },
            }
        );
    } catch (error) {
        console.error("[AutoResponseUnsubscribeAPI] GET error:", error);
        return new NextResponse(
            htmlPage("Unable to Unsubscribe", "We hit an unexpected error. Please try again later.", false),
            {
                status: 500,
                headers: { "Content-Type": "text/html; charset=utf-8" },
            }
        );
    }
}
