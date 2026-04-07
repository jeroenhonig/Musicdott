import { lazy } from 'react';
import type { ComponentType } from 'react';
import {
  PlayCircle, Video, Music, FileText, ExternalLink,
  Guitar, FileMusic, Mic, Image, Headphones,
  AlignLeft, Link, LayoutGrid,
} from 'lucide-react';

export interface BlockRegistryEntry {
  component: ReturnType<typeof lazy>;
  icon: ComponentType<{ className?: string }>;
  accentColor: string;
  accentBorder: string;
  borderLeft: string;
  label: string;
}

export const BLOCK_REGISTRY: Record<string, BlockRegistryEntry> = {
  groovescribe: {
    component: lazy(() => import('./renderers/groovescribe-renderer')),
    icon: PlayCircle,
    accentColor: 'text-blue-600',
    accentBorder: 'border-blue-200',
    borderLeft: 'border-l-blue-500',
    label: 'GrooveScribe Pattern',
  },
  youtube: {
    component: lazy(() => import('./renderers/youtube-renderer')),
    icon: Video,
    accentColor: 'text-red-600',
    accentBorder: 'border-red-200',
    borderLeft: 'border-l-red-500',
    label: 'Video',
  },
  spotify: {
    component: lazy(() => import('./renderers/spotify-renderer')),
    icon: Music,
    accentColor: 'text-green-600',
    accentBorder: 'border-green-200',
    borderLeft: 'border-l-green-500',
    label: 'Spotify Track',
  },
  apple_music: {
    component: lazy(() => import('./renderers/apple-music-renderer')),
    icon: Music,
    accentColor: 'text-pink-600',
    accentBorder: 'border-pink-200',
    borderLeft: 'border-l-pink-500',
    label: 'Apple Music',
  },
  text: {
    component: lazy(() => import('./renderers/text-renderer')),
    icon: FileText,
    accentColor: 'text-emerald-600',
    accentBorder: 'border-emerald-200',
    borderLeft: 'border-l-emerald-500',
    label: 'Text Content',
  },
  pdf: {
    component: lazy(() => import('./renderers/pdf-renderer')),
    icon: FileText,
    accentColor: 'text-purple-600',
    accentBorder: 'border-purple-200',
    borderLeft: 'border-l-purple-500',
    label: 'PDF Document',
  },
  'sync-embed': {
    component: lazy(() => import('./renderers/sync-embed-renderer')),
    icon: PlayCircle,
    accentColor: 'text-violet-600',
    accentBorder: 'border-violet-200',
    borderLeft: 'border-l-violet-500',
    label: 'Musicdott Sync',
  },
  external_link: {
    component: lazy(() => import('./renderers/external-link-renderer')),
    icon: ExternalLink,
    accentColor: 'text-orange-600',
    accentBorder: 'border-orange-200',
    borderLeft: 'border-l-orange-500',
    label: 'External Link',
  },
  sheet_music: {
    component: lazy(() => import('./renderers/notation-renderer')),
    icon: FileMusic,
    accentColor: 'text-indigo-600',
    accentBorder: 'border-indigo-200',
    borderLeft: 'border-l-indigo-500',
    label: 'Sheet Music',
  },
  tablature: {
    component: lazy(() => import('./renderers/notation-renderer')),
    icon: Guitar,
    accentColor: 'text-indigo-600',
    accentBorder: 'border-indigo-200',
    borderLeft: 'border-l-indigo-500',
    label: 'Tablature',
  },
  abc_notation: {
    component: lazy(() => import('./renderers/notation-renderer')),
    icon: Music,
    accentColor: 'text-indigo-600',
    accentBorder: 'border-indigo-200',
    borderLeft: 'border-l-indigo-500',
    label: 'ABC Notation',
  },
  flat_embed: {
    component: lazy(() => import('./renderers/notation-renderer')),
    icon: FileText,
    accentColor: 'text-indigo-600',
    accentBorder: 'border-indigo-200',
    borderLeft: 'border-l-indigo-500',
    label: 'Interactive Score',
  },
  speech_to_note: {
    component: lazy(() => import('./renderers/notation-renderer')),
    icon: Mic,
    accentColor: 'text-indigo-600',
    accentBorder: 'border-indigo-200',
    borderLeft: 'border-l-indigo-500',
    label: 'Voice Transcription',
  },
  image: {
    component: lazy(() => import('./renderers/image-renderer')),
    icon: Image,
    accentColor: 'text-cyan-600',
    accentBorder: 'border-cyan-200',
    borderLeft: 'border-l-cyan-500',
    label: 'Image',
  },
  audio: {
    component: lazy(() => import('./renderers/audio-renderer')),
    icon: Headphones,
    accentColor: 'text-teal-600',
    accentBorder: 'border-teal-200',
    borderLeft: 'border-l-teal-500',
    label: 'Audio',
  },
  chord_chart: {
    component: lazy(() => import('./renderers/chord-chart-renderer')),
    icon: Guitar,
    accentColor: 'text-amber-600',
    accentBorder: 'border-amber-200',
    borderLeft: 'border-l-amber-500',
    label: 'Chord Chart',
  },
  lyrics: {
    component: lazy(() => import('./renderers/lyrics-renderer')),
    icon: AlignLeft,
    accentColor: 'text-rose-600',
    accentBorder: 'border-rose-200',
    borderLeft: 'border-l-rose-500',
    label: 'Lyrics',
  },
  rich_link: {
    component: lazy(() => import('./renderers/rich-link-renderer')),
    icon: Link,
    accentColor: 'text-sky-600',
    accentBorder: 'border-sky-200',
    borderLeft: 'border-l-sky-500',
    label: 'Link Preview',
  },
  image_gallery: {
    component: lazy(() => import('./renderers/image-gallery-renderer')),
    icon: LayoutGrid,
    accentColor: 'text-cyan-600',
    accentBorder: 'border-cyan-200',
    borderLeft: 'border-l-cyan-500',
    label: 'Image Gallery',
  },
};
