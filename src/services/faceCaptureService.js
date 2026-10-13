import RNFS from 'react-native-fs';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import {createImageFaceDetector} from 'react-native-vision-camera-face-detector';
import {Buffer} from 'buffer';
import jpeg from 'jpeg-js';
import {stripDataUriPrefix} from '../utils/base64';
import {validateCaptureFace, validateSingleFace} from '../utils/faceValidation';
import {FACE_CONFIG} from '../config/faceConfig';

let detector;
let sequence = 0;
// Detect on the orientation-normalized still, never on scaled preview coordinates.
export const cropCapturedFace = async imageBase64 => {
  const source = `${RNFS.CachesDirectoryPath}/face-capture-${Date.now()}-${sequence++}.jpg`;
  let normalizedPath;
  try {
    await RNFS.writeFile(source, stripDataUriPrefix(imageBase64), 'base64');
    const resized = await ImageResizer.createResizedImage(source, FACE_CONFIG.resizeWidth, FACE_CONFIG.resizeHeight, 'JPEG', 100, 0);
    normalizedPath = (resized.path || resized.uri).replace('file://', '');
    detector = detector || createImageFaceDetector({performanceMode: 'accurate', runClassifications: true});
    const faces = await detector.detectFaces(`file://${normalizedPath}`);
    const singleFace = validateSingleFace(faces);
    const validation = validateCaptureFace(faces);
    if (!validation.isValid) {
      const error = new Error(validation.reason);
      error.code = singleFace.isValid ? 'INVALID_FACE_POSE' : 'INVALID_FACE_COUNT';
      throw error;
    }
    const decoded = jpeg.decode(Buffer.from(await RNFS.readFile(normalizedPath, 'base64'), 'base64'), {useTArray: true});
    const {x, y, width, height} = validation.face.bounds;
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error('Invalid face bounds. Try again.');
    const left = Math.max(0, Math.floor(x));
    const top = Math.max(0, Math.floor(y));
    const right = Math.min(decoded.width, Math.ceil(x + width));
    const bottom = Math.min(decoded.height, Math.ceil(y + height));
    const cropWidth = right - left;
    const cropHeight = bottom - top;
    if (cropWidth <= 0 || cropHeight <= 0) throw new Error('Face is outside the captured image.');
    const pixels = new Uint8Array(cropWidth * cropHeight * 4);
    for (let row = 0; row < cropHeight; row += 1) {
      const start = ((top + row) * decoded.width + left) * 4;
      pixels.set(decoded.data.subarray(start, start + cropWidth * 4), row * cropWidth * 4);
    }
    if (__DEV__) console.info('[face-capture] Face detected', {width: cropWidth, height: cropHeight});
    return Buffer.from(jpeg.encode({data: pixels, width: cropWidth, height: cropHeight}, 100).data).toString('base64');
  } finally {
    await Promise.all([source, normalizedPath].filter(Boolean).map(path => RNFS.unlink(path).catch(() => {})));
  }
};
