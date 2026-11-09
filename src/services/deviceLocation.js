import Geolocation from '@react-native-community/geolocation';

const getPosition = options => new Promise((resolve, reject) => {
  Geolocation.getCurrentPosition(resolve, reject, options);
});

export const getCurrentDeviceLocation = async () => {
  try {
    return await getPosition({enableHighAccuracy: false, timeout: 15000, maximumAge: 60000});
  } catch (error) {
    if (error.code === 1) { throw error; }
    return getPosition({enableHighAccuracy: true, timeout: 20000, maximumAge: 60000});
  }
};
