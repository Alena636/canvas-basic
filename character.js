// Заготовка для режима Character. Каркас такой же, как в game.js:
// холст на весь экран, update() меняет состояние, draw() рисует, frame() крутит цикл.

const canvas = document.getElementById("cnvs");
canvas.width = innerWidth;
canvas.height = innerHeight;

const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

const character = {
  x: W / 2,
  y: H / 2,
  speed: 250,
  moving: false,
  facing: 1,
};

const keys = {};
document.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});
document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

let time = 0;
let animTime = 0;
let animIndex = 0;
const FRAME_DURATION = 0.2; // длительность одного кадра анимации в секундах

const characterImage = new Image();
characterImage.src = "character.png";
characterImage.onerror = () => console.error("Не удалось загрузить изображение персонажа: character.png");

const SHEET_W = 720;   // ширина всего листа
const SHEET_H = 340;   // высота всего листа
const COLS = 9;
const ROWS = 3;

const FRAME_W = SHEET_W / COLS;   // 80
const FRAME_H = SHEET_H / ROWS;   // 110

const IDLE_FRAME = 0;
const RUN_FRAMES = [9, 10];


function drawFrame(n, x, y, scale) {
  const col = n % COLS;
  const row = Math.floor(n / COLS);
  const sx = col * FRAME_W;
  const sy = row * FRAME_H;

  const w = FRAME_W * scale;   // ширина на экране
  const h = FRAME_H * scale;   // высота на экране

   ctx.save();
  ctx.translate(x, y);   // (0,0) теперь в центре персонажа
  ctx.scale(character.facing, 1);         // 1 — как есть, -1 — зеркально

  ctx.drawImage(characterImage,
    sx, sy, FRAME_W, FRAME_H,
    -w / 2, -h / 2, w, h);         // центр кадра должен оказаться в (0,0)

  ctx.restore();

}



function update(dt) {
  time += dt;

  // движение: сначала решаем, куда идём
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

function draw() {
  // фон
  ctx.fillStyle = "#2a1b2e";
  ctx.fillRect(0, 0, W, H);

  // персонаж
  const x = character.x;
  const y = character.y;
  const n = character.moving ? RUN_FRAMES[animIndex] : IDLE_FRAME;
  drawFrame(n, x, y, 1.5);


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
