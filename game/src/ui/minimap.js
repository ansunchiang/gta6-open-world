import { DISTRICTS, GRID, LAND, mapRoute } from '../world/cityLayout.js';
import { ACTIVITIES } from '../missions/activities.js';
import { slips } from '../world/marina.js';
import { CAUSEWAY } from '../world/districtStyles.js';

export function drawMap(canvas, game, objective, mode = 'radar') {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const { player, police } = game;
  const full = mode !== 'radar';
  const scale = full ? Math.min(width / 535, height / 452) : 1.34;
  const center = full ? { x: 41, z: 0 } : player;
  const px = x => width / 2 + (x - center.x) * scale;
  const py = z => height / 2 + (z - center.z) * scale;
  const rect = (color, x, z, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(px(x), py(z), w * scale, h * scale);
  };
  function path(points) {
    ctx.beginPath();
    points.forEach(([x, z], i) => i ? ctx.lineTo(px(x), py(z)) : ctx.moveTo(px(x), py(z)));
  }
  function diamond(x, y, size, hue) {
    ctx.fillStyle = hue;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.fill();
  }
  ctx.fillStyle = '#244957';
  ctx.fillRect(0, 0, width, height);
  for (let z = -239; z < 239; z += 12) rect('#8ebebe20', -245, z, 585, .8);
  ctx.save();
  path(LAND);
  ctx.closePath();
  ctx.clip();
  for (const [x, z, w, h, color] of [
    [-207,-205,129,195,'#45625e'], [-78,-205,225,195,'#3d5565'],
    [145,-205,48,409,'#596267'], [-207,-10,129,215,'#514e64'], [-78,-10,224,215,'#624e4d'],
  ]) rect(color, x, z, w, h);
  for (const line of GRID) {
    rect('#687e82', line - 9, -205, 18, 410);
    rect('#687e82', -207, line - 9, 397, 18);
  }
  for (const line of GRID) {
    rect('#465a63', line - 7.7, -205, 15.4, 410);
    rect('#465a63', -207, line - 7.7, 397, 15.4);
  }
  for (const { x, z, w, d, h, color } of game.city.footprints) {
    rect(h ? full ? color : '#76847f' : '#6a936c', x - w / 2, z - d / 2, w, d);
  }
  ctx.restore();
  rect('#b6957e', 190, -205, 32, 409);
  for (const pier of slips) rect('#d9b68b', 211, pier - 2.8, 40, 5.6);
  rect('#c2baa4', CAUSEWAY.x, CAUSEWAY.z - 8.7, CAUSEWAY.end - CAUSEWAY.x, 17.4);
  if (!full && police.stars && police.lastKnown) {
    const { x, z } = police.lastKnown;
    ctx.beginPath();
    ctx.arc(px(x), py(z), (17 + Math.min(12, police.unseen * 1.45)) * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#eb9b9125';
    ctx.fill();
    ctx.strokeStyle = police.contact ? '#ffaea1ce' : '#aff5e1ce';
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const site = objective?.point;
  const objectiveColor = objective?.activity ? '#9ce9d7' : '#ffd18a';
  if (site && mode !== 'title') {
    ctx.strokeStyle = objectiveColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    path(mapRoute(player, site).map(({ x, z }) => [x, z]));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.textAlign = 'center';
  if (full) for (const district of DISTRICTS) {
    const x = px(district.x), y = py(district.z);
    ctx.font = '850 16px system-ui';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#263341';
    ctx.strokeText(district.name, x, y);
    ctx.fillStyle = district.color;
    ctx.fillText(district.name, x, y);
  }
  for (const { x, z, color, symbol } of ACTIVITIES) {
    ctx.fillStyle = '#17272f';
    ctx.fillRect(px(x) - 6, py(z) - 6, 12, 12);
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = color;
    ctx.fillText(symbol, px(x), py(z) + 3.5);
  }
  if (site) diamond(px(site.x), py(site.z), 6.8, objectiveColor);
  for (const car of police.units) diamond(px(car.x), py(car.z), car.barrier ? 6 : 4.4, '#ff6c78');
  if (police.air) diamond(px(police.air.x), py(police.air.z), 6, '#95d7ff');
  if (mode !== 'title') {
    ctx.save();
    ctx.translate(px(player.x), py(player.z));
    ctx.rotate(player.heading);
    ctx.beginPath();
    ctx.moveTo(0,-9);
    ctx.lineTo(6,6);
    ctx.lineTo(0,3);
    ctx.lineTo(-6,6);
    ctx.closePath();
    ctx.strokeStyle = '#122a33';
    ctx.stroke();
    ctx.fillStyle = '#fffae2';
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#fff0cf';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('N', full ? width - 22 : width / 2, 15);
}
