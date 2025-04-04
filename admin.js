import { database, ref, onValue, update, remove } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const pendingOrdersList = document.getElementById('pending-orders');
    const onHoldOrdersList = document.getElementById('on-hold-orders');
    const completedOrdersList = document.getElementById('completed-orders');
    const searchInput = document.getElementById('search-orders');
    const searchBtn = document.getElementById('search-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    let allOrders = [];
    let currentStatus = 'pending';

    // Load all orders
    function loadOrders() {
        const usersRef = ref(database, 'users');
        
        onValue(usersRef, (snapshot) => {
            allOrders = [];
            
            if (snapshot.exists()) {
                snapshot.forEach(userSnapshot => {
                    const username = userSnapshot.key;
                    
                    if (userSnapshot.child('orders').exists()) {
                        userSnapshot.child('orders').forEach(orderSnapshot => {
                            const order = {
                                id: orderSnapshot.key,
                                username: username,
                                ...orderSnapshot.val()
                            };
                            allOrders.push(order);
                        });
                    }
                });
            }
            
            displayOrders();
        }, (error) => {
            console.error('Error loading orders:', error);
            displayError('Failed to load orders. Please refresh.');
        });
    }

    // Display filtered orders
    function displayOrders() {
        clearOrdersList();
        
        const searchTerm = searchInput.value.toLowerCase();
        const filteredOrders = allOrders
            .filter(order => order.username.toLowerCase().includes(searchTerm))
            .sort((a, b) => b.timestamp - a.timestamp);

        if (filteredOrders.length === 0) {
            showNoOrdersMessage();
            return;
        }

        filteredOrders.forEach(order => {
            const orderElement = createOrderElement(order);
            getOrdersListByStatus(order.status).appendChild(orderElement);
        });
    }

    function clearOrdersList() {
        pendingOrdersList.innerHTML = '';
        onHoldOrdersList.innerHTML = '';
        completedOrdersList.innerHTML = '';
    }

    function showNoOrdersMessage() {
        const message = '<div class="empty-message">No orders found</div>';
        pendingOrdersList.innerHTML = message;
        onHoldOrdersList.innerHTML = message;
        completedOrdersList.innerHTML = message;
    }

    function getOrdersListByStatus(status) {
        switch (status) {
            case 'pending': return pendingOrdersList;
            case 'on-hold': return onHoldOrdersList;
            case 'completed': return completedOrdersList;
            default: return pendingOrdersList;
        }
    }

    function createOrderElement(order) {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-card';
        orderElement.innerHTML = `
            <div class="order-header">
                <span class="order-username">${order.username}</span>
                <span class="order-date">${new Date(order.timestamp).toLocaleString()}</span>
            </div>
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <span>${item.name} x${item.quantity}</span>
                        <span>$${item.totalPrice.toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
            <div class="order-footer">
                <span class="order-total">Total: $${order.total.toLocaleString()}</span>
                <div class="order-actions">
                    <select class="status-select" data-order-id="${order.id}" data-username="${order.username}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="on-hold" ${order.status === 'on-hold' ? 'selected' : ''}>On Hold</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                    <button class="delete-btn" data-order-id="${order.id}" data-username="${order.username}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        return orderElement;
    }

    // Event listeners
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStatus = btn.dataset.status;
            displayOrders();
        });
    });

    searchInput.addEventListener('input', displayOrders);
    searchBtn.addEventListener('click', displayOrders);

    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('status-select')) {
            updateOrderStatus(
                e.target.dataset.orderId,
                e.target.dataset.username,
                e.target.value
            );
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) {
            const btn = e.target.closest('.delete-btn');
            deleteOrder(btn.dataset.orderId, btn.dataset.username);
        }
    });

    // Order operations
    function updateOrderStatus(orderId, username, status) {
        const orderRef = ref(database, `users/${username}/orders/${orderId}`);
        update(orderRef, { status })
            .catch(error => console.error('Status update failed:', error));
    }

    function deleteOrder(orderId, username) {
        if (confirm('Permanently delete this order?')) {
            const orderRef = ref(database, `users/${username}/orders/${orderId}`);
            remove(orderRef)
                .catch(error => console.error('Deletion failed:', error));
        }
    }

    // Initial load
    loadOrders();
});