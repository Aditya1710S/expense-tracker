-- Create database
CREATE DATABASE IF NOT EXISTS expense_tracker;
USE expense_tracker;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount FLOAT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO transactions (date, type, category, amount, description) VALUES
('2024-01-15', 'income', 'Salary', 5000.00, 'Monthly salary'),
('2024-01-16', 'expense', 'Food', 150.50, 'Grocery shopping'),
('2024-01-17', 'expense', 'Transport', 75.00, 'Bus fare'),
('2024-01-18', 'income', 'Freelance', 1200.00, 'Web development project'),
('2024-01-19', 'expense', 'Entertainment', 45.00, 'Movie tickets');