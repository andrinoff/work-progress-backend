export default function checkUserExists(email: string): boolean {
    const mysql = require('mysql');
    const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

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
