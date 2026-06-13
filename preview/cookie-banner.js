(function () {
  if (localStorage.getItem('cookie_consent')) return;

  var css = [
    '#ck-banner{position:fixed;bottom:0;left:0;right:0;z-index:99999;',
    'background:#3E2A1A;color:rgba(255,255,255,.9);',
    'padding:16px 20px;display:flex;align-items:center;',
    'justify-content:space-between;gap:14px;flex-wrap:wrap;',
    'box-shadow:0 -4px 24px rgba(0,0,0,.3);font-size:.83rem;line-height:1.6;',
    'font-family:inherit;}',
    '#ck-banner p{margin:0;flex:1;min-width:200px;}',
    '#ck-banner a{color:#C4805A;text-decoration:underline;}',
    '#ck-btns{display:flex;gap:10px;flex-shrink:0;}',
    '#ck-accept{background:#C4805A;color:#fff;border:none;border-radius:6px;',
    'padding:9px 22px;font-size:.83rem;cursor:pointer;font-family:inherit;}',
    '#ck-decline{background:transparent;color:rgba(255,255,255,.7);',
    'border:1px solid rgba(255,255,255,.3);border-radius:6px;',
    'padding:9px 16px;font-size:.83rem;cursor:pointer;font-family:inherit;}',
    '#ck-accept:hover{background:#a06040;}',
    '#ck-decline:hover{border-color:rgba(255,255,255,.6);color:#fff;}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var banner = document.createElement('div');
  banner.id = 'ck-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'הסכמה לעוגיות');
  banner.innerHTML = [
    '<p>האתר משתמש בעוגיות לשיפור החוויה, ניתוח תנועה ופרסום ממוקד. ',
    'המשך הגלישה מהווה הסכמה לשימוש בהן. ',
    '<a href="/preview/cookies-policy-temp.html">למדיניות העוגיות המלאה</a></p>',
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
