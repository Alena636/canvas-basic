// Режим Tank. Каркас такой же, как в game.js:
// холст на весь экран, update() меняет состояние, draw() рисует, frame() крутит цикл.

const canvas = document.getElementById("cnvs");
canvas.width = innerWidth;
canvas.height = innerHeight;

const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

// ===== КАРТА =====
// Поле — это сетка клеток. Каждая строка массива — один ряд,
// каждый символ — одна клетка:
//   .  земля (по ней можно ездить)
//   #  кирпичная стена
//   B  бетонный блок
//   ~  вода
//   T  кусты
// Чтобы поменять уровень, просто перерисуйте символы. Все строки должны быть одной длины.
const MAP = [
  "BBBBBBBBBBBBBBBBBBBB",
  "B..................B",
  "B..##....~~....TT..B",
  "B..##....~~....TT..B",
  "B........~~........B",
  "B..BB..........##..B",
  "B..BB...TTTT...##..B",
  "B.......TTTT.......B",
  "B..~~..........BB..B",
  "B..~~...####...BB..B",
  "B..................B",
  "BBBBBBBBBBBBBBBBBBBB",
];
const ROWS = MAP.length;     // сколько рядов
const COLS = MAP[0].length;  // сколько клеток в ряду

// Размер клетки подбираем так, чтобы всё поле целиком влезло в экран.
const TILE = Math.floor(Math.min(W / COLS, H / ROWS));

// Отступы слева и сверху, чтобы поле стояло по центру экрана.
const FIELD_X = Math.floor((W - COLS * TILE) / 2);
const FIELD_Y = Math.floor((H - ROWS * TILE) / 2);

// Невидимый холст для поля — тот же приём, что со звёздным небом в game.js:
// рисуем один раз, а каждый кадр просто копируем готовую картинку.
const field = document.createElement("canvas");
field.width = W;
field.height = H;
const fieldCtx = field.getContext("2d");

// --- Отдельные виды клеток. (x, y) — левый верхний угол клетки на экране ---

function drawGround(g, x, y) {
  // Каждая клетка чуть светлее или темнее соседней, чтобы земля не была плоской.
  const light = 28 + Math.random() * 5; // яркость от 28% до 33%
  g.fillStyle = `hsl(85, 30%, ${light}%)`;
  g.fillRect(x, y, TILE, TILE);

  // Несколько тёмных точек — комочки земли и травинки.
  g.fillStyle = "rgba(0, 0, 0, 0.15)";
  for (let i = 0; i < 6; i++) {
    const px = x + Math.random() * TILE;
    const py = y + Math.random() * TILE;
    g.fillRect(px, py, 2, 2);
  }
}

function drawBrick(g, x, y) {
  // Сначала заливаем всю клетку цветом раствора,
  // потом сверху кладём кирпичи с зазором — зазоры и будут швами.
  g.fillStyle = "#4a2318";
  g.fillRect(x, y, TILE, TILE);

  g.fillStyle = "#a0472f";
  const bh = TILE / 4; // высота кирпича: 4 ряда в клетке
  const bw = TILE / 2; // ширина кирпича: 2 кирпича в ряду
  for (let r = 0; r < 4; r++) {
    const shift = (r % 2) * (bw / 2); // каждый второй ряд сдвинут на полкирпича
    for (let bx = -shift; bx < TILE; bx += bw) {
      // Кирпичи, вылезающие за край клетки, обрезаем по краю.
      const left = Math.max(bx, 0);
      const right = Math.min(bx + bw, TILE);
      g.fillRect(x + left + 1, y + r * bh + 1, right - left - 2, bh - 2);
    }
  }
}

function drawConcrete(g, x, y) {
  // Тёмная рамка и светлый квадрат внутри — получается объёмный блок.
  const p = TILE * 0.15;
  g.fillStyle = "#5c6168";
  g.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
  g.fillStyle = "#9aa0a8";
  g.fillRect(x + p, y + p, TILE - 2 * p, TILE - 2 * p);
}

function drawWater(g, x, y) {
  g.fillStyle = "#2b5f8f";
  g.fillRect(x, y, TILE, TILE);

  // Две волны: каждая — две дуги, вверх и вниз.
  g.strokeStyle = "rgba(255, 255, 255, 0.35)";
  g.lineWidth = 2;
  for (let i = 1; i <= 2; i++) {
    const wy = y + (TILE * i) / 3; // волны на 1/3 и 2/3 высоты клетки
    g.beginPath();
    g.moveTo(x + TILE * 0.15, wy);
    g.quadraticCurveTo(x + TILE * 0.32, wy - TILE * 0.08, x + TILE * 0.5, wy);
    g.quadraticCurveTo(x + TILE * 0.68, wy + TILE * 0.08, x + TILE * 0.85, wy);
    g.stroke();
  }
}

