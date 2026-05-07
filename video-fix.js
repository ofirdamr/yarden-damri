// video-fix.js - תיקון סרטונים לגלריה

window.igIdFromUrl = function(url) {
    const match = url.match(/yarden_makeup_(\d+)/);
    return match ? match[1] : null;
};
window.isVideoUrl = function(url) {
    if (!url) return false;
    // סרטונים מ-Cloudinary
    if (url.includes('/video/upload/')) return true;
    // סיומות נפוצות
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

const originalRenderPage = window.renderPage;

window.renderPage = function(page) {
    if (!window.filteredImages) {
        if (originalRenderPage) originalRenderPage(page);
        return;
    }
    
    const PER_PAGE = window.PER_PAGE || 48;
    const start = (page - 1) * PER_PAGE;
    const items = window.filteredImages.slice(start, start + PER_PAGE);
    const gallery = document.getElementById('ig-gallery');
    if (!gallery) return;
    
    gallery.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.style.cssText = 'position:relative;overflow:hidden;border-radius:16px;aspect-ratio:1;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.08);transition:transform .3s,box-shadow .3s;';
        
        const key = btoa(item.u).substring(0,12);
        const liked = localStorage.getItem('liked_'+key);
        const localLikes = (JSON.parse(localStorage.getItem('img_likes')||'{}')||{})[key]||0;
        const igId = window.igIdFromUrl ? window.igIdFromUrl(item.u) : null;
        const igStats = igId && window.igStatsCache ? window.igStatsCache[igId] : null;
        const totalLikes = (igStats ? igStats.likes : 0) + localLikes;
        const igCmtCount = igStats ? igStats.comments.length : 0;
        const localCmtCount = ((JSON.parse(localStorage.getItem('img_comments')||'{}')||{})[key]||[]).length;
        const cmtCount = igCmtCount + localCmtCount;
        
        const mediaEl = item.video 
            ? `<video src="${item.u}" poster="${item.thumb || ''}" muted loop playsinline style="width:100%;height:100%;object-fit:cover;display:block;" onmouseenter="this.play()" onmouseleave="this.pause();this.load()"></video>`
            : `<img src="${item.u}" alt="${item.a}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s;" />`;
        
        div.innerHTML = `${mediaEl}
            <div class="overlay" style="position:absolute;inset:0;background:linear-gradient(to top,rgba(44,32,24,.85) 0%,transparent 55%);opacity:0;transition:opacity .3s;display:flex;align-items:flex-end;padding:10px 12px;gap:8px;">
                <p style="color:#fff;font-size:.75rem;line-height:1.5;flex:1;">${(item.a || '').substring(0,60)}</p>
                <button onclick="event.stopPropagation();window.toggleLike('${item.u}')" style="background:rgba(255,255,255,.15);border:none;border-radius:20px;padding:5px 10px;color:${liked?'#ff6b8a':'#fff'};cursor:pointer;font-size:.8rem;">❤️ ${totalLikes}</button>
                <button onclick="event.stopPropagation();window.openComments('${item.u}','${(item.a || '').substring(0,30).replace(/'/g,"")}')" style="background:rgba(255,255,255,.15);border:none;border-radius:20px;padding:5px 10px;color:#fff;cursor:pointer;font-size:.8rem;">💬 ${cmtCount}</button>
            </div>`;
        
        div.onmouseenter = () => { div.style.transform='scale(1.02)'; const overlay = div.querySelector('.overlay'); if(overlay) overlay.style.opacity='1'; if(!item.video) { const img = div.querySelector('img'); if(img) img.style.transform='scale(1.05)'; } };
        div.onmouseleave = () => { div.style.transform='scale(1)'; const overlay = div.querySelector('.overlay'); if(overlay) overlay.style.opacity='0'; if(!item.video) { const img = div.querySelector('img'); if(img) img.style.transform='scale(1)'; } };
        
        div.onclick = () => window.openLightbox(item.u, item.a, item.video, item.thumb);
        gallery.appendChild(div);
    });
    
    if (window.renderPagination) window.renderPagination();
    window.scrollTo({top: document.getElementById('gallery').offsetTop - 80, behavior: 'smooth'});
};

console.log('✅ video-fix.js loaded');
