CREATE DATABASE IF NOT EXISTS rumahkita CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS rumahkita_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'rumahkita'@'127.0.0.1' IDENTIFIED BY 'rumahkita_local';
CREATE USER IF NOT EXISTS 'rumahkita'@'localhost' IDENTIFIED BY 'rumahkita_local';
GRANT ALL PRIVILEGES ON rumahkita.* TO 'rumahkita'@'127.0.0.1';
GRANT ALL PRIVILEGES ON rumahkita_test.* TO 'rumahkita'@'127.0.0.1';
GRANT ALL PRIVILEGES ON rumahkita.* TO 'rumahkita'@'localhost';
GRANT ALL PRIVILEGES ON rumahkita_test.* TO 'rumahkita'@'localhost';
ALTER USER 'root'@'localhost' IDENTIFIED BY 'LocalRootOnly123!';
