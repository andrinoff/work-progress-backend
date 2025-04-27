import connection from "./connection";
export default function checkUserExists(email: string): boolean {
    const mysql = require('mysql');


  try {
    const [rows] = connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return (rows as any[]).length > 0;
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  } finally {
    connection.end();
  }
}
