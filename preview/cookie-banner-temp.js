(function () {
  if (localStorage.getItem('cookie_consent')) return;

  var css = [
    '@keyframes ck-in{from{opacity:0;transform:translate(-50%,20px)}to{opacity:1;transform:translate(-50%,0)}}',
    '@keyframes ck-out{from{opacity:1;transform:translate(-50%,0)}to{opacity:0;transform:translate(-50%,20px)}}',
    '#ck-banner{',
    'position:fixed;left:50%;transform:translateX(-50%);z-index:99999;',
    'background:rgba(17,17,17,0.95);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
    'border-radius:16px;border:1px solid rgba(184,144,96,.3);',
    'box-shadow:0 8px 40px rgba(0,0,0,0.5);',
    'padding:16px 20px;',
    'display:flex;flex-direction:column;gap:12px;',
    'animation:ck-in .35s ease both;',
    'direction:rtl;font-family:inherit;}',
    '@media(min-width:601px){#ck-banner{bottom:28px;min-width:340px;max-width:520px;}}',
    '@media(max-width:600px){#ck-banner{bottom:110px;width:calc(100% - 32px);max-width:400px;}}',
    '#ck-row1{display:flex;align-items:flex-start;gap:10px;}',
    '#ck-icon{font-size:1.3rem;flex-shrink:0;line-height:1.5;}',
    '#ck-text{margin:0;color:rgba(255,255,255,.8);font-size:.8rem;line-height:1.55;font-family:inherit;}',
    '#ck-text a{color:#B89060;text-decoration:underline;white-space:nowrap;}',
    '#ck-btns{display:flex;gap:8px;justify-content:flex-end;align-items:center;}',
    '#ck-accept{background:#B89060;color:#fff;border:none;border-radius:6px;',
    'padding:7px 20px;font-size:.78rem;cursor:pointer;font-family:inherit;white-space:nowrap;}',
    '#ck-decline{background:transparent;color:rgba(255,255,255,.45);border:none;',
    'padding:7px 12px;font-size:.78rem;cursor:pointer;font-family:inherit;white-space:nowrap;}',
    '#ck-accept:hover{background:#9a7848;}',
    '#ck-decline:hover{color:rgba(255,255,255,.75);}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var banner = document.createElement('div');
  banner.id = 'ck-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'הסכמה לעוגיות');
  banner.innerHTML = [
    '<div id="ck-row1">',
    '<span id="ck-icon">🍪</span>',
    '<p id="ck-text">האתר משתמש בעוגיות לשיפור החוויה וניתוח תנועה. ',
    '<a href="/preview/cookies-policy.html">מדיניות עוגיות</a></p>',
    '</div>',
    '<div id="ck-btns">',
    '<button id="ck-decline">דחה</button>',
    '<button id="ck-accept">אני מסכימה</button>',
    '</div>'
  ].join('');

  document.body.appendChild(banner);

  function dismiss(choice) {
    banner.style.animation = 'ck-out .3s ease both';
    banner.addEventListener('animationend', function () {
      localStorage.setItem('cookie_consent', choice);
      banner.remove();
    }, { once: true });
  }

  document.getElementById('ck-accept').addEventListener('click', function () { dismiss('accepted'); });
  document.getElementById('ck-decline').addEventListener('click', function () { dismiss('declined'); });
})();
