// Authentic Windows 98 Minesweeper with Mobile Scaling, Flag Mode & Win/Loss Banners
function initMinesweeper() {
  const root = document.getElementById('msw98-root');
  if (!root) return;

  // Game settings
  let settings = { rows: 9, cols: 9, mines: 10 };
  let board = [], revealed = [], flagged = [], questioned = [];
  let timerInterval = null, timerCount = 0;
  let smiley, mineCounter, timerEl, modeBtn, modeIcon, modeText, bannerEl;
  let gameOver = false, started = false, firstClick = true;
  let isFlagMode = false;

  // Render container markup with Mode Button and Win/Loss Banner
  root.innerHTML = `
    <div id="msw98-panel">
      <div id="msw98-mine" title="Mines Remaining">010</div>
      <button id="msw98-mode-btn" class="msw98-mode-btn" type="button" title="Toggle Dig or Flag Mode">
        <span id="msw98-mode-icon">⛏️</span>
        <span id="msw98-mode-text">Dig</span>
      </button>
      <div id="msw98-smiley" role="button" tabindex="0" title="Restart">🙂</div>
      <div id="msw98-timer" title="Time Elapsed">000</div>
      <select id="msw98-diff" aria-label="Minesweeper Difficulty">
        <option value="beginner" selected>Beginner (9x9)</option>
        <option value="intermediate">Intermediate (16x16)</option>
        <option value="expert">Expert (16x30)</option>
      </select>
    </div>

    <!-- Retro Win / Loss Announcement Banner -->
    <div id="msw98-banner" class="msw98-banner" style="display:none;" role="alert">
      <span class="msw98-banner-icon">🏆</span>
      <div class="msw98-banner-body">
        <div class="msw98-banner-title">YOU WON!</div>
        <div class="msw98-banner-sub">All mines safely cleared!</div>
      </div>
      <button class="msw98-banner-btn" type="button">Play Again</button>
    </div>

    <div id="msw98-board-wrapper">
      <div id="msw98-board"></div>
    </div>
  `;

  const boardDiv = root.querySelector('#msw98-board');
  smiley = root.querySelector('#msw98-smiley');
  mineCounter = root.querySelector('#msw98-mine');
  timerEl = root.querySelector('#msw98-timer');
  modeBtn = root.querySelector('#msw98-mode-btn');
  modeIcon = root.querySelector('#msw98-mode-icon');
  modeText = root.querySelector('#msw98-mode-text');
  bannerEl = root.querySelector('#msw98-banner');
  const bannerBtn = bannerEl ? bannerEl.querySelector('.msw98-banner-btn') : null;
  const diffSelect = root.querySelector('#msw98-diff');

  if (bannerBtn) {
    bannerBtn.onclick = () => reset();
  }

  // Flag / Dig mode toggle
  if (modeBtn) {
    modeBtn.onclick = () => {
      isFlagMode = !isFlagMode;
      updateModeUI();
      if (typeof playClickSound === 'function') playClickSound();
    };
  }

  function updateModeUI() {
    if (!modeBtn) return;
    if (isFlagMode) {
      modeBtn.classList.add('flag-active');
      if (modeIcon) modeIcon.textContent = '🚩';
      if (modeText) modeText.textContent = 'Flag';
      modeBtn.title = 'Current Mode: Flagging. Tap to switch to Digging.';
    } else {
      modeBtn.classList.remove('flag-active');
      if (modeIcon) modeIcon.textContent = '⛏️';
      if (modeText) modeText.textContent = 'Dig';
      modeBtn.title = 'Current Mode: Digging. Tap to switch to Flagging.';
    }
  }

  diffSelect.onchange = function () {
    if (this.value === "beginner") settings = { rows: 9, cols: 9, mines: 10 };
    if (this.value === "intermediate") settings = { rows: 16, cols: 16, mines: 40 };
    if (this.value === "expert") settings = { rows: 16, cols: 30, mines: 99 };
    reset();
  };

  smiley.onclick = reset;

  function getCellSize() {
    if (window.innerWidth <= 768) {
      if (settings.cols === 9) {
        // Generous, finger-friendly size for 9x9 mobile grid
        const available = window.innerWidth - 36;
        return Math.max(34, Math.min(42, Math.floor(available / 9)));
      } else {
        return 28;
      }
    }
    return 28;
  }

  function showBanner(won) {
    if (!bannerEl) return;
    bannerEl.className = 'msw98-banner ' + (won ? 'win' : 'lose');
    bannerEl.style.display = 'flex';

    const icon = bannerEl.querySelector('.msw98-banner-icon');
    const title = bannerEl.querySelector('.msw98-banner-title');
    const sub = bannerEl.querySelector('.msw98-banner-sub');

    if (won) {
      if (icon) icon.textContent = '🏆';
      if (title) title.textContent = 'YOU WON!';
      if (sub) sub.textContent = `All mines cleared in ${timerCount} seconds! Excellent work!`;
    } else {
      if (icon) icon.textContent = '💥';
      if (title) title.textContent = 'GAME OVER!';
      if (sub) sub.textContent = 'You triggered a mine! Better luck next time.';
    }
  }

  function hideBanner() {
    if (bannerEl) bannerEl.style.display = 'none';
  }

  function playVictoryTune() {
    if (typeof playRetroTone !== 'function') return;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
    notes.forEach((freq, idx) => {
      setTimeout(() => playRetroTone(freq, 'triangle', 0.28), idx * 85);
    });
  }

  function playFlagSound() {
    if (typeof playRetroTone === 'function') {
      playRetroTone(1046.5, 'sine', 0.05);
    } else if (typeof playClickSound === 'function') {
      playClickSound();
    }
  }

  function reset() {
    stopTimer();
    hideBanner();
    timerCount = 0;
    timerEl.textContent = "000";
    mineCounter.textContent = settings.mines.toString().padStart(3, "0");
    smiley.textContent = "🙂";
    
    const cellSize = getCellSize();
    boardDiv.innerHTML = "";
    boardDiv.style.gridTemplateColumns = `repeat(${settings.cols}, ${cellSize}px)`;
    board = Array(settings.rows * settings.cols).fill(0);
    revealed = Array(settings.rows * settings.cols).fill(false);
    flagged = Array(settings.rows * settings.cols).fill(false);
    questioned = Array(settings.rows * settings.cols).fill(false);
    gameOver = false;
    started = false;
    firstClick = true;
    draw();
  }

  function placeMines(exclude) {
    let placed = 0;
    while (placed < settings.mines) {
      let idx = Math.floor(Math.random() * settings.rows * settings.cols);
      if (board[idx] === 9 || idx === exclude) continue;
      board[idx] = 9;
      placed++;
    }
    for (let i = 0; i < settings.rows * settings.cols; i++) {
      if (board[i] !== 9) board[i] = countMines(i);
    }
  }

  function countMines(i) {
    let r = Math.floor(i / settings.cols),
      c = i % settings.cols,
      cnt = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        let nr = r + dr,
          nc = c + dc,
          ni = nr * settings.cols + nc;
        if (
          nr >= 0 &&
          nr < settings.rows &&
          nc >= 0 &&
          nc < settings.cols &&
          board[ni] === 9
        ) {
          cnt++;
        }
      }
    }
    return cnt;
  }

  function draw() {
    boardDiv.innerHTML = "";
    const cellSize = getCellSize();
    boardDiv.style.gridTemplateColumns = `repeat(${settings.cols}, ${cellSize}px)`;

    for (let i = 0; i < settings.rows * settings.cols; i++) {
      let cell = document.createElement("div");
      cell.className = "msw98-cell";
      cell.style.width = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;
      cell.style.fontSize = `${Math.floor(cellSize * 0.52)}px`;

      if (revealed[i]) {
        cell.classList.add("open");
        if (board[i] === 9) {
          cell.textContent = "💣";
          cell.classList.add("mine");
        } else if (board[i] > 0) {
          cell.textContent = board[i];
          cell.classList.add("msw-num-" + board[i]);
        }
      } else if (flagged[i]) {
        cell.classList.add("flag");
        cell.textContent = "🚩";
      } else if (questioned[i]) {
        cell.classList.add("qmark");
        cell.textContent = "?";
      }

      // Desktop right-click
      cell.oncontextmenu = (e) => {
        e.preventDefault();
        if (!gameOver) {
          cycleMark(i);
          playFlagSound();
        }
      };

      // Pointer events for desktop and mobile touch gestures
      let longPressTimer = null;
      let moved = false;

      cell.addEventListener('pointerdown', (e) => {
        if (gameOver) return;
        moved = false;

        if (e.button === 0) {
          smiley.textContent = "😮";

          // Long press to place flag on mobile
          if (e.pointerType === 'touch' && !revealed[i]) {
            longPressTimer = setTimeout(() => {
              if (!gameOver && !revealed[i]) {
                cycleMark(i);
                playFlagSound();
                smiley.textContent = "🙂";
                longPressTimer = null;
              }
            }, 320);
          }
        }
      });

      cell.addEventListener('pointermove', () => {
        moved = true;
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });

      cell.addEventListener('pointerup', (e) => {
        const wasLongPress = (longPressTimer === null && e.pointerType === 'touch');
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }

        if (gameOver) return;
        smiley.textContent = "🙂";

        if (e.button === 0 && !moved) {
          if (wasLongPress) {
            // Already flagged via long-press
            return;
          }

          if (isFlagMode) {
            cycleMark(i);
            playFlagSound();
          } else {
            clickCell(i);
          }
        }
      });

      cell.addEventListener('pointercancel', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (!gameOver) smiley.textContent = "🙂";
      });

      boardDiv.appendChild(cell);
    }
  }

  function clickCell(i) {
    if (flagged[i] || revealed[i]) return;
    if (firstClick) {
      placeMines(i);
      firstClick = false;
      started = true;
      startTimer();
      if (board[i] === 9) {
        do {
          board = Array(settings.rows * settings.cols).fill(0);
          placeMines(i);
        } while (board[i] === 9);
      }
    }
    if (board[i] === 9) {
      revealed[i] = true;
      gameOver = true;
      smiley.textContent = "😵";
      revealAll();
      stopTimer();
      if (typeof playErrorSound === 'function') playErrorSound();
      showBanner(false);
    } else {
      openCell(i);
      if (typeof playClickSound === 'function') playClickSound();
    }
    draw();
    if (!gameOver && checkWin()) {
      gameOver = true;
      smiley.textContent = "😎";
      stopTimer();
      flagAllMines();
      playVictoryTune();
      showBanner(true);
    }
  }

  function flagAllMines() {
    for (let i = 0; i < settings.rows * settings.cols; i++) {
      if (board[i] === 9) flagged[i] = true;
    }
    mineCounter.textContent = "000";
    draw();
  }

  function openCell(i) {
    if (revealed[i] || flagged[i] || questioned[i]) return;
    revealed[i] = true;
    if (board[i] === 0) {
      let r = Math.floor(i / settings.cols),
        c = i % settings.cols;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          let nr = r + dr,
            nc = c + dc,
            ni = nr * settings.cols + nc;
          if (
            nr >= 0 &&
            nr < settings.rows &&
            nc >= 0 &&
            nc < settings.cols
          ) {
            openCell(ni);
          }
        }
      }
    }
  }

  function cycleMark(i) {
    if (revealed[i]) return;
    if (!flagged[i] && !questioned[i]) {
      flagged[i] = true;
    } else if (flagged[i]) {
      flagged[i] = false;
      questioned[i] = true;
    } else if (questioned[i]) {
      questioned[i] = false;
    }
    const remaining = settings.mines - flagged.filter(f => f).length;
    mineCounter.textContent = Math.max(-99, Math.min(999, remaining)).toString().padStart(3, "0");
    draw();
  }

  function revealAll() {
    for (let i = 0; i < settings.rows * settings.cols; i++) revealed[i] = true;
    draw();
  }

  function checkWin() {
    for (let i = 0; i < settings.rows * settings.cols; i++) {
      if (board[i] !== 9 && !revealed[i]) return false;
    }
    return true;
  }

  function startTimer() {
    stopTimer();
    timerCount = 0;
    timerEl.textContent = "000";
    timerInterval = setInterval(() => {
      timerCount++;
      timerEl.textContent = Math.min(999, timerCount).toString().padStart(3, "0");
      if (timerCount >= 999) stopTimer();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // Handle window resize dynamically
  window.addEventListener('resize', () => {
    if (root.offsetWidth > 0) {
      const cellSize = getCellSize();
      boardDiv.style.gridTemplateColumns = `repeat(${settings.cols}, ${cellSize}px)`;
      boardDiv.querySelectorAll('.msw98-cell').forEach(c => {
        c.style.width = `${cellSize}px`;
        c.style.height = `${cellSize}px`;
        c.style.fontSize = `${Math.floor(cellSize * 0.52)}px`;
      });
    }
  });

  reset();
}

// Auto-run if DOM already loaded or on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMinesweeper);
} else {
  initMinesweeper();
}
