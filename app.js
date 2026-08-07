/* ==========================================================================
   English Vocabulary Matching Game - Main Logic Script
   Features: Landing Page with QR Code Entry, Direct Match & Memory Flip Modes,
             Stopwatch Timer, Speed Bonus Math, TTS Pronunciation, Confetti FX
   ========================================================================== */

// --- Vocabulary Database ---
const VOCABULARY_DATABASE = [
  { id: 'apple', word: 'Apple', zh: '蘋果', category: 'food', image: 'images/apple.jpg', fallbackEmoji: '🍎' },
  { id: 'cat', word: 'Cat', zh: '貓咪', category: 'animals', image: 'images/cat.jpg', fallbackEmoji: '🐱' },
  { id: 'rocket', word: 'Rocket', zh: '火箭', category: 'objects', image: 'images/rocket.jpg', fallbackEmoji: '🚀' },
  { id: 'guitar', word: 'Guitar', zh: '吉他', category: 'objects', image: 'images/guitar.jpg', fallbackEmoji: '🎸' },
  { id: 'robot', word: 'Robot', zh: '機器人', category: 'objects', image: 'images/robot.jpg', fallbackEmoji: '🤖' },
  { id: 'pizza', word: 'Pizza', zh: '披薩', category: 'food', image: 'images/pizza.jpg', fallbackEmoji: '🍕' },
  { id: 'dog', word: 'Dog', zh: '小狗', category: 'animals', image: '', fallbackEmoji: '🐶' },
  { id: 'car', word: 'Car', zh: '汽車', category: 'objects', image: '', fallbackEmoji: '🚗' },
  { id: 'sun', word: 'Sun', zh: '太陽', category: 'nature', image: '', fallbackEmoji: '☀️' },
  { id: 'star', word: 'Star', zh: '星星', category: 'nature', image: '', fallbackEmoji: '⭐' },
  { id: 'book', word: 'Book', zh: '書本', category: 'objects', image: '', fallbackEmoji: '📖' },
  { id: 'banana', word: 'Banana', zh: '香蕉', category: 'food', image: '', fallbackEmoji: '🍌' }
];

// SVG Fallback Data URL generator
function createSvgDataUrl(emoji, word) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#141c33" />
        <stop offset="100%" stop-color="#24345c" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="24" fill="url(#bg)"/>
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-size="75">${emoji}</text>
    <text x="50%" y="80%" dominant-baseline="middle" text-anchor="middle" font-size="20" font-family="Fredoka, sans-serif" font-weight="bold" fill="#00f2fe">${word}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// --- Game State ---
let gameState = {
  screen: 'landing',     // 'landing' or 'game'
  mode: 'direct',        // 'direct' or 'flip'
  activeVocabulary: [], // 4 selected items
  
  // Direct Mode Selections
  selectedWordCard: null,
  selectedImageCard: null,
  
  // Memory Flip Selections
  flippedCards: [],
  isBoardLocked: false,
  
  matchedCount: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  startTime: null,
  timerInterval: null,
  elapsedMs: 0,
  lastActionTime: null,
  isGameActive: false,
  soundEnabled: true,
  speechEnabled: true,
  bestScore: parseInt(localStorage.getItem('match_best_score') || '0', 10),
  bestTimeMs: parseInt(localStorage.getItem('match_best_time') || '0', 10)
};

// --- DOM Elements ---
const landingPage = document.getElementById('landingPage');
const gameContainer = document.getElementById('gameContainer');
const qrContainer = document.getElementById('qrContainer');
const startGameBtn = document.getElementById('startGameBtn');
const homeBtn = document.getElementById('homeBtn');

const directMatchView = document.getElementById('directMatchView');
const memoryFlipView = document.getElementById('memoryFlipView');
const wordsGrid = document.getElementById('wordsGrid');
const imagesGrid = document.getElementById('imagesGrid');
const memoryGrid = document.getElementById('memoryFlipView');

