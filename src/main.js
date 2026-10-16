import { ChopsticksGame } from './js/game.js';
import { getHandSvg } from './js/handSvg.js';

// ─── STATE ────────────────────────────────────────────────────────────────────
let game = new ChopsticksGame();
let phase = 'choose_action'; // 'choose_action' | 'select_my_hand' | 'select_target'
let selectedHand = null;     // which of current player's hands is selected
let sessionStats = { wins: [0, 0], totalGames: 0 };

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

window.showMenu = () => { updateMenuStats(); showScreen('screen-menu'); };
window.showRules = () => showScreen('screen-rules');

window.startGame = () => {
  game.reset();
  phase = 'choose_action';
  selectedHand = null;
  showScreen('screen-game');
  renderAll();
};

// ─── UNDO ─────────────────────────────────────────────────────────────────────
window.undoMove = () => {
  if (!game.undo()) { showToast('Nothing to undo', 'info'); return; }
  phase = 'choose_action';
  selectedHand = null;
  renderAll();
  showToast('↩ Undone', 'info');
};

// ─── SPLIT MODAL ──────────────────────────────────────────────────────────────
window.closeSplitModal = () => {
  document.getElementById('split-modal').classList.add('hidden');
};

// ─── MAIN RENDER ─────────────────────────────────────────────────────────────
function renderAll() {
  renderHands();
  renderHeader();
  renderActionCenter();
  document.getElementById('btn-undo').disabled = game.history.length === 0;
}

