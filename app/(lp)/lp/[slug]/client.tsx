"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function LPAnimations({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            {children}
        </motion.div>
    );
}

export function FadeInWhenVisible({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            variants={{
                visible: { opacity: 1, y: 0 },
                hidden: { opacity: 0, y: 30 }
            }}
        >
            {children}
        </motion.div>
    );
}

export function StickyMobileCTA({ ctaText, runId }: { ctaText: string, runId: string }) {
    const [isVisible, setIsVisible] = useState(false);
    const searchParams = useSearchParams();

    useEffect(() => {
        const handleScroll = () => {
            // Show CTA after scrolling 400px
            setIsVisible(window.scrollY > 400);
        };

        window.addEventListener('scroll', handleScroll);

        // Auto-track lead on landing (impression)
        const gclid = searchParams.get('gclid');
        if (gclid || searchParams.toString()) {
            fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    runId,
                    gclid,
                    metadata: Object.fromEntries(searchParams.entries())
                })
            }).catch(err => console.error("Lead tracking failed", err));
        }

        return () => window.removeEventListener('scroll', handleScroll);
    }, [runId, searchParams]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    exit={{ y: 100 }}
                    className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border z-[100] md:hidden"
                >
                    <Button asChild className="w-full shadow-lg h-12 text-lg">
                        <Link href={`/book?runId=${runId}${searchParams.get('gclid') ? `&gclid=${searchParams.get('gclid')}` : ''}`}>
                            {ctaText}
                        </Link>
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
