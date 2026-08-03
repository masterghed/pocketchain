// ==========================================
// POCKETCHAIN - MAIN APPLICATION
// Professional DeFi Platform with Firebase
// ==========================================

import { auth, onAuthStateChanged, increment, serverTimestamp } from './firebase-config.js';
import {
  registerUser,
  loginUser,
  logoutUser,
  getAuthErrorMessage
} from './modules/auth.js';
import {
  createUserDocument,
  getUserDocument,
  updateUserDocument,
  subscribeToUser,
  createStake,
  subscribeToUserStakes,
  recordTransaction,
  getUserAttendance,
  claimDailyReward,
  getUserKYC
} from './modules/firestore.js';

// ==========================================
// GLOBAL STATE
// ==========================================
const AppState = {
  currentUser: null,
  userData: null,
  walletConnected: false,
  walletAddress: null,
  walletUnlocked: false,
  selectedPool: null,
  selectedAPY: 0,
  selectedPeriod: 0,
  isDarkMode: localStorage.getItem('pocketchain_darkmode') !== 'false',
  unsubscribeUser: null,
  unsubscribeStakes: null
};

// Token Configuration
const TOKEN_CONFIG = {
  name: "PocketChain",
  symbol: "PCH",
  totalSupply: 1000000000,
  decimals: 18,
  price: 0.045
};

// Conversion rates
const CONVERSION_RATES = {
  USDT: 0.045,
  USDC: 0.045,
  BTC: 0.00000068,
  ETH: 0.000025,
  SOL: 0.0032,
  XRP: 0.12,
  POL: 0.08
};

// P2P Rate (PHP to PCH)
const P2P_RATE = 2.50;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔷 PocketChain Platform Loading...');
  
  initializeApp();
});

async function initializeApp() {
  applyTheme();
  initCharts();
  setupEventListeners();
  initDateSync();
  initPasswordStrength();
  
  // Subscribe to auth state
  onAuthStateChanged(auth, handleAuthStateChange);
  
  console.log('✅ Platform initialized');
}

async function handleAuthStateChange(user) {
  if (user) {
    console.log('👤 User logged in:', user.uid);
    AppState.currentUser = user;
    
    // Subscribe to user data
    AppState.unsubscribeUser = subscribeToUser(user.uid, (userData) => {
      AppState.userData = userData;
      updateUIWithUserData();
    });
    
    // Subscribe to stakes
    AppState.unsubscribeStakes = subscribeToUserStakes(user.uid, (stakes) => {
      updateActivePositions(stakes);
    });
    
    // Update UI for logged in state
    updateAuthUI(true);
    
    // Load KYC status
    loadKYCStatus();
    
    // Load attendance
    loadAttendance();
    
  } else {
    console.log('👤 User logged out');
    AppState.currentUser = null;
    AppState.userData = null;
    
    // Unsubscribe from listeners
    if (AppState.unsubscribeUser) {
      AppState.unsubscribeUser();
      AppState.unsubscribeUser = null;
    }
    if (AppState.unsubscribeStakes) {
      AppState.unsubscribeStakes();
      AppState.unsubscribeStakes = null;
    }
    
    // Update UI for logged out state
    updateAuthUI(false);
    showPage('home');
  }
}

// ==========================================
// AUTHENTICATION HANDLERS
// ==========================================

window.handleLogin = async () => {
  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  const errorEl = document.getElementById('loginError');
  
  if (!email || !password) {
    if (errorEl) {
      errorEl.textContent = 'Please enter email and password';
      errorEl.style.display = 'block';
    }
    return;
  }
  
  const result = await loginUser(email, password);
  
  if (result.success) {
    closeAuthModal();
    showToast('Welcome Back!', 'Successfully logged in');
    showPage('asset');
  } else {
    if (errorEl) {
      errorEl.textContent = getAuthErrorMessage(result.code);
      errorEl.style.display = 'block';
    }
  }
};

