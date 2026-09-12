/* ==========================================================================
   WINDOWS 98 PORTFOLIO - CORE SCRIPTS
   ========================================================================== */

let zIndexCounter = 100;
const windowOrder = ['aboutMe', 'resume', 'contacts', 'skills', 'certifications', 'minesweeper'];
let minimizedWindows = {};
let activeWindowId = null;
let soundEnabled = true;

// Window Icons Mapping for Taskbar & Shortcuts
const windowIcons = {
  aboutMe: 'assets/my-computer.png',
  resume: 'assets/resume.png',
  contacts: 'assets/contacts.png',
  skills: 'assets/skills.png',
  certifications: 'assets/certifications.png',
  minesweeper: 'assets/minesweeper.png'
};

/* ==========================================================================
   RETRO SOUND SYNTHESIZER (WEB AUDIO API - ZERO ASSET OVERHEAD)
   ========================================================================== */
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playRetroTone(freq, type, duration) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

function playClickSound() {
  playRetroTone(880, 'square', 0.04);
}

function playErrorSound() {
  playRetroTone(220, 'sawtooth', 0.15);
}

function playBootChime() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord arpeggio
    notes.forEach((freq, idx) => {
      setTimeout(() => playRetroTone(freq, 'triangle', 0.4), idx * 110);
    });
  } catch (e) {}
}

function toggleAudio() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById('tray-sound-btn');
  if (btn) btn.textContent = soundEnabled ? '🔊' : '🔇';
}

/* ==========================================================================
   WINDOW MANAGEMENT & FOCUS
   ========================================================================== */

function openWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;

  if (window.innerWidth <= 768) {
    closeAppDrawer();
  }

  const isFirstOpen = (win.style.display === 'none' || win.style.display === '');
  win.style.display = 'flex';
  win.classList.remove('minimized');
  minimizedWindows[id] = false;

  if (isFirstOpen && !win.dataset.positioned) {
    centerWindow(win);
    win.dataset.positioned = "true";
  }

  bringToFront(id);
  updateTaskbar();
  playClickSound();
}

function closeWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  win.style.display = 'none';
  win.classList.remove('maximized', 'active');
  minimizedWindows[id] = false;

  if (activeWindowId === id) {
    activeWindowId = null;
    // Activate next topmost open window
    let highestZ = 0;
    let nextActive = null;
    windowOrder.forEach(wid => {
      const w = document.getElementById(wid);
      if (w && w.style.display === 'flex') {
        const z = parseInt(w.style.zIndex || '0');
        if (z > highestZ) {
          highestZ = z;
          nextActive = wid;
        }
      }
    });
    if (nextActive) bringToFront(nextActive);
  }

  updateTaskbar();
  playClickSound();
}

function minimizeWindow(id) {
  closeWindow(id);
}

function maximizeWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;

  if (!win.classList.contains('maximized')) {
    win.dataset.prevTop = win.style.top;
    win.dataset.prevLeft = win.style.left;
    win.dataset.prevWidth = win.style.width;
    win.dataset.prevHeight = win.style.height;

    win.style.top = '0px';
    win.style.left = '0px';
    win.style.width = '100vw';
    win.style.height = 'calc(100vh - 36px)';
    win.classList.add('maximized');
  } else {
    win.classList.remove('maximized');
    win.style.top = win.dataset.prevTop || '';
    win.style.left = win.dataset.prevLeft || '';
    win.style.width = win.dataset.prevWidth || '';
    win.style.height = win.dataset.prevHeight || '';
  }
  bringToFront(id);
  playClickSound();
}

function bringToFront(id) {
  const targetWin = document.getElementById(id);
  if (!targetWin) return;

  zIndexCounter++;
  targetWin.style.zIndex = zIndexCounter;
  activeWindowId = id;

  // Update active/inactive classes for authentic Windows 98 titlebar colors
  document.querySelectorAll('.window').forEach(win => {
    if (win.id === id) {
      win.classList.remove('inactive');
      win.classList.add('active');
    } else {
      win.classList.remove('active');
      win.classList.add('inactive');
    }
  });

  updateTaskbar();
}

