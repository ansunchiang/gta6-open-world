import assert from 'node:assert/strict';

export async function playTest(page, origin) {
  await page.goto(origin);
  await page.getByRole('button', { name: 'New Story' }).click();
  await page.keyboard.down('w');
  await page.getByText('Talk to ROOK', { exact: true }).waitFor();
  await page.keyboard.up('w');
  await page.keyboard.press('e');
  await page.getByText('Take the coral Volta', { exact: true }).waitFor();
  await page.keyboard.press('m');
  await page.getByRole('heading', { name: 'Vesper Bay', exact: true }).waitFor();
  await page.keyboard.press('m');
  await page.locator('#atlas').waitFor({ state: 'hidden' });
  await page.keyboard.press('v');
  await page.getByText(/MARROW FM/).waitFor();

  const result = await page.evaluate(async () => {
    const T = await import('/vendor/three.module.min.js');
    const { createSimulation, NEUTRAL } = await import('/src/world/simulation.js');
    const { PLACES } = await import('/src/world/cityLayout.js');
    const { WEAPONS, buyWeapon } = await import('/src/combat/weapons.js');
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
    check(game.career.stolen === 1 && game.career.distance > 4, 'Count theft and distance');
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
    check(game.career.wanted === 5, 'Track highest pursuit level');
    press('KeyZ');
    check(game.police.blackout > game.clock && !game.police.contact, 'Crew scanner blackout');
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
    const career = game.saves.list().entries[0];
    check(career?.safehouse && career.chapter === 1 && career.money === player.money && career.armor === 100, 'Save career at safehouse');
    check(career.loadout.heavy.owned && career.loadout.carbine.owned, 'Save weapon purchases');
    check(career.stats.earned >= 555 && career.stats.events.includes('delivery') && career.stats.wanted === 5, 'Persist career statistics');
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
  await page.goto(origin + '/?shot=street');
  await page.waitForFunction(() => window.__shotReady);
  await page.getByText('WANTED', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Vesper Bay', exact: true }).waitFor();
  await page.goto(origin);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('heading', { name: 'Blind Water', exact: true }).waitFor();
  await page.getByText('Use safehouse', { exact: true }).waitFor();
  await page.keyboard.down('w');
  await page.getByText('Use safehouse', { exact: true }).waitFor({ state: 'hidden' });
  await page.keyboard.up('w');
  await page.keyboard.press('Escape');
  for (const [tab, heading] of [['Jobs','Story jobs'], ['Stats','Career record'], ['Crew','Crew calls'], ['Save','Save career']]) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
  }
  await page.getByRole('button', { name: 'Save slot 2' }).click();
  await page.getByText('Career saved to slot 2.').waitFor();
  await page.getByRole('button', { name: 'Save slot 2' }).click();
  await page.getByText('Select again to overwrite.').waitFor();
  await page.getByRole('button', { name: 'Save slot 2' }).click();
  await page.getByText('Career saved to slot 2.').waitFor();
  await page.getByRole('button', { name: 'Controls', exact: true }).click();
  await page.getByRole('heading', { name: 'Controls', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Save career' }).waitFor();
  await page.getByRole('button', { name: 'Title screen' }).click();
  await page.getByRole('heading', { name: 'Save slots' }).waitFor();
  const readSlots = () => page.evaluate(() => localStorage.getItem('salt-relay.slots.v1'));
  const saved = await readSlots();
  const careers = JSON.parse(saved);
  assert.equal(careers.latest, 1);
  assert.equal(careers.entries[0].safehouse, true);
  assert.equal(careers.entries[1].safehouse, false);
  await page.goto(origin + '/?shot=title');
  await page.waitForFunction(() => window.__shotReady);
  for (const slot of [1, 2, 3]) {
    assert(await page.getByRole('button', { name: `Load slot ${slot}` }).isEnabled());
  }
  assert.equal(await readSlots(), saved, 'Title preview must not modify real career slots');
  await page.goto(origin);
  await page.reload();
  await page.getByRole('button', { name: 'Load', exact: true }).click();
  await page.getByRole('button', { name: 'Load slot 2' }).click();
  await page.getByRole('heading', { name: 'Blind Water', exact: true }).waitFor();
  await page.getByText('$695', { exact: true }).waitFor();
  console.log('Chrome play test passed', result);
}