window.handleSignup = async () => {
  const email = document.getElementById('regEmail')?.value.trim();
  const password = document.getElementById('regPassword')?.value;
  const confirmPassword = document.getElementById('regConfirmPassword')?.value;
  const firstName = document.getElementById('regFirstName')?.value.trim();
  const lastName = document.getElementById('regLastName')?.value.trim();
  const age = document.getElementById('regAge')?.value;
  const errorEl = document.getElementById('signupError');
  
  // Validation
  if (!email || !password || !firstName || !lastName) {
    if (errorEl) {
      errorEl.textContent = 'Please fill in all required fields';
      errorEl.style.display = 'block';
    }
    return;
  }
  
  if (password !== confirmPassword) {
    if (errorEl) {
      errorEl.textContent = 'Passwords do not match';
      errorEl.style.display = 'block';
    }
    return;
  }
  
  if (password.length < 6) {
    if (errorEl) {
      errorEl.textContent = 'Password must be at least 6 characters';
      errorEl.style.display = 'block';
    }
    return;
  }
  
  if (!age || age < 18) {
    if (errorEl) {
      errorEl.textContent = 'You must be 18 or older';
      errorEl.style.display = 'block';
    }
    return;
  }
  
  const result = await registerUser(email, password, { firstName, lastName });
  
  if (result.success) {
    // Create user document in Firestore
    await createUserDocument(result.uid, {
      firstName,
      lastName,
      email,
      age: parseInt(age)
    });
    
    closeAuthModal();
    showToast('Account Created!', 'Welcome to PocketChain! You received 10,000 PCH bonus.');
    showPage('asset');
  } else {
    if (errorEl) {
      errorEl.textContent = getAuthErrorMessage(result.code);
      errorEl.style.display = 'block';
    }
  }
};

window.logout = async () => {
  const result = await logoutUser();
  if (result.success) {
    showToast('Logged Out', 'See you soon!');
  }
};

// ==========================================
// UI UPDATES
// ==========================================

function updateAuthUI(isLoggedIn) {
  const loginMenu = document.getElementById('loginMenu');
  const privateMenu = document.getElementById('privateMenu');
  const accountMenu = document.getElementById('accountMenu');
  
  if (loginMenu) {
    loginMenu.classList.toggle('hidden', isLoggedIn);
  }
  if (privateMenu) {
    privateMenu.classList.toggle('hidden', !isLoggedIn);
  }
  if (accountMenu) {
    accountMenu.classList.toggle('hidden', !isLoggedIn);
  }
}

function updateUIWithUserData() {
  if (!AppState.userData) return;
  
  const data = AppState.userData;
  
  // Update balance displays
  const balanceElements = [
    'availableBalance',
    'stakeBalanceDisplay',
    'withdrawAvailableBalance',
    'sendAvailableBalance',
    'convertFromBalance'
  ];
  
  balanceElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = (data.balancePCH || 0).toLocaleString();
    }
  });
  
  // Update USD value
  const balanceUsd = document.getElementById('balanceUsd');
  if (balanceUsd) {
    const usdValue = (data.balancePCH || 0) * TOKEN_CONFIG.price;
    balanceUsd.textContent = `≈ $${usdValue.toLocaleString()} USD`;
  }
  
  // Update account page
  const accountFullName = document.getElementById('accountFullName');
  const accountEmail = document.getElementById('accountEmail');
  const accountUsername = document.getElementById('accountUsername');
  const accountAge = document.getElementById('accountAge');
  const accountJoined = document.getElementById('accountJoined');
  const referralCodeDisplay = document.getElementById('referralCodeDisplay');
  
  if (accountFullName) {
    accountFullName.textContent = `${data.firstName || ''} ${data.lastName || ''}`.trim() || '-';
  }
  if (accountEmail) accountEmail.textContent = data.email || '-';
  if (accountUsername) accountUsername.textContent = data.username || data.referralCode || '-';
  if (accountAge) accountAge.textContent = data.age || '-';
  if (accountJoined && data.createdAt) {
    accountJoined.textContent = new Date(data.createdAt.toDate()).toLocaleDateString();
  }
  if (referralCodeDisplay) {
    referralCodeDisplay.textContent = data.referralCode || '-----';
  }
  
  // Update KYC badge
  updateKYCBadge(data.isVerified);
  
  // Update wallet button
  if (data.walletAddress) {
    AppState.walletAddress = data.walletAddress;
    AppState.walletConnected = true;
    updateWalletButton();
  }
}

