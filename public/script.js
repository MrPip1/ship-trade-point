// Global state management
let currentUser = null;
let registeredUsers = []; // Store all registered users
let ships = [];
let filteredShips = [];
let userFavorites = [];
let userWishlist = [];
let userPurchases = [];
let userListings = [];
let availableTags = new Set(); // Dynamic tags from ship listings
let customSearchTags = new Set(); // Custom tags added by users
let messages = []; // Chat messages between buyers and sellers

// Admin system
let isAdmin = false;
const ADMIN_EMAIL = 'froggy.gaming.gg@gmail.com';

// Ship data (starts empty for production)
const sampleShips = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadSampleData();
    renderShips();
});

function initializeApp() {
    // Load registered users
    registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    
    // Load current user data from localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        isAdmin = currentUser.email === ADMIN_EMAIL;
        currentUser.isAdmin = isAdmin;
        updateAuthUI();
    }
    
    // Load ships from localStorage
    ships = JSON.parse(localStorage.getItem('ships') || '[]');
    filteredShips = [...ships];
    
    // Load user preferences
    userFavorites = JSON.parse(localStorage.getItem('userFavorites') || '[]');
    userWishlist = JSON.parse(localStorage.getItem('userWishlist') || '[]');
    userPurchases = JSON.parse(localStorage.getItem('userPurchases') || '[]');
    userListings = JSON.parse(localStorage.getItem('userListings') || '[]');
    customSearchTags = new Set(JSON.parse(localStorage.getItem('customSearchTags') || '[]'));
    messages = JSON.parse(localStorage.getItem('messages') || '[]');
}

function setupEventListeners() {
    // Navigation events
    document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
    document.getElementById('registerBtn').addEventListener('click', () => openModal('registerModal'));
    document.getElementById('adminBtn').addEventListener('click', () => openModal('adminModal'));
    document.getElementById('userMenuBtn').addEventListener('click', () => openModal('userMenuModal'));
    
    // Search and filter events
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('priceFilter').addEventListener('change', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    // Custom tag search events
    document.getElementById('addCustomTagBtn').addEventListener('click', addCustomTag);
    document.getElementById('customTagInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addCustomTag();
        }
    });
    
    // Modal events
    setupModalEvents();
    
    // Form events
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('addShipForm').addEventListener('submit', handleAddShip);
    
    // User menu events
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    document.getElementById('addNewShipBtn').addEventListener('click', () => openModal('addShipModal'));
    document.getElementById('sendMessageBtn').addEventListener('click', handleSendMessage);
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('registerModal');
        openModal('loginModal');
    });
    
    // Custom alert event listeners
    document.getElementById('alertOkBtn').addEventListener('click', closeCustomAlert);
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('customAlert').style.display === 'block') {
            closeCustomAlert();
        }
    });
    
    // Admin tab switching
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchAdminTab(this.dataset.tab);
        });
    });
}

function setupModalEvents() {
    // Close modal events
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal.id);
        });
    });
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
}

function loadSampleData() {
    // Ships are now loaded from localStorage in initializeApp()
    // Only update tags and filters if we have ships
    if (ships.length > 0) {
        updateAvailableTags();
        renderTagFilters();
    }
}

function renderShips() {
    const shipGrid = document.getElementById('shipGrid');
    const shipCount = document.getElementById('shipCount');
    
    shipGrid.innerHTML = '';
    shipCount.textContent = filteredShips.length;
    
    if (filteredShips.length === 0) {
        shipGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: rgba(255,255,255,0.7); font-size: 1.2rem;">No ships found matching your criteria.</p>';
        return;
    }
    
    filteredShips.forEach(ship => {
        const shipCard = createShipCard(ship);
        shipGrid.appendChild(shipCard);
    });
}

function createShipCard(ship) {
    const card = document.createElement('div');
    card.className = 'ship-card';
    
    const isFavorited = userFavorites.includes(ship.id);
    
    card.innerHTML = `
        <div class="ship-image">
            <img src="${ship.image}" alt="${ship.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div class="placeholder" style="display: none;">Ship Screenshot</div>
        </div>
        <div class="ship-info">
            <h3>${ship.name}</h3>
            <div class="ship-price">$${ship.price.toLocaleString()}</div>
            <p class="ship-description">${ship.description}</p>
            <div class="ship-seller">
                <small>by ${ship.seller} (${ship.discord})</small>
            </div>
            <div class="ship-tags">
                ${ship.tags.map(tag => `<span class="ship-tag">${tag}</span>`).join('')}
            </div>
            <div class="ship-actions">
                <button class="btn-contact" onclick="handleContactSeller(${ship.id})">
                    <i class="fas fa-comments"></i> Contact Seller
                </button>
                <button class="btn-favorite ${isFavorited ? 'favorited' : ''}" onclick="toggleFavorite(${ship.id})">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    `;
    
    return card;
}

