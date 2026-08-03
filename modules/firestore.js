// ==========================================
// POCKETCHAIN - FIRESTORE MODULE
// Database Operations
// ==========================================

import { db } from '../firebase-config.js';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Collection References
const USERS_COLLECTION = 'users';
const STAKES_COLLECTION = 'stakes';
const KYC_COLLECTION = 'kyc_submissions';
const TRANSACTIONS_COLLECTION = 'transactions';
const ATTENDANCE_COLLECTION = 'attendance';
const REFERRALS_COLLECTION = 'referrals';

// ==========================================
// USER OPERATIONS
// ==========================================

/**
 * Create new user document
 * @param {string} uid - User ID
 * @param {Object} userData - User data
 */
export async function createUserDocument(uid, userData) {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const userDoc = {
    uid: uid,
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
    email: userData.email || '',
    username: userData.username || '',
    balancePCH: 10000, // Starting bonus
    walletAddress: null,
    isVerified: false,
    isAdmin: false,
    referralCode: generateReferralCode(userData.firstName, uid),
    totalEarned: 0,
    totalStaked: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  await setDoc(userRef, userDoc);
  return userDoc;
}

/**
 * Get user document
 * @param {string} uid - User ID
 */
export async function getUserDocument(uid) {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snapshot = await getDoc(userRef);
  return snapshot.exists() ? snapshot.data() : null;
}

/**
 * Update user document
 * @param {string} uid - User ID
 * @param {Object} updates - Fields to update
 */
export async function updateUserDocument(uid, updates) {
  const userRef = doc(db, USERS_COLLECTION, uid);
  updates.updatedAt = serverTimestamp();
  await updateDoc(userRef, updates);
}

/**
 * Subscribe to user document changes
 * @param {string} uid - User ID
 * @param {Function} callback - Callback function
 */
export function subscribeToUser(uid, callback) {
  const userRef = doc(db, USERS_COLLECTION, uid);
  return onSnapshot(userRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    } else {
      callback(null);
    }
  });
}

// ==========================================
// STAKING OPERATIONS
// ==========================================

/**
 * Create new stake
 * @param {string} uid - User ID
 * @param {Object} stakeData - Stake data
 */
export async function createStake(uid, stakeData) {
  const stakeRef = doc(collection(db, STAKES_COLLECTION));
  const stake = {
    id: stakeRef.id,
    userId: uid,
    amount: stakeData.amount,
    apy: stakeData.apy,
    period: stakeData.period,
    startDate: serverTimestamp(),
    unlockDate: new Date(Date.now() + stakeData.period * 24 * 60 * 60 * 1000),
    status: 'active',
    claimed: false,
    earnings: (stakeData.amount * (stakeData.apy / 100) * (stakeData.period / 365)),
    createdAt: serverTimestamp()
  };
  
  await setDoc(stakeRef, stake);
  
  // Update user's staked amount
  await updateUserDocument(uid, {
    totalStaked: increment(stakeData.amount),
    balancePCH: increment(-stakeData.amount)
  });
  
  return stake;
}

/**
 * Get user's active stakes
 * @param {string} uid - User ID
 */
