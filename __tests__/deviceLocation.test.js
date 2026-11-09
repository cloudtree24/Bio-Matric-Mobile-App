import Geolocation from '@react-native-community/geolocation';
import {getCurrentDeviceLocation} from '../src/services/deviceLocation';

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
}));

beforeEach(() => Geolocation.getCurrentPosition.mockReset());

test('falls back to GPS when network location is unavailable', async () => {
  const position = {coords: {latitude: 20.29, longitude: 85.86}};
  Geolocation.getCurrentPosition
    .mockImplementationOnce((success, failure) => failure({code: 2}))
    .mockImplementationOnce(success => success(position));
  await expect(getCurrentDeviceLocation()).resolves.toEqual(position);
  expect(Geolocation.getCurrentPosition.mock.calls[0][2].enableHighAccuracy).toBe(false);
  expect(Geolocation.getCurrentPosition.mock.calls[1][2].enableHighAccuracy).toBe(true);
});

test('does not retry when location permission is denied', async () => {
  Geolocation.getCurrentPosition.mockImplementationOnce((success, failure) => failure({code: 1}));
  await expect(getCurrentDeviceLocation()).rejects.toEqual({code: 1});
  expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
});
