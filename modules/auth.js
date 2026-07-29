// ==========================================
// POCKETCHAIN - AUTHENTICATION MODULE
// Firebase Auth Operations
// ==========================================

import { auth } from '../firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} userData - Additional user data (firstName, lastName)
 * @returns {Promise<Object>} - User credential
 */
export async function registerUser(email, password, userData = {}) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name
    if (userData.firstName || userData.lastName) {
      const displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      await updateProfile(userCredential.user, { displayName });
    }
    
    // Send email verification
    await sendEmailVerification(userCredential.user);
    
    return {
      success: true,
      user: userCredential.user,
      uid: userCredential.user.uid
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Login existing user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - User credential
 */
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return {
      success: true,
      user: userCredential.user,
      uid: userCredential.user.uid
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Logout current user
 * @returns {Promise<Object>} - Logout result
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<Object>} - Result
 */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get current authenticated user
 * @returns {Object|null} - Current user or null
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Check if user is logged in
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!auth.currentUser;
}

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Callback function
 * @returns {Function} - Unsubscribe function
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get auth error message in user-friendly format
 * @param {string} code - Firebase error code
 * @returns {string} - User-friendly message
 */
export function getAuthErrorMessage(code) {
  const errorMessages = {
    'auth/invalid-email': 'Invalid email address format.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account already exists with this email.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.'
  };
  
  return errorMessages[code] || 'An error occurred. Please try again.';
}
