(function () {
  if (localStorage.getItem('cookie_consent')) return;

  var css = [
    /* ── Shared card styles ── */
    '#ck-banner{',
      'position:fixed;z-index:99999;',
      'left:50%;transform:translateX(-50%);',
      'background:rgba(248,242,234,0.90);',
      'backdrop-filter:blur(20px) saturate(160%);',
      '-webkit-backdrop-filter:blur(20px) saturate(160%);',
      'border-radius:18px;',
      'border:1px solid rgba(255,255,255,0.60);',
      'box-shadow:0 10px 40px rgba(60,35,15,.13),0 2px 8px rgba(60,35,15,.07),inset 0 1px 0 rgba(255,255,255,.65);',
      'padding:16px 18px;',
      'display:flex;flex-direction:column;gap:10px;',
      'font-family:inherit;color:#3a2618;',
      'font-size:12.5px;line-height:1.7;letter-spacing:.015em;',
    '}',
    '#ck-banner p{margin:0;direction:rtl;text-align:right;}',
    '#ck-banner a{color:#8a5c3a;text-decoration:underline;text-underline-offset:3px;font-weight:500;}',
    '#ck-btns{display:flex;align-items:center;gap:12px;direction:rtl;}',
    '#ck-accept{',
      'background:#3a2618;color:#f5ede0;border:none;border-radius:50px;',
      'padding:8px 22px;font-size:11.5px;font-weight:500;letter-spacing:.08em;',
      'text-transform:uppercase;cursor:pointer;font-family:inherit;',
      'transition:background .2s;white-space:nowrap;',
    '}',
    '#ck-accept:hover{background:#5c3c22;}',
    '#ck-decline{',
      'background:none;border:none;color:rgba(58,38,24,.42);',
      'font-size:11px;letter-spacing:.05em;text-decoration:underline;',
      'text-underline-offset:3px;cursor:pointer;font-family:inherit;padding:4px 0;',
    '}',
    '#ck-decline:hover{color:rgba(58,38,24,.75);}',

    /* ── Mobile: centered, lifted above bottom buttons (buttons end at ~72px from bottom) ── */
    '@media(max-width:767px){',
      '#ck-banner{',
        'bottom:90px;',
        'width:calc(100% - 28px);max-width:380px;',
        'animation:ck-mobile .5s cubic-bezier(.16,1,.3,1) both;',
      '}',
    '}',
    '@keyframes ck-mobile{',
      'from{transform:translateX(-50%) translateY(20px);opacity:0;}',
      'to{transform:translateX(-50%) translateY(0);opacity:1;}',
    '}',

    /* ── Tablet/iPad: centered, same lift ── */
    '@media(min-width:768px) and (max-width:1023px){',
      '#ck-banner{',
        'bottom:90px;',
        'width:calc(100% - 48px);max-width:440px;',
        'animation:ck-tablet .5s cubic-bezier(.16,1,.3,1) both;',
      '}',
    '}',
    '@keyframes ck-tablet{',
      'from{transform:translateX(-50%) translateY(18px);opacity:0;}',
      'to{transform:translateX(-50%) translateY(0);opacity:1;}',
    '}',

    /* ── Desktop: centered between left cluster and right WA button, sits at normal height ── */
    '@media(min-width:1024px){',
      '#ck-banner{',
        'bottom:30px;',
        'width:420px;',
        'animation:ck-desktop .5s cubic-bezier(.16,1,.3,1) both;',
      '}',
    '}',
    '@keyframes ck-desktop{',
      'from{transform:translateX(-50%) translateY(14px);opacity:0;}',
      'to{transform:translateX(-50%) translateY(0);opacity:1;}',
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
