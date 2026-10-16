// Dynamic SVG generator for Chopsticks hands
// Generates stylized, expressive hands showing 0 to 4 extended fingers for left and right hands

export function getHandSvg(fingers, isRightHand, isDead, isPlayer2 = false) {
  // SVG ViewBox: 0 0 160 200
  // Hand orientations:
  // For Player 1: Hand points up towards center (fingers at top, wrist at bottom)
  // For Player 2: Hand points down towards center (can be flipped via CSS or transform)
  
  if (isDead || fingers === 0) {
    return `
      <svg class="hand-svg dead-hand" viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="deadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#374151" />
            <stop offset="100%" stop-color="#1f2937" />
          </linearGradient>
          <filter id="deadGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#ef4444" flood-opacity="0.3"/>
          </filter>
        </defs>
        <!-- Dead Fist Silhouette -->
        <g class="fist-group" filter="url(#deadGlow)">
          <!-- Wrist -->
          <path d="M 55 185 C 55 155, 60 145, 55 130 L 105 130 C 100 145, 105 155, 105 185 Z" fill="url(#deadGrad)" stroke="#4b5563" stroke-width="3" stroke-linecap="round"/>
          <!-- Closed Fist Body -->
          <rect x="42" y="80" width="76" height="65" rx="20" fill="url(#deadGrad)" stroke="#4b5563" stroke-width="3"/>
          <!-- Folded finger creases -->
          <path d="M 46 98 C 65 92, 95 92, 114 98" fill="none" stroke="#6b7280" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M 46 112 C 65 106, 95 106, 114 112" fill="none" stroke="#6b7280" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M 48 126 C 65 120, 95 120, 112 126" fill="none" stroke="#6b7280" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Thumb folded across -->
          <path d="M ${isRightHand ? '44 110 C 35 115, 38 135, 60 135 L 90 125' : '116 110 C 125 115, 122 135, 100 135 L 70 125'}" fill="url(#deadGrad)" stroke="#4b5563" stroke-width="3" stroke-linecap="round"/>
          <!-- Skull / Dead Mark -->
          <g transform="translate(80, 105) scale(0.9)">
            <circle cx="0" cy="-6" r="14" fill="#ef4444" opacity="0.85"/>
            <path d="M -7 -1 L 7 -1 L 5 6 L -5 6 Z" fill="#ef4444" opacity="0.85"/>
            <!-- Skull eyes -->
            <circle cx="-5" cy="-8" r="3" fill="#111827"/>
            <circle cx="5" cy="-8" r="3" fill="#111827"/>
            <!-- Skull teeth -->
            <line x1="-3" y1="2" x2="-3" y2="5" stroke="#111827" stroke-width="1.5"/>
            <line x1="0" y1="2" x2="0" y2="5" stroke="#111827" stroke-width="1.5"/>
            <line x1="3" y1="2" x2="3" y2="5" stroke="#111827" stroke-width="1.5"/>
          </g>
        </g>
      </svg>
    `;
  }

  // Active Hand (1 to 4 fingers)
  const isIdx = fingers >= 1;
  const isMid = fingers >= 2;
  const isRng = fingers >= 3;
  const isPnk = fingers >= 4;

  const transform = isRightHand ? '' : 'transform="scale(-1, 1) translate(-160, 0)"';

  return `
    <svg class="hand-svg alive-hand" viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="handShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" flood-opacity="0.25"/>
        </filter>
      </defs>
      <g ${transform} filter="url(#handShadow)">
        <!-- Wrist / Arm -->
        <path class="hand-skin-wrist" d="M 52 195 C 50 165, 54 150, 48 135 L 112 135 C 106 150, 110 165, 108 195 Z" stroke-width="2.5" stroke-linecap="round"/>
        
        <!-- Extended / Folded Fingers (rendered back-to-front) -->
        
        <!-- Pinky (x ~ 124) -->
        ${isPnk 
          ? `<path class="hand-skin-finger finger-extended pinky" d="M 112 110 L 115 50 C 115 36, 131 36, 131 50 L 130 115 Z" stroke-width="2.5" stroke-linejoin="round"/>
             <path class="finger-crease" d="M 116 68 Q 123 71 130 68" fill="none" stroke-width="1.8"/>
             <path class="finger-crease" d="M 115 88 Q 123 91 130 88" fill="none" stroke-width="1.8"/>`
          : `<path class="hand-skin-finger finger-folded pinky" d="M 112 110 C 114 88, 131 88, 131 110 Z" stroke-width="2.5"/>`
        }

        <!-- Ring (x ~ 102) -->
        ${isRng 
          ? `<path class="hand-skin-finger finger-extended ring" d="M 92 98 L 94 30 C 94 16, 112 16, 112 30 L 112 105 Z" stroke-width="2.5" stroke-linejoin="round"/>
             <path class="finger-crease" d="M 94 52 Q 103 55 112 52" fill="none" stroke-width="1.8"/>
             <path class="finger-crease" d="M 93 75 Q 103 78 112 75" fill="none" stroke-width="1.8"/>`
          : `<path class="hand-skin-finger finger-folded ring" d="M 92 98 C 94 80, 112 80, 112 105 Z" stroke-width="2.5"/>`
        }

        <!-- Middle (x ~ 78) -->
        ${isMid 
          ? `<path class="hand-skin-finger finger-extended middle" d="M 68 95 L 70 18 C 70 4, 88 4, 88 18 L 90 102 Z" stroke-width="2.5" stroke-linejoin="round"/>
             <path class="finger-crease" d="M 70 45 Q 79 48 88 45" fill="none" stroke-width="1.8"/>
             <path class="finger-crease" d="M 69 70 Q 79 73 89 70" fill="none" stroke-width="1.8"/>`
          : `<path class="hand-skin-finger finger-folded middle" d="M 68 95 C 70 76, 88 76, 90 102 Z" stroke-width="2.5"/>`
        }

        <!-- Index (x ~ 54) -->
        ${isIdx 
          ? `<path class="hand-skin-finger finger-extended index" d="M 44 100 L 46 25 C 46 11, 64 11, 64 25 L 66 100 Z" stroke-width="2.5" stroke-linejoin="round"/>
             <path class="finger-crease" d="M 46 50 Q 55 53 64 50" fill="none" stroke-width="1.8"/>
             <path class="finger-crease" d="M 45 74 Q 55 77 65 74" fill="none" stroke-width="1.8"/>`
          : `<path class="hand-skin-finger finger-folded index" d="M 44 100 C 46 80, 64 80, 66 100 Z" stroke-width="2.5"/>`
        }

        <!-- Palm Base -->
        <path class="hand-skin-palm" d="M 42 100 C 40 120, 36 130, 48 145 C 58 152, 102 152, 112 145 C 124 130, 126 115, 126 100 C 126 95, 42 95, 42 100 Z" stroke-width="2.5" stroke-linecap="round"/>

        <!-- Thumb (folded inwards resting on palm) -->
        <path class="hand-skin-thumb" d="M 44 140 C 22 135, 20 115, 32 105 C 40 98, 52 106, 68 116 C 58 128, 48 136, 44 140 Z" stroke-width="2.5" stroke-linejoin="round"/>
        <path class="finger-crease" d="M 33 118 Q 44 122 55 120" fill="none" stroke-width="1.8"/>

        <!-- Palm contour creases -->
        <path class="palm-line" d="M 52 125 Q 75 138 105 125" fill="none" stroke-width="2" stroke-linecap="round"/>
        <path class="palm-line" d="M 56 138 Q 80 148 102 138" fill="none" stroke-width="1.8" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}
