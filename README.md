# 🔷 PocketChain DeFi Platform

Professional Decentralized Staking Protocol with Firebase Integration

## 📋 Overview

PocketChain is a next-generation DeFi platform that offers:
- **Staking Pro**: Earn up to 125% APY with institutional-grade security
- **PCH Wallet**: Non-custodial wallet with biometric authentication
- **KYC Verification**: Complete identity verification system with document upload
- **Airdrop Campaign**: Daily attendance, referrals, and social tasks
- **Live Market**: Real-time token metrics and price charts

## 🏗️ Project Structure

```
pocketchain-firebase/
├── index.html              # Main application entry point
├── style.css               # Complete styling (3000+ lines)
├── app.js                  # Main application logic with Firebase
├── kyc.js                  # KYC system with camera capture
├── firebase-config.js      # Firebase SDK initialization
├── modules/
│   ├── auth.js             # Authentication module
│   ├── firestore.js        # Database operations
│   └── storage.js          # File upload operations
├── admin.html              # Admin dashboard for KYC management
├── admin.js                # Admin panel logic
├── server.js               # Express backend with Firebase Admin
├── package.json            # Node.js dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

## 🚀 Features

### Authentication
- Email/password registration and login
- Password strength indicator
- Email verification
- Secure session management

### Wallet System
- Non-custodial PCH Wallet
- Passphrase and biometric unlock
- Deposit/Withdraw functionality
- Transaction history

### Staking
- 4 staking pools (7 days to 5 years)
- APY rates from 15% to 125%
- Real-time earnings calculation
- Active positions tracking

### KYC Verification
- Document upload (ID, passport, driver's license)
- Live camera capture for selfie
- Admin approval workflow
- Firebase Storage integration

### Airdrop System
- Daily attendance rewards
- Referral program (5 PCH per friend)
- Social media tasks (Discord, Telegram, X)
- Streak bonuses

## 🔧 Setup Instructions

### 1. Firebase Configuration

Your Firebase project is already configured with:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAeE5T0Q0PQkQMouPlvcIsOvI3l9BgkwNA",
  authDomain: "pocketchain-e1f91.firebaseapp.com",
  projectId: "pocketchain-e1f91",
  storageBucket: "pocketchain-e1f91.firebasestorage.app",
  messagingSenderId: "514803824047",
  appId: "1:514803824047:web:51fa9d02ee389f072c6b5a"
};
```

### 2. Backend Setup

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials
# Add Firebase Admin service account or credentials

# Start server
npm start

# Or for development with auto-reload
npm run dev
```

### 3. Firebase Admin Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (pocketchain-e1f91)
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Save the JSON file as `config/firebase-service-account.json`
6. Update `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env`

### 4. Firestore Database Setup

Create the following collections in Firestore:

#### users
```
- uid (string)
- firstName (string)
- lastName (string)
- email (string)
- balancePCH (number)
- isVerified (boolean)
- isAdmin (boolean)
- referralCode (string)
- walletAddress (string, optional)
- createdAt (timestamp)
- updatedAt (timestamp)
```

#### kyc_submissions
```
- userId (string)
- fullName (string)
- birthDate (string)
- nationality (string)
- idType (string)
- idNumber (string)
- address (string)
- city (string)
- country (string)
- phone (string)
- idUrl (string)
- selfieUrl (string)
- status (string: pending/verified/rejected)
- submittedAt (timestamp)
- reviewedAt (timestamp, optional)
- reviewedBy (string, optional)
- rejectionReason (string, optional)
```

#### stakes
```
- userId (string)
- amount (number)
- apy (number)
- period (number)
- startDate (timestamp)
- unlockDate (timestamp)
- status (string: active/completed)
- claimed (boolean)
- earnings (number)
```

#### transactions
```
- userId (string)
- type (string)
- amount (number)
- description (string)
- status (string)
- txHash (string, optional)
- createdAt (timestamp)
```

#### attendance
```
- userId (string)
- streak (number)
- totalClaims (number)
- lastClaim (timestamp)
- history (array)
```

### 5. Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /kyc_documents/{userId}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /kyc_selfies/{userId}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 6. Firebase Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
    }
    match /kyc_submissions/{docId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.token.admin == true;
    }
    match /stakes/{docId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    match /transactions/{docId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /attendance/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🔐 Admin Panel

Access the admin panel at `/admin.html`

**Default Credentials:**
- Username: `Masterghed`
- Password: `PocketChain`

**Admin Features:**
- View pending KYC submissions
- Approve/reject KYC applications
- View user statistics
- View uploaded documents and selfies

## 📱 Pages

| Page | Description | Access |
|------|-------------|--------|
| Home | Landing page with hero section | Public |
| Tokenomics | Token distribution and chart | Public |
| FAQ | Frequently asked questions | Public |
| Whitepaper | Project documentation | Public |
| PCH Wallet | User wallet management | Private |
| Staking Pro | Staking pools and positions | Private |
| Live Market | Token metrics and charts | Private |
| Airdrop | Daily rewards and referrals | Private |
| Account | Profile and KYC | Private |
| Support | Help and bug reporting | Private |
| Terms | Terms and policies | Public |

## 🔌 API Endpoints

### Public
- `GET /api/health` - Health check
- `GET /api/price` - Token price
- `GET /api/info` - Platform info

### Protected (requires auth token)
- `GET /api/user/:uid` - Get user data
- `GET /api/user/:uid/stakes` - Get user stakes
- `GET /api/user/:uid/transactions` - Get user transactions

### Admin (requires admin credentials)
- `GET /api/admin/kyc/pending` - Get pending KYC
- `POST /api/admin/kyc/:id/approve` - Approve KYC
- `POST /api/admin/kyc/:id/reject` - Reject KYC
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Get platform stats

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **Charts**: Chart.js
- **Icons**: Font Awesome 6

## 📝 Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
# OR
FIREBASE_PROJECT_ID=pocketchain-e1f91
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Admin
ADMIN_USERNAME=Masterghed
ADMIN_PASSWORD=PocketChain

# Security
JWT_SECRET=your_secret_key

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 🚀 Deployment

### Static Hosting (Firebase Hosting)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize hosting
firebase init hosting

# Deploy
firebase deploy
```

### Server Deployment (Heroku/Railway/Render)
```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git push origin main

# Connect to hosting platform and deploy
```

## 🔒 Security Considerations

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use strong admin passwords** - Change default credentials
3. **Enable Firebase App Check** - Prevent abuse
4. **Set up Firestore security rules** - Protect user data
5. **Use HTTPS in production** - Encrypt all communications
6. **Rate limiting** - Prevent brute force attacks

## 🐛 Troubleshooting

### Firebase not initializing
- Check your Firebase configuration
- Verify service account credentials
- Check Firestore rules

### KYC uploads failing
- Verify Storage rules allow writes
- Check file size limits (max 5MB)
- Ensure camera permissions are granted

### Authentication issues
- Check Firebase Auth is enabled
- Verify email/password sign-in method is enabled
- Check browser console for errors

## 📞 Support

For support and bug reporting:
- Email: support@pocketchain.network
- Discord: [Join our community]
- Telegram: [@PocketChain]

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ by the PocketChain Team**
