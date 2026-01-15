/**
 * PhotoCapture Component — Phase 3: Social & Engagement
 *
 * Camera capture with rich context tagging:
 * - Native camera access
 * - Photo preview with crop
 * - Context tagging (hole, match, moment type)
 * - Quick upload with progress
 * - Offline queue support
 *
 * Makes capturing trip moments effortless.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera,
    X,
    Check,
    RotateCcw,
    Sparkles,
    MapPin,
    Trophy,
    Flag,
    Users,
    Image as ImageIcon,
    Loader2,
    ZoomIn,
    ZoomOut,
    FlipHorizontal,
    Upload,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';

// ============================================
// TYPES
// ============================================

export type MomentType =
    | 'ace_attempt'
    | 'great_shot'
    | 'celebration'
    | 'scenery'
    | 'group_photo'
    | 'trophy'
    | 'funny'
    | 'action'
    | 'other';

export interface PhotoContext {
    holeNumber?: number;
    matchId?: string;
    matchNumber?: number;
    momentType: MomentType;
    taggedPlayerIds?: string[];
    caption?: string;
}

export interface CapturedPhoto {
    id: string;
    blob: Blob;
    dataUrl: string;
    context: PhotoContext;
    timestamp: string;
    isUploading: boolean;
    isUploaded: boolean;
    uploadError?: string;
}

interface PhotoCaptureProps {
    tripId: string;
    currentMatchId?: string;
    currentMatchNumber?: number;
    currentHole?: number;
    players?: Array<{ id: string; name: string; avatarUrl?: string }>;
    onCapture: (photo: CapturedPhoto) => void;
    onUpload?: (photo: CapturedPhoto) => Promise<void>;
    isOnline?: boolean;
    className?: string;
}

// ============================================
// HELPER DATA
// ============================================

const MOMENT_TYPES: { type: MomentType; label: string; icon: typeof Trophy; color: string }[] = [
    { type: 'great_shot', label: 'Great Shot', icon: Sparkles, color: '#F59E0B' },
    { type: 'celebration', label: 'Celebration', icon: Trophy, color: '#22C55E' },
    { type: 'group_photo', label: 'Group Photo', icon: Users, color: '#3B82F6' },
    { type: 'scenery', label: 'Scenery', icon: MapPin, color: '#8B5CF6' },
    { type: 'action', label: 'Action Shot', icon: Flag, color: '#EF4444' },
    { type: 'funny', label: 'Funny Moment', icon: Sparkles, color: '#EC4899' },
];

// ============================================
// CAMERA VIEW COMPONENT
// ============================================

interface CameraViewProps {
    onCapture: (blob: Blob, dataUrl: string) => void;
    onClose: () => void;
}

function CameraView({ onCapture, onClose }: CameraViewProps) {
    const haptic = useHaptic();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Start camera
    const startCamera = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Stop existing stream
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(newStream);

            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
                await videoRef.current.play();
            }
        } catch (err) {
            console.error('Camera error:', err);
            setError('Could not access camera. Please check permissions.');
        } finally {
            setIsLoading(false);
        }
    }, [facingMode, stream]);

    useEffect(() => {
        startCamera();
        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facingMode]);

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        haptic.heavy();

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Set canvas size to video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0);

        // Convert to blob and data URL
        canvas.toBlob((blob) => {
            if (blob) {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                onCapture(blob, dataUrl);
            }
        }, 'image/jpeg', 0.9);
    };

    const handleFlip = () => {
        haptic.tap();
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    return (
        <div className="fixed inset-0 bg-black z-50">
            {/* Camera Preview */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
                    <div className="text-center">
                        <p className="text-white text-lg mb-4">{error}</p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white text-black rounded-lg font-medium"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 pb-safe">
                <div className="flex items-center justify-between px-6 py-8">
                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>

                    {/* Capture */}
                    <motion.button
                        onClick={handleCapture}
                        disabled={isLoading || !!error}
                        whileTap={{ scale: 0.9 }}
                        className="w-20 h-20 rounded-full bg-white flex items-center justify-center"
                        style={{ boxShadow: '0 0 0 4px rgba(255,255,255,0.3)' }}
                    >
                        <div className="w-16 h-16 rounded-full bg-white border-4 border-gray-200" />
                    </motion.button>

                    {/* Flip */}
                    <button
                        onClick={handleFlip}
                        className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center"
                    >
                        <FlipHorizontal className="w-6 h-6 text-white" />
                    </button>
                </div>
            </div>

            {/* Top Safe Area */}
            <div className="absolute top-0 left-0 right-0 pt-safe">
                <div className="flex items-center justify-center py-4">
                    <span className="text-white/70 text-sm font-medium">Take Photo</span>
                </div>
            </div>
        </div>
    );
}