function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    applyFilters(searchTerm);
}

function applyFilters(searchTerm = '') {
    const category = document.getElementById('categoryFilter').value;
    const priceRange = document.getElementById('priceFilter').value;
    const activeTags = Array.from(document.querySelectorAll('.tag-filter.active')).map(btn => btn.dataset.tag);
    
    filteredShips = ships.filter(ship => {
        // Search term filter
        if (searchTerm && !ship.name.toLowerCase().includes(searchTerm) && 
            !ship.description.toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        // Category filter
        if (category && ship.category !== category) {
            return false;
        }
        
        // Price range filter
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(p => p === '+' ? Infinity : parseInt(p));
            if (ship.price < min || (max !== Infinity && ship.price > max)) {
                return false;
            }
        }
        
        // Tag filter (both available tags and custom search tags)
        if (activeTags.length > 0 && !activeTags.some(tag => ship.tags.includes(tag))) {
            return false;
        }
        
        return true;
    });
    
    renderShips();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('priceFilter').value = '';
    document.querySelectorAll('.tag-filter.active').forEach(btn => btn.classList.remove('active'));
    applyFilters();
}

function updateAvailableTags() {
    availableTags.clear();
    ships.forEach(ship => {
        ship.tags.forEach(tag => availableTags.add(tag));
    });
}

function renderTagFilters() {
    const tagFiltersContainer = document.getElementById('tagFilters');
    tagFiltersContainer.innerHTML = '';
    
    // Add available tags from ships
    Array.from(availableTags).sort().forEach(tag => {
        const tagBtn = document.createElement('button');
        tagBtn.className = 'tag-filter';
        tagBtn.dataset.tag = tag;
        tagBtn.textContent = tag;
        tagBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            applyFilters();
        });
        tagFiltersContainer.appendChild(tagBtn);
    });
    
    // Add custom search tags
    Array.from(customSearchTags).sort().forEach(tag => {
        if (!availableTags.has(tag)) {
            const tagBtn = document.createElement('button');
            tagBtn.className = 'tag-filter custom-tag';
            tagBtn.dataset.tag = tag;
            tagBtn.textContent = tag;
            tagBtn.style.background = 'rgba(255, 165, 0, 0.2)';
            tagBtn.style.borderColor = '#ffa500';
            tagBtn.addEventListener('click', function() {
                this.classList.toggle('active');
                applyFilters();
            });
            tagFiltersContainer.appendChild(tagBtn);
        }
    });
}

function addCustomTag() {
    const input = document.getElementById('customTagInput');
    const tag = input.value.trim();
    
    if (tag && !customSearchTags.has(tag)) {
        customSearchTags.add(tag);
        localStorage.setItem('customSearchTags', JSON.stringify(Array.from(customSearchTags)));
        renderTagFilters();
        input.value = '';
    }
}

function handleContactSeller(shipId) {
    const ship = ships.find(s => s.id === shipId);
    if (!ship) return;
    
    if (!currentUser) {
        openModal('loginModal');
        return;
    }
    
    // Show ship info in contact modal
    document.getElementById('contactShipInfo').innerHTML = `
        <h3>${ship.name}</h3>
        <div class="ship-image" style="margin: 1rem 0;">
            <img src="${ship.image}" alt="${ship.name}" style="max-width: 100%; max-height: 200px; border-radius: 8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div class="placeholder" style="display: none; color: rgba(255,255,255,0.5); font-style: italic;">Ship Screenshot</div>
        </div>
        <div class="ship-price" style="font-size: 1.5rem; margin: 1rem 0;">$${ship.price.toLocaleString()}</div>
        <p>${ship.description}</p>
        <div style="margin: 1rem 0;">
            <strong>Seller:</strong> ${ship.seller} (${ship.discord})<br>
            <strong>Payment:</strong> ${ship.paymentMethod === 'in-person' ? 'In-Person Payment' : 'Nova Bank Transfer'}<br>
            ${ship.blueprintFile ? `<strong>Blueprint:</strong> ${ship.blueprintFile}` : '<em>No blueprint provided</em>'}
        </div>
    `;
    
    // Store the ship ID for the message
    document.getElementById('contactModal').dataset.shipId = shipId;
    openModal('contactModal');
}

