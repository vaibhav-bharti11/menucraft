import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const generatedDir = path.join(process.cwd(), 'public', 'menu-images', 'generated');
const metadataPath = path.join(process.cwd(), 'data', 'dish-image-metadata.json');

async function optimizeImages() {
  console.log('Starting image optimization...');

  // 1. Read metadata
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  let metadataUpdated = false;

  // 2. Read directory
  const files = fs.readdirSync(generatedDir);
  const pngFiles = files.filter(f => f.endsWith('.png'));

  console.log(`Found ${pngFiles.length} PNG files to optimize.`);

  for (const file of pngFiles) {
    const inputPath = path.join(generatedDir, file);
    const outputFilename = file.replace(/\.png$/, '.jpg');
    const outputPath = path.join(generatedDir, outputFilename);

    console.log(`Optimizing ${file} -> ${outputFilename}...`);

    try {
      // 3. Process with sharp (resize to max width 1200, convert to JPEG 80 quality)
      await sharp(inputPath)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toFile(outputPath);

      // 4. Update metadata
      let foundInMetadata = false;
      for (const dishId in metadata) {
        if (metadata[dishId].filename === file) {
          metadata[dishId].filename = outputFilename;
          metadataUpdated = true;
          foundInMetadata = true;
        }
      }

      if (!foundInMetadata) {
         // Also check by dish prefix if it's like dish-0014
         const dishMatch = file.match(/^(dish-\d+)\.png$/);
         if (dishMatch) {
             const dId = dishMatch[1];
             if (metadata[dId] && metadata[dId].filename === file) {
                 metadata[dId].filename = outputFilename;
                 metadataUpdated = true;
             }
         }
      }

      // 5. Delete original PNG
      fs.unlinkSync(inputPath);
      console.log(`Deleted original ${file}`);

    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }

  // 6. Save updated metadata
  if (metadataUpdated) {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    console.log('Updated dish-image-metadata.json');
  }

  console.log('Optimization complete!');
}

optimizeImages().catch(console.error);