// ─── HANDS ────────────────────────────────────────────────────────────────────
function renderHands() {
  [[1,'left'],[1,'right'],[2,'left'],[2,'right']].forEach(([p, h]) => {
    const fingers = p === 1 ? game.p1[h] : game.p2[h];
    const dead = game.isDead(fingers);
    const isRight = h === 'right';

    // SVG
    document.getElementById(`svg-p${p}-${h}`).innerHTML =
      getHandSvg(fingers, isRight, dead, p === 2);

    // Chip (number)
    const chip = document.getElementById(`chip-p${p}-${h}`);
    chip.textContent = dead ? '💀' : fingers;

    // Dots
    const dotsEl = document.getElementById(`dots-p${p}-${h}`);
    dotsEl.innerHTML = '';
    const count = dead ? 0 : fingers;
    for (let i = 0; i < 4; i++) {
      const dot = document.createElement('div');
      dot.className = 'finger-dot';
      dot.style.opacity = i < count ? '1' : '0.15';
      dotsEl.appendChild(dot);
    }

    // Wrapper class
    const wrapper = document.getElementById(`hand-p${p}-${h}`);
    wrapper.className = 'hand-wrapper';
    if (dead) wrapper.classList.add('dead');
  });
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function renderHeader() {
  const badge = document.getElementById('turn-badge');
  const text  = document.getElementById('turn-text');
  badge.className = `turn-badge p${game.turn}`;
  text.innerHTML = `<span>Turn of</span> Player ${game.turn}`;

  // "YOUR TURN" labels
  document.getElementById('p1-turn-badge').classList.toggle('visible', game.turn === 1);
  document.getElementById('p2-turn-badge').classList.toggle('visible', game.turn === 2);

  // Zone active highlight
  document.getElementById('zone-p1').classList.toggle('is-active-turn', game.turn === 1);
  document.getElementById('zone-p2').classList.toggle('is-active-turn', game.turn === 2);

  // Zone CSS var for color
  const pColor = game.turn === 1 ? 'rgba(96,165,250,0.05)' : 'rgba(251,146,60,0.05)';
  document.getElementById(`zone-p${game.turn}`).style.setProperty('--zone-active-bg', pColor);
}

// ─── ACTION CENTER ─────────────────────────────────────────────────────────────
function renderActionCenter() {
  clearHandStates();

  const center = document.getElementById('action-center');
  const arrow  = document.getElementById('flow-arrow');

  // Remove old step card
  center.querySelectorAll('.step-card').forEach(el => el.remove());

  if (game.isGameOver) { arrow.className = 'flow-arrow'; return; }

  const p = game.turn;
  const colorClass = `p${p}`;
  const canSplit = game.canSplit();

  // ── Phase: CHOOSE ACTION ──────────────────────────────────────────────────
  if (phase === 'choose_action') {
    arrow.className = 'flow-arrow';

    const card = buildStepCard({
      stepNum: 1, totalSteps: 2, colorClass,
      title: `Player ${p}'s Turn`,
      desc: 'Choose what to do',
    });

    const body = card.querySelector('.step-body');

    const attackBtn = makeBtn(`⚔️ Attack`, `action-btn attack-btn ${colorClass}`, () => {
      phase = 'select_my_hand';
      renderActionCenter();
    });
    body.appendChild(attackBtn);

    if (canSplit) {
      const splitBtn = makeBtn(`🔄 Split`, 'action-btn split-btn', openSplitModal);
      body.appendChild(splitBtn);
    }

    card.querySelector('.step-num').textContent = '?';
    center.appendChild(card);
    highlightMyHandsAsClickable();
    attachHandClicks();

  // ── Phase: SELECT MY HAND ─────────────────────────────────────────────────
  } else if (phase === 'select_my_hand') {
    arrow.className = `flow-arrow visible ${colorClass}`;

    const card = buildStepCard({
      stepNum: 1, totalSteps: 2, colorClass,
      title: `Step 1 — Pick YOUR hand`,
      desc: 'Tap a hand to attack with',
    });

    const body = card.querySelector('.step-body');
    const cancelBtn = makeBtn('✕ Cancel', 'action-btn cancel-btn', () => {
      phase = 'choose_action'; renderActionCenter();
    });
    body.appendChild(cancelBtn);

    markStepDot(card, 0, 'active');

    center.appendChild(card);
    highlightMyHandsSelectable();
    attachHandClicks();

  // ── Phase: SELECT TARGET ──────────────────────────────────────────────────
  } else if (phase === 'select_target') {
    const myFingers = p === 1 ? game.p1[selectedHand] : game.p2[selectedHand];
    arrow.className = 'flow-arrow visible red';

    const card = buildStepCard({
      stepNum: 2, totalSteps: 2, colorClass,
      title: `Step 2 — Pick opponent's hand`,
      desc: `Attacking with ${selectedHand} (${myFingers} fingers)`,
    });

    const body = card.querySelector('.step-body');
    const backBtn = makeBtn('← Back', 'action-btn cancel-btn', () => {
      phase = 'select_my_hand'; selectedHand = null; renderActionCenter();
    });
    body.appendChild(backBtn);

    markStepDot(card, 0, 'done');
    markStepDot(card, 1, 'active');

    center.appendChild(card);
    highlightSourceHand();
    highlightOpponentHandsSelectable();
    attachHandClicks();
  }
}

// ─── STEP CARD BUILDER ────────────────────────────────────────────────────────
function buildStepCard({ stepNum, totalSteps, colorClass, title, desc }) {
  const card = document.createElement('div');
  card.className = `step-card ${colorClass}-active`;

  const dots = Array.from({ length: totalSteps }, () => `<div class="step-dot"></div>`).join('');

  card.innerHTML = `
    <div class="step-header">
      <div class="step-num ${colorClass}">${stepNum}</div>
      <div class="step-title">${title}</div>
      <div class="step-tracker">${dots}</div>
    </div>
    <div class="step-desc" style="padding:0.35rem 1rem;font-size:0.75rem;color:var(--text-dim)">${desc}</div>
    <div class="step-body"></div>
  `;
  return card;
}

function markStepDot(card, index, state) {
  const dots = card.querySelectorAll('.step-dot');
  if (dots[index]) dots[index].classList.add(state);
}

function makeBtn(label, classes, onClick) {
  const btn = document.createElement('button');
  btn.className = classes;
  btn.innerHTML = label;
  btn.addEventListener('click', onClick);
  return btn;
}

// ─── HAND STATE MANAGEMENT ───────────────────────────────────────────────────
function clearHandStates() {
  document.querySelectorAll('.hand-wrapper').forEach(w => {
    const p = parseInt(w.dataset.player);
    const h = w.dataset.hand;
    const fingers = p === 1 ? game.p1[h] : game.p2[h];
    w.className = 'hand-wrapper';
    if (game.isDead(fingers)) w.classList.add('dead');
  });
}

function highlightMyHandsAsClickable() {
  // In choose_action: clicking a living hand directly starts attack select
  forMyHands(w => { if (!w.classList.contains('dead')) w.classList.add('clickable'); });
}

function highlightMyHandsSelectable() {
  forMyHands(w => { if (!w.classList.contains('dead')) w.classList.add('selectable-attack'); });
  forOpponentHands(w => w.classList.add('dimmed'));
}

function highlightSourceHand() {
  const wrapper = document.getElementById(`hand-p${game.turn}-${selectedHand}`);
  wrapper?.classList.add('source-selected');
  // dim my other hand
  forMyHands(w => {
    if (w.id !== `hand-p${game.turn}-${selectedHand}`) w.classList.add('dimmed');
  });
}

function highlightOpponentHandsSelectable() {
  forOpponentHands(w => { if (!w.classList.contains('dead')) w.classList.add('selectable-defend'); });
}

function forMyHands(fn) {
  ['left','right'].forEach(h => {
    const el = document.getElementById(`hand-p${game.turn}-${h}`);
    if (el) fn(el);
  });
}
function forOpponentHands(fn) {
  const op = game.turn === 1 ? 2 : 1;
  ['left','right'].forEach(h => {
    const el = document.getElementById(`hand-p${op}-${h}`);
    if (el) fn(el);
  });
}

// ─── CLICK HANDLERS ───────────────────────────────────────────────────────────
function attachHandClicks() {
  document.querySelectorAll('.hand-wrapper').forEach(w => {
    const fresh = w.cloneNode(true);
    w.parentNode.replaceChild(fresh, w);

    if (fresh.classList.contains('dead') || fresh.classList.contains('dimmed')) return;

    const pNum = parseInt(fresh.dataset.player);
    const hand = fresh.dataset.hand;
    const isMyHand = pNum === game.turn;

    // In choose_action: clicking my alive hand shortcuts to select_my_hand then selects it
    if (phase === 'choose_action' && isMyHand) {
      fresh.classList.add('clickable');
      fresh.addEventListener('click', () => {
        phase = 'select_my_hand';
        renderActionCenter();
        // immediately select this hand
        setTimeout(() => handleMyHandClick(hand), 0);
      });
      return;
    }

    if (phase === 'select_my_hand' && isMyHand) {
      fresh.addEventListener('click', () => handleMyHandClick(hand));
    }

    if (phase === 'select_target' && !isMyHand) {
      fresh.addEventListener('click', () => handleTargetClick(hand));
    }
  });
}

function handleMyHandClick(hand) {
  const fingers = game.turn === 1 ? game.p1[hand] : game.p2[hand];
  if (game.isDead(fingers)) { showToast('That hand is dead!', 'error'); return; }
  selectedHand = hand;
  phase = 'select_target';
  renderActionCenter();
}

function handleTargetClick(hand) {
  const opNum = game.turn === 1 ? 2 : 1;
  const fingers = opNum === 1 ? game.p1[hand] : game.p2[hand];
  if (game.isDead(fingers)) { showToast('That hand is already dead!', 'error'); return; }
  executeAttack(selectedHand, hand);
}

// ─── EXECUTE ATTACK ───────────────────────────────────────────────────────────
function executeAttack(fromHand, toHand) {
  const opNum = game.turn === 1 ? 2 : 1;
  const result = game.attack(fromHand, toHand);

  if (result.error) { showToast(result.error, 'error'); return; }

  // Hit animation on target
  const targetSvg = document.getElementById(`svg-p${opNum}-${toHand}`);
  targetSvg?.classList.add('hit-anim');
  setTimeout(() => targetSvg?.classList.remove('hit-anim'), 450);

  if (result.targetDied) showToast('💀 Hand eliminated!', 'success', 2200);
  else showToast(`+${result.attackPower} fingers`, 'info', 1600);

  phase = 'choose_action';
  selectedHand = null;

  setTimeout(() => {
    renderAll();
    if (result.isGameOver) setTimeout(() => showGameOver(result.winner), 350);
  }, 200);
}

// ─── SPLIT MODAL ──────────────────────────────────────────────────────────────
function openSplitModal() {
  const p = game.getPlayer(game.turn);
  const splits = game.getValidSplits();

  // Current state
  const stateEl = document.getElementById('modal-current-state');
  stateEl.innerHTML = `
    <div class="modal-hand-state">
      <div class="modal-hand-val" style="color:${game.turn===1?'var(--p1-color)':'var(--p2-color)'}">${p.left}</div>
      <div class="modal-hand-label">Left hand</div>
    </div>
    <div style="font-size:1.5rem;opacity:0.4;align-self:center">⇄</div>
    <div class="modal-hand-state">
      <div class="modal-hand-val" style="color:${game.turn===1?'var(--p1-color)':'var(--p2-color)'}">${p.right}</div>
      <div class="modal-hand-label">Right hand</div>
    </div>
  `;

  const optionsEl = document.getElementById('split-options');
  optionsEl.innerHTML = '';

  if (splits.length === 0) {
    optionsEl.innerHTML = `<p style="color:var(--text-dim);font-size:0.85rem;padding:0.5rem 0">No valid splits available right now.</p>`;
  } else {
    splits.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'split-option-btn';
      const fromLabel = s.fromHand === 'left' ? '⬅ Left' : 'Right ➡';
      const toLabel   = s.toHand   === 'left' ? 'Left'   : 'Right';
      btn.innerHTML = `
        <span><strong>Move ${s.amount}</strong> from ${fromLabel} → ${toLabel}</span>
        <span class="split-direction-icon">→</span>
        <span class="split-result-tag">L:${s.newLeft} R:${s.newRight}</span>
      `;
      btn.addEventListener('click', () => {
        window.closeSplitModal();
        const result = game.split(s.fromHand, s.toHand, s.amount);
        if (result.error) { showToast(result.error, 'error'); return; }
        showToast(`🔄 Moved ${result.amount} finger${result.amount > 1 ? 's' : ''}`, 'info');
        phase = 'choose_action'; selectedHand = null;
        setTimeout(renderAll, 100);
      });
      optionsEl.appendChild(btn);
    });
  }

  document.getElementById('split-modal').classList.remove('hidden');
}