function centerWindow(win) {
  if (win.classList.contains('maximized')) return;

  win.style.display = 'flex';
  const width = win.offsetWidth || 540;
  const height = win.offsetHeight || 380;

  const top = Math.max(20, Math.floor((window.innerHeight - 36 - height) / 2));
  const left = Math.max(20, Math.floor((window.innerWidth - width) / 2));

  win.style.top = top + 'px';
  win.style.left = left + 'px';
}

/* ==========================================================================
   POINTER-BASED WINDOW DRAGGING (TOUCH & MOUSE COMPATIBLE)
   ========================================================================== */

function initWindowDragging() {
  document.querySelectorAll('.window').forEach(win => {
    const bar = win.querySelector('.title-bar');
    if (!bar) return;

    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    bar.addEventListener('pointerdown', (e) => {
      // Ignore clicks on minimize/maximize/close buttons
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      if (win.classList.contains('maximized')) return;

      bringToFront(win.id);
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = win.offsetLeft;
      initialTop = win.offsetTop;

      bar.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    bar.addEventListener('pointermove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      // Keep window titlebar comfortably within viewport bounds
      const maxLeft = window.innerWidth - 80;
      const maxTop = window.innerHeight - 40;
      newLeft = Math.max(-win.offsetWidth + 100, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));

      win.style.left = newLeft + 'px';
      win.style.top = newTop + 'px';
    });

    const endDrag = (e) => {
      if (isDragging) {
        isDragging = false;
        try {
          bar.releasePointerCapture(e.pointerId);
        } catch (err) {}
      }
    };

    bar.addEventListener('pointerup', endDrag);
    bar.addEventListener('pointercancel', endDrag);
  });
}

/* ==========================================================================
   TASKBAR & SYSTEM TRAY
   ========================================================================== */

function updateTaskbar() {
  const taskbar = document.getElementById('taskbar-windows');
  if (taskbar) taskbar.innerHTML = '';

  let openCount = 0;
  let hasVisibleWindow = false;
  windowOrder.forEach(id => {
    const win = document.getElementById(id);
    if (!win) return;

    const isOpen = (win.style.display === 'flex');
    if (isOpen) {
      openCount++;
      hasVisibleWindow = true;
      if (!taskbar) return;

      const btn = document.createElement('button');
      btn.className = 'taskbar-window-btn';
      
      const iconImg = document.createElement('img');
      iconImg.src = windowIcons[id] || 'assets/my-computer.png';
      iconImg.alt = '';

      const spanText = document.createElement('span');
      const titleBarText = win.querySelector('.title-bar-text');
      spanText.textContent = titleBarText ? titleBarText.textContent : id;

      btn.appendChild(iconImg);
      btn.appendChild(spanText);

      if (activeWindowId === id) {
        btn.classList.add('active');
      }

      btn.onclick = () => {
        playClickSound();
        bringToFront(id);
      };

      taskbar.appendChild(btn);
    }
  });

  document.body.classList.toggle('has-open-window', hasVisibleWindow);

  const mobileTabsLabel = document.getElementById('mobile-tabs-label');
  if (mobileTabsLabel) {
    mobileTabsLabel.textContent = `Tabs (${openCount})`;
  }

  const switcher = document.getElementById('mobile-tabs-switcher');
  if (switcher && switcher.classList.contains('open')) {
    renderTabsSwitcher();
  }
}

function updateClock() {
  const clock = document.getElementById('taskbar-clock');
  const mobileClock = document.getElementById('mobile-clock');
  const dateWidget = document.getElementById('mobile-widget-date');

  const now = new Date();
  let h = now.getHours();
  let m = now.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  if (m < 10) m = '0' + m;
  const timeStr = `${h}:${m} ${ampm}`;

  if (clock) clock.textContent = timeStr;
  if (mobileClock) mobileClock.textContent = timeStr;

  if (dateWidget) {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    dateWidget.textContent = now.toLocaleDateString(undefined, options);
  }
}

