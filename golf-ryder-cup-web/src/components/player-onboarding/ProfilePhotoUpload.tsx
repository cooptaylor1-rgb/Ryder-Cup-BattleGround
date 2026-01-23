'use client';

/**
 * Profile Photo Upload
 *
 * Beautiful photo upload with camera/gallery options.
 * Includes crop preview and fun avatar fallbacks.
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera,
    Image as ImageIcon,
    Sparkles,
    Check,
    Trash2,
    RotateCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ProfilePhoto');

// ============================================
// TYPES
// ============================================

interface ProfilePhotoUploadProps {
    currentPhoto?: string;
    onPhotoChange: (photo: string | null) => void;
    userName?: string;
    className?: string;
}

// ============================================
// AVATAR COLORS (for fallback)
// ============================================

const avatarColors = [
    { bg: 'bg-gradient-to-br from-blue-400 to-blue-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-green-400 to-green-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-purple-400 to-purple-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-amber-400 to-orange-500', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-pink-400 to-rose-500', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-cyan-400 to-teal-500', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-masters to-emerald-600', text: 'text-white' },
];

const getAvatarColor = (name?: string) => {
    if (!name) return avatarColors[0];
    const index = name.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
};

const getInitials = (name?: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

// ============================================
// COMPONENT
// ============================================

export function ProfilePhotoUpload({
    currentPhoto,
    onPhotoChange,
    userName,
    className,
}: ProfilePhotoUploadProps) {
    const [photo, setPhoto] = useState<string | null>(currentPhoto || null);
    const [showOptions, setShowOptions] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const avatarColor = getAvatarColor(userName);
    const initials = getInitials(userName);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setShowOptions(false);

        try {
            // Read file as data URL
            const reader = new FileReader();

            reader.onerror = () => {
                logger.error('Failed to read file');
                setIsProcessing(false);
            };

            reader.onload = async (event) => {
                const dataUrl = event.target?.result as string;
                if (!dataUrl) {
                    logger.error('Failed to read file data');
                    setIsProcessing(false);
                    return;
                }

                // Create image to resize
                const img = new Image();

                img.onerror = () => {
                    logger.error('Failed to load image');
                    setIsProcessing(false);
                };

                img.onload = () => {
                    // Resize to max 500x500
                    const canvas = document.createElement('canvas');
                    const maxSize = 500;
                    let { width, height } = img;

                    if (width > height) {
                        if (width > maxSize) {
                            height = (height * maxSize) / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = (width * maxSize) / height;
                            height = maxSize;
                        }
                    }

                    // Crop to square
                    const size = Math.min(width, height);
                    canvas.width = size;
                    canvas.height = size;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        logger.error('Failed to get canvas context');
                        setIsProcessing(false);
                        return;
                    }

                    const sx = (img.width - Math.min(img.width, img.height)) / 2;
                    const sy = (img.height - Math.min(img.width, img.height)) / 2;
                    const sSize = Math.min(img.width, img.height);

                    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, size, size);

                    const resizedUrl = canvas.toDataURL('image/jpeg', 0.85);
                    setPreviewPhoto(resizedUrl);
                    setIsProcessing(false);
                };
                img.src = dataUrl;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            logger.error('Failed to process image:', error);
            setIsProcessing(false);
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    }, []);

    const confirmPhoto = () => {
        if (previewPhoto) {
            setPhoto(previewPhoto);
            onPhotoChange(previewPhoto);
            setPreviewPhoto(null);
        }
    };

    const cancelPreview = () => {
        setPreviewPhoto(null);
    };

    const removePhoto = () => {
        setPhoto(null);
        onPhotoChange(null);
        setShowOptions(false);
    };

    const openCamera = () => {
        cameraInputRef.current?.click();
    };

    const openGallery = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* Hidden Inputs */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
            />
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleFileSelect}
            />

            {/* Main Photo Area */}
            <div className="flex flex-col items-center">
                {/* Photo Circle */}
                <motion.div
                    className="relative"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <button
                        onClick={() => setShowOptions(true)}
                        className={cn(
                            'w-32 h-32 rounded-full overflow-hidden shadow-lg border-4 border-white dark:border-surface-800',
                            'focus:outline-none focus:ring-4 focus:ring-masters/30',
                            'transition-all duration-200'
                        )}
                    >
                        {photo ? (
                            <img
                                src={photo}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className={cn(
                                'w-full h-full flex items-center justify-center',
                                avatarColor.bg
                            )}>
                                <span className={cn('text-4xl font-bold', avatarColor.text)}>
                                    {initials}
                                </span>
                            </div>
                        )}
                    </button>

                    {/* Edit Badge */}
                    <motion.div
                        className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-masters shadow-lg flex items-center justify-center cursor-pointer"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowOptions(true)}
                    >
                        <Camera className="w-5 h-5 text-white" />
                    </motion.div>
                </motion.div>

                {/* Label */}
                <button
                    onClick={() => setShowOptions(true)}
                    className="mt-4 text-masters font-medium hover:text-masters/80 transition-colors flex items-center gap-1.5"
                >
                    <Sparkles className="w-4 h-4" />
                    {photo ? 'Change photo' : 'Add a photo'}
                </button>

                <p className="text-xs text-surface-500 mt-1">
                    Help your team recognize you on the course!
                </p>
            </div>

            {/* Options Modal */}
            <AnimatePresence>
                {showOptions && !previewPhoto && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowOptions(false)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="w-full max-w-md bg-white dark:bg-surface-800 rounded-t-3xl overflow-hidden shadow-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-4">
                                {/* Handle */}
                                <div className="w-10 h-1 rounded-full bg-surface-300 mx-auto mb-4" />

                                <h3 className="text-lg font-semibold text-surface-900 dark:text-white text-center mb-4">
                                    Profile Photo
                                </h3>

                                <div className="space-y-2">
                                    {/* Camera Option */}
                                    <button
                                        onClick={openCamera}
                                        className="w-full p-4 rounded-xl bg-surface-50 dark:bg-surface-700 hover:bg-surface-100 dark:hover:bg-surface-600 transition-colors flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-medium text-surface-900 dark:text-white">
                                                Take a selfie
                                            </div>
                                            <div className="text-sm text-surface-500">
                                                Use your camera
                                            </div>
                                        </div>
                                    </button>

                                    {/* Gallery Option */}
                                    <button
                                        onClick={openGallery}
                                        className="w-full p-4 rounded-xl bg-surface-50 dark:bg-surface-700 hover:bg-surface-100 dark:hover:bg-surface-600 transition-colors flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                            <ImageIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-medium text-surface-900 dark:text-white">
                                                Choose from gallery
                                            </div>
                                            <div className="text-sm text-surface-500">
                                                Pick an existing photo
                                            </div>
                                        </div>
                                    </button>

                                    {/* Remove Option */}
                                    {photo && (
                                        <button
                                            onClick={removePhoto}
                                            className="w-full p-4 rounded-xl bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center gap-4"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-medium text-red-700 dark:text-red-400">
                                                    Remove photo
                                                </div>
                                                <div className="text-sm text-red-600/70">
                                                    Use initials instead
                                                </div>
                                            </div>
                                        </button>
                                    )}
                                </div>

                                {/* Cancel Button */}
                                <button
                                    onClick={() => setShowOptions(false)}
                                    className="w-full mt-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Preview Modal */}
            <AnimatePresence>
                {previewPhoto && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl"
                        >
                            <div className="p-4 border-b border-surface-200 dark:border-surface-700">
                                <h3 className="font-semibold text-surface-900 dark:text-white text-center">
                                    Looking good! 📸
                                </h3>
                            </div>

                            {/* Preview Image */}
                            <div className="p-6 flex justify-center">
                                <div className="w-48 h-48 rounded-full overflow-hidden shadow-xl border-4 border-white dark:border-surface-700">
                                    <img
                                        src={previewPhoto}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 p-4 border-t border-surface-200 dark:border-surface-700">
                                <button
                                    onClick={cancelPreview}
                                    className="flex-1 py-3 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 font-medium flex items-center justify-center gap-2"
                                >
                                    <RotateCw className="w-4 h-4" />
                                    Retake
                                </button>
                                <button
                                    onClick={confirmPhoto}
                                    className="flex-1 py-3 rounded-xl bg-masters text-white font-medium flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    Use Photo
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Processing Overlay */}
            <AnimatePresence>
                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    >
                        <div className="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl text-center">
                            <div className="w-12 h-12 rounded-full border-4 border-masters border-t-transparent animate-spin mx-auto mb-4" />
                            <p className="font-medium text-surface-900 dark:text-white">
                                Processing photo...
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ProfilePhotoUpload;
