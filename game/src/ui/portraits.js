import { CONTACTS } from '../missions/storyJobs.js';

export function drawPortrait(canvas, name) {
  const ctx = canvas.getContext('2d');
  const person = CONTACTS[name] ?? CONTACTS.ROOK;
  const palette = person.outfit;
  const poly = (color, points) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.fill();
  };
  ctx.fillStyle = '#1a2734';
  ctx.fillRect(0, 0, 64, 64);
  poly(palette, [[0,48],[55,0],[64,0],[64,52],[46,64],[0,64]]);
  poly(person.outfit, [[7,64],[12,53],[26,46],[34,55],[44,45],[56,52],[58,64]]);
  poly('#251f2a', [[20,46],[15,32],[16,19],[23,10],[37,7],[47,14],[50,29],[43,43]]);
  poly(person.skin, [[23,22],[31,17],[44,21],[45,33],[39,44],[36,49],[30,51],[24,44],[21,33]]);
  ctx.fillStyle = '#222332';
  ctx.fillRect(24, 27, 7, 2);
  ctx.fillRect(37, 27, 6, 2);
  ctx.fillStyle = '#673e3d';
  ctx.fillRect(30, 38, 8, 2);
  if (name === 'ROOK' || name === 'DEX RILL') {
    poly('#233444', [[15,22],[17,13],[25,8],[40,8],[49,15],[51,22],[41,20],[30,23]]);
  } else {
    poly('#282336', [[16,34],[13,23],[19,11],[31,7],[44,10],[49,20],[42,20],[33,14],[26,21],[22,37],[18,45]]);
    poly(palette, [[20,31],[23,31],[23,40],[20,41]]);
  }
}
