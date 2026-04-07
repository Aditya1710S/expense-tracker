from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',  # Change to your MySQL username
    'password': '1234',  # Change to your MySQL password
    'database': 'expense_tracker'
}

def get_db_connection():
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# Categories for frontend dropdown
CATEGORIES = {
    'income': ['Salary', 'Freelance', 'Investment', 'Bonus', 'Other'],
    'expense': ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health', 'Education', 'Other']
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get query parameters for filtering
        category = request.args.get('category')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        query = "SELECT * FROM transactions WHERE 1=1"
        params = []
        
        if category:
            query += " AND category = %s"
            params.append(category)
        if date_from:
            query += " AND date >= %s"
            params.append(date_from)
        if date_to:
            query += " AND date <= %s"
            params.append(date_to)
        
        query += " ORDER BY date DESC, id DESC"
        
        cursor.execute(query, params)
        transactions = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return jsonify(transactions)
    
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    data = request.get_json()
    
    # Validation
    required_fields = ['date', 'type', 'category', 'amount']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f'{field} is required'}), 400
    
    if data['type'] not in ['income', 'expense']:
        return jsonify({'error': 'Type must be income or expense'}), 400
    
    if data['amount'] <= 0:
        return jsonify({'error': 'Amount must be greater than 0'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor()
        query = """
        INSERT INTO transactions (date, type, category, amount, description)
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            data['date'], data['type'], data['category'], 
            float(data['amount']), data.get('description', '')
        ))
        connection.commit()
        new_id = cursor.lastrowid
        cursor.close()
        connection.close()
        
        return jsonify({'message': 'Transaction added successfully', 'id': new_id}), 201
    
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    data = request.get_json()
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor()
        query = """
        UPDATE transactions 
        SET date = %s, type = %s, category = %s, amount = %s, description = %s
        WHERE id = %s
        """
        cursor.execute(query, (
            data['date'], data['type'], data['category'], 
            float(data['amount']), data.get('description', ''), transaction_id
        ))
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Transaction not found'}), 404
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'message': 'Transaction updated successfully'})
    
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor()
        query = "DELETE FROM transactions WHERE id = %s"
        cursor.execute(query, (transaction_id,))
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Transaction not found'}), 404
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'message': 'Transaction deleted successfully'})
    
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/summary', methods=['GET'])
def get_summary():
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor()
        
        # Get totals
        cursor.execute("SELECT SUM(amount) as total_income FROM transactions WHERE type = 'income'")
        total_income = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT SUM(amount) as total_expense FROM transactions WHERE type = 'expense'")
        total_expense = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT COUNT(*) as total_transactions FROM transactions")
        total_transactions = cursor.fetchone()[0]
        
        cursor.close()
        connection.close()
        
        balance = total_income - total_expense
        
        return jsonify({
            'total_income': round(total_income, 2),
            'total_expense': round(total_expense, 2),
            'balance': round(balance, 2),
            'total_transactions': total_transactions
        })
    
    except Error as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)