const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    queueLimit: 0
});
var sql = `CREATE TABLE IF NOT EXISTS users (
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) PRIMARY KEY
)`;

var sql2 = `CREATE TABLE IF NOT EXISTS time (
    api_key VARCHAR(255) PRIMARY KEY,
    monday INT DEFAULT 0,
    tuesday INT DEFAULT 0,
    wednesday INT DEFAULT 0,
    thursday INT DEFAULT 0,
    friday INT DEFAULT 0,
    saturday INT DEFAULT 0,
    sunday INT DEFAULT 0,
)`;
var sql3 = `CREATE TABLE IF NOT EXISTS latest(
    api_key VARCHAR(255) PRIMARY KEY,
    latest INT DEFAULT 0
)`
var githubsql = `CREATE TABLE IF NOT EXISTS github (
    email VARCHAR(255) NOT NULL UNIQUE,
    api_key VARCHAR(255) PRIMARY KEY
)`;
const createTable2 = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        connection.query(sql2, function (err, result) {
            if (err) {
                console.error("Error creating table:", err);
                return reject(err);
            }
            console.log("Table created or already exists.");
            resolve();
        });
    });
};

const createTableGitHub = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        connection.query(githubsql, function (err, result) {
            if (err) {
                console.error("Error creating table:", err);
                return reject(err);
            }
            console.log("Table created or already exists.");
            resolve();
        });
    });
};
const createTable = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        connection.query(sql, function (err, result) {
            if (err) {
                console.error("Error creating table:", err);
                return reject(err);
            }
            console.log("Table created or already exists.");
            resolve();
        });
    });
};
const createTable3 = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        connection.query(sql3, function (err, result) {
            if (err) {
                console.error("Error creating table:", err);
                return reject(err);
            }
            console.log("Table created or already exists.");
            resolve();
        });
    });
};

export default connection;
export { createTable, createTable2, createTableGitHub, createTable3 };