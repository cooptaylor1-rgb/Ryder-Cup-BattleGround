/**
 * Photo Gallery Component
 *
 * Displays and manages photos for a trip.
 * Supports upload, viewing, and associating photos with matches/holes.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { isSupabaseConfigured, getSupabase, insertRecord } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Camera, X, Image as ImageIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('PhotoGallery');

interface Photo {
    id: string;
    tripId: string;
    matchId?: string;
    holeNumber?: number;
    uploadedBy: string;
    url: string;
    thumbnailUrl?: string;
    caption?: string;
    createdAt: string;
}

interface PhotoGalleryProps {
    tripId: string;
    matchId?: string;
    photos: Photo[];
    onPhotoUpload?: (photo: Photo) => void;
    canUpload?: boolean;
    currentPlayerId?: string;
    className?: string;
}

export function PhotoGallery({
    tripId,
    matchId,
    photos,
    onPhotoUpload,
    canUpload = true,
    currentPlayerId,
    className,
}: PhotoGalleryProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [viewerIndex, setViewerIndex] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const objectUrlsRef = useRef<Set<string>>(new Set());

    // Cleanup object URLs on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            objectUrlsRef.current.forEach(url => {
                URL.revokeObjectURL(url);
            });
            objectUrlsRef.current.clear();
        };
    }, []);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentPlayerId) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Image must be less than 10MB');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            if (isSupabaseConfigured) {
                const sb = getSupabase();
                // Upload to Supabase Storage
                const fileExt = file.name.split('.').pop();
                const fileName = `${tripId}/${crypto.randomUUID()}.${fileExt}`;

                const { error } = await sb.storage
                    .from('photos')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false,
                    });

                if (error) throw error;

                // Get public URL
                const { data: urlData } = sb.storage
                    .from('photos')
                    .getPublicUrl(fileName);

                // Save photo record
                const photo: Photo = {
                    id: crypto.randomUUID(),
                    tripId,
                    matchId,
                    uploadedBy: currentPlayerId,
                    url: urlData.publicUrl,
                    createdAt: new Date().toISOString(),
                };

                const { error: insertError } = await insertRecord('photos', {
                    id: photo.id,
                    trip_id: photo.tripId,
                    match_id: photo.matchId,
                    uploaded_by: photo.uploadedBy,
                    url: photo.url,
                    created_at: photo.createdAt,
                });

                if (insertError) throw insertError;

                onPhotoUpload?.(photo);
            } else {
                // Local mode - create object URL
                const objectUrl = URL.createObjectURL(file);
                // Track the object URL for cleanup
                objectUrlsRef.current.add(objectUrl);
                const photo: Photo = {
                    id: crypto.randomUUID(),
                    tripId,
                    matchId,
                    uploadedBy: currentPlayerId,
                    url: objectUrl,
                    createdAt: new Date().toISOString(),
                };
                onPhotoUpload?.(photo);
            }
        } catch (error) {
            logger.error('Failed to upload photo:', error);
            alert('Failed to upload photo. Please try again.');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const openViewer = (photo: Photo, index: number) => {
        setSelectedPhoto(photo);
        setViewerIndex(index);
    };

    const closeViewer = () => {
        setSelectedPhoto(null);
    };

    const navigateViewer = (direction: 'prev' | 'next') => {
        const newIndex = direction === 'prev'
            ? (viewerIndex - 1 + photos.length) % photos.length
            : (viewerIndex + 1) % photos.length;
        setViewerIndex(newIndex);
        setSelectedPhoto(photos[newIndex]);
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* Upload Button */}
            {canUpload && currentPlayerId && (
                <div className="flex items-center gap-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2.5 rounded-lg',
                            'bg-masters-primary text-white',
                            'hover:bg-masters-primary-dark',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            'transition-colors'
                        )}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <Camera className="w-5 h-5" />
                                <span>Add Photo</span>
                            </>
                        )}
                    </button>
                    {isUploading && uploadProgress > 0 && (
                        <div className="flex-1 h-2 bg-[color:var(--ink-tertiary)]/15 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-masters-primary transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Photo Grid */}
            {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                        <button
                            key={photo.id}
                            onClick={() => openViewer(photo, index)}
                            className="relative aspect-square rounded-lg overflow-hidden bg-[var(--surface)] group"
                        >
                            <Image
                                src={photo.thumbnailUrl || photo.url}
                                alt={photo.caption || 'Trip photo'}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="33vw"
                            />
                            {photo.holeNumber && (
                                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs">
                                    #{photo.holeNumber}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-[color:var(--surface)]/60 rounded-xl border border-[color:var(--rule)]/30">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 text-[var(--ink-tertiary)]" />
                    <p className="text-[var(--ink-secondary)]">No photos yet</p>
                    {canUpload && (
                        <p className="text-sm text-[var(--ink-tertiary)] mt-1">
                            Capture memories from the course!
                        </p>
                    )}
                </div>
            )}

            {/* Full-screen Viewer */}
            {selectedPhoto && (
                <PhotoViewer
                    photo={selectedPhoto}
                    onClose={closeViewer}
                    onPrev={() => navigateViewer('prev')}
                    onNext={() => navigateViewer('next')}
                    currentIndex={viewerIndex + 1}
                    totalCount={photos.length}
                />
            )}
        </div>
    );
}

// Full-screen photo viewer
interface PhotoViewerProps {
    photo: Photo;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
    currentIndex: number;
    totalCount: number;
}

function PhotoViewer({ photo, onClose, onPrev, onNext, currentIndex, totalCount }: PhotoViewerProps) {
    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 text-white">
                <span className="text-sm">{currentIndex} of {totalCount}</span>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-[color:var(--canvas)]/10 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center p-4 relative">
                <Image
                    src={photo.url}
                    alt={photo.caption || 'Trip photo'}
                    fill
                    className="object-contain"
                    sizes="100vw"
                />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between p-4">
                <button
                    onClick={onPrev}
                    className="p-3 rounded-full bg-[color:var(--canvas)]/10 hover:bg-[color:var(--canvas)]/18 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-white" />
                </button>

                {photo.caption && (
                    <p className="text-white text-center max-w-md">{photo.caption}</p>
                )}

                <button
                    onClick={onNext}
                    className="p-3 rounded-full bg-[color:var(--canvas)]/10 hover:bg-[color:var(--canvas)]/18 transition-colors"
                >
                    <ChevronRight className="w-6 h-6 text-white" />
                </button>
            </div>
        </div>
    );
}

/**
 * Compact photo strip for match cards
 */
interface PhotoStripProps {
    photos: Photo[];
    onViewAll?: () => void;
    className?: string;
}

export function PhotoStrip({ photos, onViewAll, className }: PhotoStripProps) {
    if (photos.length === 0) return null;

    const displayPhotos = photos.slice(0, 4);
    const remainingCount = photos.length - 4;

    return (
        <div className={cn('flex gap-1', className)}>
            {displayPhotos.map((photo) => (
                <div
                    key={photo.id}
                    className="w-10 h-10 rounded overflow-hidden bg-[var(--surface-secondary)] relative"
                >
                    <Image
                        src={photo.thumbnailUrl || photo.url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                    />
                </div>
            ))}
            {remainingCount > 0 && (
                <button
                    onClick={onViewAll}
                    className="w-10 h-10 rounded bg-[var(--surface-secondary)] flex items-center justify-center text-xs text-[var(--ink-tertiary)]"
                >
                    +{remainingCount}
                </button>
            )}
        </div>
    );
}

export default PhotoGallery;