// ─── GAME OVER ────────────────────────────────────────────────────────────────
function showGameOver(winner) {
  sessionStats.wins[winner - 1]++;
  sessionStats.totalGames++;

  document.getElementById('gameover-title').textContent = `Player ${winner} Wins! 🎉`;
  document.getElementById('gameover-subtitle').textContent =
    winner === 1 ? '🔵 Blue wins this round!' : '🟠 Orange wins this round!';

  document.getElementById('gameover-stats').innerHTML = `
    <div class="gameover-stat">
      <span class="gameover-stat-value">${game.stats.turnsCount}</span>
      <span class="gameover-stat-label">Turns</span>
    </div>
    <div class="gameover-stat">
      <span class="gameover-stat-value">${game.stats.attacksCount}</span>
      <span class="gameover-stat-label">Attacks</span>
    </div>
    <div class="gameover-stat">
      <span class="gameover-stat-value">${game.stats.splitsCount}</span>
      <span class="gameover-stat-label">Splits</span>
    </div>
    <div class="gameover-stat">
      <span class="gameover-stat-value">${game.stats.p1Knockouts + game.stats.p2Knockouts}</span>
      <span class="gameover-stat-label">KOs</span>
    </div>
  `;

  const trophy = document.getElementById('trophy-icon');
  trophy.style.animation = 'none';
  trophy.offsetHeight;
  trophy.style.animation = '';

  spawnFireworks();
  showScreen('screen-gameover');
}

