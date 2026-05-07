// video-fix.js - pure browser version

window.igIdFromUrl = function(url) {
    const match = url.match(/yarden_makeup_(\d+)/);
    return match ? match[1] : null;
};

window.isVideoUrl = function(url) {
    if (!url) return false;
    if (url.includes('/video/upload/')) return true;
    if (url.match(/\.(mp4|mov|webm|avi)$/i)) return true;
    return false;
};

window.openLightbox = function(url, alt, isVideo, thumb) {
    const lb = document.getElementById('lightbox');
    if (!lb.querySelector('.lb-media')) {
        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'lb-media';
        const captionP = lb.querySelector('.lb-caption');
        lb.insertBefore(mediaDiv, captionP);
    }
    const mediaEl = isVideo 
        ? `<video src="${url}" poster="${thumb || ''}" controls autoplay style="max-width:90vw;max-height:72vh;object-fit:contain;border-radius:12px;"></video>`
        : `<img src="${url}" alt="${alt}" style="max-width:90vw;max-height:72vh;object-fit:contain;border-radius:12px;">`;
    lb.querySelector('.lb-media').innerHTML = mediaEl;
    lb.querySelector('.lb-caption').textContent = (alt || '').substring(0, 120);
    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.renderPage = function(page) {
    if (!window.filteredImages) return;
    const perPage = window.PER_PAGE || 48;
    const start = (page - 1) * perPage;
    const items = window.filteredImages.slice(start, start + perPage);
    const gallery = document.getElementById('ig-gallery');
    if (!gallery) return;
    gallery.innerHTML = '';
    for (const item of items) {
        const div = document.createElement('div');
        div.style.cssText = 'position:relative;overflow:hidden;border-radius:16px;aspect-ratio:1;cursor:pointer';
        const isVideo = item.video === true;
        div.innerHTML = (isVideo ?
            `<video src="${item.u}" poster="${item.thumb||''}" muted loop playsinline style="width:100%;height:100%;object-fit:cover" onmouseenter="this.play()" onmouseleave="this.pause()"></video>` :
            `<img src="${item.u}" style="width:100%;height:100%;object-fit:cover" loading="lazy">`);
        gallery.appendChild(div);
    }
    if (window.renderPagination) window.renderPagination();
};

console.log('✅ video-fix.js loaded - browser version');
};

console.log('✅ video-fix.js loaded - full version with video detection');
