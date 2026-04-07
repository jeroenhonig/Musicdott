import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NormalizedContentBlock } from '@/utils/content-block-parser';

interface GalleryImage {
  url: string;
  alt?: string;
  caption?: string;
}

export default function ImageGalleryRenderer({ block }: { block: NormalizedContentBlock }) {
  const images: GalleryImage[] = Array.isArray(block.data?.images) ? block.data.images : [];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images.length) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
        No images in gallery.
      </div>
    );
  }

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prev = () => setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null));
  const next = () => setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null));

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => openLightbox(i)}
            className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-cyan-500"
            aria-label={img.alt || `Image ${i + 1}`}
          >
            <img
              src={img.url}
              alt={img.alt || ''}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {img.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                {img.caption}
              </div>
            )}
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </Button>
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); prev(); }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); next(); }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}
          <div onClick={(e) => e.stopPropagation()} className="max-w-5xl max-h-screen p-8">
            <img
              src={images[lightboxIndex].url}
              alt={images[lightboxIndex].alt || ''}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {images[lightboxIndex].caption && (
              <p className="text-white text-center text-sm mt-2">{images[lightboxIndex].caption}</p>
            )}
            <p className="text-gray-400 text-center text-xs mt-1">
              {lightboxIndex + 1} / {images.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