function handleSendMessage() {
    const shipId = parseInt(document.getElementById('contactModal').dataset.shipId);
    const messageText = document.getElementById('contactMessage').value.trim();
    
    if (!messageText) {
        showCustomAlert('Error', 'Please enter a message', 'error');
        return;
    }
    
    const ship = ships.find(s => s.id === shipId);
    if (!ship || !currentUser) return;
    
    // Create message
    const message = {
        id: Date.now(),
        shipId: shipId,
        shipName: ship.name,
        buyerName: currentUser.name,
        buyerDiscord: currentUser.discord,
        sellerName: ship.seller,
        sellerDiscord: ship.discord,
        message: messageText,
        timestamp: new Date(),
        read: false
    };
    
    messages.unshift(message);
    localStorage.setItem('messages', JSON.stringify(messages));
    
    // Clear form and close modal
    document.getElementById('contactMessage').value = '';
    closeModal('contactModal');
    
    showCustomAlert('Message Sent!', 'The seller will see your message in their dashboard.', 'success');
    updateUserMenu();
}

function toggleFavorite(shipId) {
    if (!currentUser) {
        openModal('loginModal');
        return;
    }
    
    const index = userFavorites.indexOf(shipId);
    if (index > -1) {
        userFavorites.splice(index, 1);
    } else {
        userFavorites.push(shipId);
    }
    
    localStorage.setItem('userFavorites', JSON.stringify(userFavorites));
    renderShips(); // Re-render to update favorite buttons
    updateUserMenu();
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Find user in registered users
    const user = registeredUsers.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Check if admin
        isAdmin = user.email === ADMIN_EMAIL;
        
        // Set current user without password
        currentUser = {
            id: user.id,
            name: user.name,
            discord: user.discord,
            email: user.email,
            joinDate: user.joinDate,
            isAdmin: isAdmin
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAuthUI();
        closeModal('loginModal');
        
        // Clear form
        document.getElementById('loginForm').reset();
        
        if (isAdmin) {
            showCustomAlert('Admin Login', 'Welcome back, Administrator!', 'success');
        } else {
            showCustomAlert('Login Successful!', 'Welcome back to Drednot Shipyard!', 'success');
        }
    } else {
        showCustomAlert('Login Failed', 'Invalid email or password. Please register first or check your credentials.', 'error');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const discord = document.getElementById('registerDiscord').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    
    if (password !== confirm) {
        showCustomAlert('Registration Error', 'Passwords do not match!', 'error');
        return;
    }
    
    // Check if email already exists
    if (registeredUsers.find(u => u.email === email)) {
        showCustomAlert('Registration Error', 'An account with this email already exists. Please use a different email or try logging in.', 'error');
        return;
    }
    
    if (name && discord && email && password) {
        const newUser = {
            id: Date.now(),
            name: name,
            discord: discord,
            email: email,
            password: password,
            joinDate: new Date()
        };
        
        // Add to registered users
        registeredUsers.push(newUser);
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
        
        // Set as current user (without password)
        currentUser = {
            id: newUser.id,
            name: newUser.name,
            discord: newUser.discord,
            email: newUser.email,
            joinDate: newUser.joinDate
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAuthUI();
        closeModal('registerModal');
        
        // Clear form
        document.getElementById('registerForm').reset();
        showCustomAlert('Welcome Aboard!', 'Account created successfully! You are now logged in.', 'success');
    }
}

async function handleAddShip(e) {
    e.preventDefault();
    if (!currentUser) return;
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing Images...';
    submitBtn.disabled = true;
    
    const name = document.getElementById('shipName').value;
    const price = parseInt(document.getElementById('shipPrice').value);
    const description = document.getElementById('shipDescription').value;
    const category = document.getElementById('shipCategory').value;
    const tagsInput = document.getElementById('shipTags').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const shipImageFile = document.getElementById('shipImage').files[0];
    const blueprintFile = document.getElementById('blueprintFile').files[0];
    const blueprintImageFile = document.getElementById('blueprintImage').files[0];
    
    // Process tags to ensure they have @ symbol
    const tags = tagsInput.split(' ').map(tag => {
        tag = tag.trim();
        return tag.startsWith('@') ? tag : `@${tag}`;
    }).filter(tag => tag.length > 1);
    
    // Convert images to base64 for persistence
    let imageBase64 = '';
    let blueprintImageBase64 = null;
    
    try {
        if (shipImageFile) {
            imageBase64 = await fileToBase64(shipImageFile);
        }
        if (blueprintImageFile) {
            blueprintImageBase64 = await fileToBase64(blueprintImageFile);
        }
    } catch (error) {
        showCustomAlert('Upload Error', 'Failed to process image files. Please try again.', 'error');
        // Restore button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
    }
    
    const newShip = {
        id: Date.now(),
        name: name,
        price: price,
        description: description || 'No description provided.',
        category: category,
        tags: tags,
        image: imageBase64, // Now stored as base64 string
        seller: currentUser.name,
        discord: currentUser.discord,
        dateAdded: new Date(),
        blueprintFile: blueprintFile ? blueprintFile.name : '',
        blueprintImage: blueprintImageBase64, // Now stored as base64 string
        paymentMethod: paymentMethod
    };
    
    ships.unshift(newShip);
    filteredShips = [...ships];
    userListings.unshift(newShip.id);
    
    // Save to localStorage
    localStorage.setItem('ships', JSON.stringify(ships));
    localStorage.setItem('userListings', JSON.stringify(userListings));
    
    // Update available tags and re-render filters
    updateAvailableTags();
    renderTagFilters();
    renderShips();
    closeModal('addShipModal');
    updateUserMenu();
    
    // Restore button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    
    // Clear form
    document.getElementById('addShipForm').reset();
    
    showCustomAlert('Ship Listed!', 'Ship successfully added to marketplace!', 'success');
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const adminBtn = document.getElementById('adminBtn');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userName = document.getElementById('userName');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        userMenuBtn.style.display = 'flex';
        userName.textContent = currentUser.name;
        
        // Show admin button if user is admin
        if (isAdmin) {
            adminBtn.style.display = 'flex';
        } else {
            adminBtn.style.display = 'none';
        }
    } else {
        loginBtn.style.display = 'block';
        registerBtn.style.display = 'block';
        adminBtn.style.display = 'none';
        userMenuBtn.style.display = 'none';
    }
}

function updateUserMenu() {
    if (!currentUser) return;
    
    // Update buyer tab
    updatePurchaseHistory();
    updateFavoritesList();
    updateWishlistList();
    
    // Update seller tab
    updateMyListings();
    updateBuyerMessages();
    updateSalesStats();
}

function updatePurchaseHistory() {
    const historyList = document.getElementById('purchaseHistory');
    if (userPurchases.length === 0) {
        historyList.innerHTML = '<p>No purchases yet</p>';
        return;
    }
    
    historyList.innerHTML = userPurchases.map(purchase => `
        <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding: 1rem 0;">
            <strong>${purchase.shipName}</strong><br>
            <span style="color: #00d4ff;">$${purchase.price.toLocaleString()}</span><br>
            <small style="color: rgba(255,255,255,0.7);">${purchase.date.toLocaleDateString()}</small>
        </div>
    `).join('');
}

function updateFavoritesList() {
    const favoritesList = document.getElementById('favoritesList');
    const favoriteShips = ships.filter(ship => userFavorites.includes(ship.id));
    
    if (favoriteShips.length === 0) {
        favoritesList.innerHTML = '<p>No favorites yet</p>';
        return;
    }
    
    favoritesList.innerHTML = favoriteShips.map(ship => `
        <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding: 1rem 0;">
            <strong>${ship.name}</strong><br>
            <span style="color: #00d4ff;">$${ship.price.toLocaleString()}</span><br>
            <small style="color: rgba(255,255,255,0.7);">by ${ship.seller}</small>
        </div>
    `).join('');
}

function updateWishlistList() {
    const wishlistList = document.getElementById('wishlistList');
    const wishlistShips = ships.filter(ship => userWishlist.includes(ship.id));
    
    if (wishlistShips.length === 0) {
        wishlistList.innerHTML = '<p>No items in wishlist</p>';
        return;
    }
    
    wishlistList.innerHTML = wishlistShips.map(ship => `
        <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding: 1rem 0;">
            <strong>${ship.name}</strong><br>
            <span style="color: #00d4ff;">$${ship.price.toLocaleString()}</span><br>
            <small style="color: rgba(255,255,255,0.7);">by ${ship.seller}</small>
        </div>
    `).join('');
}

function updateMyListings() {
    const myListings = document.getElementById('myListings');
    const userShips = ships.filter(ship => ship.seller === currentUser.name);
    
    if (userShips.length === 0) {
        myListings.innerHTML = '<p>No ships listed yet</p>';
        return;
    }
    
    myListings.innerHTML = userShips.map(ship => `
        <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding: 1rem 0;">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <img src="${ship.image}" alt="${ship.name}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 5px;">
                <div>
                    <strong>${ship.name}</strong><br>
                    <span style="color: #00d4ff;">$${ship.price.toLocaleString()}</span><br>
                    <small style="color: rgba(255,255,255,0.7);">Listed ${ship.dateAdded.toLocaleDateString()}</small><br>
                    <small style="color: rgba(255,255,255,0.7);">${ship.blueprintFile ? `Blueprint: ${ship.blueprintFile}` : 'No blueprint provided'}</small>
                </div>
            </div>
        </div>
    `).join('');
}

function updateBuyerMessages() {
    const buyerMessages = document.getElementById('buyerMessages');
    const sellerMessages = messages.filter(msg => msg.sellerName === currentUser.name);
    
    if (sellerMessages.length === 0) {
        buyerMessages.innerHTML = '<p>No messages yet</p>';
        return;
    }
    
    buyerMessages.innerHTML = sellerMessages.map(msg => `
        <div class="message-item" onclick="markMessageRead(${msg.id})">
            <div class="message-header">
                <span class="message-sender">${msg.buyerName} (${msg.buyerDiscord})</span>
                <span class="message-time">${msg.timestamp.toLocaleDateString()}</span>
            </div>
            <div class="message-preview">${msg.message}</div>
            <div class="message-ship">About: ${msg.shipName}</div>
        </div>
    `).join('');
}

function updateSalesStats() {
    const userShips = ships.filter(ship => ship.seller === currentUser.name);
    const totalSales = userShips.length;
    const totalRevenue = userShips.reduce((sum, ship) => sum + ship.price, 0);
    
    document.querySelector('#salesStats .stat-card:nth-child(1) .stat-value').textContent = totalSales;
    document.querySelector('#salesStats .stat-card:nth-child(2) .stat-value').textContent = totalSales;
    document.querySelector('#salesStats .stat-card:nth-child(3) .stat-value').textContent = `$${totalRevenue.toLocaleString()}`;
}

function markMessageRead(messageId) {
    const message = messages.find(msg => msg.id === messageId);
    if (message) {
        message.read = true;
        localStorage.setItem('messages', JSON.stringify(messages));
        updateBuyerMessages();
    }
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Update content if switching to buyer tab
    if (tabName === 'buyer') {
        updateUserMenu();
    }
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Custom Alert System
function showCustomAlert(title, message, type = 'success') {
    const alertModal = document.getElementById('customAlert');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    const alertIcon = document.querySelector('.alert-icon i');
    
    // Set content
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    
    // Set alert type and icon
    alertModal.className = `custom-alert-modal alert-${type}`;
    
    switch(type) {
        case 'success':
            alertIcon.className = 'fas fa-check-circle';
            break;
        case 'error':
            alertIcon.className = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            alertIcon.className = 'fas fa-exclamation-triangle';
            break;
        case 'info':
            alertIcon.className = 'fas fa-info-circle';
            break;
        default:
            alertIcon.className = 'fas fa-check-circle';
    }
    
    // Show modal
    alertModal.style.display = 'block';
    
    // Focus on OK button
    setTimeout(() => {
        document.getElementById('alertOkBtn').focus();
    }, 100);
}

function closeCustomAlert() {
    const alertModal = document.getElementById('customAlert');
    alertModal.style.display = 'none';
}

// Helper function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Admin Panel Functions
function switchAdminTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`admin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`).classList.add('active');
    
    // Load tab data
    loadAdminTabData(tabName);
}

