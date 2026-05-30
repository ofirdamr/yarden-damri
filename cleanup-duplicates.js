/**
 * cleanup-duplicates.js
 * Finds and deletes duplicate photos in Cloudinary.
 * Keeps the FIRST uploaded version (original), deletes any extras.
 * Run via: node cleanup-duplicates.js
 */

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function listAll(folder, type = 'image') {
  const results = [];
  let nextCursor = null;
  do {
    const params = {
      type: 'upload',
      prefix: folder,
      max_results: 500,
      resource_type: type
    };
    if (nextCursor) params.next_cursor = nextCursor;
    const res = await cloudinary.api.resources(params);
    results.push(...res.resources);
    nextCursor = res.next_cursor || null;
    console.log(`  Fetched ${results.length} ${type}s...`);
  } while (nextCursor);
  return results;
}

async function run() {
  console.log('Fetching all assets from Cloudinary...');
  const [images, videos] = await Promise.all([
    listAll('yarden_makeup', 'image'),
    listAll('yarden_makeup', 'video')
  ]);
  const all = [...images, ...videos];
  console.log(`Total assets: ${all.length}`);

  // Group by Instagram ID embedded in public_id
  // e.g. yarden_makeup/yarden_makeup_18094353658922515 → ID = 18094353658922515
  const byIgId = {};
  const noId = [];
  for (const asset of all) {
    const m = asset.public_id.match(/yarden_makeup[_/](\d{15,})/);
    if (m) {
      const igId = m[1];
      if (!byIgId[igId]) byIgId[igId] = [];
      byIgId[igId].push(asset);
    } else {
      noId.push(asset);
    }
  }

  // Find duplicates (more than 1 asset for same IG ID)
  const toDelete = [];
  let keptCount = 0;
  for (const [igId, assets] of Object.entries(byIgId)) {
    if (assets.length > 1) {
      // Sort by created_at ascending — keep oldest, delete the rest
      assets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const keep = assets[0];
      const dupes = assets.slice(1);
      keptCount++;
      toDelete.push(...dupes);
    }
  }

  console.log(`\nFound ${toDelete.length} duplicates to delete (keeping ${keptCount} originals)`);
  console.log(`No-ID assets (will skip): ${noId.length}`);

  if (toDelete.length === 0) {
    console.log('No duplicates found!');
    return;
  }

  // Delete in batches of 100
  let deleted = 0;
  const batchSize = 100;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const imageIds = batch.filter(a => a.resource_type === 'image').map(a => a.public_id);
    const videoIds = batch.filter(a => a.resource_type === 'video').map(a => a.public_id);

    if (imageIds.length) {
      await cloudinary.api.delete_resources(imageIds, { resource_type: 'image' });
      deleted += imageIds.length;
    }
    if (videoIds.length) {
      await cloudinary.api.delete_resources(videoIds, { resource_type: 'video' });
      deleted += videoIds.length;
    }
    console.log(`Deleted ${deleted}/${toDelete.length}...`);
  }

  console.log(`\nDone! Deleted ${deleted} duplicates.`);
  console.log('Storage and credits should decrease within a few minutes.');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
