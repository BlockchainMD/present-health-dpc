import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { makeHeadingIdGetter } from "@/lib/markdown-toc";
import { CostComparisonCalculator } from "@/components/pricing/CostComparisonCalculator";
import { MembershipTiers } from "@/components/pricing/MembershipTiers";

function nodeText(node: ReactNode): string {
    if (node === null || node === undefined) return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(nodeText).join("");
    // React element
    if (typeof node === "object" && (node as any).props?.children !== undefined) {
        return nodeText((node as any).props.children);
    }
    return "";
}

export function ArticleMarkdown({ content }: { content: string }) {
    const getHeadingId = makeHeadingIdGetter();

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                h2({ children, ...props }) {
                    const text = nodeText(children).trim();
                    const id = text ? getHeadingId(text) : undefined;
                    return (
                        <h2 id={id} className="scroll-mt-24" {...props}>
                            {children}
                        </h2>
                    );
                },
                h3({ children, ...props }) {
                    const text = nodeText(children).trim();
                    const id = text ? getHeadingId(text) : undefined;
                    return (
                        <h3 id={id} className="scroll-mt-24" {...props}>
                            {children}
                        </h3>
                    );
                },
                img({ ...props }) {
                    const src = String((props as any).src || "");
                    const alt = String((props as any).alt || "");
                    // Render plain <img> so content stays clean/portable; uploads should already be optimized.
                    return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={src}
                            alt={alt}
                            loading="lazy"
                            className="rounded-xl border border-border/60 max-w-full h-auto"
                        />
                    );
                },
                code({ inline, className, children, ...props }: any) {
                    const raw = String(children || "").trim();
                    const language = (className || "").replace("language-", "").toLowerCase();

                    if (!inline && language === "embed") {
                        const key = raw.toLowerCase();
                        if (key === "cost-comparison-calculator" || key === "dpc-cost-calculator") {
                            return (
                                <div className="not-prose my-8">
                                    <CostComparisonCalculator />
                                </div>
                            );
                        }
                        if (key === "membership-tiers") {
                            return (
                                <div className="not-prose my-8">
                                    <MembershipTiers />
                                </div>
                            );
                        }
                    }

                    return (
                        <code className={className} {...props}>
                            {children}
                        </code>
                    );
                },
            }}
        >
            {content}
        </ReactMarkdown>
    );
}
