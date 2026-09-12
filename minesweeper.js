// Authentic Windows 98 Minesweeper
function initMinesweeper() {
  const root = document.getElementById('msw98-root');
  if (!root) return;

  // Game settings
  let settings = { rows: 9, cols: 9, mines: 10 };
  let board = [], revealed = [], flagged = [], questioned = [];
  let timerInterval = null, timerCount = 0;
  let smiley, mineCounter, timerEl;
  let gameOver = false, started = false, firstClick = true;

  // Render container markup
  root.innerHTML = `
    <div id="msw98-panel">
      <div id="msw98-mine">010</div>
      <div id="msw98-smiley" role="button" tabindex="0">🙂</div>
      <div id="msw98-timer">000</div>
      <select id="msw98-diff" aria-label="Minesweeper Difficulty">
        <option value="beginner" selected>Beginner (9x9)</option>
        <option value="intermediate">Intermediate (16x16)</option>
        <option value="expert">Expert (16x30)</option>
      </select>
    </div>
    <div id="msw98-board"></div>  
  `;

  const boardDiv = root.querySelector('#msw98-board');
  smiley = root.querySelector('#msw98-smiley');
  mineCounter = root.querySelector('#msw98-mine');
  timerEl = root.querySelector('#msw98-timer');
  const diffSelect = root.querySelector('#msw98-diff');

  diffSelect.onchange = function () {
    if (this.value === "beginner") settings = { rows: 9, cols: 9, mines: 10 };
    if (this.value === "intermediate") settings = { rows: 16, cols: 16, mines: 40 };
    if (this.value === "expert") settings = { rows: 16, cols: 30, mines: 99 };
    reset();
  };

  smiley.onclick = reset;

  function reset() {
    stopTimer();
    timerCount = 0;
    timerEl.textContent = "000";
    mineCounter.textContent = settings.mines.toString().padStart(3, "0");
    smiley.textContent = "🙂";
    boardDiv.innerHTML = "";
    boardDiv.style.gridTemplateColumns = `repeat(${settings.cols}, 26px)`;
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
    for (let i = 0; i < settings.rows * settings.cols; i++) {
      let cell = document.createElement("div");
      cell.className = "msw98-cell";
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

      cell.oncontextmenu = (e) => {
        e.preventDefault();
        if (!gameOver) cycleMark(i);
      };

      cell.onpointerdown = (e) => {
        if (gameOver) return;
        if (e.button === 0) smiley.textContent = "😮";
      };

      cell.onpointerup = (e) => {
        if (gameOver) return;
        smiley.textContent = "🙂";
        if (e.button === 0) clickCell(i);
      };

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
    } else {
      openCell(i);
    }
    draw();
    if (checkWin()) {
      gameOver = true;
      smiley.textContent = "😎";
      stopTimer();
    }
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

  reset();
}

// Auto-run if DOM already loaded or on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMinesweeper);
} else {
  initMinesweeper();
}
