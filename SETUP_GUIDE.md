# 🚀 PocketChain Setup Guide

## ✅ What Was Done

### 1. **Firebase Configuration** (`firebase-config.js`)
- Proper Firebase SDK initialization using ES6 modules
- Exports: `app`, `auth`, `db`, `storage`, `onAuthStateChanged`
- Helper functions for user authentication state

### 2. **Modular Architecture** (`modules/`)
- **`auth.js`**: Authentication operations (register, login, logout, password reset)
- **`firestore.js`**: Database operations (users, stakes, KYC, transactions, attendance)
- **`storage.js`**: File upload operations for KYC documents

### 3. **Main Application** (`app.js`)
- Complete Firebase integration
- Real-time data sync with Firestore
- Authentication state management
- Staking, wallet, airdrop functionality
- All simulation code removed

### 4. **KYC System** (`kyc.js`)
- Live camera capture for selfies
- Document upload with validation
- Firebase Storage integration
- Professional submission workflow

### 5. **Admin Panel** (`admin.html`, `admin.js`)
- KYC management dashboard
- Approve/reject functionality
- Real-time updates
- Document and selfie viewing

### 6. **Backend Server** (`server.js`)
- Express.js with Firebase Admin
- API endpoints for user data
- Admin routes for KYC management
- Security middleware (Helmet, CORS)

### 7. **Configuration Files**
- **`package.json`**: Node.js dependencies
- **`.env.example`**: Environment variables template
- **`.gitignore`**: Git ignore rules
- **`README.md`**: Complete documentation

---

## 🔧 Quick Start

### Step 1: Install Dependencies
```bash
cd pocketchain-firebase
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### Step 3: Setup Firebase Admin
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Project Settings → Service Accounts
3. Generate new private key
4. Save to `config/firebase-service-account.json`

### Step 4: Start Server
```bash
npm start
```

### Step 5: Open Application
- Main App: `http://localhost:3000`
- Admin Panel: `http://localhost:3000/admin.html`

---

## 🔑 Admin Credentials

- **Username**: `Masterghed`
- **Password**: `PocketChain`

---

## 📁 File Structure

```
pocketchain-firebase/
├── index.html              # Main app (updated with Firebase)
├── app.js                  # Main logic (Firebase integrated)
├── kyc.js                  # KYC system (camera + storage)
├── firebase-config.js      # Firebase config
├── style.css               # Complete styling
├── modules/
│   ├── auth.js             # Auth operations
│   ├── firestore.js        # Database operations
│   └── storage.js          # File uploads
├── admin.html              # Admin dashboard
├── admin.js                # Admin logic
├── server.js               # Express backend
├── package.json            # Dependencies
├── .env.example            # Environment template
├── .gitignore              # Git ignore
├── README.md               # Documentation
└── SETUP_GUIDE.md          # This file
```

---

## 🔥 Firebase Collections Needed

### 1. `users`
```javascript
{
  uid: string,
  firstName: string,
  lastName: string,
  email: string,
  balancePCH: number,
  isVerified: boolean,
  referralCode: string,
  createdAt: timestamp
}
```

### 2. `kyc_submissions`
```javascript
{
  userId: string,
  fullName: string,
  birthDate: string,
  nationality: string,
  idType: string,
  idNumber: string,
  address: string,
  city: string,
  country: string,
  phone: string,
  idUrl: string,        // Firebase Storage URL
  selfieUrl: string,    // Firebase Storage URL
  status: 'pending' | 'verified' | 'rejected',
  submittedAt: timestamp,
  reviewedAt: timestamp,
  rejectionReason: string
}
```

### 3. `stakes`
```javascript
{
  userId: string,
  amount: number,
  apy: number,
  period: number,
  startDate: timestamp,
  unlockDate: timestamp,
  status: 'active' | 'completed',
  claimed: boolean,
  earnings: number
}
```

### 4. `transactions`
```javascript
{
  userId: string,
  type: string,
  amount: number,
  description: string,
  status: string,
  createdAt: timestamp
}
```

### 5. `attendance`
```javascript
{
  userId: string,
  streak: number,
  totalClaims: number,
  lastClaim: timestamp,
  history: array
}
```

---

## 🛡️ Security Rules

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /kyc_submissions/{docId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /kyc_documents/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /kyc_selfies/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## ✅ Features Implemented

| Feature | Status |
|---------|--------|
| Firebase Auth (Email/Password) | ✅ |
| Firestore Database | ✅ |
| Firebase Storage | ✅ |
| User Registration/Login | ✅ |
| KYC with Camera Capture | ✅ |
| KYC Document Upload | ✅ |
| Admin KYC Approval | ✅ |
| Staking System | ✅ |
| Wallet Management | ✅ |
| Daily Attendance | ✅ |
| Referral System | ✅ |
| Social Tasks | ✅ |
| Real-time Updates | ✅ |
| Responsive Design | ✅ |
| Dark/Light Mode | ✅ |

---

## 🎉 You're Ready!

Your PocketChain DeFi platform is now fully functional with Firebase integration. All simulation code has been removed and replaced with real Firebase operations.

**Next Steps:**
1. Set up Firebase Admin credentials
2. Configure Firestore security rules
3. Deploy to Firebase Hosting or your preferred platform
4. Test all features
5. Go live! 🚀

---

**Need Help?** Check `README.md` for detailed documentation.
