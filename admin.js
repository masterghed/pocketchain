// ==========================================
// POCKETCHAIN ADMIN - KYC MANAGEMENT
// Professional Admin Dashboard
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs,
    doc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAeE5T0Q0PQkQMouPlvcIsOvI3l9BgkwNA",
    authDomain: "pocketchain-e1f91.firebaseapp.com",
    projectId: "pocketchain-e1f91",
    storageBucket: "pocketchain-e1f91.firebasestorage.app",
    messagingSenderId: "514803824047",
    appId: "1:514803824047:web:51fa9d02ee389f072c6b5a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// ADMIN STATE
// ==========================================
const AdminState = {
    isLoggedIn: false,
    pendingKYC: [],
    selectedKYC: null,
    unsubscribe: null
};

// Admin credentials (in production, use proper authentication)
const ADMIN_CREDENTIALS = {
    username: 'Masterghed',
    password: 'PocketChain'
};

// ==========================================
// AUTHENTICATION
// ==========================================

window.adminLogin = () => {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errorEl = document.getElementById('loginError');
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        AdminState.isLoggedIn = true;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
        
        // Initialize dashboard
        initDashboard();
    } else {
        errorEl.style.display = 'block';
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 3000);
    }
};

window.adminLogout = () => {
    AdminState.isLoggedIn = false;
    
    // Unsubscribe from listeners
    if (AdminState.unsubscribe) {
        AdminState.unsubscribe();
        AdminState.unsubscribe = null;
    }
    
    document.getElementById('dashboard').classList.remove('active');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminUsername').value = '';
    document.getElementById('adminPassword').value = '';
};

// ==========================================
// DASHBOARD INITIALIZATION
// ==========================================

function initDashboard() {
    // Subscribe to pending KYC
    subscribeToPendingKYC();
    
    // Load initial stats
    loadStats();
}

// ==========================================
// KYC MANAGEMENT
// ==========================================

function subscribeToPendingKYC() {
    const q = query(
        collection(db, 'kyc_submissions'),
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'desc')
    );
    
    AdminState.unsubscribe = onSnapshot(q, (snapshot) => {
        AdminState.pendingKYC = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderKYCList();
        updateStats();
    }, (error) => {
        console.error('KYC subscription error:', error);
        showToast('Error', 'Failed to load KYC data', true);
    });
}

