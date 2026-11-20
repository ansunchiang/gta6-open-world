import { GRID } from '../world/cityLayout.js';
import { angle, distance } from '../render/geometry.js';
import { guideVehicle, spawnVehicle, syncVehicle } from '../vehicles/vehiclePhysics.js';

const colors = ['#a25452', '#d7b573', '#76a79b', '#b7cbd0', '#535b72', '#b7aba0', '#d58472', '#439dab'];
const types = ['reed', 'volta', 'reed', 'taxi', 'van'];
const avenueRoute = [
  { x: 3.7, z: -176.3 }, { x: 116.3, z: -176.3 },
  { x: 116.3, z: 176.3 }, { x: 3.7, z: 176.3 },
];

function loop(left, right, top, bottom, offset) {
  return [
    { x: left + offset, z: top + offset }, { x: right - offset, z: top + offset },
    { x: right - offset, z: bottom - offset }, { x: left + offset, z: bottom - offset },
  ];
}

function trafficCar(scene, route, start, ratio, type, color, pace) {
  const from = route[start];
  const to = route[(start + 1) % route.length];
  const x = from.x + (to.x - from.x) * ratio;
  const z = from.z + (to.z - from.z) * ratio;
  const car = spawnVehicle(scene, type, color, x, z, angle(to.x - x, to.z - z), 'traffic');
  car.route = route;
  car.routeIndex = (start + 1) % route.length;
  car.pace = pace;
  car.speed = pace * .8;
  return car;
}

export function createTraffic(scene, random) {
  const cars = [];
  for (let i = 0; i < 45; i++) {
    const lane = i % 7;
    const route = lane === 0 ? avenueRoute :
      loop(GRID[(lane + 4) % 5], GRID[4 + lane % 3], GRID[lane % 3], GRID[4 + (lane + 1) % 3], 3.7);
    const progress = random();
    cars.push(trafficCar(scene, route, Math.floor(progress * 4), progress * 4 % 1, types[i % types.length],
      types[i % types.length] === 'taxi' ? '#edb956' : colors[i % colors.length], 6.5 + random() * 4));
  }
  const arrival = trafficCar(scene, avenueRoute, 3, .243, 'volta', '#e8744e', 5.6);
  arrival.speed = 0;
  arrival.wait = 23;
  arrival.driver = true;
  cars.unshift(arrival);
  cars.push(spawnVehicle(scene, 'volta', '#59a19f', 6.4, 93.8, 0, 'parked'));
  cars.push(spawnVehicle(scene, 'reed', '#a5a3c6', 6.4, 76, 0, 'parked'));
  cars.push(spawnVehicle(scene, 'taxi', '#e6b367', -6.3, 70, Math.PI, 'parked'));
  cars.push(spawnVehicle(scene, 'van', '#bdc4ac', 186, -13, 0, 'parked'));
  for (const [x, z, type, color] of [[-64, -16, 'volta', '#74a6be'], [114, 133, 'volta', '#d07d5d'], [-115, 133, 'van', '#b7cdac'], [-114, -109, 'reed', '#e4b792'], [6.6,-149,'volta','#a0c6ba']]) {
    cars.push(spawnVehicle(scene, type, color, x, z, 0, 'parked'));
  }
  return cars;
}

export function updateTraffic(cars, player, city, dt, clock) {
  for (const car of cars) {
    if (car.mode === 'traffic') {
      const target = car.route[car.routeIndex];
      if (distance(car, target) < Math.max(2.6, car.speed * .53)) car.routeIndex = (car.routeIndex + 1) % car.route.length;
      const brakeFor = Math.sin(car.heading);
      const forward = -Math.cos(car.heading);
      const blocking = cars.some(other => {
        if (other === car || other.mode === 'held') return false;
        const dx = other.x - car.x;
        const dz = other.z - car.z;
        const ahead = dx * brakeFor + dz * forward;
        return ahead > 0 && ahead < 4.5 + car.speed * .44 && Math.abs(dx * forward - dz * brakeFor) < 1.72;
      });
      car.wait = Math.max(0, (car.wait ?? 0) - dt);
      const cautious = distance(player, car) < 3.6 && !player.car;
      const crash = guideVehicle(car, car.route[car.routeIndex], blocking || cautious || car.wait ? 0 : car.pace, dt, city);
      if (crash) {
        car.speed = 0;
        car.routeIndex = (car.routeIndex + 1) % car.route.length;
      }
    }
    if (car.mode === 'parked') car.speed *= Math.exp(-dt * 4);
    syncVehicle(car, clock);
  }
}
