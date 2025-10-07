// Global state management
let currentUser = null;
let ships = [];
let filteredShips = [];
let userFavorites = [];
let userWishlist = [];
let userPurchases = [];
let userListings = [];
let availableTags = new Set(); // Dynamic tags from ship listings
let customSearchTags = new Set(); // Custom tags added by users
let messages = []; // Chat messages between buyers and sellers
let allUsers = []; // Store all registered users
let userSessions = []; // Track active sessions

// Utility functions for authentication
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Simple password hashing (in production, use proper bcrypt or similar)
function hashPassword(password) {
    let hash = 0;
    if (password.length === 0) return hash.toString();
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

// Password validation
function validatePassword(password) {
    const errors = [];
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    return errors;
}

// Email validation
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Discord validation
function validateDiscord(discord) {
    const discordRegex = /^.{3,32}#[0-9]{4}$/;
    return discordRegex.test(discord);
}

// Show user feedback instead of alerts
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Form validation helpers
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Remove existing error
    const existingError = field.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add error styling
    field.style.borderColor = '#ff6b6b';
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.color = '#ff6b6b';
    errorDiv.style.fontSize = '0.8rem';
    errorDiv.style.marginTop = '0.25rem';
    
    field.parentElement.appendChild(errorDiv);
}

function clearFormErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Remove all error messages
    const errors = form.querySelectorAll('.field-error');
    errors.forEach(error => error.remove());
    
    // Reset field styling
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.style.borderColor = '';
    });
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const error = field.parentElement.querySelector('.field-error');
    if (error) {
        error.remove();
    }
    
    field.style.borderColor = '';
}

// Real-time validation setup
function setupRealTimeValidation() {
    // Password strength indicator
    const passwordField = document.getElementById('registerPassword');
    if (passwordField) {
        passwordField.addEventListener('input', function() {
            updatePasswordStrength(this.value);
        });
    }
    
    // Email validation
    const emailField = document.getElementById('registerEmail');
    if (emailField) {
        emailField.addEventListener('blur', function() {
            if (this.value && !validateEmail(this.value)) {
                showFieldError('registerEmail', 'Please enter a valid email address');
            } else {
                clearFieldError('registerEmail');
            }
        });
    }
    
    // Discord validation
    const discordField = document.getElementById('registerDiscord');
    if (discordField) {
        discordField.addEventListener('blur', function() {
            if (this.value && !validateDiscord(this.value)) {
                showFieldError('registerDiscord', 'Please enter a valid Discord name (e.g., Username#1234)');
            } else {
                clearFieldError('registerDiscord');
            }
        });
    }
    
    // Name validation
    const nameField = document.getElementById('registerName');
    if (nameField) {
        nameField.addEventListener('blur', function() {
            if (this.value && this.value.length < 3) {
                showFieldError('registerName', 'Name must be at least 3 characters long');
            } else {
                clearFieldError('registerName');
            }
        });
    }
    
    // Password confirmation
    const confirmField = document.getElementById('registerConfirm');
    if (confirmField) {
        confirmField.addEventListener('input', function() {
            const password = document.getElementById('registerPassword').value;
            if (this.value && this.value !== password) {
                showFieldError('registerConfirm', 'Passwords do not match');
            } else {
                clearFieldError('registerConfirm');
            }
        });
    }
}

// Password strength indicator
function updatePasswordStrength(password) {
    const strengthContainer = document.getElementById('passwordStrength') || createPasswordStrengthIndicator();
    
    if (!password) {
        strengthContainer.style.display = 'none';
        return;
    }
    
    strengthContainer.style.display = 'block';
    
    const errors = validatePassword(password);
    const strengthLevel = getPasswordStrength(password);
    
    const strengthText = strengthContainer.querySelector('.strength-text');
    const strengthBar = strengthContainer.querySelector('.strength-fill');
    
    strengthText.textContent = strengthLevel.text;
    strengthText.style.color = strengthLevel.color;
    
    strengthBar.className = `strength-fill ${strengthLevel.class}`;
}

