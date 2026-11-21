import { dispatchRoster } from '../ai/dispatchRoster.js';

export function createDispatchPanel(panel, list) {
  const rows = Array.from({ length: 6 }, () => {
    const row = document.createElement('div');
    row.className = 'unit';
    row.append(document.createElement('b'), document.createElement('small'), document.createElement('span'));
    return row;
  });
  list.append(...rows);
  return (police, player) => {
    const units = dispatchRoster(police, player);
    panel.hidden = units.length === 0;
    rows.forEach((row, i) => {
      const unit = units[i];
      row.hidden = !unit;
      if (!unit) return;
      for (const [i, value] of [unit.name, unit.range + 'm', unit.tactic].entries()) row.children[i].textContent = value;
      row.dataset.tactic = unit.tactic;
    });
  };
}
