// /Users/andrinoff/Documents/local github projects/vscode_extensions/work-progress/work-progress-backend/database/getEmail.ts
import connection, { createTable } from "./connection";
import { RowDataPacket } from 'mysql2';

// Add async, return Promise<string | null>
export default async function getEmail(apiKey: string): Promise<string | null> {
    // Consider calling createTable only once at application startup if possible
    // createTable(); // You might remove this if called elsewhere reliably

    try {
        // Use correct column name 'api_key' and pass the parameter
        const [rows] = await connection.promise().execute(
            'SELECT email FROM users WHERE api_key = ?', // Correct column name
            [apiKey] // Pass the apiKey parameter
        ) as [RowDataPacket[], any];

        if (rows.length > 0) {
            return rows[0].email; // Return the found email
        } else {
            console.log('No email found for API key:', apiKey);
            return null; // API key not found
        }
    } catch (error) {
        console.error('Error getting email by API key:', error);
        throw error; // Propagate error
    }
}

