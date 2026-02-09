'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTripStore } from '@/lib/stores';
import { EmptyStatePremium, NoPhotosEmpty } from '@/components/ui';
import { BottomNav, PageHeader } from '@/components/layout';
import {
  Camera,
  Plus,
  X,
  Download,
  Share2,
  Heart,
  MessageCircle,
  Grid,
  LayoutGrid,
} from 'lucide-react';

/**
 * PHOTOS PAGE -- Trip Photo Gallery
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

// Demo photos generator (called once during initialization)
function createDemoPhotos(players: { id?: string }[]): Photo[] {
  const now = Date.now();
  return [
    {
      id: '1',
      url: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800',
      caption: 'First tee vibes',
      uploadedBy: players[0]?.id || '',
      createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
      likes: 8,
    },
    {
      id: '2',
      url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800',
      caption: 'Beautiful morning on the course',
      uploadedBy: players[1]?.id || '',
      createdAt: new Date(now - 1000 * 60 * 60).toISOString(),
      likes: 12,
    },
    {
      id: '3',
      url: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800',
      caption: 'Eagle on 15!',
      uploadedBy: players[2]?.id || '',
      createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
      likes: 24,
    },
    {
      id: '4',
      url: 'https://images.unsplash.com/photo-1632170073-b2d67e9b0de4?w=800',
      caption: 'Sunset round',
      uploadedBy: players[0]?.id || '',
      createdAt: new Date(now - 1000 * 60 * 120).toISOString(),
      likes: 15,
    },
    {
      id: '5',
      url: 'https://images.unsplash.com/photo-1592919505780-303950717480?w=800',
      caption: '19th hole celebrations',
      uploadedBy: players[1]?.id || '',
      createdAt: new Date(now - 1000 * 60 * 180).toISOString(),
      likes: 31,
    },
    {
      id: '6',
      url: 'https://images.unsplash.com/photo-1611374243147-44a702c2d44c?w=800',
      caption: 'The squad',
      uploadedBy: players[2]?.id || '',
      createdAt: new Date(now - 1000 * 60 * 240).toISOString(),
      likes: 42,
    },
  ];
}

export default function PhotosPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore();

  // Use lazy initialization for demo photos to avoid Date.now() in render
  const [photos, setPhotos] = useState<Photo[]>(() => createDemoPhotos(players));
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // No redirect when no trip is selected -- render a premium empty state instead.

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

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="celebration"
            title="No trip selected"
            description="Start or select a trip to view and share photos."
            action={{
              label: 'Go Home',
              onClick: () => router.push('/'),
            }}
            secondaryAction={{
              label: 'More',
              onClick: () => router.push('/more'),
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Photos"
        subtitle={currentTrip.name}
        icon={<Camera size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'masonry' : 'grid')}
              className="btn-secondary press-scale p-2"
              aria-label={viewMode === 'grid' ? 'Switch to masonry view' : 'Switch to grid view'}
            >
              {viewMode === 'grid' ? <LayoutGrid size={18} /> : <Grid size={18} />}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-premium press-scale p-2"
              aria-label="Add photo"
            >
              <Plus size={18} />
            </button>
          </div>
        }
      />

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
          <div className={`grid gap-2 ${viewMode === 'grid' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className={`relative overflow-hidden rounded-lg aspect-square press-scale ${
                  viewMode === 'masonry' && index % 3 === 0 ? 'row-span-2' : ''
                }`}
              >
                <Image
                  src={photo.url}
                  alt={photo.caption || 'Golf trip photo'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 25vw"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-2">
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
            aria-label="Close photo viewer"
          >
            <X size={28} />
          </button>

          <div className="max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selectedPhoto.url}
              alt={selectedPhoto.caption || 'Golf trip photo'}
              width={1200}
              height={800}
              className="w-full rounded-lg"
              sizes="(max-width: 1024px) 100vw, 1024px"
            />

            <div className="mt-4 text-white">
              {selectedPhoto.caption && <p className="text-lg mb-2">{selectedPhoto.caption}</p>}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    className="flex items-center gap-2 text-white/70 hover:text-white"
                    aria-label={`Like photo, ${selectedPhoto.likes} likes`}
                  >
                    <Heart size={20} />
                    <span>{selectedPhoto.likes}</span>
                  </button>
                  <button
                    className="flex items-center gap-2 text-white/70 hover:text-white"
                    aria-label="Comment on photo"
                  >
                    <MessageCircle size={20} />
                    <span>Comment</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 text-white/70 hover:text-white" aria-label="Share photo">
                    <Share2 size={20} />
                  </button>
                  <button
                    className="p-2 text-white/70 hover:text-white"
                    aria-label="Download photo"
                  >
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

      <BottomNav />
    </div>
  );
}
