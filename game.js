const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const unitList = document.getElementById("unitList");
const alarmStatus = document.getElementById("alarmStatus");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const restartBtn = document.getElementById("restartBtn");

const world = {
  width: canvas.width,
  height: canvas.height,
  paused: false,
  timeScale: 1,
  alarm: false,
  gameOver: false,
  gameWon: false,
};

const obstacles = [
  { x: 160, y: 120, w: 240, h: 60 },
  { x: 460, y: 160, w: 120, h: 220 },
  { x: 700, y: 80, w: 260, h: 70 },
  { x: 720, y: 260, w: 220, h: 70 },
  { x: 260, y: 360, w: 200, h: 80 },
  { x: 110, y: 500, w: 180, h: 80 },
  { x: 430, y: 520, w: 180, h: 90 },
  { x: 780, y: 520, w: 220, h: 110 },
];

const doors = [
  { id: 1, x: 400, y: 250, w: 30, h: 60, open: false },
  { id: 2, x: 640, y: 270, w: 30, h: 60, open: false },
  { id: 3, x: 350, y: 450, w: 60, h: 26, open: true },
];

const hidingSpots = [
  { x: 110, y: 80, r: 38 },
  { x: 940, y: 400, r: 40 },
  { x: 180, y: 650, r: 40 },
];

const extractionZone = { x: 980, y: 620, w: 90, h: 80 };

const cameras = [
  { id: 1, x: 640, y: 110, range: 160, fov: Math.PI / 2, direction: Math.PI / 2, disabledTimer: 0 },
  { id: 2, x: 880, y: 300, range: 150, fov: Math.PI / 2.5, direction: Math.PI, disabledTimer: 0 },
];

const smokeClouds = [];

const units = [
  {
    id: 1,
    name: "Specter",
    color: "#5fd4ff",
    x: 80,
    y: 620,
    speed: 120,
    noise: 110,
    vision: 180,
    skill: "Smoke screen",
    selected: true,
    queue: [],
    abilityCooldown: 0,
  },
  {
    id: 2,
    name: "Cipher",
    color: "#ffd35f",
    x: 120,
    y: 660,
    speed: 110,
    noise: 90,
    vision: 160,
    skill: "Disable camera",
    selected: false,
    queue: [],
    abilityCooldown: 0,
  },
  {
    id: 3,
    name: "Vanguard",
    color: "#b98bff",
    x: 60,
    y: 690,
    speed: 100,
    noise: 140,
    vision: 150,
    skill: "Breach door",
    selected: false,
    queue: [],
    abilityCooldown: 0,
  },
];

const enemies = [
  {
    id: 1,
    x: 320,
    y: 200,
    speed: 80,
    range: 220,
    fov: Math.PI / 2.2,
    direction: 0,
    patrol: [
      { x: 280, y: 200 },
      { x: 380, y: 200 },
      { x: 380, y: 320 },
      { x: 280, y: 320 },
    ],
    patrolIndex: 0,
    state: "patrol",
    target: null,
    lastSeen: null,
  },
  {
    id: 2,
    x: 820,
    y: 160,
    speed: 90,
    range: 240,
    fov: Math.PI / 1.9,
    direction: Math.PI,
    patrol: [
      { x: 760, y: 130 },
      { x: 940, y: 130 },
      { x: 940, y: 260 },
      { x: 760, y: 260 },
    ],
    patrolIndex: 0,
    state: "patrol",
    target: null,
    lastSeen: null,
  },
  {
    id: 3,
    x: 520,
    y: 580,
    speed: 85,
    range: 200,
    fov: Math.PI / 2.4,
    direction: Math.PI / 2,
    patrol: [
      { x: 520, y: 520 },
      { x: 600, y: 620 },
      { x: 460, y: 660 },
      { x: 420, y: 560 },
    ],
    patrolIndex: 0,
    state: "patrol",
    target: null,
    lastSeen: null,
  },
];

const input = {
  mouse: { x: 0, y: 0 },
  shift: false,
};

const keys = new Set();

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function pointInRect(point, rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
}

function segmentIntersectsRect(a, b, rect) {
  const steps = 12;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    if (pointInRect({ x, y }, rect)) return true;
  }
  return false;
}

function isLineBlocked(a, b) {
  for (const obstacle of obstacles) {
    if (segmentIntersectsRect(a, b, obstacle)) return true;
  }
  for (const door of doors) {
    if (!door.open && segmentIntersectsRect(a, b, door)) return true;
  }
  return false;
}

function withinFov(observer, target, range, fov, direction) {
  const dx = target.x - observer.x;
  const dy = target.y - observer.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  const angle = Math.atan2(dy, dx);
  let delta = angle - direction;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  return Math.abs(delta) < fov / 2;
}