const modeDirectBtn = document.getElementById('modeDirectBtn');
const modeFlipBtn = document.getElementById('modeFlipBtn');

const timerDisplay = document.getElementById('timerDisplay');
const scoreDisplay = document.getElementById('scoreDisplay');
const comboDisplay = document.getElementById('comboDisplay');
const speedIndicator = document.getElementById('speedIndicator');
const matchedCountText = document.getElementById('matchedCountText');
const progressBarFill = document.getElementById('progressBarFill');
const bestScoreDisplay = document.getElementById('bestScoreDisplay');
const bestTimeDisplay = document.getElementById('bestTimeDisplay');
const categorySelect = document.getElementById('categorySelect');

const victoryModal = document.getElementById('victoryModal');
const finalScoreText = document.getElementById('finalScoreText');
const finalTimeText = document.getElementById('finalTimeText');
const speedBonusText = document.getElementById('speedBonusText');
const maxComboText = document.getElementById('maxComboText');
const newRecordBanner = document.getElementById('newRecordBanner');

const restartBtnHeader = document.getElementById('restartBtnHeader');
const modalRestartBtn = document.getElementById('modalRestartBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundIcon = document.getElementById('soundIcon');
const speechToggleBtn = document.getElementById('speechToggleBtn');
const speechIcon = document.getElementById('speechIcon');

// --- Web Audio Synthesizer ---
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSound(type) {
  if (!gameState.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'select' || type === 'flip') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'match') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, now + idx * 0.06);
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.2, now + idx * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
        o.start(now + idx * 0.06);
        o.stop(now + idx * 0.06 + 0.25);
      });
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'victory') {
      const victoryNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      victoryNotes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + idx * 0.1);
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.25, now + idx * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
        o.start(now + idx * 0.1);
        o.stop(now + idx * 0.1 + 0.4);
      });
    }
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

// --- Text-to-Speech Pronunciation ---
function speakWord(text) {
  if (!gameState.speechEnabled || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis failed:', e);
  }
}

// --- Helper Utilities ---
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(ms) {
  const totalSeconds = ms / 1000;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const hundredths = Math.floor((ms % 1000) / 10);

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const hh = String(hundredths).padStart(2, '0');
  return `${mm}:${ss}.${hh}`;
}

// --- High Score Record Loading ---
function updateBestRecordDisplay() {
  if (gameState.bestScore > 0) {
    bestScoreDisplay.textContent = `${gameState.bestScore.toLocaleString()} 分`;
  } else {
    bestScoreDisplay.textContent = `無紀錄`;
  }

  if (gameState.bestTimeMs > 0) {
    bestTimeDisplay.textContent = `最快 ${formatTime(gameState.bestTimeMs)}`;
  } else {
    bestTimeDisplay.textContent = `最快 --:--`;
  }
}

// --- Timer Control ---
function startTimer() {
  if (gameState.timerInterval) return;
  gameState.startTime = performance.now() - gameState.elapsedMs;
  gameState.isGameActive = true;

  function update() {
    if (!gameState.isGameActive) return;
    gameState.elapsedMs = performance.now() - gameState.startTime;
    timerDisplay.textContent = formatTime(gameState.elapsedMs);
    gameState.timerInterval = requestAnimationFrame(update);
  }
  gameState.timerInterval = requestAnimationFrame(update);
}

function stopTimer() {
  if (gameState.timerInterval) {
    cancelAnimationFrame(gameState.timerInterval);
    gameState.timerInterval = null;
  }
  gameState.isGameActive = false;
}

function resetTimer() {
  stopTimer();
  gameState.elapsedMs = 0;
  timerDisplay.textContent = '00:00.00';
}

// --- Navigation & Page Transition ---
function enterGameScreen() {
  playSound('select');
  gameState.screen = 'game';
  landingPage.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  initGame();
}

function showLandingPageScreen() {
  playSound('select');
  resetTimer();
  gameState.screen = 'landing';
  gameContainer.classList.add('hidden');
  landingPage.classList.remove('hidden');
  victoryModal.classList.remove('active');
}

