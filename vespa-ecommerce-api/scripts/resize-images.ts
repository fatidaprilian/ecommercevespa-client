import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function resizeAllImages() {
  try {
    console.log('🔍 Fetching images from vespa_parts folder...');
    
    let allResources: any[] = [];
    let nextCursor: string | undefined;

    // Fetch semua gambar (handle pagination)
    do {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'vespa_parts/',
        max_results: 500,
        next_cursor: nextCursor,
      });

      allResources = allResources.concat(result.resources);
      nextCursor = result.next_cursor;
      
      console.log(`📦 Fetched ${result.resources.length} images (Total: ${allResources.length})`);
    } while (nextCursor);

    console.log(`\n✅ Total images found: ${allResources.length}\n`);

    // Process setiap gambar
    for (let i = 0; i < allResources.length; i++) {
      const image = allResources[i];
      const publicId = image.public_id;
      
      console.log(`[${i + 1}/${allResources.length}] 🔄 Processing: ${publicId}`);

      try {
        // Resize dengan eager transformation
        await cloudinary.uploader.explicit(publicId, {
          type: 'upload',
          eager: [
            {
              width: 1500,
              height: 1500,
              crop: 'limit',
              quality: 'auto:good',
              fetch_format: 'auto',
            },
          ],
          eager_async: false, // Proses langsung (tidak async)
          overwrite: true,
          invalidate: true, // Clear CDN cache
        });

        console.log(`  ✅ Successfully resized\n`);
      } catch (error) {
        console.error(`  ❌ Failed:`, error.message, '\n');
      }

      // Delay untuk avoid rate limit
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n🎉 All images processed!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

resizeAllImages();