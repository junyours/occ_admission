/**
 * Image utility functions for handling base64 images and data URIs
 */

/**
 * Formats base64 image data into a proper data URI
 * @param {string} imageData - The base64 image data
 * @returns {string|null} - Formatted data URI or null if invalid
 */
export const formatBase64Image = (imageData) => {
  if (!imageData) return null;
  
  // If it's already a data URI, return as is
  if (imageData.startsWith('data:')) {
    return imageData;
  }
  
  // If it's a URL, return as is
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    return imageData;
  }
  
  // If it's raw base64 data, determine the image type and format it
  if (imageData.startsWith('iVBORw0KGgo')) {
    // PNG signature
    return `data:image/png;base64,${imageData}`;
  } else if (imageData.startsWith('/9j/') || imageData.startsWith('/9j4AAQ')) {
    // JPEG signature
    return `data:image/jpeg;base64,${imageData}`;
  } else if (imageData.startsWith('R0lGOD')) {
    // GIF signature
    return `data:image/gif;base64,${imageData}`;
  } else if (imageData.startsWith('UklGR')) {
    // WebP signature
    return `data:image/webp;base64,${imageData}`;
  } else {
    // Default to PNG if we can't determine the type
    return `data:image/png;base64,${imageData}`;
  }
};

/**
 * Checks if the given string is a valid base64 image
 * @param {string} str - String to check
 * @returns {boolean} - True if valid base64 image
 */
export const isValidBase64Image = (str) => {
  if (!str || typeof str !== 'string') return false;
  
  // Check if it's already a data URI
  if (str.startsWith('data:image/')) return true;
  
  // Check if it's a URL
  if (str.startsWith('http://') || str.startsWith('https://')) return true;
  
  // Check if it's valid base64
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(str)) return false;
  
  // Check for common image signatures
  const imageSignatures = [
    'iVBORw0KGgo', // PNG
    '/9j/',         // JPEG
    '/9j4AAQ',      // JPEG (alternative)
    'R0lGOD',       // GIF
    'UklGR'         // WebP
  ];
  
  return imageSignatures.some(signature => str.startsWith(signature));
};

/**
 * Gets the image type from base64 data
 * @param {string} imageData - Base64 image data
 * @returns {string} - Image type (png, jpeg, gif, webp, unknown)
 */
export const getImageType = (imageData) => {
  if (!imageData) return 'unknown';
  
  if (imageData.startsWith('data:image/')) {
    const match = imageData.match(/data:image\/([^;]+)/);
    return match ? match[1] : 'unknown';
  }
  
  if (imageData.startsWith('iVBORw0KGgo')) return 'png';
  if (imageData.startsWith('/9j/') || imageData.startsWith('/9j4AAQ')) return 'jpeg';
  if (imageData.startsWith('R0lGOD')) return 'gif';
  if (imageData.startsWith('UklGR')) return 'webp';
  
  return 'unknown';
};

/**
 * Creates an optimized image source object for React Native Image component
 * @param {string} imageData - Base64 image data or URL
 * @param {object} options - Additional options for the image source
 * @returns {object} - Image source object
 */
export const createImageSource = (imageData, options = {}) => {
  const uri = formatBase64Image(imageData);
  
  return {
    uri,
    cache: 'force-cache',
    priority: 'low',
    headers: {
      'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      ...options.headers
    },
    ...options
  };
};
