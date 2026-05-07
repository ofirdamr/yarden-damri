/**
 * sync-all-instagram.js
 * מסנכרן את כל המדיה מאינסטגרם (כולל סרטונים וקרוסלות)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const IG_TOKEN = process.env.INSTAGRAM_TOKEN;
const CLD_CLOUD = process.env.CLOUDINARY_CLOUD || "dfjwxc1cw";
const CLD_KEY = process.env.CLOUDINARY_API_KEY;
const CLD_SECRET = process.env.CLOUDINARY_API_SECRET;

let cloudinary;
try {
    cloudinary = require("cloudinary").v2;
} catch (e) {
    console.error("❌ התקיני קודם: npm install cloudinary");
    process.exit(1);
}

cloudinary.config({
    cloud_name: CLD_CLOUD,
    api_key: CLD_KEY,
    api_secret: CLD_SECRET
});

function get(url) {
    return new Promise((res, rej) => {
        https.get(url, r => {
            if (r.statusCode === 301 || r.statusCode === 302) {
                return get(r.headers.location).then(res).catch(rej);
            }
            let d = "";
            r.on("data", c => d += c);
            r.on("end", () => {
                try { res(JSON.parse(d)); } catch (e) { res(d); }
            });
        }).on("error", rej);
    });
}

async function getAllPosts() {
    const posts = [];
    let url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,video_url,thumbnail_url,timestamp&limit=100&access_token=${IG_TOKEN}`;
    while (url) {
        console.log(`📥 מוריד פוסטים... (${posts.length} עד כה)`);
        const data = await get(url);
        if (!data.data) {
            console.error("❌ שגיאת API:", JSON.stringify(data));
            break;
        }
        posts.push(...data.data);
        url = data.paging?.next || null;
        if (url) await new Promise(r => setTimeout(r, 500));
    }
    return posts;
}

async function getCarouselChildren(carouselId) {
    try {
        const url = `https://graph.instagram.com/${carouselId}/children?fields=id,media_type,media_url,video_url,thumbnail_url&access_token=${IG_TOKEN}`;
        const data = await get(url);
        return data.data || [];
    } catch (e) {
        return [];
    }
}

async function uploadToCloudinary(mediaUrl, publicId, isVideo = false, thumbnailUrl = null) {
    const resourceType = isVideo ? "video" : "image";
    
    const result = await cloudinary.uploader.upload(mediaUrl, {
        public_id: publicId,
        folder: "yarden_makeup",
        resource_type: resourceType,
        overwrite: false
    });
    
    const entry = { u: result.secure_url, a: "" };
    
    if (isVideo) {
        entry.video = true;
        if (thumbnailUrl) {
            try {
                const thumbResult = await cloudinary.uploader.upload(thumbnailUrl, {
                    public_id: `${publicId}_thumb`,
                    folder: "yarden_makeup",
                    resource_type: "image",
                    overwrite: false
                });
                entry.thumb = thumbResult.secure_url;
            } catch (e) {}
        }
    }
    return entry;
}

function readExistingGallery() {
    const galleryPath = path.join(__dirname, "gallery-data.js");
    const content = fs.readFileSync(galleryPath, "utf-8");
    const jsonMatch = content.match(/const GALLERY_IMAGES = (\[[\s\S]*?\]);/);
    if (!jsonMatch) {
        throw new Error("לא מצאתי את const GALLERY_IMAGES ב-gallery-data.js");
    }
    const existingImages = JSON.parse(jsonMatch[1]);
    const existingIds = new Set();
    existingImages.forEach(img => {
        const match = img.u.match(/yarden_makeup_(\d+)/);
        if (match) existingIds.add(match[1]);
    });
    return { existingImages, existingIds, content, galleryPath };
}

async function main() {
    if (!IG_TOKEN || !CLD_KEY || !CLD_SECRET) {
        console.error("❌ חסרים משתני סביבה");
        process.exit(1);
    }

    console.log("📂 קורא גלריה קיימת...");
    const { existingImages, existingIds, galleryPath } = readExistingGallery();
    console.log(`📂 ${existingImages.length} פריטים קיימים בגלריה\n`);

    console.log("📥 מושך פוסטים מאינסטגרם...");
    const allPosts = await getAllPosts();
    console.log(`\n📸 סה"כ ${allPosts.length} פוסטים באינסטגרם\n`);

    const newItems = [];

    for (const post of allPosts) {
        const mediaList = [];

        if (post.media_type === "CAROUSEL_ALBUM") {
            const children = await getCarouselChildren(post.id);
            for (const child of children) {
                const isVideo = child.media_type === "VIDEO";
                const url = isVideo ? child.video_url : child.media_url;
                if (url) {
                    mediaList.push({
                        id: child.id,
                        url: url,
                        isVideo: isVideo,
                        thumbnail: child.thumbnail_url
                    });
                }
            }
        } 
        else if (post.media_type === "VIDEO") {
            if (post.video_url) {
                mediaList.push({
                    id: post.id,
                    url: post.video_url,
                    isVideo: true,
                    thumbnail: post.thumbnail_url
                });
            }
        } 
        else if (post.media_type === "IMAGE") {
            if (post.media_url) {
                mediaList.push({
                    id: post.id,
                    url: post.media_url,
                    isVideo: false
                });
            }
        }

        for (const media of mediaList) {
            if (existingIds.has(media.id)) {
                console.log(`⏭️  קיים: ${media.id}`);
                continue;
            }

            console.log(`\n⬆️  ${media.isVideo ? "🎬 סרטון" : "📷 תמונה"}: ${media.id}`);
            console.log(`   תיאור: ${(post.caption || "").substring(0, 60)}...`);

            try {
                const publicId = `yarden_makeup_${media.id}`;
                const entry = await uploadToCloudinary(media.url, publicId, media.isVideo, media.thumbnail);
                entry.a = (post.caption || "").substring(0, 200);
                newItems.push(entry);
                existingIds.add(media.id);
                console.log(`   ✅ הועלה בהצלחה`);
            } catch (e) {
                console.error(`   ❌ שגיאה: ${e.message}`);
            }
            await new Promise(r => setTimeout(r, 300));
        }
    }

    if (newItems.length === 0) {
        console.log("\n✅ אין חדש להוסיף");
        return;
    }

    const jsonStr = fs.readFileSync(galleryPath, "utf-8");
    const jsonMatch = jsonStr.match(/const GALLERY_IMAGES = (\[[\s\S]*?\]);/);
    const existing = JSON.parse(jsonMatch[1]);
    const merged = [...newItems, ...existing];
    fs.writeFileSync(galleryPath, `// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(merged)};`, "utf-8");
    console.log(`\n✅ נוספו ${newItems.length} פריטים חדשים לגלריה`);
}

main().catch(console.error);
