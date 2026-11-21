import { VEHICLE_TYPES } from '../vehicles/vehicleModel.js';
import { STATIONS } from '../audio/radioStations.js';

export function updateVehiclePanel(game, name, value, label, radio, crew) {
  const car = game.player.car;
  name.textContent = car ? VEHICLE_TYPES[car.type].name.toUpperCase() : 'ON FOOT';
  value.textContent = car ? Math.round(Math.abs(car.speed) * 3.6) : 'MARA';
  label.textContent = car ? 'KM/H · ' + Math.max(0, Math.ceil(car.health)) + '% COND' : 'FIELD KIT';
  const station = STATIONS[game.station];
  radio.textContent = 'V · ' + station.name + ' / ' + station.song;
  const seconds = Math.max(0, Math.ceil(game.crewReady - game.clock));
  crew.textContent = 'X · ROOK / ' + (seconds ? seconds + 's' : 'ARMOR READY');
}