/* ==========================================================================
   START MENU
   ========================================================================== */

function toggleStartMenu() {
  const menu = document.getElementById('start-menu');
  const btn = document.getElementById('start-btn');
  if (!menu || !btn) return;

  const isVisible = menu.style.display === 'block';
  menu.style.display = isVisible ? 'none' : 'block';
  btn.classList.toggle('pressed', !isVisible);
  playClickSound();
}

function closeStartMenu() {
  const menu = document.getElementById('start-menu');
  const btn = document.getElementById('start-btn');
  if (menu) menu.style.display = 'none';
  if (btn) btn.classList.remove('pressed');
}

// Global click dismiss for Start menu & context menu
window.addEventListener('click', (e) => {
  if (!e.target.closest('#start-btn') && !e.target.closest('#start-menu')) {
    closeStartMenu();
  }
  const ctx = document.getElementById('desktop-context-menu');
  if (ctx && !e.target.closest('#desktop-context-menu')) {
    ctx.style.display = 'none';
  }
});

/* ==========================================================================
   FAST BOOTUP, BIOS & LOGIN FLOW
   ========================================================================== */

function startBootSequence() {
  document.body.style.overflow = "hidden";
  document.body.classList.add('booting');
  document.body.classList.remove('has-open-window');

  // Ensure all application windows start closed on boot
  windowOrder.forEach(id => {
    const w = document.getElementById(id);
    if (w) w.style.display = 'none';
    minimizedWindows[id] = false;
  });
  activeWindowId = null;
  updateTaskbar();

  const bootupOverlay = document.getElementById('bootup-overlay');
  const biosScreen = document.getElementById('bios-screen');
  const logoScreen = document.getElementById('windows-logo-screen');
  const loginScreen = document.getElementById('login-screen');

  if (!bootupOverlay) return;

  bootupOverlay.style.display = 'flex';
  if (biosScreen) {
    biosScreen.style.display = 'flex';
    const biosText = biosScreen.querySelector('.bios-text');
    if (biosText) biosText.style.visibility = 'visible';
  }
  if (logoScreen) logoScreen.style.display = 'none';
  if (loginScreen) loginScreen.style.display = 'none';

  // Quick stall at green BIOS screen (1.4s), then direct to Windows 98 loading screen
  setTimeout(() => {
    // If user entered BIOS utility, don't interrupt
    const biosPopup = document.getElementById('bios-popup');
    if (biosPopup && biosPopup.style.display === 'block') return;

    if (biosScreen) biosScreen.style.display = 'none';
    if (logoScreen) logoScreen.style.display = 'flex';

    const loadingBar = document.getElementById('loading-progress');
    if (loadingBar) {
      loadingBar.style.width = '0%';
      setTimeout(() => { loadingBar.style.width = '100%'; }, 50);
    }

    setTimeout(() => {
      if (logoScreen) logoScreen.style.display = 'none';
      if (loginScreen) logoScreen.style.display = 'none';
      if (loginScreen) {
        loginScreen.style.display = 'flex';
        const passInput = document.getElementById('login-password');
        if (passInput) passInput.focus();
      }
    }, 2000);
  }, 1400);
}

