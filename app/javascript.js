import { database, ref, push, set, onChildAdded, onValue, serverTimestamp } from './firebase.js';

// Order System Variables
let currentOrder = [];
let total = 0;

// DOM Elements
const productsList = document.getElementById('products');
const currentOrderList = document.getElementById('current-order');
const orderTotalElement = document.getElementById('order-total');
const customerForm = document.getElementById('customer-form');
const adminDashboard = document.getElementById('admin-dashboard');
const closeAdminBtn = document.getElementById('close-admin');

// Initialize the app
function init() {
    setupProductListeners();
    setupFormListener();
    setupAdminAccess();
    setupCloseAdminListener();
}

function setupProductListeners() {
    document.querySelectorAll('.add-to-order').forEach(button => {
        button.addEventListener('click', (e) => {
            const productItem = e.target.parentElement;
            const productId = productItem.getAttribute('data-id');
            const productText = productItem.textContent.replace('Add to Order', '').trim();
            const productName = productText.split(' - ')[0];
            const productPrice = parseInt(productText.split(' - ')[1].replace('$', ''));
            
            addToOrder(productId, productName, productPrice);
        });
    });
}

function addToOrder(id, name, price) {
    currentOrder.push({ id, name, price });
    total += price;
    updateOrderDisplay();
}

function updateOrderDisplay() {
    currentOrderList.innerHTML = '';
    currentOrder.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${item.name} - $${item.price} 
            <button class="remove-item" data-id="${item.id}">Remove</button>
        `;
        currentOrderList.appendChild(li);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            removeFromOrder(id);
        });
    });
    
    orderTotalElement.textContent = total;
}

function removeFromOrder(id) {
    const index = currentOrder.findIndex(item => item.id === id);
    if (index !== -1) {
        total -= currentOrder[index].price;
        currentOrder.splice(index, 1);
        updateOrderDisplay();
    }
}

function setupFormListener() {
    customerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const customerName = document.getElementById('customer-name').value;
        const customerEmail = document.getElementById('customer-email').value;
        
        if (currentOrder.length === 0) {
            alert('Please add items to your order first!');
            return;
        }
        
        try {
            // Save order to Firebase
            const ordersRef = ref(database, 'orders');
            const newOrderRef = push(ordersRef);
            
            await set(newOrderRef, {
                customerName,
                customerEmail,
                items: currentOrder,
                total,
                status: 'pending',
                timestamp: serverTimestamp()
            });
            
            alert('Order placed successfully!');
            currentOrder = [];
            total = 0;
            updateOrderDisplay();
            customerForm.reset();
        } catch (error) {
            console.error('Error saving order: ', error);
            alert('There was an error placing your order. Please try again.');
        }
    });
}

function setupAdminAccess() {
    let keySequence = [];
    const secretCode = ['j', 'h', 'a', 'c'];

    document.addEventListener('keydown', (e) => {
        keySequence.push(e.key.toLowerCase());
        if (keySequence.length > secretCode.length) {
            keySequence.shift();
        }
        
        if (keySequence.join('') === secretCode.join('')) {
            showAdminDashboard();
            keySequence = [];
        }
    });
}

function showAdminDashboard() {
    adminDashboard.classList.remove('hidden');
    setupAdminDashboard();
}

function setupCloseAdminListener() {
    closeAdminBtn.addEventListener('click', () => {
        adminDashboard.classList.add('hidden');
    });
}

function setupAdminDashboard() {
    const ordersList = document.getElementById('orders-list');
    ordersList.innerHTML = '<p>Loading orders...</p>';
    
    const ordersRef = ref(database, 'orders');
    
    // Listen for new orders
    onChildAdded(ordersRef, (snapshot) => {
        const order = snapshot.val();
        addOrderToAdminDashboard(snapshot.key, order);
    });
    
    // Also load existing orders
    onValue(ordersRef, (snapshot) => {
        if (!snapshot.exists()) {
            ordersList.innerHTML = '<p>No orders yet</p>';
            return;
        }
        
        if (ordersList.innerHTML === '<p>Loading orders...</p>') {
            ordersList.innerHTML = '';
        }
    });
}

function addOrderToAdminDashboard(orderId, order) {
    const ordersList = document.getElementById('orders-list');
    
    // Check if this order already exists in the DOM
    if (document.getElementById(`order-${orderId}`)) return;
    
    const orderElement = document.createElement('div');
    orderElement.className = 'order-card';
    orderElement.id = `order-${orderId}`;
    
    const timestamp = order.timestamp ? new Date(order.timestamp).toLocaleString() : 'Just now';
    
    orderElement.innerHTML = `
        <h3>Order #${orderId}</h3>
        <p><strong>Customer:</strong> ${order.customerName} (${order.customerEmail})</p>
        <p><strong>Items:</strong></p>
        <ul>
            ${order.items.map(item => `<li>${item.name} - $${item.price}</li>`).join('')}
        </ul>
        <p><strong>Total:</strong> $${order.total}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><small>${timestamp}</small></p>
    `;
    
    if (ordersList.firstChild?.textContent === 'No orders yet') {
        ordersList.innerHTML = '';
    }
    
    ordersList.prepend(orderElement);
}

// Initialize the application
init();