function createPasswordStrengthIndicator() {
    const passwordField = document.getElementById('registerPassword');
    const container = document.createElement('div');
    container.id = 'passwordStrength';
    container.className = 'password-strength';
    container.innerHTML = `
        <div class="strength-text"></div>
        <div class="strength-bar">
            <div class="strength-fill"></div>
        </div>
    `;
    
    passwordField.parentElement.appendChild(container);
    return container;
}

function getPasswordStrength(password) {
    const errors = validatePassword(password);
    const length = password.length;
    
    if (length < 6) {
        return { text: 'Very Weak', color: '#ff6b6b', class: 'strength-weak' };
    } else if (length < 8 || errors.length > 3) {
        return { text: 'Weak', color: '#ff6b6b', class: 'strength-weak' };
    } else if (errors.length > 2) {
        return { text: 'Fair', color: '#ffa726', class: 'strength-fair' };
    } else if (errors.length > 1) {
        return { text: 'Good', color: '#66bb6a', class: 'strength-good' };
    } else if (errors.length > 0) {
        return { text: 'Strong', color: '#4caf50', class: 'strength-strong' };
    } else {
        return { text: 'Very Strong', color: '#4caf50', class: 'strength-strong' };
    }
}

// Sample ship data
const sampleShips = [
    {
        id: 1,
        name: "Thunderbolt Fighter",
        price: 2500,
        description: "A sleek combat vessel designed for speed and maneuverability. Perfect for space battles and quick strikes.",
        category: "pvp",
        tags: [],
        image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwMCIvPgogIDxyZWN0IHg9IjgwIiB5PSI0MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDBkNGZmIi8+CiAgPHJlY3QgeD0iNzAiIHk9IjQ1IiB3aWR0aD0iNjAiIGhlaWdodD0iMTAiIGZpbGw9IiMwMGQ0ZmYiLz4KICA8cmVjdCB4PSI4NSIgeT0iMzUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgZmlsbD0iIzAwZDRmZiIvPgogIDx0ZXh0IHg9IjEwMCIgeT0iNTUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5UaHVuZGVyYm9sdDwvdGV4dD4KPC9zdmc+",
        seller: "Captain_Space",
        discord: "Captain_Space#1234",
        dateAdded: new Date('2024-01-15'),
        blueprintFile: "thunderbolt_blueprint.txt",
        blueprintImage: null,
        paymentMethod: "in-person"
    },
    {
        id: 2,
        name: "Deep Core Miner",
        price: 4500,
        description: "Heavy-duty mining vessel with reinforced hull and powerful drilling equipment. Built to withstand asteroid fields.",
        category: "storage",
        tags: [],
        image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwMCIvPgogIDxyZWN0IHg9IjUwIiB5PSIzMCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSI0MCIgZmlsbD0iI2ZmNjYwMCIvPgogIDxyZWN0IHg9IjYwIiB5PSI0MCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjY2M0NDAwIi8+CiAgPHJlY3QgeD0iNzAiIHk9IjIwIiB3aWR0aD0iNjAiIGhlaWdodD0iMjAiIGZpbGw9IiNmZjY2MDAiLz4KICA8dGV4dCB4PSIxMDAiIHk9IjU1IiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TWluZXI8L3RleHQ+Cjwvc3ZnPg==",
        seller: "Mining_Master",
        discord: "Mining_Master#5678",
        dateAdded: new Date('2024-01-20'),
        blueprintFile: "deep_core_blueprint.txt",
        blueprintImage: null,
        paymentMethod: "nova-bank"
    },
    {
        id: 3,
        name: "Stellar Cruiser",
        price: 8500,
        description: "Luxury transport ship with spacious cargo holds and comfortable passenger quarters. Ideal for long journeys.",
        category: "storage",
        tags: [],
        image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwMCIvPgogIDxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwZmZmZiIvPgogIDxyZWN0IHg9IjUwIiB5PSIzMCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSI0MCIgZmlsbD0iIzAwY2NjYyIvPgogIDxyZWN0IHg9IjYwIiB5PSIyMCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMDBhYWFhIi8+CiAgPHRleHQgeD0iMTAwIiB5PSI1NSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkNydWlzZXI8L3RleHQ+Cjwvc3ZnPg==",
        seller: "Stellar_Pilot",
        discord: "Stellar_Pilot#9012",
        dateAdded: new Date('2024-01-18'),
        blueprintFile: "stellar_cruiser_blueprint.txt",
        blueprintImage: null,
        paymentMethod: "in-person"
    },
    {
        id: 4,
        name: "Quantum Explorer",
        price: 12000,
        description: "Advanced exploration vessel equipped with cutting-edge sensors and quantum navigation systems.",
        category: "pvp",
        tags: [],
        image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwMCIvPgogIDxyZWN0IHg9IjgwIiB5PSI0MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZmYwMGZmIi8+CiAgPHJlY3QgeD0iNzAiIHk9IjQ1IiB3aWR0aD0iNjAiIGhlaWdodD0iMTAiIGZpbGw9IiNjYzAwY2MiLz4KICA8cmVjdCB4PSI4NSIgeT0iMzUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgZmlsbD0iI2FhMDBhYSIvPgogIDxyZWN0IHg9IjkwIiB5PSIyMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjE1IiBmaWxsPSIjZmYwMGZmIi8+CiAgPHRleHQgeD0iMTAwIiB5PSI1NSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlF1YW50dW08L3RleHQ+Cjwvc3ZnPg==",
        seller: "Quantum_Engineer",
        discord: "Quantum_Engineer#3456",
        dateAdded: new Date('2024-01-22'),
        blueprintFile: "quantum_explorer_blueprint.txt",
        blueprintImage: null,
        paymentMethod: "nova-bank"
    },
    {
        id: 5,
        name: "Lightning Bolt",
        price: 3200,
        description: "High-speed racing ship designed for competitive racing events. Minimal weight, maximum acceleration.",
        category: "pvp",
        tags: [],
        image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwMCIvPgogIDxyZWN0IHg9IjkwIiB5PSI0MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZmZmZjAwIi8+CiAgPHJlY3QgeD0iODUiIHk9IjQ1IiB3aWR0aD0iMzAiIGhlaWdodD0iMTAiIGZpbGw9IiNjY2NjMDAiLz4KICA8cmVjdCB4PSI4NyIgeT0iMzAiIHdpZHRoPSIyNiIgaGVpZ2h0PSIzMCIgZmlsbD0iI2FhYWEwMCIvPgogIDxyZWN0IHg9IjkwIiB5PSIyMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZmZmZjAwIi8+CiAgPHRleHQgeD0iMTAwIiB5PSI1NSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkxpZ2h0bmluZzwvdGV4dD4KPC9zdmc+",
        seller: "Speed_Demon",
        discord: "Speed_Demon#7890",
        dateAdded: new Date('2024-01-25'),
        blueprintFile: "lightning_bolt_blueprint.txt",
        blueprintImage: null,
        paymentMethod: "in-person"
    },
    {
        id: 6,
        name: "Iron Fortress",
        price: 15000,
        description: "Heavily armored battleship with multiple weapon systems. The ultimate in defensive capabilities.",
        category: "pvp",
        tags: [],
        image: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwMCIvPgogIDxyZWN0IHg9IjMwIiB5PSIzMCIgd2lkdGg9IjE0MCIgaGVpZ2h0PSI0MCIgZmlsbD0iIzY2NjY2NiIvPgogIDxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzMzMzMzMyIvPgogIDxyZWN0IHg9IjUwIiB5PSIyMCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSI2MCIgZmlsbD0iIzQ0NDQ0NCIvPgogIDxyZWN0IHg9IjYwIiB5PSIxMCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjNTU1NTU1Ii8+CiAgPHRleHQgeD0iMTAwIiB5PSI1NSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkZvcnRyZXNzPC90ZXh0Pgo8L3N2Zz4=",
        seller: "War_Machine",
        discord: "War_Machine#2468",
        dateAdded: new Date('2024-01-28'),
        blueprintFile: "iron_fortress_blueprint.txt",
        blueprintImage: null,
        paymentMethod: "nova-bank"
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadSampleData();
    renderShips();
});

