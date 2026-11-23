import {VEHICLE_TYPES} from '../vehicles/vehicleModel.js'
import {STATIONS} from '../audio/radioStations.js'

export function updateVehiclePanel({player: {car}, station}, text) {
	const {name, song} = STATIONS[station]
	text('radio', `V · ${name} / ${song}`)
	text('equip-name', car ? VEHICLE_TYPES[car.type].name.toUpperCase() : 'ON FOOT')
	text('equip-value', car ? Math.round(Math.abs(car.speed) * 3.6) : 'MARA')
	text('equip-label', car ? `KM/H · ${Math.ceil(Math.max(0, car.health))}% COND` : 'FIELD KIT')
}
