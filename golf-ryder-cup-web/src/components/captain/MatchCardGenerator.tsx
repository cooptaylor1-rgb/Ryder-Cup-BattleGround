/**
 * Match Card Generator
 *
 * Generate printable/shareable scorecard images for each group.
 * Essential for distributing match info at the first tee.
 *
 * Features:
 * - Clean, printable match card design
 * - Shows players, handicaps, tee time, starting hole
 * - QR code for quick app access
 * - Export as image or PDF
 * - Batch print all cards
 * - Share via messaging apps
 * - Format-specific rules snippet
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import {
    Printer,
    Share2,
    QrCode,
    Clock,
    Flag,
    ChevronLeft,
    ChevronRight,
    Check,
    FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface MatchCardPlayer {
    id: string;
    firstName: string;
    lastName: string;
    handicapIndex: number;
    teamId: 'A' | 'B';
    courseHandicap?: number;
}

export interface MatchCardData {
    id: string;
    sessionName: string;
    format: 'singles' | 'foursomes' | 'fourball';
    teeTime: string;
    startingHole: number;
    courseName: string;
    teeSetName: string;
    teamAPlayers: MatchCardPlayer[];
    teamBPlayers: MatchCardPlayer[];
    teamAName?: string;
    teamBName?: string;
    pointsValue: number;
    matchNumber: number;
    totalMatches: number;
    date: string;
}

interface MatchCardGeneratorProps {
    matches: MatchCardData[];
    tripName?: string;
    onShare?: (matchId: string, imageData: string) => void;
    onPrint?: (matchIds: string[]) => void;
    className?: string;
}

// ============================================
// FORMAT RULES
// ============================================

const FORMAT_RULES: Record<string, string> = {
    singles: 'Match Play • Individual • 1 point per match',
    foursomes: 'Alternate Shot • Partners share one ball • 1 point per match',
    fourball: 'Better Ball • Each player plays own ball, best score counts • 1 point per match',
};

// ============================================
// MATCH CARD COMPONENT
// ============================================

interface MatchCardProps {
    match: MatchCardData;
    size?: 'small' | 'medium' | 'large';
    showQR?: boolean;
    tripName?: string;
}

function MatchCard({ match, size = 'medium', showQR = true, tripName }: MatchCardProps) {
    const sizeClasses = {
        small: 'w-72 p-3 text-xs',
        medium: 'w-96 p-4 text-sm',
        large: 'w-[480px] p-6 text-base',
    };

    const getPlayerDisplay = (players: MatchCardPlayer[]) => {
        return players.map(p => ({
            name: `${p.firstName} ${p.lastName}`,
            hcp: p.courseHandicap ?? p.handicapIndex,
        }));
    };

    const teamADisplay = getPlayerDisplay(match.teamAPlayers);
    const teamBDisplay = getPlayerDisplay(match.teamBPlayers);

    return (
        <div
            className={cn(
                'rounded-xl shadow-lg print:shadow-none',
                sizeClasses[size]
            )}
            style={{
                background: '#FFFFFF',
                color: '#1a1a1a',
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
        >
            {/* Header */}
            <div className="border-b border-gray-200 pb-3 mb-3">
                <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900">{tripName || 'Ryder Cup'}</span>
                    <span className="text-gray-500">Match {match.matchNumber}/{match.totalMatches}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">{match.sessionName}</span>
                    <span className="text-gray-500">{match.date}</span>
                </div>
            </div>

            {/* Match Info Bar */}
            <div className="flex items-center justify-between bg-gray-100 rounded-lg p-2 mb-3">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">{match.teeTime}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">Hole {match.startingHole}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-500">{match.teeSetName}</span>
                </div>
            </div>

            {/* Teams */}
            <div className="space-y-3">
                {/* Team A */}
                <div
                    className="rounded-lg p-3"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="font-bold text-red-700">{match.teamAName || 'Team A'}</span>
                    </div>
                    <div className="space-y-1">
                        {teamADisplay.map((player, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <span className="font-medium text-gray-800">{player.name}</span>
                                <span className="text-gray-600 font-mono">HCP {player.hcp}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* VS */}
                <div className="text-center">
                    <span className="text-gray-400 font-bold text-lg">VS</span>
                </div>

                {/* Team B */}
                <div
                    className="rounded-lg p-3"
                    style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="font-bold text-blue-700">{match.teamBName || 'Team B'}</span>
                    </div>
                    <div className="space-y-1">
                        {teamBDisplay.map((player, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <span className="font-medium text-gray-800">{player.name}</span>
                                <span className="text-gray-600 font-mono">HCP {player.hcp}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Format Rules */}
            <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-gray-500 text-center italic">
                    {FORMAT_RULES[match.format]}
                </p>
            </div>

            {/* Course Info */}
            <div className="mt-2 text-center text-gray-400">
                {match.courseName}
            </div>

            {/* QR Code Placeholder */}
            {showQR && (
                <div className="mt-3 flex justify-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <QrCode className="w-10 h-10 text-gray-300" />
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// MATCH CARD GENERATOR
// ============================================

export function MatchCardGenerator({
    matches,
    tripName = 'Ryder Cup',
    onShare,
    onPrint,
    className,
}: MatchCardGeneratorProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [_showPreview, _setShowPreview] = useState(false);
    const [copied, setCopied] = useState(false);
    const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
    const cardRef = useRef<HTMLDivElement>(null);

    const currentMatch = matches[currentIndex];

    const handlePrevious = () => {
        setCurrentIndex(prev => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex(prev => Math.min(matches.length - 1, prev + 1));
    };

    const handleShare = useCallback(async () => {
        if (!currentMatch) return;

        // In a real implementation, this would generate an image
        // For now, we'll create shareable text
        const shareText = `
🏌️ ${tripName} - ${currentMatch.sessionName}
Match ${currentMatch.matchNumber}/${currentMatch.totalMatches}

⏰ ${currentMatch.teeTime} | 🏳️ Hole ${currentMatch.startingHole}

🔴 ${currentMatch.teamAName || 'Team A'}
${currentMatch.teamAPlayers.map(p => `   ${p.firstName} ${p.lastName} (${p.handicapIndex})`).join('\n')}

🔵 ${currentMatch.teamBName || 'Team B'}
${currentMatch.teamBPlayers.map(p => `   ${p.firstName} ${p.lastName} (${p.handicapIndex})`).join('\n')}

📍 ${currentMatch.courseName}
    `.trim();

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${tripName} - Match ${currentMatch.matchNumber}`,
                    text: shareText,
                });
            } catch {
                // User cancelled or error
            }
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(shareText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }

        onShare?.(currentMatch.id, shareText);
    }, [currentMatch, tripName, onShare]);

    const handlePrint = useCallback(() => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const matchesToPrint = selectedCards.size > 0
            ? matches.filter(m => selectedCards.has(m.id))
            : [currentMatch];

        const cardsHtml = matchesToPrint.map(match => `
      <div class="match-card" style="page-break-after: always; margin-bottom: 20px;">
        <div style="border: 2px solid #ccc; border-radius: 12px; padding: 20px; max-width: 400px; margin: 0 auto; font-family: system-ui;">
          <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between;">
              <strong>${tripName}</strong>
              <span>Match ${match.matchNumber}/${match.totalMatches}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 5px;">
              <span>${match.sessionName}</span>
              <span>${match.date}</span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-around; background: #f5f5f5; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
            <span>⏰ ${match.teeTime}</span>
            <span>🏳️ Hole ${match.startingHole}</span>
            <span>${match.teeSetName}</span>
          </div>

          <div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
            <div style="font-weight: bold; color: #b91c1c; margin-bottom: 8px;">🔴 ${match.teamAName || 'Team A'}</div>
            ${match.teamAPlayers.map(p => `<div style="display: flex; justify-content: space-between;"><span>${p.firstName} ${p.lastName}</span><span>HCP ${p.handicapIndex}</span></div>`).join('')}
          </div>

          <div style="text-align: center; font-weight: bold; color: #999; margin: 10px 0;">VS</div>

          <div style="background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
            <div style="font-weight: bold; color: #1d4ed8; margin-bottom: 8px;">🔵 ${match.teamBName || 'Team B'}</div>
            ${match.teamBPlayers.map(p => `<div style="display: flex; justify-content: space-between;"><span>${p.firstName} ${p.lastName}</span><span>HCP ${p.handicapIndex}</span></div>`).join('')}
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 10px; text-align: center; color: #666; font-style: italic;">
            ${FORMAT_RULES[match.format]}
          </div>

          <div style="text-align: center; color: #999; margin-top: 8px; font-size: 12px;">
            ${match.courseName}
          </div>
        </div>
      </div>
    `).join('');

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Match Cards - ${tripName}</title>
          <style>
            @media print {
              .match-card { page-break-after: always; }
              .match-card:last-child { page-break-after: avoid; }
            }
            body { margin: 20px; }
          </style>
        </head>
        <body>${cardsHtml}</body>
      </html>
    `);
        printWindow.document.close();
        printWindow.print();

        onPrint?.(matchesToPrint.map(m => m.id));
    }, [matches, currentMatch, selectedCards, tripName, onPrint]);

    const toggleCardSelection = (matchId: string) => {
        setSelectedCards(prev => {
            const next = new Set(prev);
            if (next.has(matchId)) {
                next.delete(matchId);
            } else {
                next.add(matchId);
            }
            return next;
        });
    };

    const selectAllCards = () => {
        if (selectedCards.size === matches.length) {
            setSelectedCards(new Set());
        } else {
            setSelectedCards(new Set(matches.map(m => m.id)));
        }
    };

    if (matches.length === 0) {
        return (
            <div className="p-8 text-center text-[var(--ink-muted)]">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No matches to generate cards for</p>
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col', className)}>
            {/* Header */}
            <div className="p-4 border-b border-[rgba(128,120,104,0.2)]">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--ink)]">Match Cards</h2>
                        <p className="text-sm text-[var(--ink-muted)]">
                            {matches.length} matches • Ready to print or share
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleShare}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title="Share"
                        >
                            {copied ? (
                                <Check className="w-5 h-5 text-green-500" />
                            ) : (
                                <Share2 className="w-5 h-5 text-[var(--ink-muted)]" />
                            )}
                        </button>
                        <button
                            onClick={handlePrint}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title="Print"
                        >
                            <Printer className="w-5 h-5 text-[var(--ink-muted)]" />
                        </button>
                    </div>
                </div>

                {/* Batch Selection */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={selectAllCards}
                        className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-[var(--ink)] border border-[rgba(128,120,104,0.2)]',
                            selectedCards.size === matches.length ? 'bg-white/10' : ''
                        )}
                    >
                        {selectedCards.size === matches.length ? 'Deselect All' : 'Select All'}
                    </button>
                    {selectedCards.size > 0 && (
                        <span className="text-sm text-[var(--ink-muted)]">{selectedCards.size} selected</span>
                    )}
                </div>
            </div>

            {/* Card Preview */}
            <div className="flex-1 overflow-hidden">
                <div className="p-4 flex items-center justify-center min-h-100">
                    <div ref={cardRef}>
                        <MatchCard match={currentMatch} tripName={tripName} />
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-center gap-4 pb-4">
                    <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        className="p-2 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-[var(--ink)]" />
                    </button>
                    <span className="text-sm font-medium text-[var(--ink)]">
                        {currentIndex + 1} of {matches.length}
                    </span>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex === matches.length - 1}
                        className="p-2 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors"
                    >
                        <ChevronRight className="w-6 h-6 text-[var(--ink)]" />
                    </button>
                </div>
            </div>

            {/* Card Grid Selection */}
            <div className="border-t border-[rgba(128,120,104,0.2)] p-4">
                <p className="text-sm font-medium mb-2 text-[var(--ink-muted)]">Quick Select</p>
                <div className="flex flex-wrap gap-2">
                    {matches.map((match, idx) => (
                        <button
                            key={match.id}
                            onClick={() => {
                                setCurrentIndex(idx);
                                toggleCardSelection(match.id);
                            }}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-[rgba(128,120,104,0.2)] bg-[var(--surface)] text-[var(--ink)]',
                                currentIndex === idx && 'ring-2 ring-[var(--masters)]',
                                selectedCards.has(match.id) && 'bg-[var(--masters-muted)] text-[var(--masters)]'
                            )}
                        >
                            {match.teeTime}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default MatchCardGenerator;