// --- Game Initialization / Reset ---
function initGame() {
  resetTimer();
  victoryModal.classList.remove('active');
  newRecordBanner.classList.add('hidden');

  gameState.selectedWordCard = null;
  gameState.selectedImageCard = null;
  gameState.flippedCards = [];
  gameState.isBoardLocked = false;
  gameState.matchedCount = 0;
  gameState.score = 0;
  gameState.combo = 0;
  gameState.maxCombo = 0;
  gameState.lastActionTime = null;

  scoreDisplay.textContent = '0';
  comboDisplay.textContent = '0';
  speedIndicator.textContent = '連擊加成 1.0x';
  matchedCountText.textContent = '0 / 4 組';
  progressBarFill.style.width = '0%';

  updateBestRecordDisplay();

  const cat = categorySelect.value;
  let pool = VOCABULARY_DATABASE;
  if (cat !== 'all') {
    pool = VOCABULARY_DATABASE.filter(item => item.category === cat);
    if (pool.length < 4) pool = VOCABULARY_DATABASE;
  }

  gameState.activeVocabulary = shuffleArray(pool).slice(0, 4);

  if (gameState.mode === 'direct') {
    directMatchView.classList.remove('hidden');
    memoryFlipView.classList.add('hidden');
    renderDirectMatchBoard(gameState.activeVocabulary);
  } else {
    directMatchView.classList.add('hidden');
    memoryFlipView.classList.remove('hidden');
    renderMemoryFlipBoard(gameState.activeVocabulary);
  }
}

// ==========================================================================
// MODE 1: DIRECT PAIR MATCHING
// ==========================================================================
function renderDirectMatchBoard(vocabulary) {
  wordsGrid.innerHTML = '';
  imagesGrid.innerHTML = '';

  const wordsDeck = shuffleArray(vocabulary.map(item => ({ id: item.id, word: item.word, zh: item.zh })));
  const imagesDeck = shuffleArray(vocabulary.map(item => ({
    id: item.id,
    word: item.word,
    image: item.image,
    fallbackEmoji: item.fallbackEmoji
  })));

  wordsDeck.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card word-card';
    card.dataset.id = item.id;
    card.innerHTML = `<span>${item.word}</span>`;
    card.addEventListener('click', () => handleDirectWordClick(card, item));
    wordsGrid.appendChild(card);
  });

  imagesDeck.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card image-card';
    card.dataset.id = item.id;

    const imgSrc = item.image ? item.image : createSvgDataUrl(item.fallbackEmoji, item.word);
    card.innerHTML = `<img src="${imgSrc}" alt="${item.word}" onError="this.src='${createSvgDataUrl(item.fallbackEmoji, item.word)}'">`;
    card.addEventListener('click', () => handleDirectImageClick(card, item));
    imagesGrid.appendChild(card);
  });
}

function handleDirectWordClick(cardElement, item) {
  if (cardElement.classList.contains('matched') || cardElement.classList.contains('disabled')) return;

  if (!gameState.isGameActive && gameState.matchedCount === 0) {
    startTimer();
    gameState.lastActionTime = performance.now();
  }

  playSound('select');
  speakWord(item.word);

  if (gameState.selectedWordCard) {
    gameState.selectedWordCard.cardElement.classList.remove('selected-word');
  }

  if (gameState.selectedWordCard && gameState.selectedWordCard.cardElement === cardElement) {
    gameState.selectedWordCard = null;
    return;
  }

  gameState.selectedWordCard = { id: item.id, cardElement, word: item.word };
  cardElement.classList.add('selected-word');

  checkDirectMatchAttempt();
}

