import connection from "./connection";
export default function checkUserExists(email: string): boolean {
  // Check if the user already exists in the database
  // and return true or false
  // connection.connect();
  connection.execute( `
        CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        api_key VARCHAR(255)
        )
    `);
    const mysql = require('mysql2');
    try {
    const rows:string = connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length > 0) {
      // User exists
      console.log('User exists');
      return true;
    }
    else if (rows === undefined) {
      return false
    }
    else {
      // User does not exist
      console.log('User does not exist');
      return false;
    }
  } catch (error) {
    console.error('Error checking user existence:', error);
    return error;
  } finally {
    // connection.end();
  }
}
