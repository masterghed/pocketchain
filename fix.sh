#!/data/data/com.termux/files/usr/bin/bash
clear
echo "🔷 PocketChain Termux Auto-Fixer"
echo "================================="

REPO_DIR="$HOME/pocketchain"
cd "$REPO_DIR" 2>/dev/null || { echo "❌ Walang pocketchain folder"; exit 1; }

echo "🔧 Nag-a-apply ng fixes..."

# FIX 1: Gawin ang modules/ folder
mkdir -p modules
[ -f "auth.js" ] && cp auth.js modules/auth.js && echo "✅ modules/auth.js"
[ -f "firestore.js" ] && cp firestore.js modules/firestore.js && echo "✅ modules/firestore.js"
[ -f "storage.js" ] && cp storage.js modules/storage.js && echo "✅ modules/storage.js"

# FIX 2: Dagdag missing functions sa dulo ng app.js
cat >> app.js << 'APPEOF'

// === AUTO-FIXED BY TERMUX SCRIPT ===
window.copyDepositAddress = () => {
    const address = document.getElementById('depositAddress')?.value;
    if (address && address !== 'Not connected' && address !== '') {
        navigator.clipboard.writeText(address).then(() => {
            showToast('Copied!', 'Wallet address copied to clipboard');
        }).catch(() => {
            showToast('Error', 'Failed to copy', 'error');
        });
    } else {
        showToast('Error', 'No wallet address available', 'error');
    }
};

window.loadTransactionHistory = async () => {
    if (!AppState.currentUser) return;
    try {
        const { getUserTransactions } = await import('./modules/firestore.js');
        const transactions = await getUserTransactions(AppState.currentUser.uid, 20);
        const container = document.getElementById('transactionHistory');
        if (!container) return;
        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exchange-alt"></i><p>No transactions yet</p></div>';
            return;
        }
        container.innerHTML = transactions.map(tx => {
            const date = tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : 'Recently';
            const isPositive = tx.amount > 0;
            const color = isPositive ? 'var(--secondary)' : 'var(--danger)';
            const sign = isPositive ? '+' : '';
            return '<div class="info-row" style="margin-bottom:8px;align-items:center;"><div style="flex:1;"><div style="font-weight:600;font-size:0.9rem;">' + (tx.type || 'Transaction') + '</div><div style="font-size:0.75rem;color:var(--text-muted);">' + (tx.description || '') + ' • ' + date + '</div></div><div style="color:' + color + ';font-weight:700;font-size:0.95rem;">' + sign + tx.amount + ' PCH</div></div>';
        }).join('');
    } catch (e) { console.error('TX load error:', e); }
};

setInterval(() => {
    if (AppState.currentUser && document.getElementById('asset')?.classList.contains('active')) {
        if (!window._txLoaded) { window._txLoaded = true; loadTransactionHistory(); }
    } else { window._txLoaded = false; }
}, 2000);
APPEOF

echo "✅ app.js updated with missing functions"

# FIX 3: Admin timestamp fix
if [ -f "admin.js" ]; then
    sed -i 's/serverTimestamp/serverTimestamp,\n    Timestamp/g' admin.js
    sed -i 's/where("reviewedAt", ">=", today)/where("reviewedAt", ">=", Timestamp.fromDate(today))/g' admin.js
    echo "✅ admin.js timestamp fixed"
fi

# FIX 4: Export Timestamp
if [ -f "firebase-config.js" ]; then
    sed -i 's|getFirestore, getDocs, increment, serverTimestamp|getFirestore, getDocs, increment, serverTimestamp, Timestamp|g' firebase-config.js
    echo "✅ firebase-config.js updated"
fi

# FIX 5: .gitignore
if [ ! -f ".gitignore" ]; then
    echo -e "node_modules/\n.env\n*.log" > .gitignore
    echo "✅ .gitignore created"
fi

echo ""
echo "📤 Commit & Push..."
git add -A
git commit -m "🔧 Auto-fix: modules folder, missing functions, timestamp fixes" || echo "⚠️ Walang bagong changes"
git push origin main && echo "✅ SUCCESS! Na-push na || echo "❌ Push failed. Baka kailangan ng token."
