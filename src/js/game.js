// Chopsticks Game Engine
// Faithful implementation of the C program rules with clean event-driven state

export class ChopsticksGame {
  constructor(options = {}) {
    this.options = {
      allowRevive: false, // Default to user's exact C code rules
      ...options
    };
    this.reset();
  }

  reset() {
    this.p1 = { left: 1, right: 1 };
    this.p2 = { left: 1, right: 1 };
    this.turn = 1; // 1 = Player 1, 2 = Player 2
    this.history = [];
    this.isGameOver = false;
    this.winner = null;
    this.stats = {
      turnsCount: 0,
      attacksCount: 0,
      splitsCount: 0,
      p1Knockouts: 0,
      p2Knockouts: 0,
    };
  }

  isDead(fingers) {
    return fingers >= 5 || fingers === 0;
  }

  checkLose(player) {
    return this.isDead(player.left) && this.isDead(player.right);
  }

  getPlayer(num) {
    return num === 1 ? this.p1 : this.p2;
  }

  getOpponent(num) {
    return num === 1 ? this.p2 : this.p1;
  }

  canSplit(playerNum = this.turn) {
    const player = this.getPlayer(playerNum);

    if (this.options.allowRevive) {
      // If revive allowed: can split if one is dead and other has >= 2 fingers
      if (this.isDead(player.left) && !this.isDead(player.right) && player.right >= 2) return true;
      if (this.isDead(player.right) && !this.isDead(player.left) && player.left >= 2) return true;
    }

    // Exact C-Code rule:
    // if (isDead(current->left)) can_split = 0;
    // else if (isDead(current->right)) can_split = 0;
    // else can_split = 1;
    // AND must have at least one hand with > 1 finger (*from <= 1 cannot split)
    if (this.isDead(player.left) || this.isDead(player.right)) {
      return false;
    }
    return player.left > 1 || player.right > 1;
  }

