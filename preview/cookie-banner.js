(function () {
  if (localStorage.getItem('cookie_consent')) return;

  var css =
    '#ck-banner{' +
      'position:fixed;bottom:0;left:0;right:0;' +
      'z-index:500;' +
      'background:rgba(15,12,10,0.96);' +
      'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
      'border-top:1px solid rgba(184,144,96,.22);' +
      'display:flex;align-items:center;justify-content:center;' +
      'padding:0 88px;' +
      'padding-bottom:env(safe-area-inset-bottom,0px);' +
      'height:56px;box-sizing:border-box;' +
      'font-family:inherit;' +
      'animation:ck-in .3s ease forwards;' +
    '}' +
    '@keyframes ck-in{from{transform:translateY(100%)}to{transform:translateY(0)}}' +
    '#ck-inner{' +
      'display:flex;align-items:center;gap:10px;direction:rtl;width:100%;justify-content:center;' +
    '}' +
    '#ck-text{color:rgba(255,255,255,.7);font-size:.74rem;white-space:nowrap;flex-shrink:1;overflow:hidden;text-overflow:ellipsis;}' +
    '#ck-text a{color:#B89060;text-decoration:underline;}' +
    '#ck-accept{background:#B89060;color:#fff;border:none;border-radius:5px;padding:5px 14px;font-size:.72rem;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;}' +
    '#ck-decline{background:transparent;color:rgba(255,255,255,.38);border:none;padding:5px 4px;font-size:.95rem;cursor:pointer;font-family:inherit;flex-shrink:0;line-height:1;}' +
    '#ck-accept:hover{background:#9a7848;}' +
    '#ck-decline:hover{color:rgba(255,255,255,.75);}' +
    '#ck-accept:focus-visible,#ck-decline:focus-visible{outline:2px solid #B89060;outline-offset:2px;}' +
    '@media(max-width:600px){' +
      '#ck-banner{padding-left:144px;padding-right:80px;padding-bottom:env(safe-area-inset-bottom,0px);}' +
    '}';

  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var banner = document.createElement('div');
  banner.id = 'ck-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'הסכמה לשימוש בעוגיות');
  banner.setAttribute('aria-modal', 'false');
  banner.innerHTML =
    '<div id="ck-inner">' +
      '<span id="ck-text">🍪 <a href="/preview/cookies-policy.html">מדיניות עוגיות</a></span>' +
      '<button id="ck-accept" aria-label="אני מסכימה לשימוש בעוגיות">אני מסכימה</button>' +
      '<button id="ck-decline" aria-label="דחה עוגיות" title="דחה">✕</button>' +
    '</div>';

  document.body.appendChild(banner);

  function dismiss(choice) {
    localStorage.setItem('cookie_consent', choice);
    banner.style.transition = 'transform .25s ease,opacity .2s ease';
    banner.style.transform = 'translateY(100%)';
    banner.style.opacity = '0';
    setTimeout(function () { banner.remove(); }, 270);
  }

  document.getElementById('ck-accept').addEventListener('click', function () { dismiss('accepted'); });
  document.getElementById('ck-decline').addEventListener('click', function () { dismiss('declined'); });
})();
