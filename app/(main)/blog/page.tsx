import { permanentRedirect } from "next/navigation";

// /blog duplicated the /learn library (same Article rows, no canonical).
// The canonical hub is /learn; /blog/[slug] already redirects via next.config.ts.
export default function BlogPage() {
    permanentRedirect("/learn");
}