function handleDirectImageClick(cardElement, item) {
  if (cardElement.classList.contains('matched') || cardElement.classList.contains('disabled')) return;

  if (!gameState.isGameActive && gameState.matchedCount === 0) {
    startTimer();
    gameState.lastActionTime = performance.now();
  }

  playSound('select');

  if (gameState.selectedImageCard) {
    gameState.selectedImageCard.cardElement.classList.remove('selected-image');
  }

  if (gameState.selectedImageCard && gameState.selectedImageCard.cardElement === cardElement) {
    gameState.selectedImageCard = null;
    return;
  }

  gameState.selectedImageCard = { id: item.id, cardElement, word: item.word };
  cardElement.classList.add('selected-image');

  checkDirectMatchAttempt();
}

function checkDirectMatchAttempt() {
  if (!gameState.selectedWordCard || !gameState.selectedImageCard) return;

  const wordObj = gameState.selectedWordCard;
  const imageObj = gameState.selectedImageCard;
  const wordCard = wordObj.cardElement;
  const imageCard = imageObj.cardElement;

  const now = performance.now();
  const timeTaken = gameState.lastActionTime ? (now - gameState.lastActionTime) / 1000 : 1.5;
  gameState.lastActionTime = now;

  if (wordObj.id === imageObj.id) {
    playSound('match');
    speakWord(wordObj.word);

    wordCard.classList.remove('selected-word');
    imageCard.classList.remove('selected-image');

    wordCard.classList.add('matched');
    imageCard.classList.add('matched');

    gameState.combo++;
    if (gameState.combo > gameState.maxCombo) {
      gameState.maxCombo = gameState.combo;
    }

    const speedBonus = Math.max(200, Math.floor(1200 - timeTaken * 350));
    const basePoints = 1000;
    const comboMultiplier = 1 + (gameState.combo - 1) * 0.5;

    const earnedScore = Math.floor((basePoints + speedBonus) * comboMultiplier);
    gameState.score += earnedScore;

    showScorePop(imageCard, `+${earnedScore} (⚡${speedBonus} Speed!)`);

    scoreDisplay.textContent = gameState.score.toLocaleString();
    comboDisplay.textContent = gameState.combo;
    speedIndicator.textContent = `連擊加成 ${comboMultiplier.toFixed(1)}x 🔥`;

    gameState.matchedCount++;
    matchedCountText.textContent = `${gameState.matchedCount} / 4 組`;
    progressBarFill.style.width = `${(gameState.matchedCount / 4) * 100}%`;

    gameState.selectedWordCard = null;
    gameState.selectedImageCard = null;

    if (gameState.matchedCount === 4) {
      handleVictory();
    }
  } else {
    playSound('wrong');

    gameState.combo = 0;
    comboDisplay.textContent = '0';
    speedIndicator.textContent = '連擊加成 1.0x';

    wordCard.classList.add('wrong');
    imageCard.classList.add('wrong');

    wordsGrid.classList.add('disabled');
    imagesGrid.classList.add('disabled');

    setTimeout(() => {
      wordCard.classList.remove('selected-word', 'wrong');
      imageCard.classList.remove('selected-image', 'wrong');
      wordsGrid.classList.remove('disabled');
      imagesGrid.classList.remove('disabled');

      gameState.selectedWordCard = null;
      gameState.selectedImageCard = null;
    }, 550);
  }
}

