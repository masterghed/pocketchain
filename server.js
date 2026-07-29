// ==========================================
// POCKETCHAIN - EXPRESS SERVER
// Backend API with Firebase Admin Integration
// ==========================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Firebase Admin SDK
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==========================================
// FIREBASE ADMIN INITIALIZATION
// ==========================================
let firebaseInitialized = false;

try {
  // Check if service account file exists
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'pocketchain-e1f91.firebasestorage.app'
    });
    console.log('✅ Firebase Admin initialized with service account file');
  } else if (process.env.FIREBASE_PRIVATE_KEY) {
    // Use environment variables
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'pocketchain-e1f91.firebasestorage.app'
    });
    console.log('✅ Firebase Admin initialized with environment variables');
  } else {
    console.warn('⚠️ Firebase Admin not configured. Some features may not work.');
    console.warn('Please set FIREBASE_SERVICE_ACCOUNT_PATH or Firebase credentials in .env');
  }
  
  firebaseInitialized = true;
} catch (error) {
  console.error('❌ Firebase Admin initialization error:', error.message);
  console.warn('Running in limited mode without Firebase Admin');
}

// Get Firestore and Auth instances
const db = firebaseInitialized ? admin.firestore() : null;
const auth = firebaseInitialized ? admin.auth() : null;
const storage = firebaseInitialized ? admin.storage() : null;

// ==========================================
// EXPRESS APP SETUP
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://*.firebaseio.com", "https://*.googleapis.com", "wss://*.firebaseio.com"],
    }
  }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(join(__dirname, '.')));

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================
const verifyToken = async (req, res, next) => {
  if (!firebaseInitialized) {
    return res.status(503).json({ error: 'Firebase not initialized' });
  }
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin authentication middleware
const verifyAdmin = async (req, res, next) => {
  const { username, password } = req.headers;
  
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  
  if (username !== adminUsername || password !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    firebaseInitialized,
    version: '1.0.0'
  });
});

// Get user data
app.get('/api/user/:uid', verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;
    
    // Verify user can only access their own data
    if (req.user.uid !== uid && !req.user.admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      data: userDoc.data()
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user stakes
app.get('/api/user/:uid/stakes', verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;
    
    if (req.user.uid !== uid && !req.user.admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const stakesSnapshot = await db.collection('stakes')
      .where('userId', '==', uid)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .get();
    
    const stakes = stakesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: stakes
    });
  } catch (error) {
    console.error('Get stakes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user transactions
app.get('/api/user/:uid/transactions', verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    if (req.user.uid !== uid && !req.user.admin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const txSnapshot = await db.collection('transactions')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    const transactions = txSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// Get pending KYC submissions
app.get('/api/admin/kyc/pending', verifyAdmin, async (req, res) => {
  try {
    const kycSnapshot = await db.collection('kyc_submissions')
      .where('status', '==', 'pending')
      .orderBy('submittedAt', 'desc')
      .get();
    
    const submissions = kycSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Get pending KYC error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve KYC
app.post('/api/admin/kyc/:id/approve', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    await db.collection('kyc_submissions').doc(id).update({
      status: 'verified',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: 'admin'
    });
    
    await db.collection('users').doc(userId).update({
      isVerified: true
    });
    
    res.json({
      success: true,
      message: 'KYC approved successfully'
    });
  } catch (error) {
    console.error('Approve KYC error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject KYC
app.post('/api/admin/kyc/:id/reject', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    await db.collection('kyc_submissions').doc(id).update({
      status: 'rejected',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectionReason: reason
    });
    
    res.json({
      success: true,
      message: 'KYC rejected'
    });
  } catch (error) {
    console.error('Reject KYC error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get platform statistics
app.get('/api/admin/stats', verifyAdmin, async (req, res) => {
  try {
    const [usersSnapshot, stakesSnapshot, kycSnapshot] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('stakes').where('status', '==', 'active').count().get(),
      db.collection('kyc_submissions').where('status', '==', 'pending').count().get()
    ]);
    
    res.json({
      success: true,
      data: {
        totalUsers: usersSnapshot.data().count,
        activeStakes: stakesSnapshot.data().count,
        pendingKYC: kycSnapshot.data().count
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Get token price (mock - replace with real API)
app.get('/api/price', (req, res) => {
  res.json({
    success: true,
    data: {
      price: 0.0452,
      change24h: 5.23,
      volume24h: 2400000,
      marketCap: 45200000
    }
  });
});

// Get platform info
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'PocketChain',
      symbol: 'PCH',
      totalSupply: 1000000000,
      stakingPools: [
        { period: 7, apy: 15, minAmount: 100 },
        { period: 180, apy: 45, minAmount: 1000 },
        { period: 365, apy: 85, minAmount: 5000 },
        { period: 1825, apy: 125, minAmount: 10000 }
      ]
    }
  });
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🔷 POCKETCHAIN DEFI PLATFORM                            ║
║                                                            ║
║   Server running on: http://localhost:${PORT}              ║
║   Firebase Admin: ${firebaseInitialized ? '✅ Connected' : '⚠️ Not Connected'}                     ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
