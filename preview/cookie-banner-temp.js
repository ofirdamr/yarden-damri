(function () {
  if (localStorage.getItem('cookie_consent')) return;

  var H = 48;

  var css =
    '#ck-top{' +
      'position:fixed;top:0;left:0;right:0;' +
      'z-index:10001;' +
      'height:' + H + 'px;' +
      'background:#1a1210;' +
      'border-bottom:1px solid rgba(184,144,96,.25);' +
      'display:flex;align-items:center;' +
      'padding:0 12px;gap:8px;' +
      'direction:rtl;font-family:inherit;' +
      'box-sizing:border-box;' +
      'animation:ck-drop .3s ease forwards;' +
    '}' +
    '@keyframes ck-drop{from{transform:translateY(-100%)}to{transform:translateY(0)}}' +
    '#ck-top-text{' +
      'color:rgba(255,255,255,.78);font-size:.72rem;' +
      'flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
    '}' +
    '#ck-top-text a{color:#B89060;text-decoration:underline;}' +
    '#ck-top-accept{' +
      'background:#B89060;color:#fff;border:none;border-radius:4px;' +
      'padding:5px 13px;font-size:.7rem;cursor:pointer;font-family:inherit;' +
      'white-space:nowrap;flex-shrink:0;' +
    '}' +
    '#ck-top-accept:hover{background:#9a7848;}' +
    '#ck-top-decline{' +
      'background:transparent;color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.3);border-radius:4px;' +
      'padding:5px 10px;font-size:.7rem;cursor:pointer;' +
      'font-family:inherit;flex-shrink:0;white-space:nowrap;' +
    '}' +
    '#ck-top-decline:hover{color:#fff;border-color:rgba(255,255,255,.6);}' +
    '#ck-top-accept:focus-visible,#ck-top-decline:focus-visible{outline:2px solid #B89060;outline-offset:2px;}' +
    'body.has-ck nav[role="navigation"]{top:' + H + 'px !important;}';

  var st = document.createElement('style');
  st.id = 'ck-style';
  st.textContent = css;
  document.head.appendChild(st);

  document.body.classList.add('has-ck');

  var banner = document.createElement('div');
  banner.id = 'ck-top';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'הסכמה לשימוש בעוגיות');
  banner.innerHTML =
    '<span id="ck-top-text">🍪 האתר משתמש בעוגיות — <a href="/preview/cookies-policy.html">מדיניות פרטיות</a></span>' +
    '<button id="ck-top-accept">אני מסכימה</button>' +
    '<button id="ck-top-decline">דחה</button>';

  document.body.insertBefore(banner, document.body.firstChild);

  function dismiss(choice) {
    localStorage.setItem('cookie_consent', choice);
    banner.style.transition = 'transform .25s ease, opacity .2s ease';
    banner.style.transform = 'translateY(-100%)';
    banner.style.opacity = '0';
    document.body.classList.remove('has-ck');
    setTimeout(function () {
      banner.remove();
      var s = document.getElementById('ck-style');
      if (s) s.remove();
    }, 270);
  }

  document.getElementById('ck-top-accept').addEventListener('click', function () { dismiss('accepted'); });
  document.getElementById('ck-top-decline').addEventListener('click', function () { dismiss('declined'); });
})();
