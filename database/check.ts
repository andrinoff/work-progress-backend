// /Users/andrinoff/Documents/local github projects/vscode_extensions/work-progress/work-progress-backend/database/check.ts
import connection, { createTable } from "./connection";
import { RowDataPacket } from 'mysql2'; // Import type for rows

// Change return type to Promise<boolean> and add async
export default async function checkUserExists(email: string): Promise<boolean> {
  // Consider calling createTable only once at application startup if possible
  // createTable(); // You might remove this if called elsewhere reliably

  try {
    // Use .promise() for async/await and await the result
    // Specify expected row type for better type safety
    const [rows] = await connection.promise().execute(
      'SELECT email FROM users WHERE email = ? LIMIT 1', // Select only needed field, LIMIT 1 for efficiency
      [email]
    );

    console.log('Check User Exists - Rows found:', rows.length);

    // Check if any rows were returned
    if (rows.length > 0) {
      console.log('User exists');
      return true; // User found
    } else {
      console.log('User does not exist');
      return false; // User not found
    }
  } catch (error) {
    console.error('Error checking user existence:', error);
    // Re-throw the error to be handled by the caller (server.ts)
    // Returning false here could mask database issues and lead to trying to insert again
    throw error;
  }
  // No finally block needed here unless cleaning up resources specific to this function
}
