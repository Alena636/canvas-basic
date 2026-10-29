# canvas-basic

Three small browser games built with the **HTML5 Canvas 2D API** and plain JavaScript. No libraries, no build step. Each game is a short demo of a few canvas basics.

| Mode | What you do | Main ideas |
| --- | --- | --- |
| **Space** | Fly a ship that follows the mouse | Game loop, rotation, `atan2`, offscreen background |
| **Tank** | Drive a tank around a tile map | Tile maps, collisions, hull and turret rotating separately |
| **Character** | Make a sprite run left and right | Sprite sheets, frame animation, mirroring |

## How to run

Open `index.html` in a browser and pick a mode. Press **Esc** or click **← Menu** to go back.

Each game page has a **How to play** card listing its controls.

## Project structure

```
index.html        start menu with three buttons
space.html        Space   → game.js       (+ images.png, the ship)
tank.html         Tank    → tank.js
character.html    Character → character.js (+ character.png, sprite sheet)
style.css         shared styles: menu, back button, How to play card
```

## Technologies

- **HTML5 `<canvas>`**: one full-screen canvas per page, drawn with the 2D context (`getContext("2d")`).
- **Vanilla JavaScript**: one script per game, no frameworks.
- **CSS**: the menu and the overlays that sit on top of the canvas (`position: fixed`).

## Core ideas

### 1. A full-screen canvas

The canvas is sized to the window once, at load time:

```js
canvas.width = innerWidth;
canvas.height = innerHeight;
const ctx = canvas.getContext("2d");
```

`(0, 0)` is the top-left corner. X grows to the right and **Y grows downward**.

### 2. The game loop

All three games use the same skeleton:

```js
let last = performance.now();
function frame(now) {
  const dt = (now - last) / 1000; // seconds since the previous frame
  last = now;
  update(dt); // change the state (positions, angles, animation)
  draw();     // paint the current state
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- `requestAnimationFrame` calls `frame` before every screen repaint, usually 60 times a second.
- `update` only changes data and `draw` only reads it. Keeping them apart keeps the code easy to follow.
- **Delta time (`dt`)**: speeds are in *pixels per second* and get multiplied by `dt`. That way a game runs at the same speed on a 60 Hz monitor and on a 144 Hz one.

### 3. Input

Event handlers don't move anything. They only record what is pressed:

```js
const keys = {};
addEventListener("keydown", (e) => (keys[e.code] = true));
addEventListener("keyup",   (e) => (keys[e.code] = false));
```

Then `update` checks `keys["KeyW"]` on every frame. `e.code` names the *physical* key, so the controls work with any keyboard layout. The mouse position is converted to canvas coordinates with `getBoundingClientRect()`.

### 4. Offscreen canvas for static backgrounds

The starfield (Space) and the battlefield (Tank) never change, so each is drawn **once** onto an invisible canvas made with `document.createElement("canvas")`. Each frame copies the finished picture with a single call:

```js
ctx.drawImage(bg, 0, 0);
```

This is much cheaper than redrawing hundreds of stars or tiles on every frame.

### 5. Transformations: `save` / `translate` / `rotate` / `scale` / `restore`

To rotate something around its own center:

```js
ctx.save();
ctx.translate(ship.x, ship.y); // move (0,0) to the object's center
ctx.rotate(ship.angle);        // turn the coordinate system
ctx.drawImage(img, -w / 2, -h / 2, w, h); // draw centered on (0,0)
ctx.restore();                 // undo, so other drawings aren't affected
```

- **Space**: the ship image is rotated toward the cursor.
- **Tank**: the hull is rotated, then the turret is rotated again *relative to the hull*.
- **Character**: `ctx.scale(-1, 1)` mirrors the sprite when it runs left.

### 6. Angles and direction (a bit of trigonometry)

- **Aim at a point**: `Math.atan2(dy, dx)` gives the angle of the vector from the object to the mouse.
- **Move in a direction**: `cos` and `sin` split an angle into X and Y steps:

```js
x += Math.cos(angle) * speed * dt;
y += Math.sin(angle) * speed * dt;
```

### 7. Tile map and collisions (Tank)

The level is an array of strings, one character per cell (`#` brick, `B` concrete, `~` water, `T` bushes, `.` ground). To change the level, you edit the text.

- **Pixel → cell**: `col = Math.floor((x - FIELD_X) / TILE)`. The row is found the same way.
- **Check before you move**: compute the next position, test it, and only apply it if it is free.
- **Collision shape**: the tank is approximated by 8 points on a circle around its center. If any point lands in a solid cell, the move is blocked.

### 8. Sprites and animation (Character)

- A **sprite sheet** is one image with every pose laid out in a grid. The 9-argument `drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)` cuts one frame out of it and draws it on screen.
- **Frame animation**: a timer adds up `dt`. Every `FRAME_DURATION` seconds it switches to the next frame in `RUN_FRAMES`. When the character stops, it shows the idle pose.
- Images load asynchronously, so the code checks they are ready (or handles `onerror`) before drawing.

### 9. Drawing with paths

- `arc` draws stars and the tank turret. `fillRect` draws tiles and bricks.
- `quadraticCurveTo` draws the curved engine flame and the water waves.
- `globalAlpha` combined with `Math.sin(time)` makes the stars twinkle and the flame flicker. Reset it to `1` afterwards.

## Credits

Character sprite: [Kenney Platformer Characters](https://kenney.nl/assets/platformer-characters) (CC0).