function checkLogin() {
  const input = document.getElementById('login-password');
  const errorDiv = document.getElementById('login-error');
  if (!input) return;

  if (input.value.trim().toLowerCase() === 'sagnik') {
    const overlay = document.getElementById('bootup-overlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('booting');
    document.body.classList.remove('has-open-window');
    if (errorDiv) errorDiv.textContent = '';
    playBootChime();

    // Clean homescreen state: all windows remain closed
    windowOrder.forEach(id => {
      const w = document.getElementById(id);
      if (w) w.style.display = 'none';
      minimizedWindows[id] = false;
    });
    activeWindowId = null;
    closeAppDrawer();
    closeNotificationCenter();
    closeTabsSwitcher();
    updateTaskbar();
  } else {
    playErrorSound();
    if (errorDiv) errorDiv.textContent = 'Incorrect password! Hint: sagnik';
    input.value = '';
    input.focus();
  }
}

function rebootPC() {
  closeStartMenu();
  closeNotificationCenter();
  closeTabsSwitcher();
  closeAppDrawer();

  // Close all open windows
  windowOrder.forEach(id => {
    const w = document.getElementById(id);
    if (w) w.style.display = 'none';
    minimizedWindows[id] = false;
  });
  activeWindowId = null;
  updateTaskbar();

  document.body.classList.add('booting');
  const overlay = document.getElementById('bootup-overlay');
  if (overlay) overlay.style.display = 'flex';
  const passInput = document.getElementById('login-password');
  if (passInput) passInput.value = '';

  startBootSequence();
}

function lockPC() {
  closeStartMenu();
  closeNotificationCenter();
  closeTabsSwitcher();
  closeAppDrawer();

  document.body.classList.add('booting');
  const overlay = document.getElementById('bootup-overlay');
  const biosScreen = document.getElementById('bios-screen');
  const logoScreen = document.getElementById('windows-logo-screen');
  const loginScreen = document.getElementById('login-screen');
  const passInput = document.getElementById('login-password');

  if (overlay) overlay.style.display = 'flex';
  if (biosScreen) biosScreen.style.display = 'none';
  if (logoScreen) logoScreen.style.display = 'none';
  if (loginScreen) loginScreen.style.display = 'flex';
  if (passInput) {
    passInput.value = '';
    passInput.focus();
  }
}

/* ==========================================================================
   BIOS SETUP UTILITY (EASTER EGG)
   ========================================================================== */

function showBiosTab(tab) {
  const tabs = ['main', 'advanced', 'boot', 'security', 'exit'];
  tabs.forEach(t => {
    const content = document.getElementById('bios-tab-content-' + t);
    const btn = document.getElementById('bios-tab-' + t);
    if (content) content.style.display = (t === tab) ? '' : 'none';
    if (btn) btn.classList.toggle('active', t === tab);
  });
  playClickSound();
}

function openBios() {
  const biosPopup = document.getElementById('bios-popup');
  const overlay = document.getElementById('bootup-overlay');
  if (!biosPopup) return;

  biosPopup.style.display = 'block';
  if (overlay) overlay.style.display = 'none';

  const now = new Date();
  const timeEl = document.getElementById('bios-time');
  const dateEl = document.getElementById('bios-date');
  if (timeEl) timeEl.textContent = now.toLocaleTimeString();
  if (dateEl) dateEl.textContent = now.toLocaleDateString();

  showBiosTab('main');
}

function closeBios() {
  const biosPopup = document.getElementById('bios-popup');
  if (biosPopup) biosPopup.style.display = 'none';
  startBootSequence();
}

// Global keydown listeners for BIOS & Login
document.addEventListener('keydown', (e) => {
  const biosScreen = document.getElementById('bios-screen');
  const overlay = document.getElementById('bootup-overlay');

  if (
    e.key === "Delete" &&
    biosScreen &&
    overlay &&
    biosScreen.style.display !== "none" &&
    overlay.style.display !== "none"
  ) {
    e.preventDefault();
    openBios();
    return;
  }

  if (e.key === "Escape") {
    const biosPopup = document.getElementById('bios-popup');
    if (biosPopup && biosPopup.style.display === "block") {
      closeBios();
      e.preventDefault();
    }
  }

  if (e.key === "Enter") {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen && loginScreen.style.display !== 'none' && document.activeElement.id === 'login-password') {
      checkLogin();
    }
  }
});

/* ==========================================================================
   DESKTOP CONTEXT MENU & CRT MODE
   ========================================================================== */