function isUnitHidden(unit) {
  for (const spot of hidingSpots) {
    if (distance(unit, spot) <= spot.r) return true;
  }
  for (const cloud of smokeClouds) {
    if (distance(unit, cloud) <= cloud.radius) return true;
  }
  return false;
}

function addSmoke(x, y) {
  smokeClouds.push({ x, y, radius: 70, timer: 8 });
}

function disableNearestCamera(unit) {
  let closest = null;
  let closestDist = Infinity;
  for (const camera of cameras) {
    const dist = distance(unit, camera);
    if (dist < closestDist) {
      closest = camera;
      closestDist = dist;
    }
  }
  if (closest && closestDist < 200) {
    closest.disabledTimer = 10;
    return true;
  }
  return false;
}

function breachNearestDoor(unit) {
  let closest = null;
  let closestDist = Infinity;
  for (const door of doors) {
    const dist = distance(unit, door);
    if (dist < closestDist) {
      closest = door;
      closestDist = dist;
    }
  }
  if (closest && closestDist < 80) {
    closest.open = true;
    spawnNoise(unit, 180);
    return true;
  }
  return false;
}

function spawnNoise(unit, amount = unit.noise) {
  unit.noisePulse = { radius: amount, timer: 0.5 };
  for (const enemy of enemies) {
    if (distance(unit, enemy) <= amount) {
      enemy.state = "investigate";
      enemy.target = { x: unit.x, y: unit.y };
    }
  }
}

function moveTowards(entity, target, speed, dt) {
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = (speed * dt) / dist;
  const nx = entity.x + dx * step;
  const ny = entity.y + dy * step;
  if (!isBlocked({ x: nx, y: ny })) {
    entity.x = nx;
    entity.y = ny;
  }
  return dist < 4;
}

function isBlocked(point) {
  for (const obstacle of obstacles) {
    if (pointInRect(point, obstacle)) return true;
  }
  for (const door of doors) {
    if (!door.open && pointInRect(point, door)) return true;
  }
  return false;
}

function updateUnits(dt) {
  for (const unit of units) {
    if (unit.queue.length > 0) {
      const target = unit.queue[0];
      const reached = moveTowards(unit, target, unit.speed, dt);
      if (reached) unit.queue.shift();
      if (dt > 0) spawnNoise(unit, unit.noise * 0.3);
    }
    if (unit.abilityCooldown > 0) {
      unit.abilityCooldown = Math.max(unit.abilityCooldown - dt, 0);
    }
    if (unit.noisePulse) {
      unit.noisePulse.timer -= dt;
      if (unit.noisePulse.timer <= 0) unit.noisePulse = null;
    }
  }
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    const patrolTarget = enemy.patrol[enemy.patrolIndex];
    if (world.alarm) {
      const targetUnit = getNearestUnit(enemy);
      if (targetUnit) {
        enemy.state = "hunt";
        enemy.target = { x: targetUnit.x, y: targetUnit.y };
        moveTowards(enemy, enemy.target, enemy.speed + 50, dt);
      }
    } else if (enemy.state === "patrol") {
      if (moveTowards(enemy, patrolTarget, enemy.speed, dt)) {
        enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrol.length;
      }
    }
    if (enemy.state === "investigate" && enemy.target) {
      if (moveTowards(enemy, enemy.target, enemy.speed + 20, dt)) {
        enemy.state = "patrol";
        enemy.target = null;
      }
    }
    if (enemy.state === "alert" && enemy.lastSeen) {
      moveTowards(enemy, enemy.lastSeen, enemy.speed + 30, dt);
    }
    enemy.direction = Math.atan2(patrolTarget.y - enemy.y, patrolTarget.x - enemy.x);
  }
}

function updateCameras(dt) {
  for (const camera of cameras) {
    if (camera.disabledTimer > 0) {
      camera.disabledTimer = Math.max(0, camera.disabledTimer - dt);
    } else {
      camera.direction += dt * 0.4;
    }
  }
}

function detectUnits() {
  for (const enemy of enemies) {
    for (const unit of units) {
      if (isUnitHidden(unit)) continue;
      if (!withinFov(enemy, unit, enemy.range, enemy.fov, enemy.direction)) continue;
      if (isLineBlocked(enemy, unit)) continue;
      triggerAlarm(unit, enemy);
    }
  }
  for (const camera of cameras) {
    if (camera.disabledTimer > 0) continue;
    for (const unit of units) {
      if (isUnitHidden(unit)) continue;
      if (!withinFov(camera, unit, camera.range, camera.fov, camera.direction)) continue;
      if (isLineBlocked(camera, unit)) continue;
      triggerAlarm(unit, camera);
    }
  }
}

