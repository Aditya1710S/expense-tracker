class ExpenseTracker {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    init() {
        this.loadSummary();
        this.loadTransactions();
        this.setupEventListeners();
        this.updateCategories();
        this.setTodayDate();
    }

    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Category dropdown change
        document.getElementById('type').addEventListener('change', () => {
            this.updateCategories();
        });

        // Enter key on filters
        document.getElementById('dateFrom').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadTransactions();
        });
        document.getElementById('dateTo').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadTransactions();
        });
        document.getElementById('categoryFilter').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadTransactions();
        });
    }

    updateCategories() {
        const type = document.getElementById('type').value;
        const categorySelect = document.getElementById('category');
        
        // Clear existing options
        categorySelect.innerHTML = '<option value="">Select Category</option>';
        
        const categories = {
            income: ['Salary', 'Freelance', 'Investment', 'Bonus', 'Other'],
            expense: ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health', 'Education', 'Other']
        };
        
        if (type && categories[type]) {
            categories[type].forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                categorySelect.appendChild(option);
            });
        }
    }

    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                },
                ...options
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
            throw error;
        }
    }

    async loadSummary() {
        try {
            const data = await this.apiCall('/summary');
            this.updateSummaryDisplay(data);
        } catch (error) {
            console.error('Failed to load summary:', error);
        }
    }

    updateSummaryDisplay(data) {
        document.getElementById('totalIncome').textContent = `$${data.total_income.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById('totalExpense').textContent = `$${data.total_expense.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById('balance').textContent = `$${data.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById('transactionCount').textContent = data.total_transactions;
    }

    async loadTransactions() {
        try {
            const params = new URLSearchParams();
            const dateFrom = document.getElementById('dateFrom').value;
            const dateTo = document.getElementById('dateTo').value;
            const category = document.getElementById('categoryFilter').value.trim();

            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            if (category) params.append('category', category);

            const data = await this.apiCall(`/transactions?${params}`);
            this.renderTransactions(data);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        }
    }

    renderTransactions(transactions) {
        const tbody = document.getElementById('transactionsBody');
        
        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No transactions found</td></tr>';
            return;
        }

        tbody.innerHTML = transactions.map(transaction => `
            <tr>
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
                <td class="type ${transaction.type}">${transaction.type.toUpperCase()}</td>
                <td>${transaction.category}</td>
                <td class="amount ${transaction.type}">${transaction.type === 'income' ? '+' : '-'}$${parseFloat(transaction.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td>${transaction.description || '-'}</td>
                <td class="actions">
                    <button class="edit" onclick="expenseTracker.editTransaction(${transaction.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete" onclick="expenseTracker.deleteTransaction(${transaction.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async addTransaction() {
        const formData = {
            date: document.getElementById('date').value,
            type: document.getElementById('type').value,
            category: document.getElementById('category').value,
            amount: parseFloat(document.getElementById('amount').value),
            description: document.getElementById('description').value
        };

        try {
            await this.apiCall('/transactions', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            this.showNotification('Transaction added successfully!', 'success');
            this.resetForm();
            this.loadSummary();
            this.loadTransactions();
        } catch (error) {
            console.error('Failed to add transaction:', error);
        }
    }

    async editTransaction(id) {
        if (!confirm('Edit this transaction?')) return;

        const newData = {
            date: prompt('New date (YYYY-MM-DD):'),
            type: prompt('New type (income/expense):'),
            category: prompt('New category:'),
            amount: parseFloat(prompt('New amount:')),
            description: prompt('New description:')
        };

        if (newData.date && newData.type && newData.category && newData.amount) {
            try {
                await this.apiCall(`/transactions/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(newData)
                });
                this.showNotification('Transaction updated!', 'success');
                this.loadSummary();
                this.loadTransactions();
            } catch (error) {
                console.error('Failed to update transaction:', error);
            }
        }
    }

    async deleteTransaction(id) {
        if (!confirm('Are you sure you want to delete this transaction?')) return;

        try {
            await this.apiCall(`/transactions/${id}`, { method: 'DELETE' });
            this.showNotification('Transaction deleted!', 'success');
            this.loadSummary();
            this.loadTransactions();
        } catch (error) {
            console.error('Failed to delete transaction:', error);
        }
    }

    resetForm() {
        document.getElementById('transactionForm').reset();
        this.setTodayDate();
        this.updateCategories();
    }

    clearFilters() {
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        document.getElementById('categoryFilter').value = '';
        this.loadTransactions();
    }

    showNotification(message, type = 'info') {
        // Simple notification using alert for demo
        // In production, use a proper toast notification library
        alert(message);
    }
}

// Global access
const expenseTracker = new ExpenseTracker();

// Global functions for onclick handlers
function loadTransactions() {
    expenseTracker.loadTransactions();
}

function clearFilters() {
    expenseTracker.clearFilters();
}