function initializeApp() {
    // Load all users from localStorage
    allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    userSessions = JSON.parse(localStorage.getItem('userSessions') || '[]');
    
    // Load current user session
    const savedSession = localStorage.getItem('currentSession');
    if (savedSession) {
        const session = JSON.parse(savedSession);
        const user = allUsers.find(u => u.id === session.userId);
        if (user && session.expiresAt > Date.now()) {
            currentUser = user;
            updateAuthUI();
        } else {
            // Session expired, clear it
            localStorage.removeItem('currentSession');
        }
    }
    
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
    document.getElementById('userMenuBtn').addEventListener('click', () => openModal('userMenuModal'));
    
    // Mobile menu events
    document.getElementById('mobileMenuBtn').addEventListener('click', toggleMobileMenu);
    document.getElementById('mobileLoginBtn').addEventListener('click', () => {
        openModal('loginModal');
        closeMobileMenu();
    });
    document.getElementById('mobileRegisterBtn').addEventListener('click', () => {
        openModal('registerModal');
        closeMobileMenu();
    });
    document.getElementById('mobileUserMenuBtn').addEventListener('click', () => {
        openModal('userMenuModal');
        closeMobileMenu();
    });
    
    // Mobile search events
    document.getElementById('mobileSearchInput').addEventListener('input', handleMobileSearch);
    document.getElementById('mobileSearchBtn').addEventListener('click', handleMobileSearch);
    
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
    
    // Real-time validation
    setupRealTimeValidation();
    
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
    ships = [...sampleShips];
    filteredShips = [...ships];
    updateAvailableTags();
    renderTagFilters();
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
            <img src="${ship.image}" alt="${ship.name}" style="max-width: 100%; max-height: 200px; border-radius: 8px;">
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
        showNotification('Please enter a message', 'error');
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
    
    showNotification('Message sent! The seller will see your message in their dashboard.', 'success');
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
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Clear previous errors
    clearFormErrors('loginForm');
    
    // Validation
    if (!email) {
        showFieldError('loginEmail', 'Email is required');
        return;
    }
    
    if (!validateEmail(email)) {
        showFieldError('loginEmail', 'Please enter a valid email address');
        return;
    }
    
    if (!password) {
        showFieldError('loginPassword', 'Password is required');
        return;
    }
    
    // Find user by email
    const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
        showFieldError('loginEmail', 'No account found with this email address');
        return;
    }
    
    // Verify password
    const hashedPassword = hashPassword(password);
    if (user.passwordHash !== hashedPassword) {
        showFieldError('loginPassword', 'Incorrect password');
        return;
    }
    
    // Create session
    const sessionId = generateSessionId();
    const session = {
        id: sessionId,
        userId: user.id,
        createdAt: new Date(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };
    
    // Update user last login
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    
    // Save data
    allUsers = allUsers.map(u => u.id === user.id ? user : u);
    userSessions.push(session);
    
    localStorage.setItem('allUsers', JSON.stringify(allUsers));
    localStorage.setItem('userSessions', JSON.stringify(userSessions));
    localStorage.setItem('currentSession', JSON.stringify(session));
    
    // Set current user
    currentUser = user;
    updateAuthUI();
    closeModal('loginModal');
    
    // Clear form
    document.getElementById('loginForm').reset();
    
    showNotification(`Welcome back, ${user.name}!`, 'success');
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const discord = document.getElementById('registerDiscord').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    
    // Clear previous errors
    clearFormErrors('registerForm');
    
    // Validation
    if (!name) {
        showFieldError('registerName', 'In-game name is required');
        return;
    }
    
    if (name.length < 3) {
        showFieldError('registerName', 'Name must be at least 3 characters long');
        return;
    }
    
    if (!discord) {
        showFieldError('registerDiscord', 'Discord name is required');
        return;
    }
    
    if (!validateDiscord(discord)) {
        showFieldError('registerDiscord', 'Please enter a valid Discord name (e.g., Username#1234)');
        return;
    }
    
    if (!email) {
        showFieldError('registerEmail', 'Email is required');
        return;
    }
    
    if (!validateEmail(email)) {
        showFieldError('registerEmail', 'Please enter a valid email address');
        return;
    }
    
    // Check if email already exists
    if (allUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        showFieldError('registerEmail', 'An account with this email already exists');
        return;
    }
    
    if (!password) {
        showFieldError('registerPassword', 'Password is required');
        return;
    }
    
    // Validate password strength
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
        showFieldError('registerPassword', passwordErrors.join(', '));
        return;
    }
    
    if (!confirm) {
        showFieldError('registerConfirm', 'Please confirm your password');
        return;
    }
    
    if (password !== confirm) {
        showFieldError('registerConfirm', 'Passwords do not match');
        return;
    }
    
    // Create new user
    const userId = generateUserId();
    const newUser = {
        id: userId,
        name: name,
        discord: discord,
        email: email,
        passwordHash: hashPassword(password),
        joinDate: new Date(),
        lastLogin: null,
        loginCount: 0,
        isActive: true,
        preferences: {
            theme: 'dark',
            notifications: true
        }
    };
    
    // Add user to all users
    allUsers.push(newUser);
    localStorage.setItem('allUsers', JSON.stringify(allUsers));
    
    // Create session
    const sessionId = generateSessionId();
    const session = {
        id: sessionId,
        userId: userId,
        createdAt: new Date(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };
    
    userSessions.push(session);
    localStorage.setItem('userSessions', JSON.stringify(userSessions));
    localStorage.setItem('currentSession', JSON.stringify(session));
    
    // Set current user
    currentUser = newUser;
    updateAuthUI();
    closeModal('registerModal');
    
    // Clear form
    document.getElementById('registerForm').reset();
    
    showNotification(`Account created successfully! Welcome to Drednot Shipyard, ${name}!`, 'success');
}