// ─── FIREWORKS ────────────────────────────────────────────────────────────────
function spawnFireworks() {
  const container = document.getElementById('fireworks');
  container.innerHTML = '';
  const colors = ['#60a5fa','#f87171','#34d399','#fbbf24','#a78bfa','#fb923c'];

  for (let b = 0; b < 6; b++) {
    const bx = 10 + Math.random() * 80;
    const by = 10 + Math.random() * 55;
    const delay = b * 0.18;
    const color = colors[b % colors.length];

    for (let i = 0; i < 12; i++) {
      const dot = document.createElement('div');
      dot.className = 'fw-dot';
      const angle = (i / 12) * Math.PI * 2;
      const dist  = 35 + Math.random() * 55;
      Object.assign(dot.style, {
        left: `${bx}%`, top: `${by}%`,
        width: `${4 + Math.random() * 4}px`,
        height: `${4 + Math.random() * 4}px`,
        background: color,
        '--tx': `${Math.cos(angle) * dist}px`,
        '--ty': `${Math.sin(angle) * dist}px`,
        '--d':  `${0.55 + Math.random() * 0.45}s`,
        '--delay': `${delay + Math.random() * 0.08}s`,
      });
      container.appendChild(dot);
    }
  }
}

// ─── MENU STATS ───────────────────────────────────────────────────────────────
function updateMenuStats() {
  const el = document.getElementById('menu-stats');
  if (sessionStats.totalGames === 0) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="stat-item"><span class="stat-value">${sessionStats.totalGames}</span><span>Games</span></div>
    <div class="stat-item"><span class="stat-value" style="color:var(--p1-color)">${sessionStats.wins[0]}</span><span>P1 Wins</span></div>
    <div class="stat-item"><span class="stat-value" style="color:var(--p2-color)">${sessionStats.wins[1]}</span><span>P2 Wins</span></div>
  `;
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 1800) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
showScreen('screen-menu');
