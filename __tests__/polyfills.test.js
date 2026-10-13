import {Buffer} from 'buffer';
import jpeg from 'jpeg-js';

describe('React Native Buffer polyfill', () => {
  const originalBuffer = global.Buffer;

  afterEach(() => {
    global.Buffer = originalBuffer;
    jest.resetModules();
  });

  it('supports JPEG encoding and decoding when Buffer is missing', () => {
    delete global.Buffer;
    require('../src/utils/polyfills');

    const encoded = jpeg.encode({
      data: new Uint8Array([255, 0, 0, 255]),
      width: 1,
      height: 1,
    }, 100);
    const base64 = global.Buffer.from(encoded.data).toString('base64');
    const decoded = jpeg.decode(global.Buffer.from(base64, 'base64'), {useTArray: true});

    expect(decoded.width).toBe(1);
    expect(decoded.height).toBe(1);
    expect(decoded.data[0]).toBeGreaterThan(250);
  });

  it('preserves an existing Buffer implementation', () => {
    global.Buffer = Buffer;
    require('../src/utils/polyfills');

    expect(global.Buffer).toBe(Buffer);
  });
});