// ==========================================================================
// MODE 2: CARD FLIP MEMORY GAME
// ==========================================================================
function renderMemoryFlipBoard(vocabulary) {
  memoryGrid.innerHTML = '';

  const cardDeck = [];
  vocabulary.forEach((item, index) => {
    cardDeck.push({
      uid: `w_${index}_${Math.random().toString(36).substr(2, 5)}`,
      pairId: item.id,
      word: item.word,
      type: 'word'
    });
    cardDeck.push({
      uid: `i_${index}_${Math.random().toString(36).substr(2, 5)}`,
      pairId: item.id,
      word: item.word,
      type: 'image',
      image: item.image,
      fallbackEmoji: item.fallbackEmoji
    });
  });

  const shuffledDeck = shuffleArray(cardDeck);

  shuffledDeck.forEach(cardData => {
    const wrapper = document.createElement('div');
    wrapper.className = `card-wrapper type-${cardData.type}`;

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    const back = document.createElement('div');
    back.className = 'card-face card-back';
    back.innerHTML = `<span class="card-back-icon">🎴</span>`;

    const front = document.createElement('div');
    front.className = 'card-face card-front';

    if (cardData.type === 'word') {
      front.innerHTML = `
        <span class="card-type-badge">Word</span>
        <span class="card-word-text">${cardData.word}</span>
      `;
    } else {
      const imgSrc = cardData.image ? cardData.image : createSvgDataUrl(cardData.fallbackEmoji, cardData.word);
      front.innerHTML = `
        <span class="card-type-badge">Image</span>
        <img class="card-img-content" src="${imgSrc}" alt="${cardData.word}" onError="this.src='${createSvgDataUrl(cardData.fallbackEmoji, cardData.word)}'">
      `;
    }

    inner.appendChild(back);
    inner.appendChild(front);
    wrapper.appendChild(inner);

    wrapper.addEventListener('click', () => handleMemoryCardClick(wrapper, cardData));
    memoryGrid.appendChild(wrapper);
  });
}

function handleMemoryCardClick(cardWrapper, cardData) {
  if (gameState.isBoardLocked) return;
  if (cardWrapper.classList.contains('flipped') || cardWrapper.classList.contains('matched')) return;

  if (!gameState.isGameActive && gameState.matchedCount === 0) {
    startTimer();
    gameState.lastActionTime = performance.now();
  }

  playSound('flip');

  if (cardData.type === 'word') {
    speakWord(cardData.word);
  }

  cardWrapper.classList.add('flipped');
  gameState.flippedCards.push({ wrapper: cardWrapper, data: cardData });

  if (gameState.flippedCards.length === 2) {
    evaluateMemoryMatch();
  }
}

function evaluateMemoryMatch() {
  gameState.isBoardLocked = true;
  const [card1, card2] = gameState.flippedCards;

  const now = performance.now();
  const timeTaken = gameState.lastActionTime ? (now - gameState.lastActionTime) / 1000 : 1.5;
  gameState.lastActionTime = now;

  const isMatch = (card1.data.pairId === card2.data.pairId) && (card1.data.type !== card2.data.type);

  if (isMatch) {
    playSound('match');
    speakWord(card1.data.word);

    card1.wrapper.classList.add('matched');
    card2.wrapper.classList.add('matched');

    gameState.combo++;
    if (gameState.combo > gameState.maxCombo) {
      gameState.maxCombo = gameState.combo;
    }

    const speedBonus = Math.max(200, Math.floor(1200 - timeTaken * 350));
    const basePoints = 1000;
    const comboMultiplier = 1 + (gameState.combo - 1) * 0.5;

    const earnedScore = Math.floor((basePoints + speedBonus) * comboMultiplier);
    gameState.score += earnedScore;

    showScorePop(card2.wrapper, `+${earnedScore} (⚡${speedBonus} Speed!)`);

    scoreDisplay.textContent = gameState.score.toLocaleString();
    comboDisplay.textContent = gameState.combo;
    speedIndicator.textContent = `連擊加成 ${comboMultiplier.toFixed(1)}x 🔥`;

    gameState.matchedCount++;
    matchedCountText.textContent = `${gameState.matchedCount} / 4 組`;
    progressBarFill.style.width = `${(gameState.matchedCount / 4) * 100}%`;

    gameState.flippedCards = [];
    gameState.isBoardLocked = false;

    if (gameState.matchedCount === 4) {
      handleVictory();
    }
  } else {
    playSound('wrong');

    gameState.combo = 0;
    comboDisplay.textContent = '0';
    speedIndicator.textContent = '連擊加成 1.0x';

    card1.wrapper.classList.add('wrong');
    card2.wrapper.classList.add('wrong');

    setTimeout(() => {
      card1.wrapper.classList.remove('flipped', 'wrong');
      card2.wrapper.classList.remove('flipped', 'wrong');
      gameState.flippedCards = [];
      gameState.isBoardLocked = false;
    }, 850);
  }
}

