import connection from "./connection";
export default function checkUserExists(email: string): boolean {
  // Check if the user already exists in the database
  // and return true or false
  // connection.connect();
    const mysql = require('mysql2');
    try {
    const [rows] = connection.execute(
      'SELECT password FROM users WHERE email = ?',
      [email]
    );
    if (rows.length > 0) {
      // User exists
      console.log('User exists');
      return true;
    } else {
      // User does not exist
      console.log('User does not exist');
      return false;
    }
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  } finally {
    // connection.end();
  }
}
