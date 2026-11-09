import {findNearestGeofence} from '../src/utils/nearestGeofence';

const locations = [
  {geoLocationName: 'Noida', lattitude: '28.5707', longitude: '77.3169'},
  {geoLocationName: 'Bhubaneswar', lattitude: '20.292228', longitude: '85.858'},
];

test('selects the nearest location from API coordinate strings', () => {
  expect(findNearestGeofence({latitude: 20.29, longitude: 85.86}, locations)).toBe(locations[1]);
  expect(findNearestGeofence({latitude: 28.57, longitude: 77.32}, locations)).toBe(locations[0]);
});

test('ignores invalid coordinates and returns null when no locations are usable', () => {
  expect(findNearestGeofence({latitude: 0, longitude: 0}, [
    {lattitude: '', longitude: '0'},
    {lattitude: '91', longitude: '0'},
    {lattitude: 'abc', longitude: '0'},
  ])).toBeNull();
});
