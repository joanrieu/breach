const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
ctx.translate(canvas.width / 2, canvas.height / 2);
ctx.scale(1, -1);

const isDown = {};
document.body.addEventListener("keydown", e => (isDown[e.key] = true));
document.body.addEventListener("keyup", e => (isDown[e.key] = false));

const components = {
  transforms: {
    bat: {
      x: 0,
      y: -230,
      w: 100,
      h: 10
    },
    ball: {
      x: (Math.random() - 0.5) * 80,
      y: -217.5,
      w: 15,
      h: 15
    }
  },

  batSprites: {
    bat: {
      color: "#b5b5b5"
    }
  },

  batBodies: {
    bat: {
      speed: 300,
      vx: 0
    }
  },

  batControls: {
    bat: {}
  },

  brickSprites: {},

  brickBodies: {},

  ballSprites: {
    ball: {
      color: "white"
    }
  },

  ballBodies: {
    ball: {
      dtAcc: 0,
      speed: 300,
      anchor: "bat"
    }
  }
};

for (let i = 0; i < 48; ++i) {
  const id = "brick" + i;
  components.transforms[id] = {
    x: ((i % 6) - 2.5) * 120,
    y: ((i / 6) | 0) * 30,
    w: 100,
    h: 15
  };
  components.brickBodies[id] = {
    hits: ((Math.random() * 3) | 0) + 1
  };
  components.brickSprites[id] = {};
}

const systems = {
  batRenderer: {
    draw() {
      for (const [id, sprite] of Object.entries(components.batSprites)) {
        const { x, y, w, h } = components.transforms[id];
        ctx.fillStyle = sprite.color;
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
      }
    }
  },

  brickRenderer: {
    draw() {
      for (const [id, sprite] of Object.entries(components.brickSprites)) {
        const { x, y, w, h } = components.transforms[id];
        ctx.fillStyle = ["#cf3", "#fc3", "#3cf"][
          components.brickBodies[id].hits - 1
        ];
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
      }
    }
  },

  ballRenderer: {
    draw() {
      for (const [id, sprite] of Object.entries(components.ballSprites)) {
        const { x, y, w, h } = components.transforms[id];
        ctx.fillStyle = sprite.color;
        ctx.beginPath();
        ctx.ellipse(x, y, w / 2, h / 2, 0, -Math.PI, Math.PI);
        ctx.fill();
      }
    }
  },

  ballPhysics: {
    update(dt) {
      for (const [id, body] of Object.entries(components.ballBodies)) {
        const transform = components.transforms[id];
        body.dtAcc += dt;
        dt = 1e-3; // small fixed step
        while (body.dtAcc > dt) {
          body.dtAcc -= dt;
          if (body.anchor) {
          } else {
            let denied = false;
            const dx = dt * body.speed * body.vx;
            const dy = dt * body.speed * body.vy;
            transform.x += dx;
            transform.y += dy;
            const { x, y, w, h } = transform;
            if (x - w / 2 < -canvas.width / 2 || x + w / 2 > canvas.width / 2) {
              body.vx *= -1;
            }
            if (y + h / 2 > canvas.height / 2) {
              body.vy *= -1;
            }
            for (const [id2, body2] of [
              ...Object.entries(components.batBodies),
              ...Object.entries(components.brickBodies)
            ]) {
              const { x: x2, y: y2, w: w2, h: h2 } = components.transforms[id2];
              if (id2 in components.batBodies) {
                if (
                  x + w / 2 > x2 - w2 / 2 &&
                  x - w / 2 < x2 + w2 / 2 &&
                  ((y - h / 2) | 0) === ((y2 + h2 / 2) | 0)
                ) {
                  body.vx = (x - x2) / (w2 / 2);
                  body.vy = Math.sqrt(1 - body.vx ** 2);
                  denied = true;
                }
              } else {
                if (
                  x + w / 2 > x2 - w2 / 2 &&
                  x - w / 2 < x2 + w2 / 2 &&
                  y + h / 2 > y2 - h2 / 2 &&
                  y - h / 2 < y2 + h2 / 2
                ) {
                  if (!--body2.hits) {
                    for (const component of Object.values(components)) {
                      delete component[id2];
                    }
                  }
                  if (Math.abs((x - x2) / w2) > Math.abs((y - y2) / h2)) {
                    body.vx *= -1;
                  } else {
                    body.vy *= -1;
                  }
                  denied = true;
                }
              }
            }
            if (denied) {
              transform.x -= dx;
              transform.y -= dy;
            }
          }
        }
      }
    }
  },

  batController: {
    update() {
      for (const [id, body] of Object.entries(components.batBodies)) {
        const transform = components.transforms[id];
        const left = isDown.ArrowLeft || isDown.q || isDown.a || false;
        const right = isDown.ArrowRight || isDown.d || false;
        const shoot =
          isDown[" "] ||
          isDown.z ||
          isDown.w ||
          isDown.s ||
          isDown.Enter ||
          false;
        body.vx = right - left || 0;
        if (shoot) {
          for (const [ballId, ballBody] of Object.entries(
            components.ballBodies
          )) {
            const ballTransform = components.transforms[ballId];
            if (ballBody.anchor === id) {
              ballBody.anchor = null;
              ballBody.vx = (ballTransform.x - transform.x) / (transform.w / 2);
              ballBody.vy = Math.sqrt(1 - ballBody.vx ** 2);
            }
          }
        }
      }
    }
  },

  batPhysics: {
    update(dt) {
      for (const [id, body] of Object.entries(components.batBodies)) {
        const transform = components.transforms[id];
        const max = canvas.width / 2 - transform.w / 2;
        const oldX = transform.x;
        transform.x = Math.min(
          max,
          Math.max(-max, oldX + dt * body.speed * body.vx)
        );
        const dx = transform.x - oldX;
        for (const [ballId, ballBody] of Object.entries(
          components.ballBodies
        )) {
          if (ballBody.anchor === id) {
            const transform = components.transforms[ballId];
            transform.x += dx;
          }
        }
      }
    }
  }
};

function draw(lastTimeMs, timeMs) {
  const dt = (timeMs - lastTimeMs) / 1000;
  for (const [id, system] of Object.entries(systems)) {
    system.update?.(dt);
  }
  ctx.clearRect(
    -canvas.width / 2,
    -canvas.height / 2,
    canvas.width,
    canvas.height
  );
  for (const [id, system] of Object.entries(systems)) {
    ctx.save();
    system.draw?.();
    ctx.restore();
  }
  requestAnimationFrame(draw.bind(null, timeMs));
}

requestAnimationFrame(draw.bind(null, 0));
