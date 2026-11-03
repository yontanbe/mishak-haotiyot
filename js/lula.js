// לולה המגלה: ילדה סקרנית עם כובע מגלי ארצות, מעיל צהוב ותיק אותיות סגול.
// מצוירת ב-SVG עם גרדיאנטים רדיאליים כדי לקבל מראה רך ותלת ממדי, ומונפשת ב-CSS.
let uid = 0;

export function lulaSVG(extraClass = '') {
  const u = `l${++uid}`;
  return `
<svg class="lula ${extraClass}" viewBox="0 0 220 300" xmlns="http://www.w3.org/2000/svg" aria-label="לולה המגלה" role="img">
  <defs>
    <radialGradient id="${u}skin" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#ffe3cc"/><stop offset=".65" stop-color="#f6c39f"/><stop offset="1" stop-color="#e3a07a"/>
    </radialGradient>
    <radialGradient id="${u}coat" cx="35%" cy="30%" r="80%">
      <stop offset="0" stop-color="#fff3a6"/><stop offset=".55" stop-color="#ffd23f"/><stop offset="1" stop-color="#f0a500"/>
    </radialGradient>
    <radialGradient id="${u}hair" cx="40%" cy="30%" r="75%">
      <stop offset="0" stop-color="#ffb070"/><stop offset=".6" stop-color="#f0742b"/><stop offset="1" stop-color="#c2521a"/>
    </radialGradient>
    <radialGradient id="${u}hat" cx="40%" cy="25%" r="80%">
      <stop offset="0" stop-color="#9ff0c4"/><stop offset=".6" stop-color="#2fbf7a"/><stop offset="1" stop-color="#16875a"/>
    </radialGradient>
    <radialGradient id="${u}bag" cx="35%" cy="30%" r="80%">
      <stop offset="0" stop-color="#d8b8ff"/><stop offset=".6" stop-color="#8f5cf0"/><stop offset="1" stop-color="#5d2fc0"/>
    </radialGradient>
    <radialGradient id="${u}boot" cx="35%" cy="30%" r="80%">
      <stop offset="0" stop-color="#ff9a9a"/><stop offset=".6" stop-color="#ef3f4f"/><stop offset="1" stop-color="#b3192c"/>
    </radialGradient>
    <radialGradient id="${u}eye" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#6b4a2f"/><stop offset="1" stop-color="#2b1a10"/>
    </radialGradient>
  </defs>

  <ellipse class="l-shadow" cx="110" cy="288" rx="58" ry="9" fill="#000" opacity=".15"/>

  <g class="l-body">
    <!-- תיק האותיות מאחור -->
    <g class="l-bag">
      <rect x="128" y="150" width="56" height="70" rx="20" fill="url(#${u}bag)"/>
      <rect x="134" y="160" width="44" height="20" rx="9" fill="#b994ff" opacity=".7"/>
      <text x="156" y="210" font-size="26" text-anchor="middle" fill="#fff" font-weight="800" font-family="Varela Round, sans-serif">אב</text>
    </g>

    <!-- רגליים ומגפיים -->
    <g class="l-leg l-leg-r"><rect x="82" y="222" width="20" height="40" rx="9" fill="url(#${u}skin)"/><ellipse cx="90" cy="268" rx="20" ry="14" fill="url(#${u}boot)"/></g>
    <g class="l-leg l-leg-l"><rect x="116" y="222" width="20" height="40" rx="9" fill="url(#${u}skin)"/><ellipse cx="128" cy="268" rx="20" ry="14" fill="url(#${u}boot)"/></g>

    <!-- מעיל -->
    <path d="M60 236 Q58 160 110 150 Q162 160 160 236 Q110 250 60 236Z" fill="url(#${u}coat)"/>
    <path d="M110 154 L110 240" stroke="#e39b00" stroke-width="3" opacity=".6"/>
    <circle cx="101" cy="182" r="5" fill="#ef3f4f"/><circle cx="101" cy="206" r="5" fill="#ef3f4f"/>
    <path d="M86 156 Q110 176 134 156" fill="#fff" opacity=".9"/>

    <!-- ידיים -->
    <g class="l-arm l-arm-r"><path d="M66 172 Q40 196 46 222" stroke="url(#${u}coat)" stroke-width="20" stroke-linecap="round" fill="none"/><circle cx="46" cy="226" r="11" fill="url(#${u}skin)"/></g>
    <g class="l-arm l-arm-l"><path d="M154 172 Q180 196 174 222" stroke="url(#${u}coat)" stroke-width="20" stroke-linecap="round" fill="none"/><circle cx="174" cy="226" r="11" fill="url(#${u}skin)"/></g>

    <!-- ראש -->
    <g class="l-head">
      <circle cx="62" cy="96" r="22" fill="url(#${u}hair)"/>
      <circle cx="158" cy="96" r="22" fill="url(#${u}hair)"/>
      <circle cx="70" cy="122" r="18" fill="url(#${u}hair)"/>
      <circle cx="150" cy="122" r="18" fill="url(#${u}hair)"/>
      <circle cx="110" cy="100" r="54" fill="url(#${u}skin)"/>
      <path d="M58 88 Q70 52 110 50 Q150 52 162 88 Q140 70 110 74 Q80 70 58 88Z" fill="url(#${u}hair)"/>

      <!-- כובע מגלי ארצות עם כוכב -->
      <g class="l-hat">
        <ellipse cx="110" cy="62" rx="72" ry="16" fill="url(#${u}hat)"/>
        <path d="M66 62 Q68 18 110 16 Q152 18 154 62Z" fill="url(#${u}hat)"/>
        <rect x="68" y="50" width="84" height="10" rx="5" fill="#ffd23f"/>
        <path class="l-star" d="M110 26 l5 10 11 1.5 -8 7.5 2 11 -10 -5.5 -10 5.5 2 -11 -8 -7.5 11 -1.5z" fill="#fff36b" stroke="#f0a500" stroke-width="1.5"/>
      </g>

      <!-- עיניים -->
      <g class="l-eyes">
        <ellipse cx="90" cy="104" rx="10" ry="13" fill="url(#${u}eye)"/>
        <ellipse cx="130" cy="104" rx="10" ry="13" fill="url(#${u}eye)"/>
        <circle cx="94" cy="99" r="4" fill="#fff"/><circle cx="134" cy="99" r="4" fill="#fff"/>
        <circle cx="87" cy="109" r="2" fill="#fff" opacity=".8"/><circle cx="127" cy="109" r="2" fill="#fff" opacity=".8"/>
      </g>
      <path d="M78 86 Q90 80 100 86" stroke="#c2521a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M120 86 Q130 80 142 86" stroke="#c2521a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="76" cy="124" rx="10" ry="6" fill="#ff8fa3" opacity=".55"/>
      <ellipse cx="144" cy="124" rx="10" ry="6" fill="#ff8fa3" opacity=".55"/>
      <circle cx="80" cy="120" r="1.6" fill="#d9774f"/><circle cx="86" cy="124" r="1.6" fill="#d9774f"/>
      <circle cx="140" cy="120" r="1.6" fill="#d9774f"/><circle cx="134" cy="124" r="1.6" fill="#d9774f"/>
      <ellipse cx="110" cy="116" rx="4" ry="3" fill="#e3a07a"/>
      <g class="l-mouth">
        <path class="l-smile" d="M96 128 Q110 142 124 128 Q110 136 96 128Z" fill="#c2364a"/>
        <ellipse class="l-open" cx="110" cy="132" rx="9" ry="7" fill="#c2364a"/>
      </g>
    </g>
  </g>
</svg>`;
}
