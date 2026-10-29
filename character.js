// Режим Character. Каркас такой же, как в game.js:
// холст на весь экран, update() меняет состояние, draw() рисует, frame() крутит цикл.
//
// Управление: стрелки ← → — бежать влево и вправо. Esc — назад в меню.
// Персонаж берётся из спрайтшита (character.png), бег анимируется сменой кадров,
// а при движении влево картинка отражается зеркально.

const canvas = document.getElementById("cnvs");
canvas.width = innerWidth;
canvas.height = innerHeight;

const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

// ===== ПЕРСОНАЖ =====
// Всё, что нужно знать о персонаже между кадрами.
//   x, y    — центр персонажа на экране (стартует посередине)
//   speed   — скорость бега в пикселях в секунду. Больше число — быстрее бег
//   moving  — бежит ли сейчас (true/false), выставляется в update()
//   facing  — куда смотрит: 1 — вправо, -1 — влево
const character = {
  x: W / 2,
  y: H / 2,
  speed: 250,
  moving: false,
  facing: 1,
};

// ===== КЛАВИАТУРА =====
// Обработчики только запоминают, какие клавиши сейчас зажаты: keys["ArrowLeft"] = true.
// Решение, что делать с нажатием, принимает update().
// e.code — физическая клавиша, поэтому управление не зависит от раскладки (рус/англ).
const keys = {};
document.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});
document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// ===== АНИМАЦИЯ =====
// animTime  — сколько времени прошло с последней смены кадра
// animIndex — какой по счёту кадр из RUN_FRAMES сейчас показан
// FRAME_DURATION — сколько секунд держится один кадр бега.
// Меньше число — ноги перебирают быстрее (попробуйте 0.1 или 0.4).
let time = 0;
let animTime = 0;
let animIndex = 0;
const FRAME_DURATION = 0.2; // длительность одного кадра анимации в секундах

// ===== СПРАЙТШИТ =====
// character.png — одна картинка, на которой все позы персонажа разложены сеткой 9 × 3.
// Чтобы взять другого персонажа из пака Kenney, замените файл на его *_tilesheet.png:
// у них та же сетка и тот же размер.
const characterImage = new Image();
characterImage.src = "character.png";
characterImage.onerror = () => console.error("Не удалось загрузить изображение персонажа: character.png");

const SHEET_W = 720;   // ширина всего листа
const SHEET_H = 340;   // высота всего листа
const COLS = 9;        // кадров в одном ряду
const ROWS = 3;        // рядов на листе

// Размер одного кадра считается из размера листа и сетки.
const FRAME_W = SHEET_W / COLS;   // 80
const FRAME_H = SHEET_H / ROWS;   // 110

// Номера кадров на листе: считаются слева направо, сверху вниз, начиная с 0.
//   0  1  2 ...  8
//   9 10 11 ... 17
//  18 19 20 ... 26
// Чтобы поменять позу стойки или добавить кадры бега, поменяйте числа здесь.
const IDLE_FRAME = 0;        // поза, когда персонаж стоит
const RUN_FRAMES = [9, 10];  // кадры бега, показываются по кругу

// ===== РИСОВАНИЕ ОДНОГО КАДРА =====
// n      — номер кадра на листе
// x, y   — где на экране будет центр персонажа
// scale  — увеличение: 1 — как на листе, 2 — вдвое больше
function drawFrame(n, x, y, scale) {
  // По номеру кадра находим его колонку и ряд, а из них — место на листе.
  const col = n % COLS;
  const row = Math.floor(n / COLS);
  const sx = col * FRAME_W;
  const sy = row * FRAME_H;

  const w = FRAME_W * scale;   // ширина на экране
  const h = FRAME_H * scale;   // высота на экране

  // Отражение: переносим точку (0,0) в центр персонажа и при facing = -1
  // переворачиваем ось X. Отражение идёт вокруг (0,0), поэтому персонаж
  // разворачивается на месте, а не улетает в сторону.
  // save/restore возвращают холст в обычное состояние для всего остального.
  ctx.save();
  ctx.translate(x, y);   // (0,0) теперь в центре персонажа
  ctx.scale(character.facing, 1);         // 1 — как есть, -1 — зеркально

  // Вырезаем кадр из листа и кладём так, чтобы его центр оказался в (0,0).
  ctx.drawImage(characterImage,
    sx, sy, FRAME_W, FRAME_H,
    -w / 2, -h / 2, w, h);         // центр кадра должен оказаться в (0,0)

  ctx.restore();

}


// ===== ЛОГИКА =====
// Вызывается каждый кадр. dt — сколько секунд прошло с прошлого кадра:
// на него умножается скорость, поэтому персонаж бежит одинаково на любом мониторе.
function update(dt) {
  time += dt;

  // движение: сначала решаем, куда идём
  // dir: -1 — влево, 0 — стоим, 1 — вправо. Если зажаты обе стрелки, получится 0.
  let dir = 0;
  if (keys["ArrowRight"]) {
    dir += 1;
    character.facing = 1;
  }
  if (!dir) character.facing = -1;
  if (keys["ArrowLeft"]) {
    dir -= 1;
    character.facing = -1;
  }
  character.moving = dir !== 0;
  character.x += dir * character.speed * dt;

  // анимация: крутится только пока бежим
  // Копим время; как набралось FRAME_DURATION — переходим к следующему кадру бега.
  // Когда персонаж стоит, анимация сбрасывается, и новый забег начинается с первого кадра.
  if (character.moving) {
    animTime += dt;
    if (animTime >= FRAME_DURATION) {
      animTime -= FRAME_DURATION;
      animIndex = (animIndex + 1) % RUN_FRAMES.length;
    }
  } else {
    animTime = 0;
    animIndex = 0;
  }
}

// ===== РИСОВАНИЕ =====
// Каждый кадр заново: сначала фон, потом персонаж поверх.
function draw() {
  // фон
  ctx.fillStyle = "#2a1b2e";
  ctx.fillRect(0, 0, W, H);

  // персонаж: бежит — текущий кадр бега, стоит — поза стойки.
  // Последнее число в drawFrame — размер персонажа.
  const x = character.x;
  const y = character.y;
  const n = character.moving ? RUN_FRAMES[animIndex] : IDLE_FRAME;
  drawFrame(n, x, y, 1.5);


}

// ===== ИГРОВОЙ ЦИКЛ =====
// Браузер вызывает frame() перед каждой перерисовкой экрана (обычно 60 раз в секунду).
let last = performance.now();
function frame(now) {
  const dt = (now - last) / 1000; // секунды с прошлого кадра
  last = now;

  update(dt);
  draw();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