function loadAdminTabData(tabName) {
    switch(tabName) {
        case 'overview':
            updateAdminOverview();
            break;
        case 'users':
            updateAdminUsers();
            break;
        case 'ships':
            updateAdminShips();
            break;
        case 'messages':
            updateAdminMessages();
            break;
    }
}

function updateAdminOverview() {
    document.getElementById('totalUsers').textContent = registeredUsers.length;
    document.getElementById('totalShips').textContent = ships.length;
    document.getElementById('totalMessages').textContent = messages.length;
    document.getElementById('activeListings').textContent = ships.length;
}

function updateAdminUsers() {
    const usersList = document.getElementById('adminUsersList');
    
    if (registeredUsers.length === 0) {
        usersList.innerHTML = '<p>No users registered yet.</p>';
        return;
    }
    
    usersList.innerHTML = registeredUsers.map(user => `
        <div class="admin-list-item">
            <div class="admin-item-header">
                <div class="admin-item-title">${user.name} ${user.email === ADMIN_EMAIL ? '(Admin)' : ''}</div>
                <div class="admin-item-actions">
                    <button class="admin-action-btn" onclick="deleteUser(${user.id})">Delete</button>
                </div>
            </div>
            <div class="admin-item-details">
                <strong>Email:</strong> ${user.email}<br>
                <strong>Discord:</strong> ${user.discord}<br>
                <strong>Joined:</strong> ${new Date(user.joinDate).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}

function updateAdminShips() {
    const shipsList = document.getElementById('adminShipsList');
    
    if (ships.length === 0) {
        shipsList.innerHTML = '<p>No ships listed yet.</p>';
        return;
    }
    
    shipsList.innerHTML = ships.map(ship => `
        <div class="admin-list-item">
            <div class="admin-item-header">
                <div class="admin-item-title">${ship.name}</div>
                <div class="admin-item-actions">
                    <button class="admin-action-btn" onclick="deleteShip(${ship.id})">Delete</button>
                </div>
            </div>
            <div class="admin-item-details">
                <strong>Price:</strong> $${ship.price.toLocaleString()}<br>
                <strong>Seller:</strong> ${ship.seller} (${ship.discord})<br>
                <strong>Category:</strong> ${ship.category}<br>
                <strong>Listed:</strong> ${new Date(ship.dateAdded).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}

function updateAdminMessages() {
    const messagesList = document.getElementById('adminMessagesList');
    
    if (messages.length === 0) {
        messagesList.innerHTML = '<p>No messages yet.</p>';
        return;
    }
    
    messagesList.innerHTML = messages.map(msg => `
        <div class="admin-list-item">
            <div class="admin-item-header">
                <div class="admin-item-title">Message about ${msg.shipName}</div>
                <div class="admin-item-actions">
                    <button class="admin-action-btn" onclick="deleteMessage(${msg.id})">Delete</button>
                </div>
            </div>
            <div class="admin-item-details">
                <strong>From:</strong> ${msg.buyerName} (${msg.buyerDiscord})<br>
                <strong>To:</strong> ${msg.sellerName} (${msg.sellerDiscord})<br>
                <strong>Message:</strong> ${msg.message}<br>
                <strong>Sent:</strong> ${new Date(msg.timestamp).toLocaleString()}
            </div>
        </div>
    `).join('');
}

function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        registeredUsers = registeredUsers.filter(user => user.id !== userId);
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
        updateAdminUsers();
        updateAdminOverview();
        showCustomAlert('User Deleted', 'User has been removed from the system.', 'success');
    }
}

