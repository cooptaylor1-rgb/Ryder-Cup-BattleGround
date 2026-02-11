/**
 * Scorecard Scanner Component
 *
 * Allows users to:
 * - Take photo of a scorecard with phone camera
 * - Upload an existing image
 * - Auto-populate course data via OCR
 *
 * Uses the existing /api/scorecard-ocr endpoint.
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import NextImage from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera,
    Upload,
    X,
    Check,
    Loader2,
    AlertCircle,
    Sparkles,
    Image as ImageIcon,
    RotateCcw,
    ZoomIn,
} from 'lucide-react';
import { useUIStore } from '@/lib/stores';
import { useHaptic } from '@/lib/hooks/useHaptic';
import { ocrLogger } from '@/lib/utils/logger';

// Types from the OCR API
interface HoleData {
    par: number;
    handicap: number;
    yardage: number | null;
}

interface TeeSetData {
    name: string;
    color?: string;
    rating?: number;
    slope?: number;
    yardages: (number | null)[];
}

interface ScorecardData {
    courseName?: string;
    teeName?: string;
    rating?: number;
    slope?: number;
    holes: HoleData[];
    teeSets?: TeeSetData[];
}

interface ScorecardScannerProps {
    onScanComplete: (data: ScorecardData) => void;
    onCancel?: () => void;
}

interface CapturedImage {
    dataUrl: string;
    mimeType: string;
    label: string;
}

export function ScorecardScanner({ onScanComplete, onCancel }: ScorecardScannerProps) {
    const { showToast } = useUIStore();
    const { trigger } = useHaptic();

    const [mode, setMode] = useState<'select' | 'camera' | 'preview' | 'processing' | 'result'>('select');
    const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
    const [currentCapture, setCurrentCapture] = useState<'front' | 'back'>('front');
    const [scanResult, setScanResult] = useState<ScorecardData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const multiFileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Start camera
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Back camera for scanning
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setMode('camera');
        } catch (err) {
            ocrLogger.error('Camera access denied:', err);
            showToast('error', 'Camera access denied. Please allow camera access or upload an image.');
        }
    }, [showToast]);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    // Capture photo
    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.9);
            const newImage: CapturedImage = {
                dataUrl: imageData,
                mimeType: 'image/jpeg',
                label: currentCapture === 'front' ? 'Front (Holes & Yardages)' : 'Back (Ratings & Slope)',
            };
            setCapturedImages(prev => [...prev, newImage]);
            stopCamera();
            setMode('preview');
            trigger('success');
        }
    }, [stopCamera, trigger, currentCapture]);

    // Handle single file upload
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('error', 'Please upload an image file (JPG, PNG, etc.)');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const newImage: CapturedImage = {
                dataUrl: reader.result as string,
                mimeType: file.type,
                label: capturedImages.length === 0 ? 'Front (Holes & Yardages)' : 'Back (Ratings & Slope)',
            };
            setCapturedImages(prev => [...prev, newImage]);
            setMode('preview');
        };
        reader.readAsDataURL(file);
    }, [showToast, capturedImages.length]);

    // Handle multiple file upload
    const handleMultiFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) {
            showToast('error', 'Please upload image files (JPG, PNG, etc.)');
            return;
        }

        const labels = ['Front (Holes & Yardages)', 'Back (Ratings & Slope)', 'Additional'];
        const newImages: CapturedImage[] = [];

        validFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = () => {
                newImages.push({
                    dataUrl: reader.result as string,
                    mimeType: file.type,
                    label: labels[index] || `Image ${index + 1}`,
                });

                // When all files are read, update state
                if (newImages.length === validFiles.length) {
                    setCapturedImages(newImages);
                    setMode('preview');
                }
            };
            reader.readAsDataURL(file);
        });
    }, [showToast]);

    // Add another image
    const addAnotherImage = useCallback(() => {
        setCurrentCapture('back');
        setMode('select');
    }, []);

    // Process image(s) with OCR
    const processImage = useCallback(async () => {
        if (capturedImages.length === 0) return;

        setIsLoading(true);
        setMode('processing');
        setError(null);

        try {
            // Build request body based on number of images
            let requestBody;

            if (capturedImages.length === 1) {
                // Single image (backward compatible)
                const base64Data = capturedImages[0].dataUrl.split(',')[1];
                requestBody = {
                    image: base64Data,
                    mimeType: capturedImages[0].mimeType,
                };
            } else {
                // Multiple images
                const images = capturedImages.map(img => ({
                    image: img.dataUrl.split(',')[1],
                    mimeType: img.mimeType,
                    label: img.label,
                }));
                requestBody = { images };
            }

            const response = await fetch('/api/scorecard-ocr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to process scorecard');
            }

            if (result.success && result.data) {
                setScanResult(result.data);
                setMode('result');
                trigger('success');
            } else {
                throw new Error('No data extracted from scorecard');
            }
        } catch (err) {
            ocrLogger.error('OCR processing error:', err);
            setError(err instanceof Error ? err.message : 'Failed to process scorecard');
            setMode('preview');
            showToast('error', 'Failed to read scorecard. Try clearer images.');
        } finally {
            setIsLoading(false);
        }
    }, [capturedImages, trigger, showToast]);

    // Remove an image from the list
    const removeImage = useCallback((index: number) => {
        setCapturedImages(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Reset scanner
    const reset = useCallback(() => {
        stopCamera();
        setCapturedImages([]);
        setCurrentCapture('front');
        setScanResult(null);
        setError(null);
        setMode('select');
    }, [stopCamera]);

    // Confirm and use result
    const confirmResult = useCallback(() => {
        if (scanResult) {
            onScanComplete(scanResult);
        }
    }, [scanResult, onScanComplete]);

    return (
        <div className="fixed inset-0 z-50 bg-[var(--canvas)] flex flex-col">
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 border-b border-[var(--rule)]"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
            >
                <button
                    onClick={onCancel || reset}
                    className="p-2 rounded-full hover:bg-[var(--surface-raised)]"
                    aria-label="Cancel"
                >
                    <X size={24} />
                </button>
                <h1 className="font-semibold">Scan Scorecard</h1>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                    {/* Mode: Select */}
                    {mode === 'select' && (
                        <motion.div
                            key="select"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col items-center justify-center p-6 gap-6"
                        >
                            <div
                                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                                style={{ background: 'var(--masters-subtle)' }}
                            >
                                <Sparkles size={40} style={{ color: 'var(--masters)' }} />
                            </div>

                            <div className="text-center">
                                <h2 className="text-xl font-bold mb-2">
                                    {capturedImages.length === 0 ? 'Quick Course Setup' : 'Add Back Side'}
                                </h2>
                                <p className="text-[var(--ink-secondary)]">
                                    {capturedImages.length === 0
                                        ? 'Capture both sides of the scorecard for complete data (holes, yardages, ratings, and slope)'
                                        : 'Add the back of the scorecard for ratings and slope information'
                                    }
                                </p>
                            </div>

                            {/* Show captured images count */}
                            {capturedImages.length > 0 && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600">
                                    <Check size={16} />
                                    <span className="text-sm font-medium">
                                        {capturedImages.length} image{capturedImages.length > 1 ? 's' : ''} captured
                                    </span>
                                </div>
                            )}

                            <div className="w-full max-w-sm space-y-3">
                                <button
                                    onClick={startCamera}
                                    className="w-full py-4 rounded-xl flex items-center justify-center gap-3 font-medium"
                                    style={{ background: 'var(--masters)', color: 'white' }}
                                >
                                    <Camera size={20} />
                                    {capturedImages.length === 0 ? 'Take Photo' : 'Take Another Photo'}
                                </button>

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-4 rounded-xl flex items-center justify-center gap-3 font-medium bg-[var(--surface)] border border-[var(--rule)] hover:bg-[var(--surface-raised)]"
                                >
                                    <Upload size={20} />
                                    Upload Image
                                </button>

                                {capturedImages.length === 0 && (
                                    <button
                                        onClick={() => multiFileInputRef.current?.click()}
                                        className="w-full py-3 rounded-xl flex items-center justify-center gap-3 text-sm bg-[var(--surface)] border border-[var(--rule)] hover:bg-[var(--surface-raised)]"
                                    >
                                        <ImageIcon size={18} />
                                        Upload Multiple Images
                                    </button>
                                )}

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />

                                <input
                                    ref={multiFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleMultiFileUpload}
                                />
                            </div>

                            {capturedImages.length > 0 && (
                                <button
                                    onClick={() => setMode('preview')}
                                    className="text-sm underline text-[var(--ink-secondary)] hover:text-[var(--ink)]"
                                >
                                    Continue with {capturedImages.length} image{capturedImages.length > 1 ? 's' : ''}
                                </button>
                            )}

                            <p className="text-xs text-[var(--ink-secondary)] text-center max-w-xs">
                                💡 Tip: Capture front (holes/yardages) and back (ratings/slope) for best results
                            </p>
                        </motion.div>
                    )}

                    {/* Mode: Camera */}
                    {mode === 'camera' && (
                        <motion.div
                            key="camera"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full relative bg-black"
                        >
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />

                            {/* Capture guide overlay */}
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute inset-8 border-2 border-white/50 rounded-2xl" />
                                <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 text-center text-white text-sm bg-black/50 py-2 rounded-lg">
                                    Align scorecard within frame
                                </div>
                            </div>

                            {/* Capture button */}
                            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                                <button
                                    onClick={capturePhoto}
                                    className="w-20 h-20 rounded-full bg-white flex items-center justify-center"
                                    style={{ boxShadow: '0 0 0 4px rgba(255,255,255,0.3)' }}
                                >
                                    <div
                                        className="w-16 h-16 rounded-full"
                                        style={{ background: 'var(--masters)' }}
                                    />
                                </button>
                            </div>

                            <canvas ref={canvasRef} className="hidden" />
                        </motion.div>
                    )}

                    {/* Mode: Preview */}
                    {mode === 'preview' && capturedImages.length > 0 && (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col"
                        >
                            {/* Image preview - scrollable for multiple images */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {capturedImages.map((img, index) => (
                                    <div key={index} className="relative bg-black rounded-xl overflow-hidden">
                                        <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10">
                                            <span className="px-2 py-1 text-xs font-medium bg-black/60 text-white rounded">
                                                {img.label}
                                            </span>
                                            <button
                                                onClick={() => removeImage(index)}
                                                className="p-1.5 bg-red-500/80 rounded-full hover:bg-red-500"
                                            >
                                                <X size={14} className="text-white" />
                                            </button>
                                        </div>
                                        <NextImage
                                            src={img.dataUrl}
                                            alt={img.label}
                                            width={400}
                                            height={256}
                                            className="w-full max-h-64 object-contain"
                                            unoptimized
                                        />
                                    </div>
                                ))}

                                {/* Add another image button */}
                                {capturedImages.length < 3 && (
                                    <button
                                        onClick={addAnotherImage}
                                        className="w-full py-4 border-2 border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-muted-foreground/50 transition-colors"
                                    >
                                        <ImageIcon size={24} className="text-[var(--ink-secondary)]" />
                                        <span className="text-sm text-[var(--ink-secondary)]">
                                            Add {capturedImages.length === 1 ? 'back side' : 'another'} image
                                        </span>
                                    </button>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-4 border-t border-[var(--rule)] space-y-3">
                                {error && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-500">
                                        <AlertCircle size={16} />
                                        <span className="text-sm">{error}</span>
                                    </div>
                                )}

                                <button
                                    onClick={processImage}
                                    disabled={isLoading}
                                    className="w-full py-4 rounded-xl flex items-center justify-center gap-3 font-medium disabled:opacity-50"
                                    style={{ background: 'var(--masters)', color: 'white' }}
                                >
                                    {isLoading ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <ZoomIn size={20} />
                                    )}
                                    Extract Course Data ({capturedImages.length} image{capturedImages.length > 1 ? 's' : ''})
                                </button>

                                <button
                                    onClick={reset}
                                    className="w-full py-3 rounded-xl flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--rule)] hover:bg-[var(--surface-raised)]"
                                >
                                    <RotateCcw size={18} />
                                    Start Over
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Mode: Processing */}
                    {mode === 'processing' && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col items-center justify-center p-6 gap-4"
                        >
                            <div
                                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                                style={{ background: 'var(--masters-subtle)' }}
                            >
                                <Loader2
                                    size={40}
                                    className="animate-spin"
                                    style={{ color: 'var(--masters)' }}
                                />
                            </div>

                            <div className="text-center">
                                <h2 className="text-lg font-semibold mb-1">Reading Scorecard...</h2>
                                <p className="text-sm text-[var(--ink-secondary)]">
                                    AI is extracting hole data
                                </p>
                            </div>

                            <div className="flex gap-1">
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [0.5, 1, 0.5],
                                        }}
                                        transition={{
                                            duration: 1,
                                            repeat: Infinity,
                                            delay: i * 0.2,
                                        }}
                                        className="w-2 h-2 rounded-full"
                                        style={{ background: 'var(--masters)' }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Mode: Result */}
                    {mode === 'result' && scanResult && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col"
                        >
                            {/* Success header */}
                            <div className="p-4 flex items-center gap-3 border-b border-[var(--rule)]">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[color:var(--success)]/15">
                                    <Check size={20} className="text-[var(--success)]" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">Data Extracted!</h2>
                                    {scanResult.courseName && (
                                        <p className="text-sm text-[var(--ink-secondary)]">
                                            {scanResult.courseName}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Data preview */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Holes summary */}
                                <div className="bg-[var(--canvas-sunken)] rounded-xl p-4">
                                    <h3 className="font-medium mb-3">
                                        {scanResult.holes.length} Holes Detected
                                    </h3>

                                    {/* Front 9 */}
                                    <div className="mb-4">
                                        <p className="text-xs text-[var(--ink-secondary)] mb-2">Front 9</p>
                                        <div className="grid grid-cols-9 gap-1">
                                            {scanResult.holes.slice(0, 9).map((hole, i) => (
                                                <div
                                                    key={i}
                                                    className="text-center bg-[var(--surface)] rounded p-1"
                                                >
                                                    <div className="text-xs text-[var(--ink-secondary)]">
                                                        {i + 1}
                                                    </div>
                                                    <div className="font-medium text-sm">
                                                        {hole.par}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Back 9 */}
                                    {scanResult.holes.length > 9 && (
                                        <div>
                                            <p className="text-xs text-[var(--ink-secondary)] mb-2">Back 9</p>
                                            <div className="grid grid-cols-9 gap-1">
                                                {scanResult.holes.slice(9, 18).map((hole, i) => (
                                                    <div
                                                        key={i}
                                                        className="text-center bg-[var(--surface)] rounded p-1"
                                                    >
                                                        <div className="text-xs text-[var(--ink-secondary)]">
                                                            {i + 10}
                                                        </div>
                                                        <div className="font-medium text-sm">
                                                            {hole.par}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-3 flex gap-4 text-sm">
                                        <div>
                                            <span className="text-[var(--ink-secondary)]">Total Par:</span>{' '}
                                            <span className="font-medium">
                                                {scanResult.holes.reduce((sum, h) => sum + h.par, 0)}
                                            </span>
                                        </div>
                                        {scanResult.rating && (
                                            <div>
                                                <span className="text-[var(--ink-secondary)]">Rating:</span>{' '}
                                                <span className="font-medium">{scanResult.rating}</span>
                                            </div>
                                        )}
                                        {scanResult.slope && (
                                            <div>
                                                <span className="text-[var(--ink-secondary)]">Slope:</span>{' '}
                                                <span className="font-medium">{scanResult.slope}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tee sets */}
                                {scanResult.teeSets && scanResult.teeSets.length > 0 && (
                                    <div className="bg-[var(--canvas-sunken)] rounded-xl p-4">
                                        <h3 className="font-medium mb-3">
                                            {scanResult.teeSets.length} Tee Sets Found
                                        </h3>
                                        <div className="space-y-2">
                                            {scanResult.teeSets.map((tee, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-2 text-sm"
                                                >
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{
                                                            background: getTeeColor(tee.name || tee.color),
                                                        }}
                                                    />
                                                    <span className="font-medium">{tee.name}</span>
                                                    {tee.rating && (
                                                        <span className="text-[var(--ink-secondary)]">
                                                            {tee.rating}/{tee.slope}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-4 border-t border-[var(--rule)] space-y-2">
                                <button
                                    onClick={confirmResult}
                                    className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-medium"
                                    style={{ background: 'var(--masters)', color: 'white' }}
                                >
                                    <Check size={20} />
                                    Use This Data
                                </button>
                                <button
                                    onClick={reset}
                                    className="w-full py-3 rounded-xl bg-[var(--surface)] border border-[var(--rule)] hover:bg-[var(--surface-raised)]"
                                >
                                    Scan Again
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Safe area */}
            <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
        </div>
    );
}

// Helper to get tee color
function getTeeColor(teeName?: string): string {
    const name = teeName?.toLowerCase() || '';
    if (name.includes('black')) return '#1a1a1a';
    if (name.includes('blue')) return '#2563eb';
    if (name.includes('white')) return '#e5e5e5';
    if (name.includes('gold') || name.includes('yellow')) return '#eab308';
    if (name.includes('red')) return '#dc2626';
    if (name.includes('green')) return '#16a34a';
    return '#6b7280';
}

// Quick action button to trigger scanner
interface ScanScorecardButtonProps {
    onScanComplete: (data: ScorecardData) => void;
    variant?: 'default' | 'compact';
}

export function ScanScorecardButton({ onScanComplete, variant = 'default' }: ScanScorecardButtonProps) {
    const [showScanner, setShowScanner] = useState(false);

    return (
        <>
            {variant === 'default' ? (
                <button
                    onClick={() => setShowScanner(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--rule)] hover:bg-[var(--surface-raised)] transition-colors"
                >
                    <Camera size={18} />
                    <span className="font-medium">Scan Scorecard</span>
                </button>
            ) : (
                <button
                    onClick={() => setShowScanner(true)}
                    className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--rule)] hover:bg-[var(--surface-raised)]"
                    title="Scan Scorecard"
                >
                    <Camera size={18} />
                </button>
            )}

            {showScanner && (
                <ScorecardScanner
                    onScanComplete={(data) => {
                        onScanComplete(data);
                        setShowScanner(false);
                    }}
                    onCancel={() => setShowScanner(false)}
                />
            )}
        </>
    );
}