export async function getUserStakes(uid) {
  const q = query(
    collection(db, STAKES_COLLECTION),
    where('userId', '==', uid),
    where('status', '==', 'active'),
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Subscribe to user's stakes
 * @param {string} uid - User ID
 * @param {Function} callback - Callback function
 */
export function subscribeToUserStakes(uid, callback) {
  const q = query(
    collection(db, STAKES_COLLECTION),
    where('userId', '==', uid),
    where('status', '==', 'active'),
  );
  
  return onSnapshot(q, (snapshot) => {
    const stakes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(stakes);
  });
}

// ==========================================
// KYC OPERATIONS
// ==========================================

/**
 * Submit KYC application
 * @param {string} uid - User ID
 * @param {Object} kycData - KYC form data
 * @param {string} idUrl - ID document URL
 * @param {string} selfieUrl - Selfie URL
 */
export async function submitKYC(uid, kycData, idUrl, selfieUrl) {
  const kycRef = doc(collection(db, KYC_COLLECTION));
  const submission = {
    id: kycRef.id,
    userId: uid,
    fullName: kycData.fullName,
    birthDate: kycData.birthDate,
    nationality: kycData.nationality,
    idType: kycData.idType,
    idNumber: kycData.idNumber,
    address: kycData.address,
    city: kycData.city,
    country: kycData.country,
    phone: kycData.phone,
    idUrl: idUrl,
    selfieUrl: selfieUrl,
    status: 'pending',
    submittedAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null
  };
  
  await setDoc(kycRef, submission);
  return submission;
}

/**
 * Get user's KYC status
 * @param {string} uid - User ID
 */
export async function getUserKYC(uid) {
  const q = query(
    collection(db, KYC_COLLECTION),
    where('userId', '==', uid),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

/**
 * Approve KYC
 * @param {string} kycId - KYC document ID
 * @param {string} userId - User ID
 * @param {string} adminId - Admin ID
 */
export async function approveKYC(kycId, userId, adminId) {
  const kycRef = doc(db, KYC_COLLECTION, kycId);
  await updateDoc(kycRef, {
    status: 'verified',
    reviewedAt: serverTimestamp(),
    reviewedBy: adminId
  });
  
  // Update user's verification status
  await updateUserDocument(userId, { isVerified: true });
}

/**
 * Reject KYC
 * @param {string} kycId - KYC document ID
 * @param {string} reason - Rejection reason
 */
export async function rejectKYC(kycId, reason) {
  const kycRef = doc(db, KYC_COLLECTION, kycId);
  await updateDoc(kycRef, {
    status: 'rejected',
    reviewedAt: serverTimestamp(),
    rejectionReason: reason
  });
}

/**
 * Get pending KYC submissions (for admin)
 */
export async function getPendingKYC() {
  const q = query(
    collection(db, KYC_COLLECTION),
    where('status', '==', 'pending'),
    orderBy('submittedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Subscribe to pending KYC (for admin)
 * @param {Function} callback - Callback function
 */
export function subscribeToPendingKYC(callback) {
  const q = query(
    collection(db, KYC_COLLECTION),
    where('status', '==', 'pending'),
    orderBy('submittedAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(submissions);
  });
}

// ==========================================
// TRANSACTION OPERATIONS
// ==========================================

/**
 * Record a transaction
 * @param {string} uid - User ID
 * @param {Object} transactionData - Transaction data
 */
export async function recordTransaction(uid, transactionData) {
  const txRef = doc(collection(db, TRANSACTIONS_COLLECTION));
  const transaction = {
    id: txRef.id,
    userId: uid,
    type: transactionData.type,
    amount: transactionData.amount,
    description: transactionData.description || '',
    status: transactionData.status || 'completed',
    txHash: transactionData.txHash || null,
    createdAt: serverTimestamp()
  };
  
  await setDoc(txRef, transaction);
  return transaction;
}

/**
 * Get user's transactions
 * @param {string} uid - User ID
 * @param {number} limitCount - Number of transactions to fetch
 */
export async function getUserTransactions(uid, limitCount = 50) {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('userId', '==', uid),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ==========================================
// ATTENDANCE OPERATIONS
// ==========================================

/**
 * Get user's attendance record
 * @param {string} uid - User ID
 */
export async function getUserAttendance(uid) {
  const attendanceRef = doc(db, ATTENDANCE_COLLECTION, uid);
  const snapshot = await getDoc(attendanceRef);
  
  if (!snapshot.exists()) {
    const defaultAttendance = {
      userId: uid,
      streak: 0,
      totalClaims: 0,
      lastClaim: null,
      history: []
    };
    await setDoc(attendanceRef, defaultAttendance);
    return defaultAttendance;
  }
  
  return snapshot.data();
}

/**
 * Update attendance
 * @param {string} uid - User ID
 * @param {Object} updates - Attendance updates
 */
export async function updateAttendance(uid, updates) {
  const attendanceRef = doc(db, ATTENDANCE_COLLECTION, uid);
  await updateDoc(attendanceRef, updates);
}

/**
 * Claim daily reward
 * @param {string} uid - User ID
 * @param {number} reward - Reward amount
 */
export async function claimDailyReward(uid, reward) {
  const attendanceRef = doc(db, ATTENDANCE_COLLECTION, uid);
  const attendance = await getUserAttendance(uid);
  
  const today = new Date().toDateString();
  const lastClaim = attendance.lastClaim ? new Date(attendance.lastClaim.toDate()).toDateString() : null;
  
  if (lastClaim === today) {
    throw new Error('Already claimed today');
  }
  
  // Calculate streak
  let newStreak = attendance.streak;
  if (lastClaim) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastClaim !== yesterday.toDateString()) {
      newStreak = 0;
    }
  }
  newStreak++;
  
  // Add streak bonus
  let totalReward = reward;
  if (newStreak % 7 === 0) {
    totalReward += 5; // Weekly bonus
  }
  
  // Update attendance
  await updateDoc(attendanceRef, {
    streak: newStreak,
    totalClaims: increment(1),
    lastClaim: serverTimestamp(),
    history: arrayUnion({
      date: serverTimestamp(),
      reward: totalReward,
      streak: newStreak
    })
  });
  
  // Update user balance
  await updateUserDocument(uid, {
    balancePCH: increment(totalReward),
    totalEarned: increment(totalReward)
  });
  
  return { reward: totalReward, streak: newStreak };
}

// ==========================================
// REFERRAL OPERATIONS
// ==========================================

/**
 * Get user's referral data
 * @param {string} uid - User ID
 */
export async function getUserReferrals(uid) {
  const referralRef = doc(db, REFERRALS_COLLECTION, uid);
  const snapshot = await getDoc(referralRef);
  return snapshot.exists() ? snapshot.data() : null;
}

/**
 * Process referral
 * @param {string} referrerCode - Referrer's code
 * @param {string} newUserId - New user's ID
 */
export async function processReferral(referrerCode, newUserId) {
  // Find referrer by code
  const q = query(
    collection(db, USERS_COLLECTION),
    where('referralCode', '==', referrerCode),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return false;
  
  const referrerId = snapshot.docs[0].id;
  
  // Update referrer's data
  const referralRef = doc(db, REFERRALS_COLLECTION, referrerId);
  await updateDoc(referralRef, {
    invited: arrayUnion({
      userId: newUserId,
      joinedAt: serverTimestamp(),
      reward: 5
    }),
    totalRewards: increment(5)
  });
  
  // Add reward to referrer
  await updateUserDocument(referrerId, {
    balancePCH: increment(5),
    totalEarned: increment(5)
  });
  
  return true;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function generateReferralCode(name, uid) {
  const prefix = name ? name.substring(0, 3).toUpperCase() : 'PCH';
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${random}`;
}