function initDesktopContextMenu() {
  const desktop = document.body;
  const menu = document.getElementById('desktop-context-menu');
  if (!menu) return;

  desktop.addEventListener('contextmenu', (e) => {
    // Only show custom context menu if right clicking on background or desktop icons
    if (e.target.closest('.window') || e.target.closest('.taskbar') || e.target.closest('#bootup-overlay')) {
      return;
    }
    e.preventDefault();
    menu.style.display = 'block';
    menu.style.left = Math.min(e.clientX, window.innerWidth - 170) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 150) + 'px';
  });
}

function toggleCRT() {
  let crt = document.getElementById('crt-overlay');
  if (!crt) {
    crt = document.createElement('div');
    crt.id = 'crt-overlay';
    crt.className = 'crt-filter';
    document.body.appendChild(crt);
  } else {
    crt.remove();
  }
  const btn = document.getElementById('tray-crt-btn');
  if (btn) btn.title = document.getElementById('crt-overlay') ? 'CRT Effect: ON' : 'CRT Effect: OFF';
}

function arrangeIcons() {
  const icons = document.querySelector('.desktop-icons');
  if (icons) {
    icons.style.flexDirection = 'column';
    playClickSound();
  }
}

/* ==========================================================================
   DESKTOP ICONS SELECTION & TOUCH/CLICK HANDLING
   ========================================================================== */