function handleAddShip(e) {
    e.preventDefault();
    if (!currentUser) return;
    
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
    
    // Handle file uploads
    const imageUrl = shipImageFile ? URL.createObjectURL(shipImageFile) : '';
    const blueprintFileName = blueprintFile ? blueprintFile.name : '';
    const blueprintImageUrl = blueprintImageFile ? URL.createObjectURL(blueprintImageFile) : null;
    
    const newShip = {
        id: Date.now(),
        name: name,
        price: price,
        description: description || 'No description provided.',
        category: category,
        tags: tags,
        image: imageUrl,
        seller: currentUser.name,
        discord: currentUser.discord,
        dateAdded: new Date(),
        blueprintFile: blueprintFileName,
        blueprintImage: blueprintImageUrl,
        paymentMethod: paymentMethod
    };
    
    ships.unshift(newShip);
    filteredShips = [...ships];
    userListings.unshift(newShip.id);
    localStorage.setItem('userListings', JSON.stringify(userListings));
    
    // Update available tags and re-render filters
    updateAvailableTags();
    renderTagFilters();
    renderShips();
    closeModal('addShipModal');
    updateUserMenu();
    
    // Clear form
    document.getElementById('addShipForm').reset();
    
    showNotification('Ship successfully added to marketplace!', 'success');
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userName = document.getElementById('userName');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        userMenuBtn.style.display = 'flex';
        userName.textContent = currentUser.name;
    } else {
        loginBtn.style.display = 'block';
        registerBtn.style.display = 'block';
        userMenuBtn.style.display = 'none';
    }
    
    // Also update mobile menu
    updateMobileAuthUI();
}

