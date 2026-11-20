import { DISTRICTS, GRID, SHORE, mapRoute } from '../world/cityLayout.js';
import { ACTIVITIES } from '../missions/activities.js';

const palette = {
  land: '#343e44', road: '#536064', edge: '#6a7473', sea: '#284d57', sand: '#88776b',
  ink: '#202c34', cream: '#fcdec0', gold: '#ffd18a', mint: '#9ce9d7',
};

function path(ctx, points, map) {
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const [x, y] = map(points[i].x, points[i].z);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function diamond(ctx, x, y, size, fill, outlined = false) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx[outlined ? 'strokeStyle' : 'fillStyle'] = fill;
  if (outlined) ctx.stroke();
  else ctx.fill();
}

function symbol(ctx, actor, map, color) {
  const [x, y] = map(actor.x, actor.z);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(actor.heading);
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#13242c';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

export function drawMap(canvas, game, objective, mode = 'radar') {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const overview = mode !== 'radar';
  const scale = overview ? Math.min(w / 516, h / 452) : 1.50;
  const x0 = overview ? 22 : game.player.x;
  const z0 = overview ? 0 : game.player.z;
  const map = (x, z) => [w / 2 + (x - x0) * scale, h / 2 + (z - z0) * scale];
  function rect(x, z, width, height) {
    const [px, py] = map(x, z);
    ctx.fillRect(px, py, width * scale, height * scale);
  }

  ctx.fillStyle = palette.ink;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = palette.sea;
  rect(-249, -242, 545, 484);
  ctx.strokeStyle = '#83bfba27';
  ctx.lineWidth = 1;
  for (let i = -235; i <= 235; i += 12) path(ctx, [{ x: -250, z: i }, { x: 286, z: i }], map);
  ctx.fillStyle = palette.land;
  rect(-205, -204, SHORE + 205, 408);
  ctx.fillStyle = palette.sand;
  rect(191, -204, 31, 408);
  ctx.fillStyle = '#c9ad85';
  rect(211, -27.7, 39, 7.8);
  ctx.strokeStyle = palette.edge;
  ctx.lineWidth = 19 * scale;
  for (const value of GRID) {
    path(ctx, [{ x: -200, z: value }, { x: 190, z: value }], map);
    path(ctx, [{ x: value, z: -202 }, { x: value, z: 202 }], map);
  }
  ctx.strokeStyle = palette.road;
  ctx.lineWidth = 15 * scale;
  for (const value of GRID) {
    path(ctx, [{ x: -201, z: value }, { x: 190, z: value }], map);
    path(ctx, [{ x: value, z: -202 }, { x: value, z: 202 }], map);
  }
  for (const building of game.city.footprints) {
    ctx.fillStyle = overview ? (building.h > 20 ? '#a4a49a' : '#777976') : '#92948b';
    rect(building.x - building.w / 2, building.z - building.d / 2, building.w, building.d);
  }
  const { police } = game;
  if (!overview && police.escapeTime !== null && police.lastKnown) {
    const [x, y] = map(police.lastKnown.x, police.lastKnown.z);
    const radius = (17 + Math.min(12, police.unseen * 1.45)) * scale;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#81e4ce1e';
    ctx.fill();
    ctx.strokeStyle = '#a2edddc9';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const site = objective?.point;
  if (site && mode !== 'title') {
    ctx.strokeStyle = objective.activity ? palette.mint : palette.gold;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2.1;
    path(ctx, mapRoute(game.player, site), map);
    ctx.setLineDash([]);
  }

  if (overview) {
    for (const district of DISTRICTS) {
      const right = district.name === 'Beacon Strand';
      const [x, y] = map(district.x + (right ? 31 : 0), district.z + (right ? 30 : 0));
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3.6;
      ctx.strokeStyle = '#28353b';
      ctx.strokeText(district.name, x, y);
      ctx.fillStyle = district.color;
      ctx.fillText(district.name, x, y);
    }
  } else {
    for (const car of game.cars) {
      if (car === game.player.car || car.mode === 'police') continue;
      const [x, y] = map(car.x, car.z);
      ctx.fillStyle = '#e8d9ba9a';
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
  }
  for (const activity of ACTIVITIES) {
    const [x, y] = map(activity.x, activity.z);
    ctx.fillStyle = '#17272f';
    ctx.strokeStyle = activity.color;
    ctx.lineWidth = 1;
    ctx.fillRect(x - 6, y - 6, 12, 12);
    ctx.strokeRect(x - 6, y - 6, 12, 12);
    ctx.textAlign = 'center';
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = activity.color;
    ctx.fillText(activity.symbol, x, y + 3.3);
  }
  if (site) {
    const [x, y] = map(site.x, site.z);
    diamond(ctx, Math.max(8, Math.min(w - 8, x)), Math.max(9, Math.min(h - 8, y)), 6.8, objective.activity ? palette.mint : palette.gold);
  }
  for (const cop of police.units) {
    const [x, y] = map(cop.x, cop.z);
    ctx.lineWidth = 1.5;
    diamond(ctx, x, y, cop.intercepting ? 5.8 : 4.1, '#ff797b', cop.intercepting);
  }
  if (!overview) {
    for (const guard of game.guards) {
      if (!guard.alerted || guard.down) continue;
      const [x, y] = map(guard.x, guard.z);
      ctx.fillStyle = guard.aim ? '#fff1b8' : '#f4b36e';
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }
  if (mode !== 'title') symbol(ctx, game.player, map, '#fffae2');
  ctx.fillStyle = '#182a34dc';
  ctx.fillRect(w - 23, 6, 17, 19);
  ctx.fillStyle = '#fff0cf';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('N', w - 14.5, 20);
}
