/**
 * Generate iOS Splash Screens
 *
 * Creates splash screen images for iOS PWA launch screens.
 * Uses sharp to generate PNG files with a solid background and centered text.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Splash screen sizes for various iOS devices
const splashSizes = [
    { width: 750, height: 1334, name: 'splash-750x1334.png' },     // iPhone SE, 8, 7, 6s, 6
    { width: 1242, height: 2208, name: 'splash-1242x2208.png' },   // iPhone 8 Plus, 7 Plus
    { width: 1125, height: 2436, name: 'splash-1125x2436.png' },   // iPhone X, Xs, 11 Pro
    { width: 828, height: 1792, name: 'splash-828x1792.png' },     // iPhone Xr, 11
    { width: 1242, height: 2688, name: 'splash-1242x2688.png' },   // iPhone Xs Max, 11 Pro Max
    { width: 1080, height: 2340, name: 'splash-1080x2340.png' },   // iPhone 12 mini, 13 mini
    { width: 1170, height: 2532, name: 'splash-1170x2532.png' },   // iPhone 12, 12 Pro, 13, 13 Pro, 14
    { width: 1284, height: 2778, name: 'splash-1284x2778.png' },   // iPhone 12 Pro Max, 13 Pro Max, 14 Plus
    { width: 1179, height: 2556, name: 'splash-1179x2556.png' },   // iPhone 14 Pro
    { width: 1290, height: 2796, name: 'splash-1290x2796.png' },   // iPhone 14 Pro Max, 15 Pro Max
];

// Masters green color
const BACKGROUND_COLOR = '#036635';
const TEXT_COLOR = '#F5F1E8';

// Create splash directory if it doesn't exist
const splashDir = path.join(__dirname, '../public/splash');
if (!fs.existsSync(splashDir)) {
    fs.mkdirSync(splashDir, { recursive: true });
}

// Generate PNG splash screens
async function generateSplashScreens() {
    console.log('Generating iOS splash screens...\n');

    for (const { width, height, name } of splashSizes) {
        const fontSize = Math.round(width * 0.08);
        const subFontSize = Math.round(width * 0.035);
        const iconSize = Math.round(width * 0.15);

        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${BACKGROUND_COLOR}"/>

  <!-- Decorative golf ball icon -->
  <g transform="translate(${width / 2}, ${height / 2 - fontSize * 1.8})">
    <circle cx="0" cy="0" r="${iconSize}" fill="white" opacity="0.12"/>
    <!-- Golf ball dimple pattern -->
    <circle cx="${-iconSize * 0.3}" cy="${-iconSize * 0.2}" r="${iconSize * 0.08}" fill="white" opacity="0.08"/>
    <circle cx="${iconSize * 0.15}" cy="${-iconSize * 0.35}" r="${iconSize * 0.06}" fill="white" opacity="0.08"/>
    <circle cx="${iconSize * 0.35}" cy="${iconSize * 0.1}" r="${iconSize * 0.07}" fill="white" opacity="0.08"/>
    <circle cx="${-iconSize * 0.1}" cy="${iconSize * 0.3}" r="${iconSize * 0.05}" fill="white" opacity="0.08"/>
  </g>

  <!-- App name -->
  <text
    x="${width / 2}"
    y="${height / 2 + fontSize * 0.2}"
    text-anchor="middle"
    font-family="Georgia, Times, serif"
    font-size="${fontSize}"
    font-weight="normal"
    letter-spacing="2"
    fill="${TEXT_COLOR}"
  >Ryder Cup</text>

  <!-- Subtitle -->
  <text
    x="${width / 2}"
    y="${height / 2 + fontSize * 1.0}"
    text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif"
    font-size="${subFontSize}"
    font-weight="300"
    letter-spacing="1"
    fill="${TEXT_COLOR}"
    opacity="0.7"
  >Golf Trip Tracker</text>

  <!-- Decorative line -->
  <line
    x1="${width / 2 - fontSize * 1.5}"
    y1="${height / 2 + fontSize * 1.5}"
    x2="${width / 2 + fontSize * 1.5}"
    y2="${height / 2 + fontSize * 1.5}"
    stroke="${TEXT_COLOR}"
    stroke-width="1"
    opacity="0.3"
  />
</svg>`;

        const pngPath = path.join(splashDir, name);

        try {
            await sharp(Buffer.from(svg))
                .png()
                .toFile(pngPath);
            console.log(`✓ Generated: ${name} (${width}x${height})`);
        } catch (error) {
            console.error(`✗ Failed: ${name} - ${error.message}`);
        }
    }

    // Clean up old SVG files if they exist
    const svgFiles = fs.readdirSync(splashDir).filter(f => f.endsWith('.svg'));
    for (const svgFile of svgFiles) {
        fs.unlinkSync(path.join(splashDir, svgFile));
        console.log(`Cleaned up: ${svgFile}`);
    }

    console.log('\n✓ All splash screens generated in public/splash/');
}

generateSplashScreens().catch(console.error);