// --- Floating Score Pop Effect ---
function showScorePop(targetElement, text) {
  const rect = targetElement.getBoundingClientRect();
  const pop = document.createElement('div');
  pop.className = 'score-pop';
  pop.textContent = text;
  pop.style.left = `${rect.left + rect.width / 2}px`;
  pop.style.top = `${rect.top}px`;
  document.body.appendChild(pop);

  setTimeout(() => pop.remove(), 1200);
}

// --- Victory Handler ---
function handleVictory() {
  stopTimer();
  playSound('victory');

  const totalSecs = gameState.elapsedMs / 1000;
  const timeBonus = Math.max(0, Math.floor(6000 - totalSecs * 250));
  const finalScore = gameState.score + timeBonus;

  let isNewRecord = false;
  if (finalScore > gameState.bestScore || gameState.bestScore === 0) {
    gameState.bestScore = finalScore;
    gameState.bestTimeMs = gameState.elapsedMs;
    localStorage.setItem('match_best_score', gameState.bestScore);
    localStorage.setItem('match_best_time', gameState.bestTimeMs);
    isNewRecord = true;
  }

  finalScoreText.textContent = finalScore.toLocaleString();
  finalTimeText.textContent = formatTime(gameState.elapsedMs);
  speedBonusText.textContent = `+${timeBonus.toLocaleString()} Time Bonus`;
  maxComboText.textContent = `${gameState.maxCombo}x Streak`;

  if (isNewRecord) {
    newRecordBanner.classList.remove('hidden');
  }

  setTimeout(() => {
    victoryModal.classList.add('active');
    triggerConfetti();
  }, 450);
}

// --- Canvas Confetti System ---
function triggerConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#00f2fe', '#4facfe', '#7f00ff', '#ff0844', '#ffcb43', '#00e676'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rSpeed: (Math.random() - 0.5) * 10,
      opacity: 1
    });
  }

  let startTime = null;

  function render(now) {
    if (!startTime) startTime = now;
    const progress = now - startTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.rotation += p.rSpeed;
      p.opacity -= 0.008;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    if (progress < 2500) {
      requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(render);
}

// --- Landing Page Click Listeners ---
qrContainer.addEventListener('click', enterGameScreen);
startGameBtn.addEventListener('click', enterGameScreen);
homeBtn.addEventListener('click', showLandingPageScreen);

// --- Mode Switching Listeners ---
modeDirectBtn.addEventListener('click', () => {
  if (gameState.mode === 'direct') return;
  gameState.mode = 'direct';
  modeDirectBtn.classList.add('active');
  modeFlipBtn.classList.remove('active');
  initGame();
});

modeFlipBtn.addEventListener('click', () => {
  if (gameState.mode === 'flip') return;
  gameState.mode = 'flip';
  modeFlipBtn.classList.add('active');
  modeDirectBtn.classList.remove('active');
  initGame();
});

// --- Controls Listeners ---
restartBtnHeader.addEventListener('click', () => {
  playSound('select');
  initGame();
});

modalRestartBtn.addEventListener('click', () => {
  playSound('select');
  initGame();
});

categorySelect.addEventListener('change', () => {
  initGame();
});

soundToggleBtn.addEventListener('click', () => {
  gameState.soundEnabled = !gameState.soundEnabled;
  soundIcon.textContent = gameState.soundEnabled ? '🔊' : '🔇';
});

speechToggleBtn.addEventListener('click', () => {
  gameState.speechEnabled = !gameState.speechEnabled;
  speechIcon.textContent = gameState.speechEnabled ? '🗣️' : '🚫';
});

window.addEventListener('resize', () => {
  const canvas = document.getElementById('confettiCanvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// Initialize Landing Page on Load
document.addEventListener('DOMContentLoaded', () => {
  updateBestRecordDisplay();
});