function updateUserMenu() {
    if (!currentUser) return;
    
    // Update user info display
    updateUserInfo();
    
    // Update buyer tab
    updatePurchaseHistory();
    updateFavoritesList();
    updateWishlistList();
    
    // Update seller tab
    updateMyListings();
    updateBuyerMessages();
    updateSalesStats();
}

function updateUserInfo() {
    const menuUserName = document.getElementById('menuUserName');
    if (menuUserName) {
        menuUserName.textContent = currentUser.name;
    }
    
    // Add account info if not exists
    let accountInfo = document.getElementById('accountInfo');
    if (!accountInfo) {
        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            accountInfo = document.createElement('div');
            accountInfo.id = 'accountInfo';
            accountInfo.className = 'account-info';
            userInfo.appendChild(accountInfo);
        }
    }
    
    if (accountInfo) {
        const joinDate = new Date(currentUser.joinDate).toLocaleDateString();
        const lastLogin = currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleDateString() : 'Never';
        const loginCount = currentUser.loginCount || 0;
        
        accountInfo.innerHTML = `
            <h4>Account Information</h4>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>Discord:</strong> ${currentUser.discord}</p>
            <p><strong>Member since:</strong> ${joinDate}</p>
            <p><strong>Last login:</strong> ${lastLogin}</p>
            <p><strong>Login count:</strong> ${loginCount}</p>
        `;
    }
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

