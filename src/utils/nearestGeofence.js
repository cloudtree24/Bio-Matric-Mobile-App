import {getDistance} from 'geolib';

export const findNearestGeofence = (position, geofences) => {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const geofence of geofences) {
    const lat = geofence?.lattitude;
    const lon = geofence?.longitude;
    if (lat == null || lon == null || String(lat).trim() === '' || String(lon).trim() === '') {
      continue;
    }
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      continue;
    }
    const distance = getDistance(position, {latitude, longitude});
    if (distance < nearestDistance) {
      nearest = geofence;
      nearestDistance = distance;
    }
  }

  return nearest;
};
