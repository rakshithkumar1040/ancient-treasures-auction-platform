// items.js

// #region ITEM DISPLAY & LOADING
// ----------------------------------------------------------------

function loadItems(section) {
    let container;
    if (section === 'featured') container = document.getElementById('featured-items');
    else if (section === 'trending') container = document.getElementById('trending-items');
    else container = document.getElementById('all-items');

    if (!container) return;
    container.innerHTML = '';

    const activeItems = items.filter(item => !isAuctionEnded(item) && !item.hidden);
    let displayItems = [];

    if (section === 'featured') {
        displayItems = activeItems.slice(0, 4);
    } else if (section === 'trending') {
        displayItems = [...activeItems].sort((a, b) => (b.bids?.length || 0) - (a.bids?.length || 0)).slice(0, 4);
    } else {
        displayItems = filteredItems.filter(item => !isAuctionEnded(item) && !item.hidden);
    }

    if (displayItems.length === 0) {
        container.innerHTML = '<div class="no-results">No active auctions found.</div>';
        return;
    }

    displayItems.forEach(item => {
        container.appendChild(createItemCard(item));
    });
}

function createItemCard(item) {
    const isEnded = isAuctionEnded(item);
    const timeLeft = getTimeLeft(item.endDate);

    const itemCard = document.createElement('div');
    itemCard.className = 'item-card';
    itemCard.setAttribute('data-item-id', item.id);

    let bidContent = '';
    if (isEnded) {
        bidContent = 'Auction ended';
    } else if (!currentUser) {
        bidContent = 'Login to bid';
    } else if (item.seller === currentUser.email) {
        bidContent = 'This is your item';
    }

    itemCard.innerHTML = `
        <img src="${item.imageUrl}" alt="${item.name}" class="item-image" onclick="showItemDetail('${item.id}')">
        <div class="item-content">
            <h3 class="item-title" onclick="showItemDetail('${item.id}')">${item.name}</h3>
            <div class="item-info">
                <p><strong>Time left:</strong> <span class="countdown">${isEnded ? 'Auction ended' : timeLeft}</span></p>
            </div>
            <div class="item-prices">
                <span>Start: ${formatCurrency(item.startingPrice)}</span>
                <span class="current-bid">Current: ${formatCurrency(item.currentBid)}</span>
            </div>
            ${!isEnded && currentUser && item.seller !== currentUser.email ? `
            <form class="bid-form" data-item-id="${item.id}">
                <input type="number" placeholder="Your bid" min="${item.currentBid + 1}" step="1" class="bid-input" required>
                <button type="submit" class="btn btn-primary">Bid</button>
            </form>
            ` : `
            <div style="text-align: center; padding: 10px; background-color: #f5f5f5; border-radius: 4px; font-size: 0.9em;">
                ${bidContent}
            </div>
            `}
        </div>
        ${isEnded ? `<div class="expired-tag">Ended</div>` : ''}
    `;

    const bidForm = itemCard.querySelector('.bid-form');
    if (bidForm) {
        bidForm.addEventListener('submit', handleBid);
    }

    return itemCard;
}

window.showItemDetail = function(itemId) {
    const item = items.find(i => i.id === itemId) || soldItems.find(i => i.id === itemId);
    if (!item) return;

    const detailContent = document.getElementById('item-detail-content');
    if (!detailContent) return;

    const isEnded = isAuctionEnded(item);
    const timeLeft = getTimeLeft(item.endDate);

    let bidContent = '';
    if (isEnded) {
        bidContent = `<p>This auction has ended.</p>${item.highestBidder === currentUser?.email ? '<p><strong>Congratulations! You won this item.</strong></p>' : ''}`;
    } else if (!currentUser) {
        bidContent = '<p>Please login to place a bid.</p>';
    } else if (item.seller === currentUser.email) {
        bidContent = '<p>You cannot bid on your own item.</p>';
    }

    detailContent.innerHTML = `
        <h2>${item.name}</h2>
        <img src="${item.imageUrl}" alt="${item.name}" class="item-detail-image">
        <div class="item-detail-info">
            <div>
                <p><span class="item-detail-label">Category:</span> ${formatCategory(item.category)}</p>
                <p><span class="item-detail-label">Age/Period:</span> ${item.age}</p>
                <p><span class="item-detail-label">Condition:</span> ${formatCondition(item.condition)}</p>
                <p><span class="item-detail-label">Seller:</span> ${item.seller}</p>
            </div>
            <div>
                <p><span class="item-detail-label">Starting Price:</span> ${formatCurrency(item.startingPrice)}</p>
                <p><span class="item-detail-label">Current Bid:</span> ${formatCurrency(item.currentBid)}</p>
                <p><span class="item-detail-label">Auction Ends:</span> ${formatDisplayDate(item.endDate)}</p>
                <p><span class="item-detail-label">Time Left:</span> <span class="countdown">${isEnded ? 'Auction ended' : timeLeft}</span></p>
            </div>
        </div>
        <h3>Description</h3><p>${item.description}</p>
        <h3>Authenticity Information</h3><p>${item.authenticity || 'No additional information provided.'}</p>
        ${!isEnded && currentUser && item.seller !== currentUser.email ? `
        <form class="bid-form" data-item-id="${item.id}" style="margin-top: 20px;">
            <div style="display: flex; gap: 10px;">
                <input type="number" placeholder="Your bid" min="${item.currentBid + 1}" step="1" style="flex: 1; padding: 10px;" required>
                <button type="submit" class="btn btn-primary">Place Bid</button>
            </div>
        </form>
        ` : `<div style="text-align: center; padding: 15px; background-color: #f5f5f5; border-radius: 4px; margin-top: 20px;">${bidContent}</div>`}
    `;

    const bidForm = detailContent.querySelector('.bid-form');
    if (bidForm) bidForm.addEventListener('submit', handleBid);

    showModal('item-detail-modal');
}