  getValidSplits(playerNum = this.turn) {
    const player = this.getPlayer(playerNum);
    const splits = [];

    // Helper to evaluate transfer from -> to
    const checkTransfer = (fromHand, toHand, fromVal, toVal) => {
      if (fromVal <= 1) return;
      // In C code: transfer amount (1 to *from - 1)
      for (let amount = 1; amount < fromVal; amount++) {
        const newFrom = fromVal - amount;
        const newTo = toVal + amount;
        // Check that receiving hand does not bust >= 5 unless intended
        if (newTo < 5 && newFrom > 0) {
          splits.push({
            fromHand,
            toHand,
            amount,
            newLeft: fromHand === 'left' ? newFrom : newTo,
            newRight: fromHand === 'right' ? newFrom : newTo,
          });
        }
      }
    };

    if (!this.isDead(player.left) && !this.isDead(player.right)) {
      // Left -> Right
      checkTransfer('left', 'right', player.left, player.right);
      // Right -> Left
      checkTransfer('right', 'left', player.right, player.left);
    } else if (this.options.allowRevive) {
      if (this.isDead(player.left) && !this.isDead(player.right) && player.right >= 2) {
        checkTransfer('right', 'left', player.right, 0);
      } else if (this.isDead(player.right) && !this.isDead(player.left) && player.left >= 2) {
        checkTransfer('left', 'right', player.left, 0);
      }
    }

    // Filter duplicate resulting states if any
    const unique = [];
    const seen = new Set();
    for (const s of splits) {
      const key = `${s.newLeft}-${s.newRight}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }
    return unique;
  }

  getValidAttacks(playerNum = this.turn) {
    const attacker = this.getPlayer(playerNum);
    const defender = this.getOpponent(playerNum);
    const attacks = [];

    const myHands = [];
    if (!this.isDead(attacker.left)) myHands.push('left');
    if (!this.isDead(attacker.right)) myHands.push('right');

    const opHands = [];
    if (!this.isDead(defender.left)) opHands.push('left');
    if (!this.isDead(defender.right)) opHands.push('right');

    for (const myH of myHands) {
      for (const opH of opHands) {
        attacks.push({ fromHand: myH, toHand: opH });
      }
    }
    return attacks;
  }

  saveSnapshot() {
    return {
      p1: { ...this.p1 },
      p2: { ...this.p2 },
      turn: this.turn,
      isGameOver: this.isGameOver,
      winner: this.winner,
      stats: { ...this.stats },
    };
  }

  attack(fromHand, toHand) {
    if (this.isGameOver) return { error: 'Game is already over' };

    const attackerNum = this.turn;
    const defenderNum = attackerNum === 1 ? 2 : 1;
    const attacker = this.getPlayer(attackerNum);
    const defender = this.getOpponent(attackerNum);

    if (this.isDead(attacker[fromHand])) {
      return { error: 'Attacking hand is dead' };
    }
    if (this.isDead(defender[toHand])) {
      return { error: 'Target hand is already dead' };
    }

    // Save previous snapshot for undo and history
    const prevSnapshot = this.saveSnapshot();

    const attackPower = attacker[fromHand];
    const initialTargetFingers = defender[toHand];
    let newTargetFingers = initialTargetFingers + attackPower;
    let targetDied = false;

    // C logic:
    // *hand_defend += *hand_attack;
    // if(isDead(*hand_defend)) { *hand_defend = 0; }
    if (this.isDead(newTargetFingers)) {
      defender[toHand] = 0;
      targetDied = true;
      if (attackerNum === 1) this.stats.p1Knockouts++;
      else this.stats.p2Knockouts++;
    } else {
      defender[toHand] = newTargetFingers;
    }

    this.stats.attacksCount++;
    this.stats.turnsCount++;

    const isGameOver = this.checkLose(defender);
    if (isGameOver) {
      this.isGameOver = true;
      this.winner = attackerNum;
    }

    const moveRecord = {
      type: 'attack',
      player: attackerNum,
      fromHand,
      toHand,
      attackPower,
      initialTargetFingers,
      newTargetFingers: defender[toHand],
      targetDied,
      isGameOver,
      winner: this.winner,
      snapshotBefore: prevSnapshot,
    };

    this.history.push(moveRecord);

    if (!isGameOver) {
      this.turn = defenderNum;
    }

    return {
      success: true,
      ...moveRecord,
    };
  }

  split(fromHand, toHand, amount) {
    if (this.isGameOver) return { error: 'Game is already over' };

    const playerNum = this.turn;
    const player = this.getPlayer(playerNum);

    if (!this.canSplit(playerNum)) {
      return { error: 'Cannot split currently' };
    }

    if (player[fromHand] <= 1) {
      return { error: 'Cannot split from a hand with 1 or fewer fingers' };
    }

    if (amount < 1 || amount >= player[fromHand]) {
      return { error: `Amount must be between 1 and ${player[fromHand] - 1}` };
    }

    const prevSnapshot = this.saveSnapshot();

    player[fromHand] -= amount;
    player[toHand] += amount;

    if (this.isDead(player[toHand])) {
      player[toHand] = 0;
    }

    this.stats.splitsCount++;
    this.stats.turnsCount++;

    const moveRecord = {
      type: 'split',
      player: playerNum,
      fromHand,
      toHand,
      amount,
      newLeft: player.left,
      newRight: player.right,
      snapshotBefore: prevSnapshot,
    };

    this.history.push(moveRecord);

    // Switch turn
    this.turn = playerNum === 1 ? 2 : 1;

    return {
      success: true,
      ...moveRecord,
    };
  }

  undo() {
    if (this.history.length === 0) return false;
    const lastMove = this.history.pop();
    const snap = lastMove.snapshotBefore;

    this.p1 = { ...snap.p1 };
    this.p2 = { ...snap.p2 };
    this.turn = snap.turn;
    this.isGameOver = snap.isGameOver;
    this.winner = snap.winner;
    this.stats = { ...snap.stats };

    return true;
  }
}
