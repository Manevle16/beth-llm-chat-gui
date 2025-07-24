import { generateImageHash, constructImageUrl } from '../types/imageUpload';

class ImageHashService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_BASE_URL || '';
    this.imageServeEndpoint = '/api/images';
    this.isInitialized = false;
    this.hashCache = new Map(); // Cache for generated hashes
  }

  /**
   * Initialize the service
   */
  initialize() {
    if (this.isInitialized) return;
    
    // Set up any initialization logic here
    this.isInitialized = true;
    console.log('ImageHashService initialized');
  }

  /**
   * Generate SHA-256 hash for an image file
   * @param {File} file - Image file to hash
   * @returns {Promise<string>} SHA-256 hash
   */
  async generateHash(file) {
    try {
      this.initialize();
      
      // Check cache first
      const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;
      if (this.hashCache.has(cacheKey)) {
        return this.hashCache.get(cacheKey);
      }
      
      // Generate new hash
      const hash = await generateImageHash(file);
      
      // Cache the result
      this.hashCache.set(cacheKey, hash);
      
      return hash;
    } catch (error) {
      console.error('Hash generation error:', error);
      throw new Error(`Failed to generate hash: ${error.message}`);
    }
  }

  /**
   * Generate hashes for multiple image files
   * @param {File[]} files - Array of image files
   * @returns {Promise<string[]>} Array of SHA-256 hashes
   */
  async generateHashes(files) {
    try {
      this.initialize();
      
      const hashPromises = files.map(file => this.generateHash(file));
      const hashes = await Promise.all(hashPromises);
      
      return hashes;
    } catch (error) {
      console.error('Batch hash generation error:', error);
      throw error;
    }
  }

  /**
   * Construct image URL using hash
   * @param {string} hash - Image hash
   * @param {string} baseUrl - Optional base URL override
   * @returns {string} Full image URL
   */
  constructImageUrl(hash, baseUrl = null) {
    this.initialize();
    
    const base = baseUrl || `${this.baseUrl}${this.imageServeEndpoint}`;
    return constructImageUrl(hash, base);
  }

  /**
   * Validate hash format
   * @param {string} hash - Hash to validate
   * @returns {boolean} True if valid SHA-256 hash
   */
  validateHash(hash) {
    if (!hash || typeof hash !== 'string') {
      return false;
    }
    
    // SHA-256 hashes are 64 characters long and contain only hexadecimal characters
    const sha256Regex = /^[a-fA-F0-9]{64}$/;
    return sha256Regex.test(hash);
  }

  /**
   * Extract hash from image URL
   * @param {string} url - Image URL
   * @returns {string|null} Hash if found, null otherwise
   */
  extractHashFromUrl(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }
    
    // Extract hash from URL pattern like /api/images/{hash}
    const match = url.match(/\/api\/images\/([a-fA-F0-9]{64})/);
    return match ? match[1] : null;
  }

  /**
   * Get hash from file without generating new one if cached
   * @param {File} file - Image file
   * @returns {Promise<string|null>} Hash if cached, null otherwise
   */
  async getCachedHash(file) {
    this.initialize();
    
    const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;
    return this.hashCache.get(cacheKey) || null;
  }

  /**
   * Clear hash cache
   */
  clearCache() {
    this.hashCache.clear();
    console.log('ImageHashService cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.hashCache.size,
      keys: Array.from(this.hashCache.keys())
    };
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      baseUrl: this.baseUrl,
      imageServeEndpoint: this.imageServeEndpoint,
      cacheSize: this.hashCache.size
    };
  }
}

// Create singleton instance
const imageHashService = new ImageHashService();

export default ImageHashService;
export { imageHashService }; 