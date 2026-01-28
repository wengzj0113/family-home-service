-- Database schema for Home Service Platform

-- Users table (unified for customers and workers)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `phone` VARCHAR(20) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('customer', 'worker', 'admin') NOT NULL DEFAULT 'customer',
    `nickname` VARCHAR(50),
    `avatar` VARCHAR(255),
    `status` TINYINT DEFAULT 1 COMMENT '1: active, 0: disabled',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Worker profiles (extended info for workers)
CREATE TABLE IF NOT EXISTS `worker_profiles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `real_name` VARCHAR(50),
    `id_card_no` VARCHAR(20),
    `id_card_front` VARCHAR(255),
    `id_card_back` VARCHAR(255),
    `skills` TEXT COMMENT 'Comma separated skills or JSON',
    `rating` DECIMAL(3, 2) DEFAULT 5.00,
    `credit_score` INT DEFAULT 100,
    `service_count` INT DEFAULT 0,
    `audit_status` TINYINT DEFAULT 0 COMMENT '0: pending, 1: approved, 2: rejected',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders table
CREATE TABLE IF NOT EXISTS `orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_no` VARCHAR(50) NOT NULL UNIQUE,
    `customer_id` INT NOT NULL,
    `worker_id` INT,
    `service_type` VARCHAR(50) NOT NULL,
    `service_time` DATETIME NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `address_detail` TEXT,
    `contact_phone` VARCHAR(20),
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` TINYINT DEFAULT 0 COMMENT '0: pending(waiting for grab), 1: grabbed(ongoing), 2: completed, 3: cancelled, 4: paid',
    `remark` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`worker_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transactions table (wallet/accounting)
CREATE TABLE IF NOT EXISTS `transactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT,
    `user_id` INT NOT NULL COMMENT 'Receiver or sender of funds',
    `type` ENUM('payment', 'income', 'commission', 'withdrawal') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `balance_after` DECIMAL(10, 2) NOT NULL,
    `status` TINYINT DEFAULT 1 COMMENT '0: failed, 1: success',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Platform configurations (e.g., commission rate)
CREATE TABLE IF NOT EXISTS `platform_configs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `config_key` VARCHAR(50) NOT NULL UNIQUE,
    `config_value` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255),
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Initial configurations
INSERT INTO `platform_configs` (`config_key`, `config_value`, `description`) 
VALUES ('commission_rate', '0.08', 'Platform commission rate (0.05-0.10)');