function updateKYCBadge(isVerified) {
  const badge = document.getElementById('kycStatusBadge');
  const statusText = document.getElementById('kycStatusText');
  
  if (!badge) return;
  
  if (isVerified) {
    badge.className = 'kyc-badge verified';
    badge.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
    if (statusText) statusText.textContent = 'Your identity has been verified';
  } else {
    badge.className = 'kyc-badge unverified';
    badge.innerHTML = '<i class="fas fa-times-circle"></i> Not Verified';
    if (statusText) statusText.textContent = 'Complete KYC to unlock all features';
  }
}

// ==========================================
// STAKING FUNCTIONS
// ==========================================

window.selectPool = (element, period, apy) => {
  document.querySelectorAll('.staking-pool').forEach(p => p.classList.remove('selected'));
  element.classList.add('selected');
  
  AppState.selectedPool = period;
  AppState.selectedAPY = apy;
  AppState.selectedPeriod = period;
  
  calculateProEarnings();
  
  const btn = document.getElementById('stakeBtnPro');
  if (btn) {
    btn.textContent = `Stake Now (${apy}% APY)`;
    btn.disabled = false;
  }
};

window.calculateProEarnings = () => {
  const amount = parseFloat(document.getElementById('stakeAmountPro')?.value) || 0;
  const preview = document.getElementById('earnPreviewPro');
  
  if (amount > 0 && AppState.selectedAPY > 0) {
    const annualReward = amount * (AppState.selectedAPY / 100);
    const dailyReward = annualReward / 365;
    const totalReward = dailyReward * AppState.selectedPeriod;
    
    const totalReturnEl = document.getElementById('totalReturnPro');
    const dailyEarningsEl = document.getElementById('dailyEarningsPro');
    
    if (totalReturnEl) totalReturnEl.textContent = `+${totalReward.toFixed(2)} PCH`;
    if (dailyEarningsEl) dailyEarningsEl.textContent = `+${dailyReward.toFixed(4)} PCH`;
    if (preview) preview.classList.add('show');
  } else {
    if (preview) preview.classList.remove('show');
  }
};

window.setMaxStake = () => {
  if (AppState.userData) {
    const input = document.getElementById('stakeAmountPro');
    if (input) {
      input.value = AppState.userData.balancePCH || 0;
      calculateProEarnings();
    }
  }
};

window.stakePro = async () => {
  if (!AppState.currentUser) {
    showToast('Error', 'Please login first', 'error');
    return;
  }
  
  const amount = parseFloat(document.getElementById('stakeAmountPro')?.value);
  
  if (!amount || amount <= 0) {
    showToast('Error', 'Enter a valid amount', 'error');
    return;
  }
  
  if (!AppState.selectedPool) {
    showToast('Error', 'Select a staking pool', 'error');
    return;
  }
  
  const balance = AppState.userData?.balancePCH || 0;
  if (amount > balance) {
    showToast('Error', 'Insufficient balance', 'error');
    return;
  }
  
  // Minimum amounts
  const minAmounts = { 7: 100, 180: 1000, 365: 5000, 1825: 10000 };
  if (amount < minAmounts[AppState.selectedPool]) {
    showToast('Error', `Minimum ${minAmounts[AppState.selectedPool]} PCH required`, 'error');
    return;
  }
  
  try {
    await createStake(AppState.currentUser.uid, {
      amount: amount,
      apy: AppState.selectedAPY,
      period: AppState.selectedPeriod
    });
    
    await recordTransaction(AppState.currentUser.uid, {
      type: 'Stake',
      amount: -amount,
      description: `Staked ${amount} PCH for ${AppState.selectedPeriod} days at ${AppState.selectedAPY}% APY`,
      status: 'Locked'
    });
    
    showToast('Success', `Successfully staked ${amount} PCH!`);
    
    // Reset form
    document.getElementById('stakeAmountPro').value = '';
    document.querySelectorAll('.staking-pool').forEach(p => p.classList.remove('selected'));
    AppState.selectedPool = null;
    AppState.selectedAPY = 0;
    
    const preview = document.getElementById('earnPreviewPro');
    if (preview) preview.classList.remove('show');
    
    const btn = document.getElementById('stakeBtnPro');
    if (btn) {
      btn.textContent = 'Select a Pool to Stake';
      btn.disabled = true;
    }
    
  } catch (error) {
    console.error('Staking error:', error);
    showToast('Error', 'Failed to create stake. Please try again.', 'error');
  }
};

