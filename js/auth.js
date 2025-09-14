// auth.js

// #region AUTHENTICATION & UI
// ----------------------------------------------------------------

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        if (user.banned) {
            errorElement.textContent = 'This account has been banned. Please contact support.';
            errorElement.style.display = 'block';
            return;
        }
        
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        hideModal('login-modal');
        updateAuthUI();
        document.getElementById('login-form').reset();
        errorElement.style.display = 'none';
        
        // Initial checks on login
        checkUserNotifications();
        checkWonAuctions();
        
        showNotification(`Welcome back, ${user.name}!`);
    } else {
        errorElement.textContent = 'Invalid email or password';
        errorElement.style.display = 'block';
    }
}

function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    const errorElement = document.getElementById('signup-error');
    const successElement = document.getElementById('signup-success');
    
    if (password !== confirmPassword) {
        errorElement.textContent = 'Passwords do not match';
        errorElement.style.display = 'block';
        return;
    }
    if (password.length < 6) {
        errorElement.textContent = 'Password must be at least 6 characters';
        errorElement.style.display = 'block';
        return;
    }
    if (users.some(u => u.email === email)) {
        errorElement.textContent = 'Email already in use';
        errorElement.style.display = 'block';
        return;
    }
    
    const newUser = {
        id: generateId(),
        name,
        email,
        password,
        banned: false,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    errorElement.style.display = 'none';
    successElement.textContent = 'Account created successfully! Logging you in...';
    successElement.style.display = 'block';
    
    setTimeout(() => {
        currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        hideModal('signup-modal');
        updateAuthUI();
        document.getElementById('signup-form').reset();
        successElement.style.display = 'none';
        showNotification(`Welcome to Ancient Treasures, ${newUser.name}!`);
    }, 1500);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    // Redirect to home page after logout
    window.location.href = 'index.html';
}

function updateAuthUI() {
    const authButtons = document.querySelector('.auth-buttons');
    const userPanel = document.querySelector('.user-panel');
    const adminDashboardLink = document.getElementById('admin-dashboard-link');

    if (currentUser) {
        // User is logged in
        authButtons.style.display = 'none';
        userPanel.style.display = 'flex';
        document.getElementById('username-display').textContent = currentUser.name;
        
        const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('user-avatar').textContent = initials;
        
        // Show admin dashboard link if user is admin
        if (adminDashboardLink) {
             adminDashboardLink.style.display = (currentUser.email === adminAccount.email) ? 'block' : 'none';
        }
        updateNotificationBadge();
    } else {
        // User is logged out
        authButtons.style.display = 'flex';
        userPanel.style.display = 'none';
        if (adminDashboardLink) adminDashboardLink.style.display = 'none';
    }
}

// #endregion

// #region USER PROFILE
// ----------------------------------------------------------------

window.showProfile = function() {
    if (!currentUser) return;
    
    // Set profile info
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-email').textContent = currentUser.email;
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('profile-avatar').textContent = initials;
    
    // --- Load Bid History ---
    const bidHistoryContainer = document.getElementById('bid-history');
    bidHistoryContainer.innerHTML = '';
    
    const allBids = [];
    const itemsWithBids = [...items, ...soldItems];

    itemsWithBids.forEach(item => {
        if(item.bids) {
            item.bids.forEach(bid => {
                if (bid.bidder === currentUser.email) {
                    allBids.push({ item, bid });
                }
            });
        }
    });

    // Remove duplicates and sort by date
    const uniqueBids = Array.from(new Set(allBids.map(a => a.bid.date)))
        .map(date => allBids.find(a => a.bid.date === date))
        .sort((a, b) => new Date(b.bid.date) - new Date(a.bid.date));

    if (uniqueBids.length === 0) {
        bidHistoryContainer.innerHTML = '<p>You have not placed any bids yet.</p>';
    } else {
        uniqueBids.forEach(({ item, bid }) => {
            const isEnded = isAuctionEnded(item);
            let status = 'outbid';
            if (isEnded) {
                status = item.highestBidder === currentUser.email ? 'won' : 'lost';
            } else {
                status = item.highestBidder === currentUser.email ? 'winning' : 'outbid';
            }

            const bidItem = document.createElement('div');
            bidItem.className = 'bid-history-item';
            bidItem.innerHTML = `
                <div class="bid-item-info">
                    <h4 onclick="showItemDetail('${item.id}')" style="cursor: pointer;">${item.name}</h4>
                    <small>Your bid on ${new Date(bid.date).toLocaleString()}</small>
                </div>
                <div class="bid-item-price">${formatCurrency(bid.amount)}</div>
                <div class="bid-status ${status}">${status}</div>
            `;
            bidHistoryContainer.appendChild(bidItem);
        });
    }

    // --- Load Won Items ---
    const wonItemsContainer = document.getElementById('won-items-list');
    wonItemsContainer.innerHTML = '';
    
    const wonItems = soldItems
        .filter(item => item.highestBidder === currentUser.email)
        .sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
    
    if (wonItems.length === 0) {
        wonItemsContainer.innerHTML = '<p>You have not won any items yet.</p>';
    } else {
        wonItems.forEach(item => {
            const wonItem = document.createElement('div');
            wonItem.className = 'won-item';
            wonItem.innerHTML = `
                <div class="won-item-info">
                    <h4 onclick="showItemDetail('${item.id}')" style="cursor: pointer;">${item.name}</h4>
                    <small>Won on ${formatDisplayDate(item.endDate)}</small>
                </div>
                <div class="won-item-price">${formatCurrency(item.currentBid)}</div>
                <div>
                    ${item.paid 
                        ? `<span class="payment-status paid">Paid</span>` 
                        : `<button class="btn btn-primary" onclick="initiatePayment('${item.id}')">Pay Now</button>`
                    }
                </div>
            `;
            wonItemsContainer.appendChild(wonItem);
        });
    }
    
    // Activate the first tab by default
    document.querySelectorAll('.profile-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.profile-content').forEach(content => content.classList.remove('active'));
    document.querySelector('.profile-tab[data-tab="bids"]').classList.add('active');
    document.getElementById('bids-tab').classList.add('active');
    
    showModal('profile-modal');
}

function isAuctionEnded(item) {
    return new Date(item.endDate) < new Date();
}

// #endregion