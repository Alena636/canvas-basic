// Заготовка для режима Character. Каркас такой же, как в game.js:
// холст на весь экран, update() меняет состояние, draw() рисует, frame() крутит цикл.

const canvas = document.getElementById("cnvs");
canvas.width = innerWidth;
canvas.height = innerHeight;

const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

let time = 0;

function update(dt) {
  time += dt;
  // здесь будет логика: движение, клавиши, столкновения
}

function draw() {
  // фон
  ctx.fillStyle = "#2a1b2e";
  ctx.fillRect(0, 0, W, H);

  // временная надпись, пока игры нет
  ctx.fillStyle = "white";
  ctx.font = "48px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Character — coming soon", W / 2, H / 2);
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
