"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const HERO_VIDEO = {
    mp4: "/media/hero/doctor-consult-a.mp4",
    webm: "/media/hero/doctor-consult-a.webm",
    posterJpg: "/media/hero/doctor-consult-a-poster.jpg",
    posterWebp: "/media/hero/doctor-consult-a-poster.webp",
} as const;

const DESKTOP_QUERY = "(min-width: 768px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function bindMediaQuery(query: MediaQueryList, onChange: () => void) {
    if (typeof query.addEventListener === "function") {
        query.addEventListener("change", onChange);
        return () => query.removeEventListener("change", onChange);
    }

    query.addListener(onChange);
    return () => query.removeListener(onChange);
}

export function HeroBackgroundMedia() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isDesktop, setIsDesktop] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);
    const [shouldRenderVideo, setShouldRenderVideo] = useState(false);
    const [isVideoVisible, setIsVideoVisible] = useState(false);

    useEffect(() => {
        const desktopQuery = window.matchMedia(DESKTOP_QUERY);
        const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);

        const syncPreferences = () => {
            setIsDesktop(desktopQuery.matches);
            setPrefersReducedMotion(reducedMotionQuery.matches);
        };

        syncPreferences();

        const unbindDesktop = bindMediaQuery(desktopQuery, syncPreferences);
        const unbindReducedMotion = bindMediaQuery(reducedMotionQuery, syncPreferences);

        return () => {
            unbindDesktop();
            unbindReducedMotion();
        };
    }, []);

    useEffect(() => {
        const shouldUseVideo = isDesktop && !prefersReducedMotion;

        if (!shouldUseVideo) {
            setShouldRenderVideo(false);
            setIsVideoVisible(false);
            videoRef.current?.pause();
            return;
        }

        let idleId: number | undefined;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        let cancelled = false;

        const startEnhancement = () => {
            if ("requestIdleCallback" in window) {
                idleId = window.requestIdleCallback(() => {
                    if (!cancelled) {
                        setShouldRenderVideo(true);
                    }
                }, { timeout: 1200 });
                return;
            }

            timeoutId = window.setTimeout(() => {
                if (!cancelled) {
                    setShouldRenderVideo(true);
                }
            }, 250);
        };

        if (document.readyState === "complete") {
            startEnhancement();
        } else {
            window.addEventListener("load", startEnhancement, { once: true });
        }

        return () => {
            cancelled = true;
            window.removeEventListener("load", startEnhancement);

            if (typeof idleId === "number" && "cancelIdleCallback" in window) {
                window.cancelIdleCallback(idleId);
            }

            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [isDesktop, prefersReducedMotion]);

    useEffect(() => {
        if (!shouldRenderVideo || !videoRef.current) {
            return;
        }

        const video = videoRef.current;

        const playVideo = async () => {
            try {
                await video.play();
                setIsVideoVisible(true);
            } catch {
                setIsVideoVisible(false);
            }
        };

        if (video.readyState >= 2) {
            void playVideo();
        }
    }, [shouldRenderVideo]);

    return (
        <div className="absolute inset-0 overflow-hidden">
            <Image
                src={HERO_VIDEO.posterWebp}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-[70%_center] md:object-[60%_center] xl:object-[55%_center]"
            />
            {shouldRenderVideo ? (
                <video
                    ref={videoRef}
                    aria-hidden="true"
                    autoPlay
                    className={`absolute inset-0 h-full w-full object-cover object-[70%_center] transition-opacity duration-700 ease-out md:object-[60%_center] xl:object-[55%_center] ${isVideoVisible ? "opacity-100" : "opacity-0"}`}
                    loop
                    muted
                    playsInline
                    poster={HERO_VIDEO.posterJpg}
                    preload="metadata"
                    onCanPlay={() => {
                        void videoRef.current?.play().then(() => setIsVideoVisible(true)).catch(() => setIsVideoVisible(false));
                    }}
                >
                    <source src={HERO_VIDEO.webm} type="video/webm" />
                    <source src={HERO_VIDEO.mp4} type="video/mp4" />
                </video>
            ) : null}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(55,120,96,0.34),transparent_38%)]" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-950/72 to-slate-950/38" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/82 via-slate-950/10 to-slate-950/52" />
            <div className="absolute inset-0 bg-noise opacity-20" />
        </div>
    );
}
