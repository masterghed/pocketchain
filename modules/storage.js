// ==========================================
// POCKETCHAIN - STORAGE MODULE
// Firebase Storage Operations
// ==========================================

import { storage } from '../firebase-config.js';
import {
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

// Storage paths
const KYC_DOCUMENTS_PATH = 'kyc_documents';
const KYC_SELFIES_PATH = 'kyc_selfies';

/**
 * Upload KYC ID document
 * @param {string} uid - User ID
 * @param {File} file - File to upload
 * @returns {Promise<string>} - Download URL
 */
export async function uploadKYCDocument(uid, file) {
  try {
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uid}_id_${timestamp}.${fileExtension}`;
    const storageRef = ref(storage, `${KYC_DOCUMENTS_PATH}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      success: true,
      url: downloadURL,
      path: snapshot.ref.fullPath
    };
  } catch (error) {
    console.error('KYC document upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Upload KYC selfie
 * @param {string} uid - User ID
 * @param {string} dataUrl - Base64 image data URL
 * @returns {Promise<string>} - Download URL
 */
export async function uploadKYCSelfie(uid, dataUrl) {
  try {
    const timestamp = Date.now();
    const fileName = `${uid}_selfie_${timestamp}.jpg`;
    const storageRef = ref(storage, `${KYC_SELFIES_PATH}/${fileName}`);
    
    const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      success: true,
      url: downloadURL,
      path: snapshot.ref.fullPath
    };
  } catch (error) {
    console.error('KYC selfie upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete file from storage
 * @param {string} path - File path
 */
export async function deleteFile(path) {
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
    return { success: true };
  } catch (error) {
    console.error('Delete file error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate file for upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 */
export function validateFile(file, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
  } = options;
  
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }
  
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(1)}MB` 
    };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }
  
  return { valid: true };
}

/**
 * Convert base64 to blob
 * @param {string} dataUrl - Base64 data URL
 */
export function dataUrlToBlob(dataUrl) {
  const byteString = atob(dataUrl.split(',')[1]);
  const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ab], { type: mimeString });
}
