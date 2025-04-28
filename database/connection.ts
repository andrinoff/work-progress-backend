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
const createTable = ()    => {
    // connection.connect()
     connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Table created");
  }
    );}

export default connection;
export { createTable };