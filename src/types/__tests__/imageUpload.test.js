import { generateImageHash } from '../imageUpload';

// Mock crypto.subtle for testing
const mockDigest = jest.fn();
const mockSubtle = {
  digest: mockDigest
};

// Mock crypto globally
global.crypto = {
  subtle: mockSubtle
};

describe('generateImageHash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful hash generation
    mockDigest.mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
  });

  it('should generate hash for regular File object with arrayBuffer method', async () => {
    // Create a mock File object with arrayBuffer method
    const mockFile = {
      name: 'test.png',
      type: 'image/png',
      size: 1024,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
    };

    const hash = await generateImageHash(mockFile);
    
    expect(mockFile.arrayBuffer).toHaveBeenCalled();
    expect(mockDigest).toHaveBeenCalledWith('SHA-256', new ArrayBuffer(8));
    expect(hash).toBe('0102030405060708');
  });

  it('should generate hash for clipboard File object without arrayBuffer method', async () => {
    // Create a mock File object without arrayBuffer method (like clipboard data)
    const mockFile = {
      name: 'pasted-image.png',
      type: 'image/png',
      size: 1024
      // No arrayBuffer method
    };

    // Mock FileReader
    const mockFileReader = {
      readAsArrayBuffer: jest.fn(),
      onload: null,
      onerror: null
    };
    
    global.FileReader = jest.fn(() => mockFileReader);

    const hashPromise = generateImageHash(mockFile);
    
    // Simulate FileReader success
    setTimeout(() => {
      mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });
    }, 0);

    const hash = await hashPromise;
    
    expect(mockFileReader.readAsArrayBuffer).toHaveBeenCalledWith(mockFile);
    expect(mockDigest).toHaveBeenCalledWith('SHA-256', new ArrayBuffer(8));
    expect(hash).toBe('0102030405060708');
  });

  it('should handle FileReader errors', async () => {
    const mockFile = {
      name: 'error.png',
      type: 'image/png',
      size: 1024
    };

    const mockFileReader = {
      readAsArrayBuffer: jest.fn(),
      onload: null,
      onerror: null
    };
    
    global.FileReader = jest.fn(() => mockFileReader);

    const hashPromise = generateImageHash(mockFile);
    
    // Simulate FileReader error with proper event structure
    const errorEvent = {
      target: {
        error: new Error('File read error')
      }
    };
    mockFileReader.onerror(errorEvent);

    await expect(hashPromise).rejects.toThrow('Failed to generate hash: FileReader failed: File read error');
  });

  it('should handle crypto.digest errors', async () => {
    const mockFile = {
      name: 'test.png',
      type: 'image/png',
      size: 1024,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
    };

    mockDigest.mockRejectedValue(new Error('Crypto error'));

    await expect(generateImageHash(mockFile)).rejects.toThrow('Failed to generate hash: Crypto error');
  });
}); 