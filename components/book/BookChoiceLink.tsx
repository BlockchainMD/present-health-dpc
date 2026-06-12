"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { AnalyticsEvents, trackEvent } from "@/lib/analytics";

type BookChoice = "membership" | "single_visit";

type BookChoiceLinkProps = {
    href: string;
    choice: BookChoice;
    label: string;
    className?: string;
    children: ReactNode;
    "aria-label"?: string;
};

export function BookChoiceLink({
    href,
    choice,
    label,
    className,
    children,
    "aria-label": ariaLabel,
}: BookChoiceLinkProps) {
    const eventType =
        choice === "membership" ? AnalyticsEvents.JOIN_CLICK : AnalyticsEvents.VISIT_PATH_CLICK;

    return (
        <Link
            href={href}
            className={className}
            aria-label={ariaLabel}
            data-book-choice-link="true"
            onClick={() => {
                trackEvent({
                    eventType,
                    path: "/book",
                    metadata: {
                        category: "book_choice",
                        label,
                        content_type: "booking_path",
                        item_id: choice,
                    },
                });
            }}
        >
            {children}
        </Link>
    );
}