function drawBush(g, x, y) {
  // Куст — несколько тёмных кругов, а поверх них светлые поменьше.
  const colors = ["#2f5a1f", "#3f7a2a"];
  for (const color of colors) {
    g.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const cx = x + TILE * (0.25 + Math.random() * 0.5);
      const cy = y + TILE * (0.25 + Math.random() * 0.5);
      const r = TILE * (color === colors[0] ? 0.28 : 0.16);
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
    }
  }
}

function makeField(g) {
  // Фон вокруг поля, если экран не того же формата, что карта.
  g.fillStyle = "#111";
  g.fillRect(0, 0, W, H);

  // Обходим карту: row — номер ряда, col — номер клетки в ряду.
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = FIELD_X + col * TILE;
      const y = FIELD_Y + row * TILE;
      const cell = MAP[row][col];

      drawGround(g, x, y); // земля под каждой клеткой, даже под стенами

      if (cell === "#") drawBrick(g, x, y);
      else if (cell === "B") drawConcrete(g, x, y);
      else if (cell === "~") drawWater(g, x, y);
      else if (cell === "T") drawBush(g, x, y);
    }
  }
}
makeField(fieldCtx); // вызвать один раз

let time = 0;

const tank = {
  x: W / 2,
  y: H / 2,
  hullAngle: 0,
  turretAngle: 0,
  speed: 150,
  turnSpeed: 2,
};

function drawTank(g) {
  g.save();
  g.translate(tank.x, tank.y);
  g.rotate(tank.hullAngle);

  // Рисуем корпус танка (прямоугольник с закруглёнными углами).
  const hullWidth = TILE + TILE * 0.5; // ширина корпуса чуть больше клетки
  const hullHeight = TILE * 0.8;
  g.fillStyle = "#4a4a4a";
  g.beginPath();
  g.moveTo(-hullWidth / 2, -hullHeight / 2);
  g.lineTo(hullWidth / 2, -hullHeight / 2);
  g.lineTo(hullWidth / 2, hullHeight / 2);
  g.lineTo(-hullWidth / 2, hullHeight / 2);
  g.closePath();
  g.fill();

  // Рисуем башню (круг в центре корпуса).
  g.rotate(tank.turretAngle - tank.hullAngle); // башня поворачивается относительно корпуса
  const turretRadius = TILE * 0.3;
  g.fillStyle = "#6a6a6a";
  g.beginPath();
  g.arc(0, 0, turretRadius, 0, Math.PI * 2);
  g.fill();

  // Рисуем ствол (прямоугольник, выходящий из башни).
  const barrelLength = TILE * 0.6;
  const barrelWidth = TILE * 0.1;
  g.fillStyle = "#1f1212";
  g.fillRect(0, -barrelWidth / 2, barrelLength, barrelWidth);

  g.restore();
}

const keys = {};
const mouse = { x: 0, y: 0 };

addEventListener("keydown", (e) => (keys[e.code] = true));
addEventListener("keyup", (e) => (keys[e.code] = false));
canvas.addEventListener("mousemove", (e) => {
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
});

function update(dt) {
  time += dt;
  // здесь будет логика: движение танка, клавиши, столкновения
  if (keys["KeyD"]) tank.hullAngle += tank.turnSpeed * dt;
  if (keys["KeyA"]) tank.hullAngle -= tank.turnSpeed * dt;

   if (keys["KeyW"]) {
    tank.x += Math.cos(tank.hullAngle) * tank.speed * dt;
    tank.y += Math.sin(tank.hullAngle) * tank.speed * dt;
  }
  if (keys["KeyS"]) {
    tank.x -= Math.cos(tank.hullAngle) * tank.speed * dt;
    tank.y -= Math.sin(tank.hullAngle) * tank.speed * dt;
  }

  // Башня всегда поворачивается к мыши.
  const dx = mouse.x - tank.x;
  const dy = mouse.y - tank.y;
  tank.turretAngle = Math.atan2(dy, dx);
}

function draw() {
  ctx.drawImage(field, 0, 0); // готовое поле одной командой

  drawTank(ctx); // здесь потом будет рисоваться танк
}

let last = performance.now();
function frame(now) {
  const dt = (now - last) / 1000; // секунды с прошлого кадра
  last = now;

  update(dt);
  draw();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
