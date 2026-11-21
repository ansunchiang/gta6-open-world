import assert from 'node:assert/strict';

export async function playTest(page, origin) {
  await page.goto(origin);
  await page.getByRole('button', { name: 'Start story' }).click();
  await page.keyboard.down('w');
  await page.getByText('Talk to ROOK', { exact: true }).waitFor();
  await page.keyboard.up('w');
  await page.keyboard.press('e');
  await page.getByText('Take the coral Volta', { exact: true }).waitFor();
  await page.keyboard.press('m');
  await page.getByRole('heading', { name: 'SALT RELAY', exact: true }).waitFor();
  await page.keyboard.press('m');
  await page.locator('#overlay').waitFor({ state: 'hidden' });
  await page.keyboard.press('v');
  await page.getByText(/MARROW FM/).waitFor();

  const result = await page.evaluate(async () => {
    const T = await import('/vendor/three.module.min.js');
    const { createSimulation, NEUTRAL } = await import('/src/world/simulation.js');
    const { PLACES } = await import('/src/world/cityLayout.js');
    const { WEAPONS, buyWeapon } = await import('/src/combat/weapons.js');
    const { loadCareer } = await import('/src/save/saveSystem.js');
    const game = createSimulation(new T.Scene(), new T.PerspectiveCamera(), 2601, { reset() {} }, false);
    game.menus = { mode: 'play', show(mode) { this.mode = mode; } };
    const { player } = game;
    const check = (condition, label) => { if (!condition) throw new Error(label); };
    const at = (point, heading = 0) => {
      Object.assign(player, { x: point.x, z: point.z, heading });
      game.camera.update(player, NEUTRAL, 0, true);
    };
    const tick = (count, controls = {}) => {
      for (let i = 0; i < count; i++) game.simulate({ ...NEUTRAL, ...controls }, 1 / 60);
    };
    const press = (...keys) => tick(1, { presses: new Set(keys) });
    game.reset(null);
    at({ x: PLACES.garage.x, z: PLACES.garage.z + 1.8 });
    press('KeyE');
    check(game.missions.stage === 1, 'Garage contact');
    const arrival = game.cars[0];
    at({ x: arrival.x + 1.65, z: arrival.z + 1.2 });
    press('KeyE');
    check(player.theft?.car === arrival && !arrival.driver, 'Carjack traffic vehicle');
    tick(40);
    check(player.car === arrival, 'Finish carjack animation');
    const z = arrival.z;
    tick(80, { throttle: 1 });
    check(arrival.speed > 8 && arrival.z < z - 4, 'Drive the Volta');
    for (const [i, weapon] of WEAPONS.entries()) {
      if (!weapon.capacity) continue;
      if (weapon.price) buyWeapon(player, weapon);
      tick(50);
      const before = player.loadout[weapon.id].rounds;
      press('Digit' + (i + 1), 'KeyF');
      check(player.loadout[weapon.id].rounds === before - 1, 'Fire ' + weapon.id + ' from vehicle');
    }
    tick(80);
    press('Digit4');
    tick(110, { attack: true });
    check(game.police.stars === 5 && game.police.air, 'Escalate to five stars with active air unit');
    check(player.loadout.smg.rounds < 24, 'Spend SMG ammunition');
    press('KeyR');
    tick(70);
    check(player.loadout.smg.rounds === 24 && player.loadout.smg.stock < 72, 'Reload from reserve');
    arrival.speed = 0;
    press('KeyE');
    if (player.car) {
      at({ x: 179, z: 117 });
      Object.assign(arrival, { x: player.x, z: player.z, speed: 0 });
      press('KeyE');
    }
    check(!player.car, 'Exit car');
    at({ x: 216, z: 145 });
    for (const index of [1, 2]) {
      tick(45);
      press('Digit' + index, 'KeyF');
      check(player.swing > .5 && player.cooldown > .2, 'Attack with ' + WEAPONS[index - 1].id);
    }
    tick(1450);
    check(game.police.heat === 0 && !game.police.air, 'Evade pursuit and leave search area');
    check(game.missions.stage === 3, 'Advance after escaping');
    at(PLACES.depot);
    press('KeyE');
    check(game.missions.chapter === 1 && player.money >= 460, 'Complete Borrowed Tide');
    const cash = player.money;
    at(PLACES.delivery);
    press('KeyE');
    check(game.activities.objective()?.activity, 'Start Lockside Courier');
    at(PLACES.market);
    press('KeyE');
    check(!game.activities.objective() && player.money === cash + 235, 'Complete Lockside Courier');
    at(PLACES.safehouse);
    player.armor = 18;
    press('KeyE');
    const career = loadCareer();
    check(career?.safehouse && career.chapter === 1 && career.money === player.money && career.armor === 100, 'Save career at safehouse');
    check(career.loadout.heavy.owned && career.loadout.carbine.owned, 'Save weapon purchases');
    game.reset(career);
    check(player.x === PLACES.safehouse.x && player.armor === 100 && player.loadout.heavy.owned, 'Load career and inventory');
    const boat = game.cars.find(car => car.type === 'boat' && car.z === 46);
    at({ x: boat.x, z: 44 });
    press('KeyE');
    tick(38);
    check(player.car === boat, 'Board marina boat');
    const boatX = boat.x;
    tick(65, { throttle: 1 });
    check(boat.x > boatX + 3, 'Drive out from the marina');
    return { health: player.health, cash: career.money, chapter: career.chapter, weapons: WEAPONS.length };
  });
  assert.equal(result.weapons, 7);
  await page.reload();
  await page.getByRole('button', { name: 'Continue story' }).click();
  await page.getByRole('heading', { name: 'Blind Water', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Save checkpoint' }).click();
  await page.getByText('Career checkpoint saved.').waitFor();
  console.log('Chrome play test passed', result);
}
