import connection from "./connection";
export default function checkUserExists(email: string): boolean {
  // Check if the user already exists in the database
  // and return true or false
  connection.connect();
    const mysql = require('mysql2');
    try {
    const [rows] = connection.execute(
      'SELECT password FROM users WHERE email = ?',
      [email]
    );
    return (rows)
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  } finally {
    connection.end();
  }
}
