(function () {
  if (localStorage.getItem('cookie_consent')) return;

  var css = [
    '#ck-banner{position:fixed;bottom:0;left:0;right:0;z-index:99999;',
    'background:rgba(17,17,17,0.93);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);',
    'border-top:1px solid rgba(184,144,96,.25);',
    'padding:10px 20px;display:flex;align-items:center;',
    'justify-content:space-between;gap:12px;flex-wrap:nowrap;',
    'font-size:.78rem;line-height:1.5;font-family:inherit;}',
    '#ck-banner p{margin:0;color:rgba(255,255,255,.7);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#ck-banner a{color:#B89060;text-decoration:underline;white-space:nowrap;}',
    '#ck-btns{display:flex;gap:8px;flex-shrink:0;align-items:center;}',
    '#ck-accept{background:#B89060;color:#fff;border:none;border-radius:4px;',
    'padding:6px 18px;font-size:.76rem;cursor:pointer;font-family:inherit;white-space:nowrap;}',
    '#ck-decline{background:transparent;color:rgba(255,255,255,.45);border:none;',
    'padding:6px 10px;font-size:.76rem;cursor:pointer;font-family:inherit;white-space:nowrap;}',
    '#ck-accept:hover{background:#9a7848;}',
    '#ck-decline:hover{color:rgba(255,255,255,.8);}',
    '@media(max-width:600px){',
    '#ck-banner{flex-wrap:wrap;padding:10px 14px;}',
    '#ck-banner p{white-space:normal;font-size:.74rem;}',
    '}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var banner = document.createElement('div');
  banner.id = 'ck-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'הסכמה לעוגיות');
  banner.innerHTML = [
    '<p>האתר משתמש בעוגיות לשיפור החוויה וניתוח תנועה. ',
    '<a href="/preview/cookies-policy.html">מדיניות עוגיות</a></p>',
    '<div id="ck-btns">',
    '<button id="ck-accept">אני מסכימה</button>',
    '<button id="ck-decline">דחה</button>',
    '</div>'
  ].join('');

  document.body.appendChild(banner);

  function dismiss(choice) {
    localStorage.setItem('cookie_consent', choice);
    banner.remove();
  }

  document.getElementById('ck-accept').addEventListener('click', function () { dismiss('accepted'); });
  document.getElementById('ck-decline').addEventListener('click', function () { dismiss('declined'); });
})();
