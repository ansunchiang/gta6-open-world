const KEY = 'salt-relay.career.v1';

const finite = (value, fallback, max) => Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : fallback;
const levels = value => Math.floor(finite(value, 0, 2));

export function loadCareer() {
  try {
    const save = JSON.parse(localStorage.getItem(KEY));
    if (save?.version !== 1) return null;
    return {
      chapter: Math.floor(finite(save.chapter, 0, 8)),
      money: Math.floor(finite(save.money, 140, 100000)),
      rep: Math.floor(finite(save.rep, 0, 100000)),
      reserve: Math.floor(finite(save.reserve, 32, 200)),
      armor: finite(save.armor, 50, 100),
      loadout: save.loadout && typeof save.loadout === 'object' ? save.loadout : {},
      safehouse: save.safehouse === true,
      upgrades: { engine: levels(save.upgrades?.engine), armor: levels(save.upgrades?.armor), weapon: levels(save.upgrades?.weapon) },
      stashes: Array.isArray(save.stashes) ? save.stashes.filter(i => Number.isInteger(i) && i >= 0 && i < 8) : [],
    };
  } catch {
    return null;
  }
}

export function saveCareer(game, safehouse) {
  try {
    const { money, rep, loadout, armor } = game.player;
    localStorage.setItem(KEY, JSON.stringify({
      version: 1, chapter: game.missions.chapter, money, rep, loadout, armor, safehouse: !!safehouse,
      upgrades: game.upgrades, stashes: [...game.activities.stashes],
    }));
    return true;
  } catch {
    return false;
  }
}