function renderKYCList() {
    const container = document.getElementById('kycList');
    
    if (AdminState.pendingKYC.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>No Pending Submissions</h3>
                <p>All KYC applications have been reviewed</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <table class="kyc-table">
            <thead>
                <tr>
                    <th>User</th>
                    <th>Full Name</th>
                    <th>ID Type</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${AdminState.pendingKYC.map(kyc => `
                    <tr>
                        <td>
                            <div class="user-info">
                                <div class="user-avatar">${kyc.fullName?.charAt(0) || '?'}</div>
                                <div class="user-details">
                                    <span class="user-name">${kyc.fullName || 'Unknown'}</span>
                                    <span class="user-email">${kyc.userId?.substring(0, 15)}...</span>
                                </div>
                            </div>
                        </td>
                        <td>${kyc.fullName || '-'}</td>
                        <td>${formatIdType(kyc.idType)}</td>
                        <td>${formatDate(kyc.submittedAt)}</td>
                        <td><span class="status-badge pending">Pending</span></td>
                        <td>
                            <div class="action-btns">
                                <button class="btn-icon btn-view" onclick="viewKYC('${kyc.id}')" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-icon btn-approve" onclick="approveKYC('${kyc.id}', '${kyc.userId}')" title="Approve">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="btn-icon btn-reject" onclick="rejectKYC('${kyc.id}')" title="Reject">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

window.viewKYC = (kycId) => {
    const kyc = AdminState.pendingKYC.find(k => k.id === kycId);
    if (!kyc) return;
    
    AdminState.selectedKYC = kyc;
    
    const modalBody = document.getElementById('kycModalBody');
    modalBody.innerHTML = `
        <div class="kyc-detail-grid">
            <div class="kyc-detail-item">
                <div class="kyc-detail-label">Full Name</div>
                <div class="kyc-detail-value">${kyc.fullName || '-'}</div>
            </div>
            <div class="kyc-detail-item">
                <div class="kyc-detail-label">Date of Birth</div>
                <div class="kyc-detail-value">${kyc.birthDate || '-'}</div>
            </div>
            <div class="kyc-detail-item">
                <div class="kyc-detail-label">Nationality</div>
                <div class="kyc-detail-value">${kyc.nationality || '-'}</div>
            </div>
            <div class="kyc-detail-item">
                <div class="kyc-detail-label">ID Type</div>
                <div class="kyc-detail-value">${formatIdType(kyc.idType)}</div>
            </div>
            <div class="kyc-detail-item">
                <div class="kyc-detail-label">ID Number</div>
                <div class="kyc-detail-value">${kyc.idNumber || '-'}</div>
            </div>
            <div class="kyc-detail-item">
                <div class="kyc-detail-label">Phone</div>
                <div class="kyc-detail-value">${kyc.phone || '-'}</div>
            </div>
            <div class="kyc-detail-item" style="grid-column: span 2;">
                <div class="kyc-detail-label">Address</div>
                <div class="kyc-detail-value">${kyc.address || '-'}, ${kyc.city || '-'}, ${kyc.country || '-'}</div>
            </div>
        </div>
        
        <div class="kyc-images">
            <div class="kyc-image-item">
                <div class="kyc-image-label"><i class="fas fa-id-card"></i> ID Document</div>
                ${kyc.idUrl ? `<img src="${kyc.idUrl}" alt="ID Document" onclick="window.open('${kyc.idUrl}', '_blank')">` : '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No ID uploaded</div>'}
            </div>
            <div class="kyc-image-item">
                <div class="kyc-image-label"><i class="fas fa-user"></i> Selfie</div>
                ${kyc.selfieUrl ? `<img src="${kyc.selfieUrl}" alt="Selfie" onclick="window.open('${kyc.selfieUrl}', '_blank')">` : '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No selfie uploaded</div>'}
            </div>
        </div>
        
        <div class="modal-actions">
            <button class="btn-danger" onclick="rejectKYC('${kyc.id}')">
                <i class="fas fa-times"></i> Reject
            </button>
            <button class="btn-primary" onclick="approveKYC('${kyc.id}', '${kyc.userId}')">
                <i class="fas fa-check"></i> Approve
            </button>
        </div>
    `;
    
    document.getElementById('kycModal').classList.add('active');
};

window.closeKYCModal = () => {
    document.getElementById('kycModal').classList.remove('active');
    AdminState.selectedKYC = null;
};

window.approveKYC = async (kycId, userId) => {
    try {
        // Update KYC status
        await updateDoc(doc(db, 'kyc_submissions', kycId), {
            status: 'verified',
            reviewedAt: serverTimestamp,
    Timestamp(),
            reviewedBy: 'admin'
        });
        
        // Update user verification status
        await updateDoc(doc(db, 'users', userId), {
            isVerified: true
        });
        
        showToast('Success', 'KYC approved successfully');
        closeKYCModal();
        
        // Refresh data
        loadStats();
        
    } catch (error) {
        console.error('Approve KYC error:', error);
        showToast('Error', 'Failed to approve KYC', true);
    }
};

window.rejectKYC = async (kycId) => {
    const reason = prompt('Enter rejection reason (optional):');
    
    try {
        await updateDoc(doc(db, 'kyc_submissions', kycId), {
            status: 'rejected',
            reviewedAt: serverTimestamp,
    Timestamp(),
            rejectionReason: reason || 'Application rejected'
        });
        
        showToast('Success', 'KYC rejected');
        closeKYCModal();
        
        // Refresh data
        loadStats();
        
    } catch (error) {
        console.error('Reject KYC error:', error);
        showToast('Error', 'Failed to reject KYC', true);
    }
};

// ==========================================
// STATS & DATA
// ==========================================

async function loadStats() {
    try {
        // Get total users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        document.getElementById('statUsers').textContent = usersSnapshot.size;
        
        // Get pending count
        const pendingSnapshot = await getDocs(
            query(collection(db, 'kyc_submissions'), where('status', '==', 'pending'))
        );
        document.getElementById('statPending').textContent = pendingSnapshot.size;
        document.getElementById('pendingCount').textContent = pendingSnapshot.size;
        
        // Get today's approved/rejected
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const approvedSnapshot = await getDocs(
            query(
                collection(db, 'kyc_submissions'),
                where('status', '==', 'verified'),
                where('reviewedAt', '>=', today)
            )
        );
        document.getElementById('statApproved').textContent = approvedSnapshot.size;
        
        const rejectedSnapshot = await getDocs(
            query(
                collection(db, 'kyc_submissions'),
                where('status', '==', 'rejected'),
                where('reviewedAt', '>=', today)
            )
        );
        document.getElementById('statRejected').textContent = rejectedSnapshot.size;
        
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

function updateStats() {
    document.getElementById('statPending').textContent = AdminState.pendingKYC.length;
    document.getElementById('pendingCount').textContent = AdminState.pendingKYC.length;
}

window.refreshData = () => {
    loadStats();
    showToast('Refreshed', 'Data updated successfully');
};

// ==========================================
// NAVIGATION
// ==========================================

window.showSection = (section) => {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
    
    if (section === 'kyc') {
        // Already showing KYC
    } else if (section === 'users') {
        showToast('Coming Soon', 'User management feature coming soon');
    } else if (section === 'settings') {
        showToast('Coming Soon', 'Settings feature coming soon');
    }
};

// ==========================================
// UTILITIES
// ==========================================

function formatIdType(type) {
    const types = {
        'passport': 'Passport',
        'drivers_license': "Driver's License",
        'national_id': 'National ID'
    };
    return types[type] || type || '-';
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        if (hours < 1) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} min ago`;
        }
        return `${hours} hours ago`;
    }
    
    // Less than 7 days
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days} days ago`;
    }
    
    return date.toLocaleDateString();
}

function showToast(title, message, isError = false) {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast.querySelector('.toast-icon');
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    if (isError) {
        toast.classList.add('error');
        toastIcon.className = 'fas fa-exclamation-circle toast-icon';
    } else {
        toast.classList.remove('error');
        toastIcon.className = 'fas fa-check-circle toast-icon';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Handle Enter key on login
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            adminLogin();
        }
    });
});
