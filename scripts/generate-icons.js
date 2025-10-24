import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const sourceImage = join(rootDir, 'attached_assets/generated_images/Syncly_app_icon_design_1bfe02c3.png');
const outputDir = join(rootDir, 'public/icons');

const iconSizes = [
  { name: 'icon-192x192.png', size: 192, maskable: false },
  { name: 'icon-512x512.png', size: 512, maskable: false },
  { name: 'icon-maskable-192x192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
  { name: 'icon-badge-72x72.png', size: 72, maskable: false }
];

async function generateIcons() {
  try {
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });
    console.log('✅ Created icons directory');

    // Load the source image
    const image = sharp(sourceImage);
    const metadata = await image.metadata();
    console.log(`📸 Source image: ${metadata.width}x${metadata.height}`);

    // Generate each icon size
    for (const icon of iconSizes) {
      const outputPath = join(outputDir, icon.name);
      
      if (icon.maskable) {
        // For maskable icons, add padding (safe zone) - 20% on each side
        const paddedSize = Math.round(icon.size * 1.5);
        await sharp(sourceImage)
          .resize(icon.size, icon.size, { 
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .extend({
            top: Math.round((paddedSize - icon.size) / 2),
            bottom: Math.round((paddedSize - icon.size) / 2),
            left: Math.round((paddedSize - icon.size) / 2),
            right: Math.round((paddedSize - icon.size) / 2),
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .resize(icon.size, icon.size)
          .png()
          .toFile(outputPath);
      } else {
        // Standard icons - no padding needed
        await sharp(sourceImage)
          .resize(icon.size, icon.size, { 
            fit: 'cover',
            position: 'center'
          })
          .png()
          .toFile(outputPath);
      }
      
      console.log(`✅ Generated: ${icon.name} (${icon.size}x${icon.size}${icon.maskable ? ' maskable' : ''})`);
    }

    console.log('\n🎉 All icons generated successfully!');
    console.log(`📁 Output directory: ${outputDir}`);
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