// ============================================
// PHOTO PREVIEW COMPONENT
// ============================================

interface PhotoPreviewProps {
    dataUrl: string;
    context: PhotoContext;
    players?: Array<{ id: string; name: string; avatarUrl?: string }>;
    onContextChange: (context: PhotoContext) => void;
    onConfirm: () => void;
    onRetake: () => void;
    isUploading: boolean;
}

function PhotoPreview({
    dataUrl,
    context,
    players = [],
    onContextChange,
    onConfirm,
    onRetake,
    isUploading,
}: PhotoPreviewProps) {
    const haptic = useHaptic();
    const [showTagPicker, setShowTagPicker] = useState(false);

    const handleMomentTypeChange = (type: MomentType) => {
        haptic.tap();
        onContextChange({ ...context, momentType: type });
    };

    const handleHoleChange = (hole: number | undefined) => {
        haptic.tap();
        onContextChange({ ...context, holeNumber: hole });
    };

    const handleToggleTag = (playerId: string) => {
        haptic.tap();
        const currentTags = context.taggedPlayerIds || [];
        const newTags = currentTags.includes(playerId)
            ? currentTags.filter(id => id !== playerId)
            : [...currentTags, playerId];
        onContextChange({ ...context, taggedPlayerIds: newTags });
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Photo */}
            <div className="flex-1 relative overflow-hidden">
                <img
                    src={dataUrl}
                    alt="Captured"
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Context Panel */}
            <div className="bg-gray-900 p-4 space-y-4 max-h-[50vh] overflow-y-auto">
                {/* Moment Type */}
                <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                        Moment Type
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {MOMENT_TYPES.map(({ type, label, icon: Icon, color }) => (
                            <button
                                key={type}
                                onClick={() => handleMomentTypeChange(type)}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                                    context.momentType === type
                                        ? 'text-white ring-2 ring-offset-2 ring-offset-gray-900'
                                        : 'text-gray-300 bg-gray-800'
                                )}
                                style={{
                                    background: context.momentType === type ? color : undefined,
                                    ringColor: color,
                                }}
                            >
                                <Icon size={14} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Hole Number */}
                <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                        Hole (optional)
                    </label>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        <button
                            onClick={() => handleHoleChange(undefined)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0',
                                context.holeNumber === undefined
                                    ? 'bg-white text-black'
                                    : 'bg-gray-800 text-gray-300'
                            )}
                        >
                            None
                        </button>
                        {Array.from({ length: 18 }, (_, i) => i + 1).map((hole) => (
                            <button
                                key={hole}
                                onClick={() => handleHoleChange(hole)}
                                className={cn(
                                    'w-9 h-9 rounded-lg text-sm font-medium transition-all shrink-0',
                                    context.holeNumber === hole
                                        ? 'bg-white text-black'
                                        : 'bg-gray-800 text-gray-300'
                                )}
                            >
                                {hole}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tag Players */}
                {players.length > 0 && (
                    <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                            Tag Players
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {players.map((player) => {
                                const isTagged = context.taggedPlayerIds?.includes(player.id);
                                return (
                                    <button
                                        key={player.id}
                                        onClick={() => handleToggleTag(player.id)}
                                        className={cn(
                                            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                                            isTagged
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-800 text-gray-300'
                                        )}
                                    >
                                        {player.avatarUrl ? (
                                            <img
                                                src={player.avatarUrl}
                                                alt=""
                                                className="w-5 h-5 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-xs">
                                                {player.name.charAt(0)}
                                            </div>
                                        )}
                                        {player.name.split(' ')[0]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Caption */}
                <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
                        Caption (optional)
                    </label>
                    <input
                        type="text"
                        value={context.caption || ''}
                        onChange={(e) => onContextChange({ ...context, caption: e.target.value })}
                        placeholder="Add a caption..."
                        className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white placeholder-gray-500 text-sm"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-900 border-t border-gray-800 p-4 pb-safe">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onRetake}
                        disabled={isUploading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-800 text-white font-medium"
                    >
                        <RotateCcw size={18} />
                        Retake
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isUploading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-semibold"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Save Photo
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// MAIN PHOTO CAPTURE COMPONENT
// ============================================

export function PhotoCapture({
    tripId,
    currentMatchId,
    currentMatchNumber,
    currentHole,
    players = [],
    onCapture,
    onUpload,
    isOnline = true,
    className,
}: PhotoCaptureProps) {
    const haptic = useHaptic();
    const [showCamera, setShowCamera] = useState(false);
    const [capturedPhoto, setCapturedPhoto] = useState<{ blob: Blob; dataUrl: string } | null>(null);
    const [context, setContext] = useState<PhotoContext>({
        matchId: currentMatchId,
        matchNumber: currentMatchNumber,
        holeNumber: currentHole,
        momentType: 'great_shot',
    });
    const [isUploading, setIsUploading] = useState(false);

    const handleOpenCamera = () => {
        haptic.tap();
        setShowCamera(true);
    };

    const handleCameraCapture = (blob: Blob, dataUrl: string) => {
        setCapturedPhoto({ blob, dataUrl });
        setShowCamera(false);
    };

    const handleCloseCamera = () => {
        setShowCamera(false);
    };

    const handleRetake = () => {
        haptic.tap();
        setCapturedPhoto(null);
        setShowCamera(true);
    };

    const handleConfirm = async () => {
        if (!capturedPhoto) return;

        haptic.heavy();

        const photo: CapturedPhoto = {
            id: crypto.randomUUID(),
            blob: capturedPhoto.blob,
            dataUrl: capturedPhoto.dataUrl,
            context,
            timestamp: new Date().toISOString(),
            isUploading: true,
            isUploaded: false,
        };

        onCapture(photo);

        if (onUpload && isOnline) {
            setIsUploading(true);
            try {
                await onUpload(photo);
                photo.isUploading = false;
                photo.isUploaded = true;
            } catch (error) {
                photo.isUploading = false;
                photo.uploadError = 'Upload failed';
            } finally {
                setIsUploading(false);
            }
        }

        // Reset state
        setCapturedPhoto(null);
        setContext({
            matchId: currentMatchId,
            matchNumber: currentMatchNumber,
            holeNumber: currentHole,
            momentType: 'great_shot',
        });
    };

    return (
        <>
            {/* Capture Button */}
            <motion.button
                onClick={handleOpenCamera}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    'relative flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                    className
                )}
                style={{ background: 'var(--masters)', color: 'white' }}
            >
                <Camera size={18} />
                Capture Moment
                {!isOnline && (
                    <WifiOff size={14} className="absolute -top-1 -right-1 text-amber-400" />
                )}
            </motion.button>

            {/* Camera View */}
            <AnimatePresence>
                {showCamera && (
                    <CameraView
                        onCapture={handleCameraCapture}
                        onClose={handleCloseCamera}
                    />
                )}
            </AnimatePresence>

            {/* Photo Preview */}
            <AnimatePresence>
                {capturedPhoto && !showCamera && (
                    <PhotoPreview
                        dataUrl={capturedPhoto.dataUrl}
                        context={context}
                        players={players}
                        onContextChange={setContext}
                        onConfirm={handleConfirm}
                        onRetake={handleRetake}
                        isUploading={isUploading}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default PhotoCapture;
