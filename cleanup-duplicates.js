/**
 * cleanup-duplicates.js
 * Deletes Cloudinary assets that are NOT used by the site (not in gallery-data.js).
 * Also removes duplicates.
 */
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function listAll(resourceType) {
  const results = [];
  let nextCursor = undefined;
  let page = 0;
  do {
    if (page > 0) await sleep(600);
    const opts = { resource_type: resourceType, type: 'upload', prefix: 'yarden_makeup', max_results: 500 };
    if (nextCursor) opts.next_cursor = nextCursor;
    const res = await cloudinary.api.resources(opts);
    results.push(...(res.resources || []));
    nextCursor = res.next_cursor;
    page++;
    process.stdout.write(`\r  ${resourceType}s: ${results.length} fetched...`);
  } while (nextCursor);
  console.log('');
  return results;
}

async function run() {
  // 1. Load gallery-data.js to know which URLs the site actually uses
  let usedUrls = new Set();
  try {
    const raw = fs.readFileSync('gallery-data.js', 'utf8')
      .replace('// Auto-generated gallery data\nconst GALLERY_IMAGES = ', '')
      .replace(/;$/, '');
    const gallery = JSON.parse(raw);
    gallery.forEach(item => {
      if (item.u) usedUrls.add(item.u);
    });
    console.log(`Gallery has ${gallery.length} items, ${usedUrls.size} unique URLs`);
  } catch(e) {
    console.error('Could not load gallery-data.js:', e.message);
    process.exit(1);
  }

  // 2. List all Cloudinary assets
  console.log('Fetching all Cloudinary assets...');
  const images = await listAll('image');
  await sleep(1000);
  const videos = await listAll('video');
  const all = [...images, ...videos];
  console.log(`Cloudinary total: ${all.length} (${images.length} images, ${videos.length} videos)`);

  // 3. Find assets NOT used by the site
  const toDelete = [];
  const keep = [];
  for (const asset of all) {
    if (usedUrls.has(asset.secure_url)) {
      keep.push(asset);
    } else {
      toDelete.push(asset);
    }
  }

  console.log(`\nUsed by site: ${keep.length}`);
  console.log(`Unused (to delete): ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('Nothing to delete!');
    return;
  }

  // Show sample of what will be deleted
  console.log('\nSample of assets to delete:');
  toDelete.slice(0, 5).forEach(a => console.log(' -', a.public_id, `(${a.resource_type})`));
  if (toDelete.length > 5) console.log(` ... and ${toDelete.length - 5} more`);

  // 4. Delete in batches of 100
  const imageIds = toDelete.filter(a => a.resource_type === 'image').map(a => a.public_id);
  const videoIds = toDelete.filter(a => a.resource_type === 'video').map(a => a.public_id);
  console.log(`\nDeleting ${imageIds.length} images + ${videoIds.length} videos...`);

  let deleted = 0;
  const batchSize = 100;

  for (let i = 0; i < imageIds.length; i += batchSize) {
    await sleep(800);
    const batch = imageIds.slice(i, i + batchSize);
    await cloudinary.api.delete_resources(batch, { resource_type: 'image' });
    deleted += batch.length;
    console.log(`  Images: ${deleted}/${imageIds.length}`);
  }

  for (let i = 0; i < videoIds.length; i += batchSize) {
    await sleep(800);
    const batch = videoIds.slice(i, i + batchSize);
    await cloudinary.api.delete_resources(batch, { resource_type: 'video' });
    deleted += batch.length;
    console.log(`  Videos: ${deleted - imageIds.length}/${videoIds.length}`);
  }

  console.log(`\nDone! Deleted ${toDelete.length} unused assets.`);
  console.log(`Cloudinary now has ~${keep.length} assets matching the site.`);
}

run().catch(e => {
  console.error('FATAL:', e.message || JSON.stringify(e.error || e).slice(0, 300));
  process.exit(1);
});
