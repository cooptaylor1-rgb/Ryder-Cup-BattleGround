'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore } from '@/lib/stores';
import { NoPhotosEmpty } from '@/components/ui';
import {
  ChevronLeft,
  Home,
  Target,
  Users,
  Trophy,
  MoreHorizontal,
  Camera,
  Plus,
  X,
  Download,
  Share2,
  Heart,
  MessageCircle,
  Grid,
  LayoutGrid,
  CalendarDays,
} from 'lucide-react';

/**
 * PHOTOS PAGE — Trip Photo Gallery
 *
 * Capture and share memories from your golf trip
 */

interface Photo {
  id: string;
  url: string;
  caption?: string;
  uploadedBy: string;
  createdAt: string;
  likes: number;
}

export default function PhotosPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
    }
  }, [currentTrip, router]);

  // Demo photos
  useEffect(() => {
    setPhotos([
      {
        id: '1',
        url: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800',
        caption: 'First tee vibes 🏌️',
        uploadedBy: players[0]?.id || '',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        likes: 8,
      },
      {
        id: '2',
        url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800',
        caption: 'Beautiful morning on the course',
        uploadedBy: players[1]?.id || '',
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        likes: 12,
      },
      {
        id: '3',
        url: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800',
        caption: 'Eagle on 15! 🦅',
        uploadedBy: players[2]?.id || '',
        createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        likes: 24,
      },
      {
        id: '4',
        url: 'https://images.unsplash.com/photo-1632170073-b2d67e9b0de4?w=800',
        caption: 'Sunset round',
        uploadedBy: players[0]?.id || '',
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        likes: 15,
      },
      {
        id: '5',
        url: 'https://images.unsplash.com/photo-1592919505780-303950717480?w=800',
        caption: '19th hole celebrations 🍻',
        uploadedBy: players[1]?.id || '',
        createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        likes: 31,
      },
      {
        id: '6',
        url: 'https://images.unsplash.com/photo-1611374243147-44a702c2d44c?w=800',
        caption: 'The squad',
        uploadedBy: players[2]?.id || '',
        createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        likes: 42,
      },
    ]);
  }, [players]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const newPhoto: Photo = {
        id: crypto.randomUUID(),
        url,
        uploadedBy: players[0]?.id || '',
        createdAt: new Date().toISOString(),
        likes: 0,
      };
      setPhotos((prev) => [newPhoto, ...prev]);
    });
  };

  const getPlayer = (id: string) => players.find((p) => p.id === id);

  if (!currentTrip) return null;

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--canvas)' }}>
      {/* Header */}
      <header className="header">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 press-scale"
              style={{ color: 'var(--ink-secondary)' }}
              aria-label="Back"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <span className="type-overline">Photos</span>
              <p className="type-caption">{photos.length} photos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'masonry' : 'grid')}
              className="p-2 rounded-lg"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              {viewMode === 'grid' ? <LayoutGrid size={20} /> : <Grid size={20} />}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg"
              style={{ color: 'var(--masters)' }}
            >
              <Plus size={22} />
            </button>
          </div>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Photo Grid */}
      <main className="container-editorial py-4">
        {photos.length > 0 ? (
          <div
            className={`grid gap-2 ${
              viewMode === 'grid' ? 'grid-cols-3' : 'grid-cols-2'
            }`}
          >
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className={`relative overflow-hidden rounded-lg aspect-square press-scale ${
                  viewMode === 'masonry' && index % 3 === 0 ? 'row-span-2' : ''
                }`}
              >
                <img
                  src={photo.url}
                  alt={photo.caption || 'Golf trip photo'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-2">
                  <div className="flex items-center gap-2 text-white text-xs">
                    <Heart size={12} />
                    <span>{photo.likes}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <NoPhotosEmpty onUploadPhoto={() => fileInputRef.current?.click()} />
        )}
      </main>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
          >
            <X size={28} />
          </button>

          <div
            className="max-w-4xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption || 'Golf trip photo'}
              className="w-full rounded-lg"
            />

            <div className="mt-4 text-white">
              {selectedPhoto.caption && (
                <p className="text-lg mb-2">{selectedPhoto.caption}</p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 text-white/70 hover:text-white">
                    <Heart size={20} />
                    <span>{selectedPhoto.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 text-white/70 hover:text-white">
                    <MessageCircle size={20} />
                    <span>Comment</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 text-white/70 hover:text-white">
                    <Share2 size={20} />
                  </button>
                  <button className="p-2 text-white/70 hover:text-white">
                    <Download size={20} />
                  </button>
                </div>
              </div>

              {/* Uploader info */}
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm text-white/50">
                  Uploaded by{' '}
                  {getPlayer(selectedPhoto.uploadedBy)
                    ? `${getPlayer(selectedPhoto.uploadedBy)?.firstName} ${getPlayer(selectedPhoto.uploadedBy)?.lastName}`
                    : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link href="/" className="nav-item">
          <Home size={22} strokeWidth={1.75} />
          <span>Home</span>
        </Link>
        <Link href="/schedule" className="nav-item">
          <CalendarDays size={22} strokeWidth={1.75} />
          <span>Schedule</span>
        </Link>
        <Link href="/score" className="nav-item">
          <Target size={22} strokeWidth={1.75} />
          <span>Score</span>
        </Link>
        <Link href="/matchups" className="nav-item">
          <Users size={22} strokeWidth={1.75} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item">
          <Trophy size={22} strokeWidth={1.75} />
          <span>Standings</span>
        </Link>
        <Link href="/more" className="nav-item">
          <MoreHorizontal size={22} strokeWidth={1.75} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}