function initDesktopIcons() {
  const icons = document.querySelectorAll('.desktop-icons .icon');
  icons.forEach(icon => {
    let lastTap = 0;

    icon.addEventListener('click', (e) => {
      icons.forEach(i => i.classList.remove('selected'));
      icon.classList.add('selected');
      e.stopPropagation();

      // On mobile screens (<=768px), single tap immediately opens the window
      if (window.innerWidth <= 768) {
        const action = icon.getAttribute('data-window');
        if (action) openWindow(action);
        return;
      }

      // On desktop, support double-click and quick double-tap
      const now = new Date().getTime();
      const diff = now - lastTap;
      if (diff < 350 && diff > 0) {
        const action = icon.getAttribute('data-window');
        if (action) openWindow(action);
      }
      lastTap = now;
    });

    icon.addEventListener('dblclick', () => {
      const action = icon.getAttribute('data-window');
      if (action) openWindow(action);
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.icon')) {
      icons.forEach(i => i.classList.remove('selected'));
    }
  });
}

/* ==========================================================================
   MOBILE OS: TOUCH GESTURES, APP DRAWER, NOTIFICATION SHADE & RECENT TABS
   ========================================================================== */

/* 1. App Drawer */
function openAppDrawer() {
  const drawer = document.getElementById('mobile-app-drawer');
  if (drawer) {
    closeNotificationCenter();
    closeTabsSwitcher();
    drawer.classList.add('open');
    playClickSound();
  }
}

function closeAppDrawer() {
  const drawer = document.getElementById('mobile-app-drawer');
  if (drawer) {
    drawer.classList.remove('open');
  }
}

function toggleAppDrawer() {
  const drawer = document.getElementById('mobile-app-drawer');
  if (drawer) {
    const isOpen = drawer.classList.contains('open');
    if (isOpen) closeAppDrawer();
    else openAppDrawer();
  }
}

function filterDrawerApps(query) {
  const q = (query || '').toLowerCase().trim();
  const items = document.querySelectorAll('.drawer-app-item');
  items.forEach(item => {
    const title = item.querySelector('.drawer-app-title')?.textContent.toLowerCase() || '';
    const desc = item.querySelector('.drawer-app-desc')?.textContent.toLowerCase() || '';
    if (title.includes(q) || desc.includes(q)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

/* 2. Droppable Notification Shade & Control Center */
function toggleNotificationCenter() {
  const shade = document.getElementById('mobile-notification-center');
  if (!shade) return;
  const isOpen = shade.classList.contains('open');
  if (isOpen) {
    closeNotificationCenter();
  } else {
    openNotificationCenter();
  }
}

function openNotificationCenter() {
  const shade = document.getElementById('mobile-notification-center');
  if (!shade) return;
  closeAppDrawer();
  closeTabsSwitcher();
  shade.classList.add('open');
  updateControlCenterUI();
  playClickSound();
}

function closeNotificationCenter() {
  const shade = document.getElementById('mobile-notification-center');
  if (shade) {
    shade.classList.remove('open');
  }
}

let wifiConnected = true;
function toggleWiFi() {
  wifiConnected = !wifiConnected;
  const card = document.getElementById('ctrl-wifi');
  const carrier = document.querySelector('.mobile-carrier');
  if (card) {
    card.classList.toggle('active', wifiConnected);
    const sub = card.querySelector('.ctrl-sub');
    if (sub) sub.textContent = wifiConnected ? 'Connected' : 'Disconnected';
  }
  if (carrier) {
    carrier.textContent = wifiConnected ? 'Win98 4G' : 'No Service';
  }
  playClickSound();
}

function updateControlCenterUI() {
  const crtCard = document.getElementById('ctrl-crt');
  const crtSub = document.getElementById('ctrl-crt-sub');
  const isCrt = document.body.classList.contains('crt-mode');
  if (crtCard) crtCard.classList.toggle('active', isCrt);
  if (crtSub) crtSub.textContent = isCrt ? 'On' : 'Off';

  const audioCard = document.getElementById('ctrl-audio');
  const audioSub = document.getElementById('ctrl-audio-sub');
  if (audioCard) audioCard.classList.toggle('active', soundEnabled);
  if (audioSub) audioSub.textContent = soundEnabled ? 'On' : 'Mute';
}

function clearNotifications() {
  const list = document.getElementById('notif-list');
  if (list) {
    list.innerHTML = `
      <div class="notif-item" style="justify-content:center; color:#666; font-style:italic; padding: 14px;">
        <span>No new notifications</span>
      </div>
    `;
    playClickSound();
  }
}

/* 3. Recent Tabs Switcher (Multitasking Overview) */
function toggleTabsSwitcher() {
  const switcher = document.getElementById('mobile-tabs-switcher');
  if (!switcher) return;
  const isOpen = switcher.classList.contains('open');
  if (isOpen) {
    closeTabsSwitcher();
  } else {
    openTabsSwitcher();
  }
}

function openTabsSwitcher() {
  const switcher = document.getElementById('mobile-tabs-switcher');
  if (!switcher) return;
  closeNotificationCenter();
  closeAppDrawer();
  renderTabsSwitcher();
  switcher.classList.add('open');
  playClickSound();
}

function closeTabsSwitcher() {
  const switcher = document.getElementById('mobile-tabs-switcher');
  if (switcher) {
    switcher.classList.remove('open');
  }
}

function renderTabsSwitcher() {
  const container = document.getElementById('tabs-switcher-list');
  if (!container) return;
  container.innerHTML = '';

  const openIds = windowOrder.filter(id => {
    const win = document.getElementById(id);
    return win && win.style.display === 'flex';
  });

  if (openIds.length === 0) {
    container.innerHTML = `
      <div class="tabs-empty-state">
        <h4>No Open Tabs</h4>
        <p>You have no active running applications.<br>Open an app from the home screen or app drawer.</p>
      </div>
    `;
    return;
  }

  openIds.forEach(id => {
    const win = document.getElementById(id);
    const titleBarText = win.querySelector('.title-bar-text');
    const title = titleBarText ? titleBarText.textContent : id;
    const icon = windowIcons[id] || 'assets/my-computer.png';
    const isActive = (activeWindowId === id);

    const card = document.createElement('div');
    card.className = 'tab-card';

    card.innerHTML = `
      <div class="tab-card-header ${isActive ? '' : 'inactive'}">
        <div class="tab-card-title">
          <img src="${icon}" alt="" />
          <span>${title}</span>
        </div>
        <button class="tab-card-close" onclick="event.stopPropagation(); closeWindow('${id}');" aria-label="Close tab">✕</button>
      </div>
      <div class="tab-card-preview" onclick="switchToTab('${id}')">
        <img src="${icon}" alt="" />
        <span>${title}</span>
      </div>
    `;

    container.appendChild(card);
  });
}

function switchToTab(id) {
  closeTabsSwitcher();
  const win = document.getElementById(id);
  if (!win) return;
  win.style.display = 'flex';
  win.classList.remove('minimized');
  minimizedWindows[id] = false;
  bringToFront(id);
  updateTaskbar();
  playClickSound();
}

function closeAllTabs() {
  windowOrder.forEach(id => {
    closeWindow(id);
  });
  activeWindowId = null;
  document.body.classList.remove('has-open-window');
  updateTaskbar();
  renderTabsSwitcher();
  playClickSound();
}

/* 4. Bottom Nav Actions */
function goHome() {
  closeAppDrawer();
  closeNotificationCenter();
  closeTabsSwitcher();

  // Fully close and clear all open tabs from the open tabs section
  windowOrder.forEach(id => {
    closeWindow(id);
  });

  activeWindowId = null;
  document.body.classList.remove('has-open-window');
  updateTaskbar();
  renderTabsSwitcher();
  playClickSound();
}

function goBack() {
  const shade = document.getElementById('mobile-notification-center');
  if (shade && shade.classList.contains('open')) {
    closeNotificationCenter();
    playClickSound();
    return;
  }
  const switcher = document.getElementById('mobile-tabs-switcher');
  if (switcher && switcher.classList.contains('open')) {
    closeTabsSwitcher();
    playClickSound();
    return;
  }
  const drawer = document.getElementById('mobile-app-drawer');
  if (drawer && drawer.classList.contains('open')) {
    closeAppDrawer();
    playClickSound();
    return;
  }
  if (activeWindowId) {
    closeWindow(activeWindowId);
  } else {
    playClickSound();
  }
}

/* 5. Mobile Gesture Recognition */
function initMobileGestures() {
  let touchStartY = 0;
  let touchStartX = 0;
  let isSwiping = false;

  document.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 768) return;
    // Don't intercept swipe gestures if user is interacting with scrollable content
    if (e.target.closest('.window-body') || e.target.closest('#tabs-switcher-list') || e.target.closest('#notif-list')) {
      isSwiping = false;
      return;
    }
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      isSwiping = true;
    }
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!isSwiping || window.innerWidth > 768) return;
    isSwiping = false;

    if (e.changedTouches.length > 0) {
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndX = e.changedTouches[0].clientX;
      const diffY = touchStartY - touchEndY;
      const diffX = Math.abs(touchStartX - touchEndX);

      // Predominantly vertical swipe
      if (Math.abs(diffY) > 40 && Math.abs(diffY) > diffX) {
        if (diffY < -40) {
          // Swipe DOWN
          // If swipe starts from top 25% of screen, drop notification center
          if (touchStartY < window.innerHeight * 0.25) {
            openNotificationCenter();
          } else {
            // Otherwise, if drawer is open, close drawer
            const drawer = document.getElementById('mobile-app-drawer');
            if (drawer && drawer.classList.contains('open')) {
              closeAppDrawer();
            }
          }
        } else if (diffY > 40) {
          // Swipe UP
          const shade = document.getElementById('mobile-notification-center');
          if (shade && shade.classList.contains('open')) {
            closeNotificationCenter();
            return;
          }

          // Open drawer ONLY from homescreen when no window is active
          if (!document.body.classList.contains('has-open-window')) {
            const drawer = document.getElementById('mobile-app-drawer');
            if (drawer && !drawer.classList.contains('open')) {
              if (touchStartY > window.innerHeight * 0.35) {
                openAppDrawer();
              }
            }
          }
        }
      }
    }
  }, { passive: true });
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

window.addEventListener('DOMContentLoaded', () => {
  initWindowDragging();
  initDesktopIcons();
  initDesktopContextMenu();
  initMobileGestures();
  updateClock();
  setInterval(updateClock, 1000);
  startBootSequence();
});