function triggerAlarm(unit, source) {
  world.alarm = true;
  if (source.lastSeen !== undefined) {
    source.state = "alert";
    source.lastSeen = { x: unit.x, y: unit.y };
  }
}

function updateAlarm() {
  if (world.alarm) {
    alarmStatus.innerHTML = "Alarm: <span style=\"color:#ff5c5c\">Triggered</span>";
  } else {
    alarmStatus.innerHTML = "Alarm: <span class=\"muted\">Silent</span>";
  }
}

function updateSmoke(dt) {
  for (const cloud of smokeClouds) {
    cloud.timer -= dt;
  }
  for (let i = smokeClouds.length - 1; i >= 0; i -= 1) {
    if (smokeClouds[i].timer <= 0) smokeClouds.splice(i, 1);
  }
}

function updateExtraction() {
  const allExtracted = units.every((unit) => pointInRect(unit, extractionZone));
  if (allExtracted && !world.gameOver) {
    world.gameWon = true;
    showOverlay("Mission Complete", "All operatives extracted successfully.");
  }
}

function updateGameOver() {
  if (world.gameOver || world.gameWon) return;
  for (const enemy of enemies) {
    for (const unit of units) {
      if (distance(enemy, unit) < 14) {
        world.gameOver = true;
        showOverlay("Mission Failed", "Operatives captured. Mission compromised.");
        return;
      }
    }
  }
}

function update(dt) {
  if (world.paused || world.gameOver || world.gameWon) return;
  updateUnits(dt);
  updateEnemies(dt);
  updateCameras(dt);
  updateSmoke(dt);
  detectUnits();
  updateAlarm();
  updateExtraction();
  updateGameOver();
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < world.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = 0; y < world.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }
}

function drawObstacles() {
  ctx.fillStyle = "#1d2a3d";
  obstacles.forEach((o) => {
    ctx.fillRect(o.x, o.y, o.w, o.h);
  });
}

function drawDoors() {
  doors.forEach((door) => {
    ctx.fillStyle = door.open ? "#2b5f4b" : "#6c3f3f";
    ctx.fillRect(door.x, door.y, door.w, door.h);
    ctx.strokeStyle = "#0b1118";
    ctx.strokeRect(door.x, door.y, door.w, door.h);
  });
}

function drawHidingSpots() {
  hidingSpots.forEach((spot) => {
    ctx.fillStyle = "rgba(120,255,180,0.2)";
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(120,255,180,0.4)";
    ctx.stroke();
  });
}

function drawExtraction() {
  ctx.fillStyle = "rgba(190,140,255,0.18)";
  ctx.fillRect(extractionZone.x, extractionZone.y, extractionZone.w, extractionZone.h);
  ctx.strokeStyle = "rgba(190,140,255,0.5)";
  ctx.strokeRect(extractionZone.x, extractionZone.y, extractionZone.w, extractionZone.h);
}

function drawVisionCone(entity, range, fov, direction, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(entity.x, entity.y);
  ctx.arc(entity.x, entity.y, range, direction - fov / 2, direction + fov / 2);
  ctx.closePath();
  ctx.fill();
}