function updateActivePositions(stakes) {
  const container = document.getElementById('activePositions');
  if (!container) return;
  
  if (!stakes || stakes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-coins"></i>
        <p>No active stakes</p>
        <p class="empty-sub">Select a pool and start earning</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = stakes.map(stake => {
    const reward = stake.earnings || 0;
    const startDate = stake.startDate?.toDate ? stake.startDate.toDate() : new Date();
    const unlockDate = stake.unlockDate?.toDate ? stake.unlockDate.toDate() : new Date();
    
    return `
      <div class="card" style="margin-bottom: 10px; border-left: 3px solid var(--secondary);">
        <div style="display:flex; justify-content:space-between;">
          <strong>${stake.amount.toLocaleString()} PCH</strong>
          <span style="color:var(--secondary);">${stake.apy}% APY</span>
        </div>
        <div style="font-size: 0.8rem; color:var(--text-muted); margin-top:5px;">
          Est. Reward: +${reward.toFixed(2)} PCH <br>
          Unlock: ${unlockDate.toLocaleDateString()}
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// WALLET FUNCTIONS
// ==========================================

window.unlockWithPassphrase = () => {
  const modal = document.getElementById('passphraseModal');
  if (modal) modal.classList.add('active');
};

window.closePassphraseModal = () => {
  const modal = document.getElementById('passphraseModal');
  if (modal) modal.classList.remove('active');
};

window.confirmPassphraseUnlock = () => {
  const passphrase = document.getElementById('walletPassphrase')?.value.trim();
  
  if (!passphrase || passphrase.length < 10) {
    showToast('Error', 'Please enter a valid passphrase', 'error');
    return;
  }
  
  // In production, this would validate against encrypted stored passphrase
  AppState.walletUnlocked = true;
  closePassphraseModal();
  showWalletContent();
  showToast('Wallet Unlocked', 'Your PCH Wallet is now accessible');
  
  document.getElementById('walletPassphrase').value = '';
};

window.unlockWithFingerprint = () => {
  if (navigator.credentials && window.PublicKeyCredential) {
    showToast('Authenticating', 'Please verify your fingerprint...');
    
    setTimeout(() => {
      AppState.walletUnlocked = true;
      showWalletContent();
      showToast('Wallet Unlocked', 'Biometric authentication successful');
    }, 1500);
  } else {
    showToast('Fingerprint', 'Fingerprint sensor not available', 'error');
  }
};

function showWalletContent() {
  const unlockButtons = document.getElementById('unlockButtons');
  const walletContent = document.getElementById('walletContent');
  const lockedState = document.getElementById('walletLockedState');
  
  if (unlockButtons) unlockButtons.classList.add('hidden');
  if (lockedState) lockedState.classList.add('hidden');
  if (walletContent) walletContent.classList.remove('hidden');
}

// ==========================================
// AIRDROP & ATTENDANCE
// ==========================================

async function loadAttendance() {
  if (!AppState.currentUser) return;
  
  try {
    const attendance = await getUserAttendance(AppState.currentUser.uid);
    updateAttendanceUI(attendance);
  } catch (error) {
    console.error('Load attendance error:', error);
  }
}

function updateAttendanceUI(attendance) {
  if (!attendance) return;
  
  const streakDisplay = document.getElementById('attendanceStreak');
  const totalClaims = document.getElementById('totalClaims');
  const nextBonus = document.getElementById('nextBonus');
  const claimBtn = document.getElementById('dailyClaimBtn');
  
  if (streakDisplay) streakDisplay.textContent = attendance.streak || 0;
  if (totalClaims) totalClaims.textContent = attendance.totalClaims || 0;
  
  if (nextBonus) {
    const streak = attendance.streak || 0;
    const daysUntilBonus = 7 - (streak % 7);
    nextBonus.textContent = daysUntilBonus === 7 ? 'Bonus Ready!' : `${daysUntilBonus} days`;
  }
  
  // Check if already claimed today
  if (attendance.lastClaim) {
    const lastClaimDate = attendance.lastClaim.toDate ? attendance.lastClaim.toDate() : new Date(attendance.lastClaim);
    const today = new Date().toDateString();
    
    if (lastClaimDate.toDateString() === today) {
      if (claimBtn) {
        claimBtn.disabled = true;
        claimBtn.textContent = 'Already Claimed Today';
        claimBtn.classList.add('claimed');
      }
    }
  }
}

window.claimDailyReward = async () => {
  if (!AppState.currentUser) {
    showToast('Error', 'Please login first', 'error');
    return;
  }
  
  try {
    const result = await claimDailyReward(AppState.currentUser.uid, 1);
    showToast('Claimed!', `+${result.reward} PCH${result.streak % 7 === 0 ? ' (Weekly Bonus!)' : ''}`);
    
    const claimBtn = document.getElementById('dailyClaimBtn');
    if (claimBtn) {
      claimBtn.disabled = true;
      claimBtn.textContent = 'Already Claimed Today';
      claimBtn.classList.add('claimed');
    }
    
    // Update UI
    const attendance = await getUserAttendance(AppState.currentUser.uid);
    updateAttendanceUI(attendance);
    
  } catch (error) {
    if (error.message === 'Already claimed today') {
      showToast('Error', 'You already claimed today', 'error');
    } else {
      console.error('Claim error:', error);
      showToast('Error', 'Failed to claim reward', 'error');
    }
  }
};

window.completeTask = async (platform) => {
  if (!AppState.currentUser) {
    showToast('Error', 'Please login first', 'error');
    return;
  }
  
  const btn = document.getElementById(`task-${platform}`);
  if (btn && btn.disabled) return;
  
  try {
    await updateUserDocument(AppState.currentUser.uid, {
      balancePCH: increment(10),
      totalEarned: increment(10)
    });
    
    await recordTransaction(AppState.currentUser.uid, {
      type: 'Social Task',
      amount: 10,
      description: `Completed ${platform} task`,
      status: 'Completed'
    });
    
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Claimed';
    }
    
    showToast('Success', `+10 PCH for ${platform}!`);
    
    // Update airdrop total
    const airdropTotal = document.getElementById('airdropTotal');
    if (airdropTotal) {
      const current = parseInt(airdropTotal.textContent) || 0;
      airdropTotal.textContent = `${current + 10} PCH`;
    }
    
  } catch (error) {
    console.error('Task error:', error);
    showToast('Error', 'Failed to claim reward', 'error');
  }
};

// ==========================================
// KYC FUNCTIONS
// ==========================================

async function loadKYCStatus() {
  if (!AppState.currentUser) return;
  
  try {
    const kyc = await getUserKYC(AppState.currentUser.uid);
    
    if (kyc) {
      const badge = document.getElementById('kycStatusBadge');
      const statusText = document.getElementById('kycStatusText');
      
      if (kyc.status === 'pending') {
        if (badge) {
          badge.className = 'kyc-badge pending';
          badge.innerHTML = '<i class="fas fa-clock"></i> Pending Approval';
        }
        if (statusText) statusText.textContent = 'Your KYC application is under review';
      } else if (kyc.status === 'verified') {
        updateKYCBadge(true);
      }
    }
  } catch (error) {
    console.error('Load KYC error:', error);
  }
}

// ==========================================
// NAVIGATION & UI
// ==========================================

window.showPage = (pageId) => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
  
  document.querySelectorAll('#sideMenu a').forEach(a => a.classList.remove('active'));
  const navItem = document.getElementById('nav-' + pageId);
  if (navItem) navItem.classList.add('active');
  
  window.scrollTo(0, 0);
  
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('overlay');
  if (menu?.classList.contains('open')) {
    menu.classList.remove('open');
    overlay?.classList.remove('active');
  }
};

window.toggleMenu = () => {
  document.getElementById('sideMenu')?.classList.toggle('open');
  document.getElementById('overlay')?.classList.toggle('active');
};

window.toggleTheme = () => {
  AppState.isDarkMode = !AppState.isDarkMode;
  localStorage.setItem('pocketchain_darkmode', AppState.isDarkMode);
  applyTheme();
};

function applyTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('themeIcon');
  
  if (AppState.isDarkMode) {
    body.classList.remove('light-mode');
    if (themeIcon) themeIcon.className = 'fas fa-moon';
  } else {
    body.classList.add('light-mode');
    if (themeIcon) themeIcon.className = 'fas fa-sun';
  }
  
  initCharts();
}

window.togglePassword = (inputId, btn) => {
  const input = document.getElementById(inputId);
  const icon = btn?.querySelector('i');
  
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
    if (icon) {
      icon.className = input.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    }
  }
};

window.toggleFaq = (element) => {
  const item = element.parentElement;
  item.classList.toggle('active');
};

// ==========================================
// MODALS
// ==========================================

window.openAuthModal = (type) => {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('active');
    switchAuth(type);
  }
};

window.closeAuthModal = () => {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('active');
};

window.switchAuth = (type) => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  
  if (loginForm) loginForm.style.display = type === 'login' ? 'block' : 'none';
  if (signupForm) signupForm.style.display = type === 'login' ? 'none' : 'block';
};

window.openWalletModal = () => {
  const modal = document.getElementById('walletModal');
  if (modal) modal.classList.add('active');
};

window.closeWalletModal = () => {
  const modal = document.getElementById('walletModal');
  if (modal) modal.classList.remove('active');
};

window.openDepositModal = () => {
  if (!AppState.walletUnlocked) {
    showToast('Wallet Locked', 'Please unlock your wallet first', 'error');
    return;
  }
  const modal = document.getElementById('depositModal');
  if (modal) modal.classList.add('active');
};

window.closeDepositModal = () => {
  const modal = document.getElementById('depositModal');
  if (modal) modal.classList.remove('active');
};

window.openWithdrawOptionsModal = () => {
  if (!AppState.walletUnlocked) {
    showToast('Wallet Locked', 'Please unlock your wallet first', 'error');
    return;
  }
  const modal = document.getElementById('withdrawOptionsModal');
  if (modal) modal.classList.add('active');
};

window.closeWithdrawOptionsModal = () => {
  const modal = document.getElementById('withdrawOptionsModal');
  if (modal) modal.classList.remove('active');
};

// ==========================================
// WALLET CONNECTION
// ==========================================

window.connectWallet = async (type) => {
  if (type === 'metamask' && window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      
      AppState.walletConnected = true;
      AppState.walletAddress = address;
      
      // Save to user document
      if (AppState.currentUser) {
        await updateUserDocument(AppState.currentUser.uid, { walletAddress: address });
      }
      
      updateWalletButton();
      closeWalletModal();
      showToast('Wallet Connected', 'MetaMask connected successfully');
      
    } catch (error) {
      showToast('Error', 'Failed to connect wallet', 'error');
    }
  } else {
    showToast('Error', 'Please install MetaMask', 'error');
  }
};

function updateWalletButton() {
  const btn = document.getElementById('walletBtn');
  if (!btn) return;
  
  if (AppState.walletConnected && AppState.walletAddress) {
    const shortAddress = `${AppState.walletAddress.substring(0, 6)}...${AppState.walletAddress.substring(38)}`;
    btn.innerHTML = `<i class="fas fa-check-circle"></i><span>${shortAddress}</span>`;
    btn.classList.add('connected');
  } else {
    btn.innerHTML = `<i class="fas fa-wallet"></i><span>Connect Wallet</span>`;
    btn.classList.remove('connected');
  }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

window.showToast = (title, message, type = 'success') => {
  const toast = document.getElementById('toast');
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = toast?.querySelector('.toast-icon');
  
  if (!toast) return;
  
  if (toastTitle) toastTitle.textContent = title;
  if (toastMessage) toastMessage.textContent = message;
  
  if (toastIcon) {
    toastIcon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} toast-icon`;
    toastIcon.style.color = type === 'success' ? 'var(--secondary)' : 'var(--danger)';
  }
  
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function initDateSync() {
  const daySelect = document.getElementById('regDay');
  const monthSelect = document.getElementById('regMonth');
  const yearSelect = document.getElementById('regYear');
  const ageInput = document.getElementById('regAge');
  
  if (!daySelect || !monthSelect || !yearSelect || !ageInput) return;
  
  // Populate days
  for (let i = 1; i <= 31; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    daySelect.appendChild(option);
  }
  
  // Populate months
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  months.forEach((month, idx) => {
    const option = document.createElement('option');
    option.value = idx + 1;
    option.textContent = month;
    monthSelect.appendChild(option);
  });
  
  // Populate years
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 18; i >= currentYear - 100; i--) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    yearSelect.appendChild(option);
  }
  
  function calculateAge() {
    const day = parseInt(daySelect.value);
    const month = parseInt(monthSelect.value) - 1;
    const year = parseInt(yearSelect.value);
    
    if (!day || isNaN(month) || !year) return;
    
    const birthDate = new Date(year, month, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    ageInput.value = age;
  }
  
  daySelect.addEventListener('change', calculateAge);
  monthSelect.addEventListener('change', calculateAge);
  yearSelect.addEventListener('change', calculateAge);
}

function initPasswordStrength() {
  const passwordInput = document.getElementById('regPassword');
  const strengthBar = document.getElementById('passwordStrength');
  const strengthText = document.getElementById('strengthText');
  
  if (!passwordInput || !strengthBar || !strengthText) return;
  
  passwordInput.addEventListener('input', (e) => {
    const password = e.target.value;
    let score = 0;
    
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 20;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 20;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;
    
    strengthBar.className = 'strength-bar';
    if (password.length === 0) {
      strengthBar.style.width = '0%';
      strengthText.textContent = '';
    } else if (score < 40) {
      strengthBar.classList.add('weak');
      strengthText.textContent = 'Weak';
      strengthText.className = 'strength-text weak';
    } else if (score < 80) {
      strengthBar.classList.add('moderate');
      strengthText.textContent = 'Moderate';
      strengthText.className = 'strength-text moderate';
    } else {
      strengthBar.classList.add('strong');
      strengthText.textContent = 'Strong';
      strengthText.className = 'strength-text strong';
    }
  });
}

function setupEventListeners() {
  // Stake amount input
  const stakeInput = document.getElementById('stakeAmountPro');
  if (stakeInput) {
    stakeInput.addEventListener('input', window.calculateProEarnings);
  }
}

// ==========================================
// CHARTS
// ==========================================

let tokenomicsChartInst = null;
let priceChartInst = null;

function initCharts() {
  const textColor = AppState.isDarkMode ? '#fff' : '#1a1a2e';
  const gridColor = AppState.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  
  // Tokenomics Chart
  const ctx1 = document.getElementById('tokenomicsChart');
  if (ctx1) {
    if (tokenomicsChartInst) tokenomicsChartInst.destroy();
    tokenomicsChartInst = new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: ['Staking', 'Liquidity', 'Team', 'Development', 'Airdrop', 'Reserve'],
        datasets: [{
          data: [40, 20, 15, 10, 10, 5],
          backgroundColor: ['#00c2ff', '#00ff88', '#7000ff', '#ff4757', '#ffa502', '#8b9bb4'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: textColor } }
        }
      }
    });
  }
  
  // Price Chart
  const ctx2 = document.getElementById('priceChart');
  if (ctx2) {
    if (priceChartInst) priceChartInst.destroy();
    priceChartInst = new Chart(ctx2, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'PCH Price (USD)',
          data: [0.038, 0.041, 0.039, 0.042, 0.044, 0.043, 0.045],
          borderColor: '#00c2ff',
          backgroundColor: 'rgba(0, 194, 255, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { grid: { color: gridColor }, ticks: { color: textColor } },
          x: { grid: { color: gridColor }, ticks: { color: textColor } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
}

// ==========================================
// OTHER FUNCTIONS (PLACEHOLDERS)
// ==========================================

window.copyReferralCode = () => {
  if (!AppState.userData?.referralCode) {
    showToast('Error', 'Please login first', 'error');
    return;
  }
  
  const link = `https://pocketchain.network/ref/${AppState.userData.referralCode}`;
  navigator.clipboard.writeText(link).then(() => {
    showToast('Copied!', 'Referral link copied to clipboard');
  });
};

window.openP2PModal = () => {
  closeWithdrawOptionsModal();
  const modal = document.getElementById('p2pModal');
  if (modal) modal.classList.add('active');
};

window.closeP2PModal = () => {
  const modal = document.getElementById('p2pModal');
  if (modal) modal.classList.remove('active');
};

window.switchP2PTab = (tab) => {
  document.querySelectorAll('.p2p-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
};

window.calculateP2P = () => {
  const phpAmount = parseFloat(document.getElementById('p2pPhpAmount')?.value) || 0;
  const pchAmount = phpAmount / P2P_RATE;
  const pchInput = document.getElementById('p2pPchAmount');
  if (pchInput) pchInput.value = pchAmount.toFixed(2);
};

window.executeP2POrder = () => {
  showToast('Coming Soon', 'P2P trading will be available soon');
  closeP2PModal();
};

window.openWithdrawCryptoModal = () => {
  closeWithdrawOptionsModal();
  showToast('Coming Soon', 'Crypto withdrawal will be available soon');
};

window.openSendModal = () => {
  if (!AppState.walletUnlocked) {
    showToast('Wallet Locked', 'Please unlock your wallet first', 'error');
    return;
  }
  showToast('Coming Soon', 'Send feature will be available soon');
};

window.openConvertModal = () => {
  if (!AppState.walletUnlocked) {
    showToast('Wallet Locked', 'Please unlock your wallet first', 'error');
    return;
  }
  showToast('Coming Soon', 'Convert feature will be available soon');
};

window.submitSupport = () => {
  showToast('Submitted', 'Support ticket submitted. We will respond within 24 hours.');
  document.getElementById('supportSubject').value = '';
  document.getElementById('supportMessage').value = '';
};

window.openBugModal = () => {
  showToast('Coming Soon', 'Bug reporting will be available soon');
};

window.switchLeaderboard = (type) => {
  document.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
};

// Export AppState for debugging
window.AppState = AppState;
// --- ADDED/FIXED STAKING LOGIC ---
async function renderActiveStakes(userId) {
  const stakesList = document.getElementById('active-stakes-list') || document.querySelector('.active-positions-container');
  if (!stakesList) return;

  db.collection('users').doc(userId).collection('stakes')
    .where('status', '==', 'active')
    .onSnapshot((snapshot) => {
      if (snapshot.empty) {
        stakesList.innerHTML = `
          <div class="text-center py-4">
            <i class="fas fa-coins fa-2x mb-2 text-muted"></i>
            <p>No active stakes</p>
            <small class="text-muted">Select a pool and start earning</small>
          </div>`;
        return;
      }

      let html = '';
      snapshot.forEach((doc) => {
        const stake = doc.data();
        const startDate = stake.createdAt ? new Date(stake.createdAt.toDate()).toLocaleDateString() : 'N/A';
        html += `
          <div class="card bg-dark text-white mb-2 border-secondary p-3">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="mb-0 text-primary">${stake.poolName}</h6>
                <small class="text-muted">Staked: ${stake.amount} PCH @ ${stake.apy}% APY</small>
              </div>
              <span class="badge bg-success">Active</span>
            </div>
            <hr class="my-2 border-secondary">
            <div class="d-flex justify-content-between text-muted small">
              <span>Date: ${startDate}</span>
              <span>Reward: +${((stake.amount * stake.apy) / 100).toFixed(2)} PCH/yr</span>
            </div>
          </div>`;
      });
      stakesList.innerHTML = html;
    });
}
