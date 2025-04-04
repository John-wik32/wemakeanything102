import { database, ref, push, set, onValue } from './firebase.js';

const ORDER_COOLDOWN = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const usernameInput = document.getElementById('username');
    const categorySelect = document.getElementById('category');
    const itemSelect = document.getElementById('item');
    const quantityInput = document.getElementById('quantity');
    const itemPriceDisplay = document.getElementById('item-price');
    const addToCartBtn = document.getElementById('add-to-cart');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalDisplay = document.getElementById('cart-total');
    const placeOrderBtn = document.getElementById('place-order');
    const orderTimerDisplay = document.getElementById('order-timer');
    const timerSpan = document.getElementById('timer');

    // Verify all elements exist
    if (!usernameInput || !categorySelect || !itemSelect || !quantityInput || 
        !itemPriceDisplay || !addToCartBtn || !cartItemsContainer || 
        !cartTotalDisplay || !placeOrderBtn) {
        console.error('Critical DOM elements missing');
        return;
    }

    let cart = [];
    let lastOrderTime = 0;
    let cooldownInterval = null;

    // Item database
    const itemsDatabase = {
        'gun-parts': [
            { name: 'SPRINGS', price: 2000 },
            { name: 'PIPE PARTS', price: 2500 },
            { name: 'RIFLE PARTS', price: 1000 },
            { name: 'SNIPER PARTS', price: 1500 },
            { name: 'Shotgun parts', price: 1000 },
            { name: 'Pistol Parts', price: 500 },
            { name: 'SMG PARTS', price: 2000 }
        ],
        'ores-bars': [
            { name: 'IRON (per locker - 99 bars)', price: 49500 },
            { name: 'GOLD (per locker - 99 bars)', price: 54450 },
            { name: 'DIAMOND (per locker - 99 bars)', price: 69300 }
        ],
        'heist-gear': [
            { name: 'Reinforced drill bits', price: 7000 },
            { name: 'Golden drill bits', price: 14000 },
            { name: 'Monitor', price: 8500 },
            { name: 'Mill Saw', price: 25000 },
            { name: 'Powercores (Normal)', price: 2500 },
            { name: 'Large Drill', price: 35000 },
            { name: 'Small Drill', price: 30000 },
            { name: 'Drill', price: 20000 }
        ]
    };

    // Initialize
    checkOrderCooldown();

    // Event Listeners
    categorySelect.addEventListener('change', updateItemSelect);
    itemSelect.addEventListener('change', updateItemPrice);
    addToCartBtn.addEventListener('click', addToCart);
    placeOrderBtn.addEventListener('click', placeOrder);

    // Functions
    function updateItemSelect() {
        const category = categorySelect.value;
        itemSelect.innerHTML = '<option value="">-- Select Item --</option>';
        
        if (category && itemsDatabase[category]) {
            itemSelect.disabled = false;
            itemsDatabase[category].forEach(item => {
                const option = document.createElement('option');
                option.value = item.name;
                option.textContent = `${item.name} - $${item.price.toLocaleString()}`;
                itemSelect.appendChild(option);
            });
        } else {
            itemSelect.disabled = true;
            itemPriceDisplay.textContent = '0';
        }
    }

    function updateItemPrice() {
        const category = categorySelect.value;
        const itemName = itemSelect.value;
        
        if (category && itemName && itemsDatabase[category]) {
            const item = itemsDatabase[category].find(i => i.name === itemName);
            itemPriceDisplay.textContent = item ? item.price.toLocaleString() : '0';
        } else {
            itemPriceDisplay.textContent = '0';
        }
    }

    function addToCart() {
        const username = usernameInput.value.trim();
        const category = categorySelect.value;
        const itemName = itemSelect.value;
        const quantity = parseInt(quantityInput.value) || 1;

        if (!username) {
            alert('Please enter your username first');
            return;
        }

        if (!category || !itemName) {
            alert('Please select both category and item');
            return;
        }

        if (!itemsDatabase[category]) {
            alert('Invalid category selected');
            return;
        }

        const item = itemsDatabase[category].find(i => i.name === itemName);
        if (item) {
            cart.push({
                name: item.name,
                price: item.price,
                quantity,
                totalPrice: item.price * quantity
            });
            updateCartDisplay();
        }
    }

    function updateCartDisplay() {
        if (!cartItemsContainer || !cartTotalDisplay || !placeOrderBtn) {
            console.error('Cart display elements missing');
            return;
        }

        cartItemsContainer.innerHTML = '';

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
            placeOrderBtn.disabled = true;
        } else {
            cart.forEach((item, index) => {
                const itemElement = document.createElement('div');
                itemElement.className = 'cart-item';
                itemElement.innerHTML = `
                    <span>${item.name} x${item.quantity}</span>
                    <span>$${item.totalPrice.toLocaleString()}</span>
                    <button class="remove-item" data-index="${index}">×</button>
                `;
                cartItemsContainer.appendChild(itemElement);
            });
            placeOrderBtn.disabled = false;
        }

        const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);
        cartTotalDisplay.textContent = total.toLocaleString();
    }

    async function placeOrder() {
        const username = usernameInput.value.trim();
        
        if (!username) {
            alert('Please enter your username');
            return;
        }

        if (cart.length === 0) {
            alert('Your cart is empty');
            return;
        }

        if (Date.now() - lastOrderTime < ORDER_COOLDOWN) {
            alert('You can only place one order every 3 hours');
            return;
        }

        const orderData = {
            username,
            items: [...cart], // Create a copy of the cart
            total: cart.reduce((sum, item) => sum + item.totalPrice, 0),
            timestamp: Date.now(),
            status: 'pending',
            lastOrderTime: Date.now()
        };

        try {
            const userOrdersRef = ref(database, `users/${username}/orders`);
            const newOrderRef = push(userOrdersRef);
            await set(newOrderRef, orderData);

            // Update last order time
            lastOrderTime = Date.now();
            localStorage.setItem(`${username}_lastOrder`, lastOrderTime.toString());
            if (orderTimerDisplay) orderTimerDisplay.classList.remove('hidden');
            startCooldownTimer();

            alert('Order placed successfully!');
            cart = [];
            updateCartDisplay();
        } catch (error) {
            console.error('Error saving order:', error);
            alert('There was an error placing your order. Please try again.');
        }
    }

    function checkOrderCooldown() {
        const username = usernameInput.value.trim();
        if (!username) return;

        const storedTime = localStorage.getItem(`${username}_lastOrder`);
        if (storedTime) {
            lastOrderTime = parseInt(storedTime);
            const timeSinceLastOrder = Date.now() - lastOrderTime;
            
            if (timeSinceLastOrder < ORDER_COOLDOWN) {
                if (orderTimerDisplay) orderTimerDisplay.classList.remove('hidden');
                startCooldownTimer(ORDER_COOLDOWN - timeSinceLastOrder);
            }
        }
    }

    function startCooldownTimer(remainingTime = ORDER_COOLDOWN) {
        clearInterval(cooldownInterval);
        
        if (!orderTimerDisplay || !timerSpan) {
            console.error('Timer elements missing');
            return;
        }

        orderTimerDisplay.classList.remove('hidden');
        
        let timeLeft = remainingTime;
        
        function updateTimer() {
            timeLeft -= 1000;
            
            if (timeLeft <= 0) {
                clearInterval(cooldownInterval);
                orderTimerDisplay.classList.add('hidden');
                return;
            }
            
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            timerSpan.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        updateTimer();
        cooldownInterval = setInterval(updateTimer, 1000);
    }

    // Handle cart item removal
    cartItemsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item')) {
            const index = parseInt(e.target.dataset.index);
            if (!isNaN(index) && index >= 0 && index < cart.length) {
                cart.splice(index, 1);
                updateCartDisplay();
            }
        }
    });

    // Check for username changes
    usernameInput.addEventListener('input', checkOrderCooldown);
});