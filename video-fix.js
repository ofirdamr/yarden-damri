window.isVideoUrl = function(url) {
    if (!url) return false;
    if (url.includes('/video/upload/')) return true;
    if (url.match(/\.(mp4|mov|webm|avi)$/i)) return true;
    return false;
};

console.log("✅ video-fix.js loaded");