function drawUnits() {
  for (const unit of units) {
    ctx.fillStyle = unit.color;
    ctx.beginPath();
    ctx.arc(unit.x, unit.y, 10, 0, Math.PI * 2);
    ctx.fill();

    if (unit.selected) {
      ctx.strokeStyle = "#4ad6ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(unit.x, unit.y, 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (unit.queue.length > 0) {
      ctx.strokeStyle = "rgba(79,214,255,0.6)";
      ctx.beginPath();
      ctx.moveTo(unit.x, unit.y);
      unit.queue.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.stroke();
    }

    if (unit.noisePulse) {
      ctx.strokeStyle = "rgba(255,208,92,0.6)";
      ctx.beginPath();
      ctx.arc(unit.x, unit.y, unit.noisePulse.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    drawVisionCone(enemy, enemy.range, enemy.fov, enemy.direction, "rgba(255,92,92,0.2)");
    ctx.fillStyle = "#ff5c5c";
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#271111";
    ctx.stroke();
  }
}

function drawCameras() {
  for (const camera of cameras) {
    const disabled = camera.disabledTimer > 0;
    if (!disabled) {
      drawVisionCone(camera, camera.range, camera.fov, camera.direction, "rgba(255,92,92,0.15)");
    }
    ctx.fillStyle = disabled ? "#697486" : "#ff9066";
    ctx.fillRect(camera.x - 6, camera.y - 6, 12, 12);
  }
}

function drawSmoke() {
  for (const cloud of smokeClouds) {
    ctx.fillStyle = "rgba(95,170,255,0.25)";
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function render() {
  ctx.clearRect(0, 0, world.width, world.height);
  drawGrid();
  drawExtraction();
  drawHidingSpots();
  drawSmoke();
  drawObstacles();
  drawDoors();
  drawEnemies();
  drawCameras();
  drawUnits();
}

function handleLeftClick(pos, additive) {
  let selectedUnit = null;
  for (const unit of units) {
    if (distance(unit, pos) < 16) {
      selectedUnit = unit;
      break;
    }
  }
  if (!additive) {
    units.forEach((unit) => {
      unit.selected = false;
    });
  }
  if (selectedUnit) {
    selectedUnit.selected = !selectedUnit.selected && additive ? true : true;
  }
  renderUnitList();
}

function getNearestUnit(enemy) {
  let closest = null;
  let closestDist = Infinity;
  for (const unit of units) {
    const dist = distance(enemy, unit);
    if (dist < closestDist) {
      closestDist = dist;
      closest = unit;
    }
  }
  return closest;
}

function toggleDoorAt(pos) {
  for (const door of doors) {
    if (pointInRect(pos, door)) {
      door.open = !door.open;
      return true;
    }
  }
  return false;
}

function handleRightClick(pos, queued) {
  const selectedUnits = units.filter((unit) => unit.selected);
  if (selectedUnits.length === 0) return;

  if (toggleDoorAt(pos)) return;

  for (const unit of selectedUnits) {
    if (!queued) unit.queue = [];
    unit.queue.push({ x: clamp(pos.x, 20, world.width - 20), y: clamp(pos.y, 20, world.height - 20) });
  }
}

function renderUnitList() {
  unitList.innerHTML = "";
  for (const unit of units) {
    const card = document.createElement("div");
    card.className = "unit-card" + (unit.selected ? " active" : "");
    card.innerHTML = `
      <div class="title">
        <span>${unit.name}</span>
        <span>${unit.abilityCooldown > 0 ? unit.abilityCooldown.toFixed(1) + "s" : "Ready"}</span>
      </div>
      <div class="traits">Speed ${unit.speed} · Noise ${unit.noise} · Vision ${unit.vision}</div>
      <div class="traits">Skill: ${unit.skill}</div>
    `;
    unitList.appendChild(card);
  }
}

function useAbility(index) {
  const activeUnits = units.filter((unit) => unit.selected);
  if (activeUnits.length === 0) return;
  for (const unit of activeUnits) {
    if (unit.abilityCooldown > 0) continue;
    if (index === 1 && unit.id === 1) {
      addSmoke(unit.x, unit.y);
      unit.abilityCooldown = 10;
    }
    if (index === 2 && unit.id === 2) {
      const success = disableNearestCamera(unit);
      if (success) unit.abilityCooldown = 12;
    }
    if (index === 3 && unit.id === 3) {
      const success = breachNearestDoor(unit);
      if (success) unit.abilityCooldown = 8;
    }
  }
}

function showOverlay(title, message) {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlay.classList.remove("hidden");
}

function resetMission() {
  overlay.classList.add("hidden");
  world.alarm = false;
  world.gameOver = false;
  world.gameWon = false;
  units[0].x = 80;
  units[0].y = 620;
  units[1].x = 120;
  units[1].y = 660;
  units[2].x = 60;
  units[2].y = 690;
  units.forEach((unit) => {
    unit.queue = [];
    unit.abilityCooldown = 0;
  });
  doors[0].open = false;
  doors[1].open = false;
  doors[2].open = true;
  smokeClouds.length = 0;
  cameras.forEach((camera) => (camera.disabledTimer = 0));
  enemies.forEach((enemy) => {
    enemy.state = "patrol";
    enemy.patrolIndex = 0;
    enemy.target = null;
    enemy.lastSeen = null;
  });
  renderUnitList();
}

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  input.mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  input.mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const pos = {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
  handleLeftClick(pos, event.shiftKey);
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const pos = {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
  handleRightClick(pos, event.shiftKey);
});

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (event.key === " ") {
    world.paused = !world.paused;
  }
  if (event.key === "1") useAbility(1);
  if (event.key === "2") useAbility(2);
  if (event.key === "3") useAbility(3);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

restartBtn.addEventListener("click", resetMission);

let lastTime = 0;
function loop(timestamp) {
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  world.timeScale = keys.has("shift") ? 0.3 : 1;
  update(delta * world.timeScale);
  render();
  renderUnitList();
  requestAnimationFrame(loop);
}

renderUnitList();
requestAnimationFrame(loop);
