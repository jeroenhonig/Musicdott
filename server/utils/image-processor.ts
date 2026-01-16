import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Image Processing Utilities for School Logos
 * Provides secure image processing and optimization
 */

export interface ImageProcessingOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
}

export interface ProcessedImageResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

/**
 * Default processing options for school logos
 */
const DEFAULT_LOGO_OPTIONS: ImageProcessingOptions = {
  maxWidth: 800,
  maxHeight: 400,
  quality: 90,
  format: 'png'
};

/**
 * Processes and secures uploaded school logo images
 */
export async function processSchoolLogo(
  inputPath: string,
  outputPath: string,
  options: Partial<ImageProcessingOptions> = {}
): Promise<ProcessedImageResult> {
  const processingOptions = { ...DEFAULT_LOGO_OPTIONS, ...options };

  try {
    // Verify input file exists
    if (!fs.existsSync(inputPath)) {
      return {
        success: false,
        error: 'Input file does not exist'
      };
    }

    // Read and validate image
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // Security validation
    if (!metadata.format) {
      return {
        success: false,
        error: 'Invalid image format'
      };
    }

    // Check for supported formats
    const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
    if (!supportedFormats.includes(metadata.format.toLowerCase())) {
      return {
        success: false,
        error: `Unsupported image format: ${metadata.format}`
      };
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Process image with security and optimization
    let processedImage = sharp(inputPath)
      // Remove EXIF data and other metadata for privacy
      .rotate() // Auto-rotate based on EXIF orientation, then strip EXIF
      .resize({
        width: processingOptions.maxWidth,
        height: processingOptions.maxHeight,
        fit: 'inside',
        withoutEnlargement: true
      });

    // Apply format-specific processing
    switch (processingOptions.format) {
      case 'jpeg':
        processedImage = processedImage.jpeg({
          quality: processingOptions.quality,
          progressive: true,
          mozjpeg: true
        });
        break;
      case 'png':
        processedImage = processedImage.png({
          quality: processingOptions.quality,
          compressionLevel: 9,
          progressive: true
        });
        break;
      case 'webp':
        processedImage = processedImage.webp({
          quality: processingOptions.quality,
          effort: 6
        });
        break;
    }

    // Write processed image
    await processedImage.toFile(outputPath);

    // Get final metadata
    const processedMetadata = await sharp(outputPath).metadata();

    // Get file size
    const stats = fs.statSync(outputPath);

    return {
      success: true,
      outputPath,
      metadata: {
        width: processedMetadata.width || 0,
        height: processedMetadata.height || 0,
        format: processedMetadata.format || processingOptions.format,
        size: stats.size
      }
    };

  } catch (error) {
    return {
      success: false,
      error: `Image processing failed: ${(error as Error).message}`
    };
  }
}

/**
 * Validates image file before processing
 */
export async function validateImageFile(filePath: string): Promise<{
  isValid: boolean;
  error?: string;
  metadata?: sharp.Metadata;
}> {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        error: 'File does not exist'
      };
    }

    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Check if it's actually an image
    if (!metadata.format) {
      return {
        isValid: false,
        error: 'File is not a valid image'
      };
    }

    // Check dimensions
    if (!metadata.width || !metadata.height) {
      return {
        isValid: false,
        error: 'Invalid image dimensions'
      };
    }

    // Size limits (width and height)
    const MAX_DIMENSION = 4000;
    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      return {
        isValid: false,
        error: `Image dimensions too large. Maximum ${MAX_DIMENSION}x${MAX_DIMENSION} pixels.`
      };
    }

    // Check for minimal dimensions
    const MIN_DIMENSION = 50;
    if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
      return {
        isValid: false,
        error: `Image too small. Minimum ${MIN_DIMENSION}x${MIN_DIMENSION} pixels.`
      };
    }

    return {
      isValid: true,
      metadata
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Image validation failed: ${(error as Error).message}`
    };
  }
}

/**
 * Creates multiple sizes of a logo for different use cases
 */
export async function createLogoVariants(
  inputPath: string,
  outputDir: string,
  baseName: string
): Promise<{
  success: boolean;
  variants?: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
  };
  error?: string;
}> {
  try {
    const variants = {
      thumbnail: path.join(outputDir, `${baseName}_thumb.png`),
      small: path.join(outputDir, `${baseName}_small.png`),
      medium: path.join(outputDir, `${baseName}_medium.png`),
      large: path.join(outputDir, `${baseName}_large.png`)
    };

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const image = sharp(inputPath);

    // Create different sizes
    await Promise.all([
      // Thumbnail: 64x64
      image.clone()
        .resize(64, 64, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 90 })
        .toFile(variants.thumbnail),

      // Small: 128x128
      image.clone()
        .resize(128, 128, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 90 })
        .toFile(variants.small),

      // Medium: 256x256
      image.clone()
        .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 95 })
        .toFile(variants.medium),

      // Large: 512x512
      image.clone()
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 95 })
        .toFile(variants.large)
    ]);

    return {
      success: true,
      variants
    };

  } catch (error) {
    return {
      success: false,
      error: `Failed to create logo variants: ${(error as Error).message}`
    };
  }
}

/**
 * Cleans up old logo files when a new one is uploaded
 */
export function cleanupOldLogos(logoPattern: string): void {
  try {
    const dir = path.dirname(logoPattern);
    const baseName = path.basename(logoPattern, path.extname(logoPattern));
    
    if (!fs.existsSync(dir)) {
      return;
    }

    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      if (file.startsWith(baseName) && file !== path.basename(logoPattern)) {
        const filePath = path.join(dir, file);
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error(`Failed to delete old logo file: ${filePath}`, error);
        }
      }
    });

  } catch (error) {
    console.error('Failed to cleanup old logos:', error);
  }
}