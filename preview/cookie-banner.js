(function () {
  if (localStorage.getItem('cookie_consent')) return;

  var css = [
    '@keyframes ck-in{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}',
    '#ck-banner{position:fixed;bottom:0;left:0;right:0;z-index:10000;',
    'background:rgba(15,12,10,0.96);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
    'border-top:1px solid rgba(184,144,96,.3);',
    'padding:12px 20px;display:flex;align-items:center;gap:12px;flex-wrap:nowrap;',
    'animation:ck-in .3s ease forwards;direction:rtl;font-family:inherit;}',
    '#ck-icon{font-size:1.1rem;flex-shrink:0;}',
    '#ck-banner p{margin:0;color:rgba(255,255,255,.75);font-size:.78rem;line-height:1.5;flex:1;font-family:inherit;}',
    '#ck-banner p a{color:#B89060;text-decoration:underline;}',
    '#ck-btns{display:flex;gap:4px;align-items:center;flex-shrink:0;}',
    '#ck-accept{background:#B89060;color:#fff;border:none;border-radius:6px;',
    'padding:7px 18px;font-size:.76rem;cursor:pointer;white-space:nowrap;font-family:inherit;flex-shrink:0;}',
    '#ck-decline{background:transparent;color:rgba(255,255,255,.45);border:none;',
    'padding:7px 10px;font-size:.76rem;cursor:pointer;white-space:nowrap;font-family:inherit;flex-shrink:0;}',
    '#ck-accept:hover{background:#9a7848;}',
    '#ck-decline:hover{color:rgba(255,255,255,.8);}',
    '#ck-accept:focus-visible,#ck-decline:focus-visible{outline:2px solid #B89060;outline-offset:2px;}',
    '@media(max-width:600px){',
    '#ck-banner{flex-wrap:wrap;}',
    '#ck-banner p{white-space:normal;}',
    '#ck-btns{margin-right:auto;}',
    '}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var banner = document.createElement('div');
  banner.id = 'ck-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'הסכמה לעוגיות');
  banner.setAttribute('aria-modal', 'false');
  banner.innerHTML = [
    '<span id="ck-icon">🍪</span>',
    '<p>האתר משתמש בעוגיות לשיפור החוויה וניתוח תנועה. ',
    '<a href="/preview/cookies-policy.html">מדיניות עוגיות</a></p>',
    '<div id="ck-btns">',
    '<button id="ck-accept">אני מסכימה</button>',
    '<button id="ck-decline">דחה</button>',
    '</div>'
  ].join('');

  document.body.appendChild(banner);

  requestAnimationFrame(function () {
    var h = banner.offsetHeight;
    var lift = document.createElement('style');
    lift.id = 'ck-lift';
    lift.textContent =
      '#scroll-top{bottom:' + (h + 12) + 'px!important;transition:bottom .3s ease;}' +
      '#wa-float-btn,.wa-float{bottom:' + (h + 12) + 'px!important;transition:bottom .3s ease;}' +
      '#a11y-trigger{bottom:' + (h + 12) + 'px!important;transition:bottom .3s ease;}' +
      '#a11y-panel{bottom:' + (h + 76) + 'px!important;transition:bottom .3s ease;}';
    document.head.appendChild(lift);
  });

  function dismiss(choice) {
    localStorage.setItem('cookie_consent', choice);
    var lift = document.getElementById('ck-lift');
    if (lift) lift.remove();
    banner.style.transition = 'opacity .25s, transform .25s';
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(100%)';
    setTimeout(function () { banner.remove(); }, 260);
  }

  document.getElementById('ck-accept').addEventListener('click', function () { dismiss('accepted'); });
  document.getElementById('ck-decline').addEventListener('click', function () { dismiss('declined'); });
})();