function deleteShip(shipId) {
    if (confirm('Are you sure you want to delete this ship listing?')) {
        ships = ships.filter(ship => ship.id !== shipId);
        filteredShips = [...ships];
        
        // Save to localStorage
        localStorage.setItem('ships', JSON.stringify(ships));
        
        updateAvailableTags();
        renderTagFilters();
        renderShips();
        updateAdminShips();
        updateAdminOverview();
        showCustomAlert('Ship Deleted', 'Ship listing has been removed from the marketplace.', 'success');
    }
}

function deleteMessage(messageId) {
    if (confirm('Are you sure you want to delete this message?')) {
        messages = messages.filter(msg => msg.id !== messageId);
        localStorage.setItem('messages', JSON.stringify(messages));
        updateAdminMessages();
        updateAdminOverview();
        showCustomAlert('Message Deleted', 'Message has been removed from the system.', 'success');
    }
}

// Logout function (can be called from user menu)
function logout() {
    currentUser = null;
    isAdmin = false;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    closeModal('userMenuModal');
}

// Add logout button to user menu
document.addEventListener('DOMContentLoaded', function() {
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn-secondary';
        logoutBtn.style.marginTop = '2rem';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        logoutBtn.onclick = logout;
        userMenu.appendChild(logoutBtn);
    }
});
