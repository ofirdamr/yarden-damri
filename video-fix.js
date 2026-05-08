window.isVideoUrl = function(url) {
    if (!url) return false;
    return url.includes('/video/upload/');
};

console.log('✅ video-fix.js loaded');