// #endregion

// #region BIDDING & SELLING
// ----------------------------------------------------------------

function handleBid(e) {
    e.preventDefault();
    if (!currentUser) { showModal('login-modal'); return; }

    const form = e.target;
    const itemId = form.dataset.itemId;
    const bidInput = form.querySelector('input[type="number"]');
    const bidAmount = parseInt(bidInput.value);
    const item = items.find(i => i.id === itemId);

    if (!item || isNaN(bidAmount)) return;

    if (item.seller === currentUser.email) {
        showNotification("You cannot bid on your own item.", "error");
        return;
    }

    if (bidAmount > item.currentBid) {
        if (item.highestBidder && item.highestBidder !== currentUser.email) {
            createUserNotification(item.highestBidder, `You've been outbid on ${item.name}.`, "warning");
        }

        item.currentBid = bidAmount;
        item.highestBidder = currentUser.email;
        if (!item.bids) item.bids = [];
        item.bids.push({ bidder: currentUser.email, amount: bidAmount, date: new Date().toISOString() });
        localStorage.setItem('items', JSON.stringify(items));

        // Refresh UI
        loadItems('featured');
        loadItems('trending');
        loadItems('all');
        
        showNotification(`Bid of ${formatCurrency(bidAmount)} placed successfully!`, "success");
        form.reset();
        hideModal('item-detail-modal');
    } else {
        showNotification('Your bid must be higher than the current bid.', "error");
    }
}

function handleSellItem(e) {
    e.preventDefault();
    if (!currentUser) { window.location.href = 'index.html'; return; }

    const imageFile = document.getElementById('item-image').files[0];
    if (!imageFile) {
        showNotification('Please upload an image.', "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const newItem = {
            id: generateId(),
            name: document.getElementById('item-name').value,
            category: document.getElementById('item-category').value,
            description: document.getElementById('item-description').value,
            age: document.getElementById('item-age').value,
            condition: document.getElementById('item-condition').value,
            startingPrice: parseInt(document.getElementById('starting-price').value),
            currentBid: parseInt(document.getElementById('starting-price').value),
            highestBidder: null,
            startDate: new Date().toISOString(),
            endDate: new Date(document.getElementById('auction-end').value).toISOString(),
            imageUrl: event.target.result,
            seller: currentUser.email,
            authenticity: document.getElementById('authenticity').value,
            bids: [],
            hidden: false
        };

        items.push(newItem);
        localStorage.setItem('items', JSON.stringify(items));
        
        alert(`Item "${newItem.name}" has been listed for auction!`);
        window.location.href = 'browse.html';
    };
    reader.readAsDataURL(imageFile);
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('image-preview').innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
}

// #endregion

// #region ITEM MANAGEMENT & UTILITIES
// ----------------------------------------------------------------

function checkExpiredAuctions() {
    const now = new Date();
    const endedItems = items.filter(item => new Date(item.endDate) < now);

    if (endedItems.length > 0) {
        endedItems.forEach(item => {
            if (item.highestBidder) {
                const commission = item.currentBid * SELLER_COMMISSION_RATE;
                soldItems.push({ ...item, commission, paid: false });
                createUserNotification(item.highestBidder, `You won the auction for ${item.name}!`, "success");
                createUserNotification(item.seller, `Your item ${item.name} sold for ${formatCurrency(item.currentBid)}.`, "success");
            } else {
                createUserNotification(item.seller, `Your item ${item.name} did not sell.`, "warning");
            }
        });

        items = items.filter(item => new Date(item.endDate) >= now);
        localStorage.setItem('items', JSON.stringify(items));
        localStorage.setItem('soldItems', JSON.stringify(soldItems));

        // Refresh UI if on a relevant page
        if (document.getElementById('featured-items')) loadItems('featured');
        if (document.getElementById('trending-items')) loadItems('trending');
        if (document.getElementById('all-items')) loadItems('all');
        updateNotificationBadge();
    }
}

function updateCountdownTimers() {
    document.querySelectorAll('.countdown').forEach(element => {
        const itemCard = element.closest('.item-card');
        const detailView = element.closest('.item-detail-info');
        let itemId;

        if (itemCard) {
            itemId = itemCard.dataset.itemId;
        } else if (detailView) {
            const form = document.querySelector('#item-detail-modal .bid-form');
            if(form) itemId = form.dataset.itemId;
        }

        if (!itemId) return;
        const item = items.find(i => i.id === itemId);
        if (item) {
            element.textContent = isAuctionEnded(item) ? 'Auction ended' : getTimeLeft(item.endDate);
        }
    });
}

function getTimeLeft(endDateString) {
    const timeLeft = new Date(endDateString) - new Date();
    if (timeLeft <= 0) return 'Auction ended';

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function handleSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    filteredItems = items.filter(item =>
        !item.hidden &&
        (item.name.toLowerCase().includes(searchTerm) ||
         item.description.toLowerCase().includes(searchTerm))
    );
    loadItems('all');
}

function formatCategory(category) {
    const categories = { 'ancient-egypt': 'Ancient Egyptian', 'roman': 'Roman', 'greek': 'Ancient Greek', 'medieval': 'Medieval', 'asian': 'Asian Antiquities', 'mesoamerican': 'Mesoamerican', 'near-east': 'Near Eastern', 'other': 'Other' };
    return categories[category] || category;
}

function formatCondition(condition) {
    const conditions = { 'excellent': 'Excellent', 'good': 'Good', 'fair': 'Fair', 'poor': 'Poor', 'fragments': 'Fragments' };
    return conditions[condition] || condition;
}

// #endregion