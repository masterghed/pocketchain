#!/bin/bash

echo "🚀 Starting PocketChain Staking Fix Script..."

# 1. Update app.js local code logic for staking rendering
cat << 'APP_JS_PATCH' > patch_staking.js
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
APP_JS_PATCH

# Append logic to app.js if not present
if ! grep -q "renderActiveStakes" app.js; then
    cat patch_staking.js >> app.js
    rm patch_staking.js
    echo "✅ Patched app.js with Active Position listener!"
else
    echo "⚡ Patch already exists in app.js."
    rm patch_staking.js
fi

# 2. Git Commit and Push
echo "📤 Committing and pushing fixes to GitHub..."
git add .
git commit -m "Fix: Automated real-time Active Positions rendering for Staking"
git push origin main || git push origin master

echo "🎉 Done! Check your live site in 1-2 minutes."
