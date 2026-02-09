'use client';

/**
 * 404 Not Found Page
 *
 * Custom 404 page with golf-themed messaging and helpful navigation.
 */

import Link from 'next/link';
import { MapPin, Home, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/layout';

export default function NotFound() {
    const router = useRouter();

    return (
        <div
            className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)] flex flex-col items-center justify-center p-6"
        >
            {/* Golf Flag Icon */}
            <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: 'var(--masters-light)' }}
            >
                <MapPin size={48} style={{ color: 'var(--masters)' }} />
            </div>

            {/* 404 Display */}
            <div
                className="text-7xl font-bold mb-4"
                style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--masters)',
                }}
            >
                404
            </div>

            {/* Title */}
            <h1
                className="text-2xl font-semibold mb-3"
                style={{ color: 'var(--ink)' }}
            >
                Lost in the Rough
            </h1>

            {/* Description */}
            <p
                className="text-center max-w-md mb-8"
                style={{ color: 'var(--ink-secondary)' }}
            >
                Looks like this page went out of bounds. Let&apos;s get you back on the fairway.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={() => router.back()}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-opacity hover:opacity-90"
                    style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--rule)',
                        color: 'var(--ink)',
                    }}
                >
                    <ArrowLeft size={18} />
                    Go Back
                </button>

                <Link
                    href="/"
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-opacity hover:opacity-90"
                    style={{
                        background: 'var(--masters)',
                        color: 'white',
                    }}
                >
                    <Home size={18} />
                    Home
                </Link>
            </div>

            {/* Quick Links */}
            <div className="mt-12 text-center">
                <p
                    className="text-sm mb-4"
                    style={{ color: 'var(--ink-tertiary)' }}
                >
                    Popular destinations:
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                    {[
                        { href: '/standings', label: 'Standings' },
                        { href: '/score', label: 'Score' },
                        { href: '/schedule', label: 'Schedule' },
                        { href: '/players', label: 'Players' },
                    ].map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-opacity-80"
                            style={{
                                background: 'var(--surface)',
                                color: 'var(--ink-secondary)',
                            }}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
