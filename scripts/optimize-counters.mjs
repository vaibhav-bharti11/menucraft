import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const countersDir = path.join(process.cwd(), 'public', 'menu-images', 'counters');

async function optimizeCounters() {
  console.log('Starting counter image optimization...');

  const files = fs.readdirSync(countersDir);
  const imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));

  console.log(`Found ${imageFiles.length} files to optimize in counters directory.`);

  for (const file of imageFiles) {
    const inputPath = path.join(countersDir, file);
    
    // Always output to .jpg
    const outputFilename = file.replace(/\.(png|jpeg)$/i, '.jpg');
    // We need a temporary output path because we cannot overwrite the file while reading it
    const tempOutputPath = path.join(countersDir, `temp_${outputFilename}`);
    
    console.log(`Optimizing ${file}...`);

    try {
      await sharp(inputPath)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 75, progressive: true })
        .toFile(tempOutputPath);

      // Replace original file with the optimized temp file
      if (inputPath !== path.join(countersDir, outputFilename)) {
          // If extension changed (e.g. .png to .jpg), delete the original .png
          fs.unlinkSync(inputPath);
      } else {
          // It was already a .jpg, so delete the original before renaming temp
          fs.unlinkSync(inputPath);
      }
      fs.renameSync(tempOutputPath, path.join(countersDir, outputFilename));

    } catch (err) {
      console.error(`Error processing ${file}:`, err);
      // Clean up temp file if error
      if (fs.existsSync(tempOutputPath)) {
         fs.unlinkSync(tempOutputPath);
      }
    }
  }

  console.log('Counter image optimization complete!');
}

optimizeCounters().catch(console.error);
