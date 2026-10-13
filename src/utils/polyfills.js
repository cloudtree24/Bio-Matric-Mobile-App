import {Buffer} from 'buffer';

// jpeg-js uses the global Buffer when encoding captured face images.
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
