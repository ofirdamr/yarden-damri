/**
 * cleanup-duplicates.js
 * Uses Cloudinary Search API to find duplicates by Instagram ID in filename.
 * Keeps the FIRST uploaded (oldest), deletes extras.
 */
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function listAll(resourceType) {
  const results = [];
  let nextCursor = undefined;
  do {
    const opts = {
      resource_type: resourceType,
      type: 'upload',
      prefix: 'yarden_makeup',
      max_results: 500
    };
    if (nextCursor) opts.next_cursor = nextCursor;
    const res = await cloudinary.api.resources(opts);
    const batch = res.resources || [];
    results.push(...batch);
    nextCursor = res.next_cursor;
    process.stdout.write(`\r  ${resourceType}s: ${results.length} fetched...`);
  } while (nextCursor);
  console.log('');
  return results;
}

async function run() {
  console.log('Fetching all Cloudinary assets...');
  const images = await listAll('image');
  const videos = await listAll('video');
  const all = [...images, ...videos];
  console.log(`Total: ${all.length} assets (${images.length} images, ${videos.length} videos)`);

  // Group by Instagram media ID in public_id
  const byIgId = {};
  for (const asset of all) {
    const m = asset.public_id.match(/(\d{15,})/);
    const key = m ? m[1] : asset.public_id;
    if (!byIgId[key]) byIgId[key] = [];
    byIgId[key].push(asset);
  }

  const toDelete = [];
  let dupGroups = 0;
  for (const [key, assets] of Object.entries(byIgId)) {
    if (assets.length > 1) {
      dupGroups++;
      // Keep oldest, delete the rest
      assets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      toDelete.push(...assets.slice(1));
    }
  }

  console.log(`\nDuplicate groups: ${dupGroups}`);
  console.log(`Assets to delete: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('No duplicates found!');
    return;
  }

  // Delete in batches
  const imageIds = toDelete.filter(a => a.resource_type === 'image').map(a => a.public_id);
  const videoIds = toDelete.filter(a => a.resource_type === 'video').map(a => a.public_id);
  console.log(`Deleting ${imageIds.length} images and ${videoIds.length} videos...`);

  const batchSize = 100;
  let deleted = 0;

  for (let i = 0; i < imageIds.length; i += batchSize) {
    const batch = imageIds.slice(i, i + batchSize);
    await cloudinary.api.delete_resources(batch, { resource_type: 'image' });
    deleted += batch.length;
    console.log(`  Deleted images: ${deleted}/${imageIds.length}`);
  }

  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    await cloudinary.api.delete_resources(batch, { resource_type: 'video' });
    deleted += batch.length;
    console.log(`  Deleted videos: ${deleted - imageIds.length}/${videoIds.length}`);
  }

  console.log(`\nDone! Deleted ${toDelete.length} duplicates.`);
}

run().catch(e => {
  console.error('FATAL:', e.http_code || e.message || e);
  if (e.error) console.error('Cloudinary error:', JSON.stringify(e.error));
  process.exit(1);
});
