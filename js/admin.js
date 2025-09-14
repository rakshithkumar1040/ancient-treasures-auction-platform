// admin.js

// #region PAYMENT
// ----------------------------------------------------------------

window.initiatePayment = function(itemId) {
    const item = soldItems.find(item => item.id === itemId);
    if (!item) return;
    
    document.getElementById('payment-form-container').style.display = 'block';
    document.getElementById('payment-success').style.display = 'none';
    
    document.getElementById('payment-item-details').innerHTML = `<p><strong>Item:</strong> ${item.name}</p><p><strong>Price:</strong> ${formatCurrency(item.currentBid)}</p>`;
    document.getElementById('payment-total').textContent = `Total: ${formatCurrency(item.currentBid)}`;
    document.getElementById('payment-form').setAttribute('data-item-id', itemId);
    
    showModal('payment-modal');
}

function handlePayment(e) {
    e.preventDefault();
    const form = e.target;
    const itemId = form.dataset.itemId;
    
    const itemIndex = soldItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;

    soldItems[itemIndex].paid = true;
    soldItems[itemIndex].paymentDate = new Date().toISOString();
    soldItems[itemIndex].shippingAddress = document.getElementById('shipping-address').value;
    localStorage.setItem('soldItems', JSON.stringify(soldItems));

    document.getElementById('payment-form-container').style.display = 'none';
    document.getElementById('payment-success').style.display = 'block';

    createUserNotification(currentUser.email, `Payment for ${soldItems[itemIndex].name} was successful.`, "success");
    createUserNotification(soldItems[itemIndex].seller, `Payment received for ${soldItems[itemIndex].name}. Please prepare for shipping.`, "success");
    
    updateNotificationBadge();
    showProfile(); // Re-render profile modal to show "Paid" status
}

// #endregion

// #region ADMIN DASHBOARD
// ----------------------------------------------------------------

function loadAdminDashboard() {
    // Update stats
    document.getElementById('total-users').textContent = users.length - 1; // Exclude admin
    document.getElementById('active-auctions').textContent = items.filter(item => !isAuctionEnded(item)).length;

    const totalRevenue = soldItems.reduce((total, item) => total + (item.commission || 0), 0);
    document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue);

    // Load tables
    loadUsersTable();
    loadAdminAuctionsTable();
    loadSoldItemsTable();

    // Activate the first tab by default
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.admin-content').forEach(content => content.classList.remove('active'));
    document.querySelector('.admin-tab[data-tab="users"]').classList.add('active');
    document.getElementById('users-tab').classList.add('active');
}

function loadUsersTable() {
    const usersTableBody = document.getElementById('users-table');
    if (!usersTableBody) return;
    usersTableBody.innerHTML = '';
    
    const filteredUsers = users.filter(user => user.email !== adminAccount.email);
    if (filteredUsers.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
        return;
    }

    filteredUsers.forEach(user => {
        const row = usersTableBody.insertRow();
        row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="payment-status ${user.banned ? 'pending' : 'paid'}">${user.banned ? 'Banned' : 'Active'}</span></td>
            <td>
                <button class="action-btn ${user.banned ? 'edit-btn' : 'ban-btn'}" data-user-id="${user.email}">
                    ${user.banned ? 'Unban' : 'Ban'}
                </button>
                <button class="action-btn delete-btn" data-user-id="${user.email}">Delete</button>
            </td>
        `;
    });
}

function loadAdminAuctionsTable() {
    const auctionsTableBody = document.getElementById('auctions-table');
    if (!auctionsTableBody) return;
    auctionsTableBody.innerHTML = '';

    const liveAuctions = items.filter(item => !isAuctionEnded(item));
    if (liveAuctions.length === 0) {
        auctionsTableBody.innerHTML = '<tr><td colspan="5">No live auctions.</td></tr>';
        return;
    }

    liveAuctions.forEach(item => {
        const row = auctionsTableBody.insertRow();
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.seller}</td>
            <td>${formatCurrency(item.currentBid)}</td>
            <td>${formatDisplayDate(item.endDate)}</td>
            <td><button class="action-btn delete-btn" data-item-id="${item.id}">Delete</button></td>
        `;
    });
}

function loadSoldItemsTable() {
    const soldItemsTableBody = document.getElementById('sold-items-table');
    if (!soldItemsTableBody) return;
    soldItemsTableBody.innerHTML = '';

    if (soldItems.length === 0) {
        soldItemsTableBody.innerHTML = '<tr><td colspan="6">No items have been sold.</td></tr>';
        return;
    }

    soldItems.forEach(item => {
        const row = soldItemsTableBody.insertRow();
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.seller}</td>
            <td>${item.highestBidder}</td>
            <td>${formatCurrency(item.currentBid)}</td>
            <td>${formatCurrency(item.commission)}</td>
            <td><span class="payment-status ${item.paid ? 'paid' : 'pending'}">${item.paid ? 'Paid' : 'Pending'}</span></td>
        `;
    });
}

// #endregion

// #region ADMIN ACTIONS
// ----------------------------------------------------------------

function toggleUserBan(userEmail) {
    const user = users.find(u => u.email === userEmail);
    if (!user) return;
    
    user.banned = !user.banned;
    localStorage.setItem('users', JSON.stringify(users));
    
    createUserNotification(userEmail, `An admin has ${user.banned ? 'banned' : 'unbanned'} your account.`, user.banned ? "error" : "success");
    showNotification(`User has been ${user.banned ? 'banned' : 'unbanned'}.`, "admin");
    loadUsersTable();
}

function deleteUser(userEmail) {
    if (confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
        users = users.filter(u => u.email !== userEmail);
        localStorage.setItem('users', JSON.stringify(users));
        
        // Optionally, handle items listed by the deleted user
        items = items.filter(item => item.seller !== userEmail);
        localStorage.setItem('items', JSON.stringify(items));
        
        showNotification('User deleted successfully.', "admin");
        loadAdminDashboard();
    }
}

function deleteItem(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (confirm(`Are you sure you want to delete the item "${item.name}"?`)) {
        createUserNotification(item.seller, `Your item "${item.name}" was removed by an administrator.`, "warning");
        
        items = items.filter(i => i.id !== itemId);
        localStorage.setItem('items', JSON.stringify(items));
        
        showNotification('Item deleted successfully.', "admin");
        loadAdminDashboard();
    }
}

// #endregion