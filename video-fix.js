// video-fix.js – גרסה שעובדת
(function() {
    console.log("✅ video-fix.js loaded – starting");

    // פונקציה שמחליפה את כל הווידאו בגלריה
    function fixVideos() {
        console.log("fixVideos running");
        const videos = document.querySelectorAll('video');
        console.log(`Found ${videos.length} video elements`);
        videos.forEach(v => {
            if (!v.hasAttribute('controls')) {
                v.setAttribute('controls', '');
                v.setAttribute('preload', 'metadata');
                console.log('Added controls to video');
            }
        });
    }

    // הרצה מיידית
    fixVideos();

    // הרצה גם אחרי טעינה דינמית (לגלריה)
    const observer = new MutationObserver(() => fixVideos());
    observer.observe(document.body, { childList: true, subtree: true });
})();
