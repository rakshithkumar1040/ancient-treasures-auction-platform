// notifications.js

function showNotification(message, type = "success", onClick = null) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle',
        admin: 'fa-user-shield'
    };
    
    notification.innerHTML = `
        <i class="fas ${iconMap[type] || 'fa-info-circle'}"></i>
        <span>${message}</span>
        <span class="notification-close">&times;</span>
    `;
    
    document.getElementById('notification-area').appendChild(notification);

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notification.remove();
    });

    if (onClick) {
        notification.style.cursor = 'pointer';
        notification.addEventListener('click', () => {
            onClick();
            notification.remove();
        });
    }
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

function loadUserNotifications() {
    if (!currentUser) return;
    const container = document.getElementById('notifications-list');
    container.innerHTML = '';
    
    const userNotifications = notifications
        .filter(n => n.userId === currentUser.email)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (userNotifications.length === 0) {
        container.innerHTML = '<div class="notification-item"><p>No new notifications.</p></div>';
        return;
    }
    
    userNotifications.forEach(n => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.innerHTML = `<div class="notification-content"><div>${n.message}</div><div class="notification-date">${new Date(n.date).toLocaleString()}</div></div>`;
        container.appendChild(item);
    });
}

function updateNotificationBadge() {
    if (!currentUser) return;
    const badge = document.getElementById('notification-badge');
    if (!badge) return;
    
    const unreadCount = notifications.filter(n => n.userId === currentUser.email && !n.read).length;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function createUserNotification(userId, message, type = "info") {
    notifications.push({
        id: generateId(),
        userId,
        message,
        date: new Date().toISOString(),
        read: false,
        type
    });
    localStorage.setItem('notifications', JSON.stringify(notifications));
    if (currentUser && currentUser.email === userId) {
        updateNotificationBadge();
    }
}

function markAllNotificationsAsRead() {
    if (!currentUser) return;
    notifications.forEach(n => {
        if (n.userId === currentUser.email) n.read = true;
    });
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateNotificationBadge();
    loadUserNotifications();
}

function checkUserNotifications() {
    if (!currentUser) return;
    const unread = notifications.filter(n => n.userId === currentUser.email && !n.read);
    unread.forEach(n => {
        showNotification(n.message, n.type);
        n.read = true;
    });
    if (unread.length > 0) {
        localStorage.setItem('notifications', JSON.stringify(notifications));
        updateNotificationBadge();
    }
}

function checkWonAuctions() {
    if (!currentUser) return;
    const wonUnpaidItems = soldItems.filter(item => item.highestBidder === currentUser.email && !item.paid);
    const key = `viewedWonItems-${currentUser.email}`;
    const viewedItems = JSON.parse(localStorage.getItem(key)) || [];
    
    const newWins = wonUnpaidItems.filter(item => !viewedItems.includes(item.id));

    if (newWins.length > 0) {
        showNotification(
            `You have ${newWins.length} new auction win(s)! Click to pay.`, 
            "info",
            () => {
                window.location.href = 'index.html'; // Or a dedicated profile page
                setTimeout(showProfile, 100); // Small delay to ensure page context is ready
            }
        );
        const newViewedItems = [...viewedItems, ...newWins.map(item => item.id)];
        localStorage.setItem(key, JSON.stringify(newViewedItems));
    }
}