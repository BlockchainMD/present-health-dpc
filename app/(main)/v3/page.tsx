import { permanentRedirect } from "next/navigation";

// Retired homepage hero A/B variant. Permanently redirect to the homepage.
export default function V3Page() {
    permanentRedirect("/");
}
