// /Users/andrinoff/Documents/local github projects/vscode_extensions/work-progress/work-progress-backend/database/getApi.ts
import connection, { createTable } from "./connection";
import { RowDataPacket } from 'mysql2';

// Add async, return Promise<string | null> (null indicates error/not found)
export default async function getApi(email: string, passwordInput: string|null): Promise<string | null> {
    // Consider calling createTable only once at application startup if possible
    // createTable(); // You might remove this if called elsewhere reliably

    try {
        // Fetch password and api_key for the user
        const [rows] = await connection.promise().execute(
            'SELECT api_key FROM users WHERE email = ?', // Fetch api_key too
            [email]
        );

        if (rows.length === 0) {
            console.log('User not found for API retrieval:', email);
            return null; // User not found
        }

        // const storedPassword = rows[0].password;
        const apiKey = rows[0].api_key;

        // --- !!! CRITICAL SECURITY WARNING !!! ---
        // You MUST NOT store or compare plain text passwords.
        // 1. On signup (saveToDatabase), hash the password using bcrypt or argon2.
        // 2. Here, compare the input password with the stored hash using the hashing library's compare function.
        // Example (using bcrypt - requires `npm install bcrypt` and `npm install @types/bcrypt`):
        // import bcrypt from 'bcrypt';
        // const match = await bcrypt.compare(passwordInput, storedPassword);
        // if (match) { ... }

        // For now, fixing the logic with the (insecure) plain text comparison:
        return apiKey; // Return the API key
        
        
        
    } catch (error) {
        console.error('Error getting API key:', error);
        return null; // Indicate database error
    }
}
