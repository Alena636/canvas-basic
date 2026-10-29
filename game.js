const canvas = document.getElementById("cnvs"); //глобальная переменная для холста
canvas.width = innerWidth;
canvas.height = innerHeight;

const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height; // половина высоты, чтобы не было чёрной полосы внизу

const bg = document.createElement("canvas"); // невидимый холст в памяти для неба, который не будет перерисовываться каждый кадр
bg.width = W;
bg.height = H;
const bgCtx = bg.getContext("2d");

function makeStarfield(g) {
  g.fillStyle = "#0B1026";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "white";

  for (let i = 0; i < 300; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = 0.5 + Math.random() ** 3 * 3.5; // в основном мелкие, изредка до 4px


    g.globalAlpha = 0.5 + 0.5 * (r / 4); // мелкие тусклее, крупные ярче
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}
makeStarfield(bgCtx); // вызвать один раз

const twinklers = [];
for (let i = 0; i < 80; i++) {
  twinklers.push({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 0.8 + Math.random() ** 2 * 4.7, // от 0.8 до 3.5, в основном мелкие
    phase: Math.random() * Math.PI * 2,  // от 0 до 2π
    speed: Math.random() * 5 + 1,        // от 1 до 6: цикл мерцания от ~6 до ~1 с
  });
} // массив объектов, которые будут мерцать

let time = 0;


// ===== КОРАБЛЬ =====
// Состояние корабля. Хранится в одном объекте: update() его меняет,
// drawShip() только читает.
const ship = {
  x: canvas.width / 2,   // позиция центра корабля на экране (старт — центр холста)
  y: canvas.height / 2,
  angle: 0,              // направление носа в радианах (0 = вправо, π/2 = вниз, как у atan2)
  speed: 550,            // скорость в пикселях в секунду (умножается на dt, поэтому не зависит от FPS)
};

// Картинка корабля загружается асинхронно: в первые кадры её ещё может не быть.
const shipImage = new Image();
shipImage.src = "images.png";
shipImage.onerror = () => console.error("Не удалось загрузить изображение корабля: images.png");

function drawShip() {
  // save/restore: translate/rotate ниже действуют только внутри этой функции.
  // Без restore система координат холста осталась бы сдвинутой и повёрнутой
  // для звёзд и всего, что рисуется после.
  ctx.save();

  // 1) Переносим начало координат (0,0) в центр корабля.
  //    Дальше все точки задаются относительно центра корабля, а не экрана.
  ctx.translate(ship.x, ship.y);

  // 2) Поворачиваем систему координат на угол корабля.
  //    +π/2 (90°) — поправка: angle = 0 означает «нос вправо», а на картинке
  //    нос смотрит вверх. Доворот на 90° совмещает картинку с направлением движения.
  ctx.rotate(ship.angle + Math.PI / 2);

  // 3) Пламя двигателя. Рисуется только пока зажата W, и ДО картинки,
  //    чтобы корпус корабля перекрывал основание огня.
  //    После rotate локальная ось Y направлена к хвосту корабля,
  //    поэтому положительные Y = «сзади», за соплом.
  if (keys["KeyW"]) {
    const flicker = Math.sin(time * 35) * 5; // ±5px, 35 рад/с — быстрое дрожание длины пламени

    // Внешний (оранжевый) язык: треугольник с изогнутым остриём.
    // Основание — отрезок от (-9,70) до (9,70) у сопла, кончик — ниже, на 115px.
    ctx.beginPath();
    ctx.moveTo(-9, 70);                              // левый край сопла
    ctx.quadraticCurveTo(0, 115 + flicker, 9, 70);   // дуга через кончик пламени к правому краю
    ctx.closePath();                                 // замыкаем обратно к левому краю
    ctx.fillStyle = "#ff6a00";
    ctx.fill();

    // Внутренний (жёлтый) язык: уже и короче, рисуется поверх оранжевого — горячее ядро.
    ctx.beginPath();
    ctx.moveTo(-4, 73);
    ctx.quadraticCurveTo(0, 98 + flicker, 4, 73);
    ctx.closePath();
    ctx.fillStyle = "#ffe66d";
    ctx.fill();
  }

  // 4) Сама картинка. Проверка нужна: drawImage с незагруженной
  //    или битой картинкой бросит ошибку или ничего не нарисует.
  if (shipImage.complete && shipImage.naturalWidth > 0) {
    // Размер 100x175. Смещение (-50, -87.5) = минус половина ширины и высоты,
    // чтобы центр картинки совпал с точкой (0,0) — центром корабля.
    // Благодаря этому корабль вращается вокруг своего центра, а не вокруг угла картинки.
    ctx.drawImage(shipImage, -50, -87.5, 100, 175);
  }

  // Возвращаем систему координат в исходное состояние.
  ctx.restore();
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

let last = performance.now();
function frame(now) {
  const dt = (now - last) / 1000; // секунды
  last = now;

  update(dt);
  draw();
  requestAnimationFrame(frame);
}

function update(dt) {
  time += dt; // общее время — используется для мерцания звёзд и пламени

  // --- Поворот корабля: нос всегда смотрит на курсор ---
  const dx = mouse.x - ship.x;      // вектор от корабля до мыши по X
  const dy = mouse.y - ship.y;      // по Y
  const dist = Math.hypot(dx, dy);  // длина этого вектора (расстояние до курсора)

  // atan2(dy, dx) — угол вектора «корабль → мышь» в радианах.
  // Мёртвая зона 60px: когда курсор почти над кораблём, малейшее движение мыши
  // резко меняло бы угол и корабль дёргался бы. Внутри зоны угол не трогаем.
  if (dist > 60) {
    ship.angle = Math.atan2(dy, dx);
  }

  // --- Движение: пока зажата W, корабль летит вперёд по направлению носа ---
  // cos/sin раскладывают направление angle на шаги по X и Y.
  // speed * dt — сколько пикселей пройти за этот кадр (dt — секунды с прошлого кадра).
  if (keys["KeyW"]) {
    ship.x += Math.cos(ship.angle) * ship.speed * dt;
    ship.y += Math.sin(ship.angle) * ship.speed * dt;
  }
}

function draw() {
  ctx.drawImage(bg, 0, 0);

  ctx.fillStyle = "white";
  for (const s of twinklers) {
    const k = Math.sin(time * s.speed + s.phase) * 0.5 + 0.5; // от 0 до 1
    ctx.globalAlpha = 0.2 + 0.8 * k;                          // от 0.2 до 1
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1; // вернуть, иначе всё остальное тоже станет полупрозрачным

   drawShip();
}


requestAnimationFrame(frame);