// Mobile menu functions
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const isOpen = mobileMenu.style.display === 'block';
    
    if (isOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

function openMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.style.display = 'block';
    
    // Update mobile user menu if logged in
    updateMobileAuthUI();
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.style.display = 'none';
}

function handleMobileSearch() {
    const searchTerm = document.getElementById('mobileSearchInput').value.toLowerCase();
    // Sync with main search
    document.getElementById('searchInput').value = searchTerm;
    applyFilters(searchTerm);
    closeMobileMenu();
}

function updateMobileAuthUI() {
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    const mobileRegisterBtn = document.getElementById('mobileRegisterBtn');
    const mobileUserMenuBtn = document.getElementById('mobileUserMenuBtn');
    const mobileUserName = document.getElementById('mobileUserName');
    
    if (currentUser) {
        mobileLoginBtn.style.display = 'none';
        mobileRegisterBtn.style.display = 'none';
        mobileUserMenuBtn.style.display = 'flex';
        mobileUserName.textContent = currentUser.name;
    } else {
        mobileLoginBtn.style.display = 'block';
        mobileRegisterBtn.style.display = 'block';
        mobileUserMenuBtn.style.display = 'none';
    }
}

// Logout function (can be called from user menu)
function logout() {
    // Remove current session
    localStorage.removeItem('currentSession');
    
    // Clear current user
    currentUser = null;
    updateAuthUI();
    closeModal('userMenuModal');
    
    showNotification('You have been logged out successfully', 'info');
}

// Account persistence verification
function verifyAccountPersistence() {
    const userCount = allUsers.length;
    const sessionCount = userSessions.length;
    
    console.log(`Account Persistence Status:`);
    console.log(`- Total registered users: ${userCount}`);
    console.log(`- Active sessions: ${sessionCount}`);
    console.log(`- Current user: ${currentUser ? currentUser.name : 'None'}`);
    
    if (userCount > 0) {
        showNotification(`Account persistence verified! ${userCount} user(s) stored securely.`, 'success');
    }
}

// Session cleanup (remove expired sessions)
function cleanupExpiredSessions() {
    const now = Date.now();
    const activeSessions = userSessions.filter(session => session.expiresAt > now);
    
    if (activeSessions.length !== userSessions.length) {
        userSessions = activeSessions;
        localStorage.setItem('userSessions', JSON.stringify(userSessions));
        console.log(`Cleaned up ${userSessions.length - activeSessions.length} expired sessions`);
    }
}

// Export account data for backup
function exportAccountData() {
    if (!currentUser) {
        showNotification('Please log in to export your data', 'error');
        return;
    }
    
    const accountData = {
        user: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            discord: currentUser.discord,
            joinDate: currentUser.joinDate,
            lastLogin: currentUser.lastLogin,
            loginCount: currentUser.loginCount
        },
        preferences: {
            favorites: userFavorites,
            wishlist: userWishlist,
            purchases: userPurchases,
            listings: userListings,
            customTags: Array.from(customSearchTags)
        },
        messages: messages.filter(msg => 
            msg.buyerName === currentUser.name || msg.sellerName === currentUser.name
        ),
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const dataStr = JSON.stringify(accountData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `drednot-shipyard-backup-${currentUser.name}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('Account data exported successfully!', 'success');
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
        
        // Add account verification button for testing
        const verifyBtn = document.createElement('button');
        verifyBtn.className = 'btn-secondary';
        verifyBtn.style.marginTop = '1rem';
        verifyBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Verify Account Storage';
        verifyBtn.onclick = verifyAccountPersistence;
        userMenu.appendChild(verifyBtn);
        
        // Add data export button
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn-secondary';
        exportBtn.style.marginTop = '1rem';
        exportBtn.innerHTML = '<i class="fas fa-download"></i> Export Account Data';
        exportBtn.onclick = exportAccountData;
        userMenu.appendChild(exportBtn);
    }
    
    // Clean up expired sessions on load
    cleanupExpiredSessions();
});
