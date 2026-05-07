// video-fix.js - תיקון סרטונים לגלריה - גרסה מלאה ומוכנה

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

window.toggleLike = function(url) {
    const likes = JSON.parse(localStorage.getItem('img_likes')||'{}');
    const key = btoa(url).substring(0,12);
    const liked = localStorage.getItem('liked_'+key);
    if (liked) {
        likes[key] = Math.max(0,(likes[key]||1)-1);
        localStorage.removeItem('liked_'+key);
    } else {
        likes[key] = (likes[key]||0)+1;
        localStorage.setItem('liked_'+key,'1');
    }
    localStorage.setItem('img_likes', JSON.stringify(likes));
    if (window.renderPage) window.renderPage(window.currentPage || 1);
};

window.openComments = function(url, alt) {
    const key = btoa(url).substring(0,12);
    const localComments = (JSON.parse(localStorage.getItem('img_comments')||'{}')||{})[key]||[];
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.85);display:flex;align-items:flex-end;justify-content:center;';
    modal.innerHTML = `<div style="background:#231815;border-radius:20px 20px 0 0;width:100%;max-width:500px;padding:24px;max-height:70vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <strong style="color:#E8C8B0">תגובות</strong>
            <button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:none;color:#E8C8B0;font-size:1.3rem;cursor:pointer">✕</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
            ${localComments.length ? localComments.map(c=>`
                <div style="background:rgba(255,255,255,.05);border-radius:10px;padding:10px 12px;">
                    <strong style="color:var(--blush);font-size:.85rem">${c.name}</strong>
                    <p style="font-size:.88rem;color:rgba(240,230,220,.8);margin-top:4px">${c.text}</p>
                </div>`).join('') : '<p style="opacity:.5;font-size:.85rem">אין תגובות עדיין</p>'}
        </div>
        <input id="cmt-name" placeholder="שמך" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(232,200,176,.2);background:rgba(255,255,255,.06);color:#F0E6DC;font-size:.9rem;margin-bottom:8px;" />
        <textarea id="cmt-text" placeholder="כתבי תגובה..." style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(232,200,176,.2);background:rgba(255,255,255,.06);color:#F0E6DC;font-size:.9rem;min-height:70px;resize:none;margin-bottom:10px;font-family:inherit;"></textarea>
        <button onclick="(()=>{const n=document.getElementById('cmt-name').value.trim();const t=document.getElementById('cmt-text').value.trim();if(!n||!t)return;const c=JSON.parse(localStorage.getItem('img_comments')||'{}');if(!c['${key}'])c['${key}']=[];c['${key}'].push({name:n,text:t,date:new Date().toLocaleDateString('he-IL')});localStorage.setItem('img_comments',JSON.stringify(c));this.closest('div[style*=fixed]').remove();if(window.renderPage)window.renderPage(window.currentPage||1);})()" style="width:100%;padding:12px;border-radius:10px;border:none;background:#C4805A;color:#fff;font-weight:700;cursor:pointer;font-size:.95rem;">שלחי 💬</button>
    </div>`;
    document.body.appendChild(modal);
};

const originalRenderPage = window.renderPage;

window.renderPage = function(page) {
    window.currentPage = page;
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
        
        const isVideo = window.isVideoUrl(item.u);
        
        const mediaEl = isVideo 
            ? `<video src="${item.u}" poster="${item.thumb || ''}" muted loop playsinline style="width:100%;height:100%;object-fit:cover;display:block;" onmouseenter="this.play()" onmouseleave="this.pause();this.load()"></video>`
            : `<img src="${item.u}" alt="${item.a}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s;" />`;
        
        div.innerHTML = `${mediaEl}
            <div class="overlay" style="position:absolute;inset:0;background:linear-gradient(to top,rgba(44,32,24,.85) 0%,transparent 55%);opacity:0;transition:opacity .3s;display:flex;align-items:flex-end;padding:10px 12px;gap:8px;">
                <p style="color:#fff;font-size:.75rem;line-height:1.5;flex:1;">${(item.a || '').substring(0,60)}</p>
                <button onclick="event.stopPropagation();window.toggleLike('${item.u}')" style="background:rgba(255,255,255,.15);border:none;border-radius:20px;padding:5px 10px;color:${liked?'#ff6b8a':'#fff'};cursor:pointer;font-size:.8rem;">❤️ ${totalLikes}</button>
                <button onclick="event.stopPropagation();window.openComments('${item.u}','${(item.a || '').substring(0,30).replace(/'/g,"")}')" style="background:rgba(255,255,255,.15);border:none;border-radius:20px;padding:5px 10px;color:#fff;cursor:pointer;font-size:.8rem;">💬 ${cmtCount}</button>
            </div>`;
        
        div.onmouseenter = () => { div.style.transform='scale(1.02)'; const overlay = div.querySelector('.overlay'); if(overlay) overlay.style.opacity='1'; if(!isVideo) { const img = div.querySelector('img'); if(img) img.style.transform='scale(1.05)'; } };
        div.onmouseleave = () => { div.style.transform='scale(1)'; const overlay = div.querySelector('.overlay'); if(overlay) overlay.style.opacity='0'; if(!isVideo) { const img = div.querySelector('img'); if(img) img.style.transform='scale(1)'; } };
        
        div.onclick = () => window.openLightbox(item.u, item.a, isVideo, item.thumb);
        gallery.appendChild(div);
    });
    
    if (window.renderPagination) window.renderPagination();
    window.scrollTo({top: document.getElementById('gallery').offsetTop - 80, behavior: 'smooth'});
};

console.log('✅ video-fix.js loaded - full version with video detection');
