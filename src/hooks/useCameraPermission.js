import {useCallback} from 'react';
import {useCameraPermission as useVisionCameraPermission} from 'react-native-vision-camera';

export const useCameraPermission = () => {
  const {hasPermission, requestPermission, status} = useVisionCameraPermission();

  const requestCameraPermission = useCallback(async () => {
    return requestPermission();
  }, [requestPermission]);

  return {
    cameraPermissionStatus: hasPermission ? 'granted' : status,
    requestCameraPermission,
  };
};
