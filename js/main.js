// main.js

// Global variables
let currentUser = null;
let users = []; // Will store user data
let items = []; // Will store auction items
let filteredItems = []; // For search functionality
let notifications = []; // Store notifications for users
let soldItems = []; // Store sold items

let adminAccount = {
    email: "admin@gmail.com",
    password: "123456",
    name: "Admin",
    isAdmin: true,
    balance: 0
};

// Commission rates
const SELLER_COMMISSION_RATE = 0.05; // 5%

// #region UTILITY FUNCTIONS
// ----------------------------------------------------------------

function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function formatDisplayDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'block';
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// #endregion

// #region INITIALIZATION & SETUP
// ----------------------------------------------------------------

function initLocalStorage() {
    // Add default data to localStorage if it's empty
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([adminAccount]));
        localStorage.setItem('items', JSON.stringify([]));
        localStorage.setItem('soldItems', JSON.stringify([]));
        localStorage.setItem('notifications', JSON.stringify([]));
    }
    
    // Load data from localStorage into global variables
    users = JSON.parse(localStorage.getItem('users')) || [];
    items = JSON.parse(localStorage.getItem('items')) || [];
    filteredItems = [...items];
    notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    soldItems = JSON.parse(localStorage.getItem('soldItems')) || [];
    
    // Ensure admin account exists
    if (!users.some(u => u.email === adminAccount.email)) {
        users.push(adminAccount);
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    // Check for a logged-in user session
    const loggedInUser = localStorage.getItem('currentUser');
    if (loggedInUser) {
        currentUser = JSON.parse(loggedInUser);
    }
}

function setupNavigation() {
    // --- Setup event listeners for elements common to all pages ---
    
    // Auth buttons
    document.getElementById('login-btn')?.addEventListener('click', () => showModal('login-modal'));
    document.getElementById('signup-btn')?.addEventListener('click', () => showModal('signup-modal'));
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    
    // User avatar for profile
    document.getElementById('user-avatar')?.addEventListener('click', showProfile);
    
    // Notification bell
    const notificationBell = document.getElementById('notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('notification-dropdown');
            dropdown.classList.toggle('show');
            loadUserNotifications();
        });
        document.addEventListener('click', () => {
            document.getElementById('notification-dropdown')?.classList.remove('show');
        });
        document.getElementById('clear-notifications-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            markAllNotificationsAsRead();
        });
    }
    
    // Modal close buttons
    document.getElementById('close-login')?.addEventListener('click', () => hideModal('login-modal'));
    document.getElementById('close-signup')?.addEventListener('click', () => hideModal('signup-modal'));
    document.getElementById('close-item-detail')?.addEventListener('click', () => hideModal('item-detail-modal'));
    document.getElementById('close-profile')?.addEventListener('click', () => hideModal('profile-modal'));
    document.getElementById('close-payment')?.addEventListener('click', () => hideModal('payment-modal'));
    document.getElementById('payment-done-btn')?.addEventListener('click', () => hideModal('payment-modal'));
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Switch between login/signup modals
    document.getElementById('switch-to-signup')?.addEventListener('click', (e) => { e.preventDefault(); hideModal('login-modal'); showModal('signup-modal'); });
    document.getElementById('switch-to-login')?.addEventListener('click', (e) => { e.preventDefault(); hideModal('signup-modal'); showModal('login-modal'); });
    
    // Profile tabs
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.profile-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`)?.classList.add('active');
        });
    });
    
    // Admin tabs
     document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`)?.classList.add('active');
        });
    });

    // Form submissions
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('signup-form')?.addEventListener('submit', handleSignup);
    document.getElementById('sell-form')?.addEventListener('submit', handleSellItem);
    document.getElementById('payment-form')?.addEventListener('submit', handlePayment);
    
    // --- Page-specific listeners ---
    document.getElementById('item-image')?.addEventListener('change', handleImagePreview);
    document.getElementById('search-btn')?.addEventListener('click', handleSearch);
    document.getElementById('search-input')?.addEventListener('keypress', e => { if (e.key === 'Enter') handleSearch(); });
    document.getElementById('apply-user-filter')?.addEventListener('click', loadUsersTable);
    document.getElementById('apply-sold-filter')?.addEventListener('click', loadSoldItemsTable);
    
    // Admin action buttons (delegated to document)
    document.addEventListener('click', function(e) {
        const button = e.target.closest('button');
        if (!button) return;

        if (button.matches('.ban-btn, .edit-btn')) {
            const userId = button.dataset.userId;
            if (userId) toggleUserBan(userId);
        }
        if (button.matches('.delete-btn')) {
            const userId = button.dataset.userId;
            const itemId = button.dataset.itemId;
            if (userId) deleteUser(userId);
            if (itemId) deleteItem(itemId);
        }
    });
}

/**
 * Main initialization function. Runs on every page load.
 * Determines which page is active and calls the relevant functions.
 */
function init() {
    initLocalStorage();
    setupNavigation();
    updateAuthUI();

    // Determine the current page and run page-specific code
    const currentPage = window.location.pathname;

    if (currentPage.endsWith('/') || currentPage.endsWith('index.html')) {
        // --- Code for Home Page ---
        loadItems('featured');
        loadItems('trending');
    } else if (currentPage.endsWith('browse.html')) {
        // --- Code for Browse Page ---
        loadItems('all');
    } else if (currentPage.endsWith('admin.html')) {
        // --- Code for Admin Page ---
        if (currentUser && currentUser.email === adminAccount.email) {
            loadAdminDashboard();
        } else {
            // Protect page and redirect non-admins
            alert('Access Denied. You must be an admin to view this page.');
            window.location.href = 'index.html'; 
        }
    }
    // 'sell.html' and 'about.html' don't need any special JS to run on page load.

    // Start global timers that run on all pages
    setInterval(checkExpiredAuctions, 30000); // Check every 30 seconds
    setInterval(updateCountdownTimers, 1000);
}

// Start the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

// #endregion