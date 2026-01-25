/**
 * Quick Photo Capture
 *
 * A premium, one-tap photo capture button designed for the scoring page.
 * Captures memorable moments during play with automatic metadata tagging.
 *
 * Features:
 * - One-tap camera access from scoring screen
 * - Auto-tags with hole number, match, timestamp
 * - Optional caption with voice input
 * - Preview before saving
 * - Haptic feedback on capture
 * - Works offline (stores locally)
 * - Integrates with trip photo gallery
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera,
    X,
    Check,
    Mic,
    MicOff,
    RotateCcw,
    Sparkles,
    MapPin,
    Clock,
    Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mediaLogger } from '@/lib/utils/logger';
// Speech recognition types are global from speech-recognition.d.ts

// Simple haptic feedback helper
function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection') {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        const patterns: Record<typeof type, number | number[]> = {
            light: 10,
            medium: 25,
            heavy: 50,
            success: [50, 50, 50],
            warning: [100, 50, 100],
            error: [200, 100, 200],
            selection: 5,
        };
        navigator.vibrate(patterns[type]);
    }
}

// ============================================
// TYPES
// ============================================

export interface PhotoMetadata {
    matchId: string;
    holeNumber: number;
    timestamp: string;
    caption?: string;
    location?: {
        lat: number;
        lng: number;
    };
    tags?: string[];
}

export interface CapturedPhoto {
    id: string;
    dataUrl: string;
    metadata: PhotoMetadata;
    createdAt: string;
}

interface QuickPhotoCaptureProps {
    /** Match ID for tagging */
    matchId: string;
    /** Current hole number */
    holeNumber: number;
    /** Team names for context */
    teamAName?: string;
    teamBName?: string;
    /** Callback when photo is saved */
    onCapture?: (photo: CapturedPhoto) => void;
    /** Compact mode (just the button) */
    compact?: boolean;
    /** Custom button position class */
    className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function QuickPhotoCapture({
    matchId,
    holeNumber,
    teamAName = 'Team A',
    teamBName = 'Team B',
    onCapture,
    compact = false,
    className,
}: QuickPhotoCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

    // Wrapper for haptic feedback
    const trigger = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection') => {
        triggerHaptic(type);
    }, []);

    // Start camera stream
    const startCamera = useCallback(async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }
        } catch (err) {
            mediaLogger.error('Camera access error:', err);
            setError('Could not access camera. Please check permissions.');
            trigger('error');
        }
    }, [facingMode, trigger]);

    // Stop camera stream
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    // Open camera modal
    const handleOpen = useCallback(async () => {
        trigger('medium');
        setIsOpen(true);
        setCapturedImage(null);
        setCaption('');
        setError(null);

        // Small delay for modal animation
        setTimeout(startCamera, 100);
    }, [startCamera, trigger]);

    // Close camera modal
    const handleClose = useCallback(() => {
        trigger('light');
        stopCamera();
        setIsOpen(false);
        setCapturedImage(null);
        setCaption('');
    }, [stopCamera, trigger]);

    // Capture photo
    const handleCapture = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        trigger('success');
        setIsCapturing(true);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0);

        // Get data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);

        // Flash effect timing
        setTimeout(() => setIsCapturing(false), 150);

        // Stop camera while reviewing
        stopCamera();
    }, [stopCamera, trigger]);

    // Retake photo
    const handleRetake = useCallback(() => {
        trigger('light');
        setCapturedImage(null);
        startCamera();
    }, [startCamera, trigger]);

    // Switch camera
    const handleSwitchCamera = useCallback(() => {
        trigger('selection');
        stopCamera();
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
        setTimeout(startCamera, 100);
    }, [startCamera, stopCamera, trigger]);

    // Save photo
    const handleSave = useCallback(() => {
        if (!capturedImage) return;

        trigger('success');

        const photo: CapturedPhoto = {
            id: crypto.randomUUID(),
            dataUrl: capturedImage,
            metadata: {
                matchId,
                holeNumber,
                timestamp: new Date().toISOString(),
                caption: caption || undefined,
                tags: [
                    `hole-${holeNumber}`,
                    teamAName.toLowerCase().replace(/\s+/g, '-'),
                    teamBName.toLowerCase().replace(/\s+/g, '-'),
                ],
            },
            createdAt: new Date().toISOString(),
        };

        // Store in localStorage for offline support
        try {
            const existing = JSON.parse(localStorage.getItem('tripPhotos') || '[]');
            existing.push(photo);
            localStorage.setItem('tripPhotos', JSON.stringify(existing));
        } catch (e) {
            mediaLogger.error('Failed to save photo locally:', e);
        }

        onCapture?.(photo);
        handleClose();
    }, [capturedImage, caption, matchId, holeNumber, teamAName, teamBName, onCapture, handleClose, trigger]);

    // Voice caption input
    const toggleVoiceInput = useCallback(() => {
        if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
            setError('Voice input not supported on this device');
            return;
        }

        trigger('selection');

        if (isListening) {
            setIsListening(false);
            return;
        }

        const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) return;

        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setCaption(prev => prev ? `${prev} ${transcript}` : transcript);
        };

        recognition.start();
    }, [isListening, trigger]);

    return (
        <>
            {/* Trigger Button */}
            <motion.button
                onClick={handleOpen}
                whileTap={{ scale: 0.9 }}
                className={cn(
                    'relative flex items-center justify-center',
                    'rounded-full shadow-md',
                    'transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    compact
                        ? 'w-10 h-10'
                        : 'w-12 h-12 lg:w-14 lg:h-14',
                    className,
                )}
                style={{
                    background: 'linear-gradient(135deg, var(--surface) 0%, #2A2520 100%)',
                    color: '#F5F1E8',
                    border: '1px solid rgba(128, 120, 104, 0.3)',
                }}
                aria-label={`Capture photo for hole ${holeNumber}`}
            >
                <Camera className={cn(compact ? 'w-5 h-5' : 'w-6 h-6')} />

                {/* Hole badge */}
                {!compact && (
                    <span
                        className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold"
                        style={{
                            background: 'var(--masters)',
                            color: 'white',
                        }}
                    >
                        {holeNumber}
                    </span>
                )}
            </motion.button>

            {/* Camera Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col bg-black"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4">
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                aria-label="Close camera"
                            >
                                <X className="w-6 h-6 text-white" />
                            </button>

                            <div className="flex items-center gap-2 text-white">
                                <Hash className="w-4 h-4 opacity-60" />
                                <span className="text-sm font-medium">Hole {holeNumber}</span>
                            </div>

                            <button
                                onClick={handleSwitchCamera}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                aria-label="Switch camera"
                            >
                                <RotateCcw className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Camera View / Preview */}
                        <div className="flex-1 relative overflow-hidden">
                            {error ? (
                                <div className="absolute inset-0 flex items-center justify-center p-8">
                                    <div className="text-center">
                                        <Camera className="w-16 h-16 text-white/30 mx-auto mb-4" />
                                        <p className="text-white/80 text-sm">{error}</p>
                                    </div>
                                </div>
                            ) : capturedImage ? (
                                <Image
                                    src={capturedImage}
                                    alt="Captured"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                            )}

                            {/* Capture flash effect */}
                            <AnimatePresence>
                                {isCapturing && (
                                    <motion.div
                                        initial={{ opacity: 1 }}
                                        animate={{ opacity: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute inset-0 bg-white"
                                    />
                                )}
                            </AnimatePresence>

                            {/* Hidden canvas for capture */}
                            <canvas ref={canvasRef} className="hidden" />
                        </div>

                        {/* Caption input (when photo captured) */}
                        {capturedImage && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 bg-black/80 backdrop-blur-md"
                            >
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        placeholder="Add a caption..."
                                        className={cn(
                                            'flex-1 px-4 py-3 rounded-xl',
                                            'bg-white/10 text-white placeholder-white/40',
                                            'border border-white/10',
                                            'focus:outline-none focus:ring-2 focus:ring-white/20',
                                        )}
                                    />
                                    <button
                                        onClick={toggleVoiceInput}
                                        className={cn(
                                            'p-3 rounded-xl transition-colors',
                                            isListening
                                                ? 'bg-red-500 text-white'
                                                : 'bg-white/10 text-white hover:bg-white/20',
                                        )}
                                        aria-label={isListening ? 'Stop listening' : 'Voice input'}
                                    >
                                        {isListening ? (
                                            <MicOff className="w-5 h-5" />
                                        ) : (
                                            <Mic className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>

                                {/* Metadata tags */}
                                <div className="flex items-center gap-3 mt-3 text-white/60 text-xs">
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        Hole {holeNumber}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        Auto-tagged
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {/* Bottom controls */}
                        <div className="p-6 pb-safe">
                            {capturedImage ? (
                                <div className="flex items-center justify-center gap-8">
                                    <button
                                        onClick={handleRetake}
                                        className={cn(
                                            'flex flex-col items-center gap-2 p-4 rounded-2xl',
                                            'bg-white/10 text-white',
                                            'hover:bg-white/20 transition-colors',
                                        )}
                                    >
                                        <RotateCcw className="w-6 h-6" />
                                        <span className="text-xs">Retake</span>
                                    </button>

                                    <motion.button
                                        onClick={handleSave}
                                        whileTap={{ scale: 0.95 }}
                                        className={cn(
                                            'flex flex-col items-center gap-2 px-8 py-4 rounded-2xl',
                                            'text-white font-medium',
                                        )}
                                        style={{
                                            background: 'var(--masters)',
                                        }}
                                    >
                                        <Check className="w-6 h-6" />
                                        <span className="text-xs">Save</span>
                                    </motion.button>
                                </div>
                            ) : (
                                <div className="flex justify-center">
                                    <motion.button
                                        onClick={handleCapture}
                                        whileTap={{ scale: 0.9 }}
                                        disabled={!!error}
                                        className={cn(
                                            'w-20 h-20 rounded-full',
                                            'flex items-center justify-center',
                                            'transition-all duration-200',
                                            error && 'opacity-30 cursor-not-allowed',
                                        )}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            border: '4px solid white',
                                        }}
                                        aria-label="Take photo"
                                    >
                                        <div
                                            className="w-14 h-14 rounded-full"
                                            style={{ background: 'white' }}
                                        />
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default QuickPhotoCapture;
