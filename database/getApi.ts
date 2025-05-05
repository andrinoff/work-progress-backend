// /Users/andrinoff/Documents/local github projects/vscode_extensions/work-progress/work-progress-backend/database/getApi.ts
import connection, { createTable } from "./connection";
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcrypt';

// Add async, return Promise<string | null> (null indicates error/not found)
export default async function getApi(email: string, passwordInput: string|null): Promise<string | null> {
    // Consider calling createTable only once at application startup if possible
    // createTable(); // You might remove this if called elsewhere reliably

    try {
        // Fetch password and api_key for the user
        const [rows] = await connection.promise().execute(
            'SELECT password, api_key FROM users WHERE email = ?', // Fetch api_key too
            [email]
        );
        const sql2 = `
        INSERT INTO latestTime (api_key) VALUES (?)
    `;

        if (rows.length === 0) {
            console.log('User not found for API retrieval:', email);
            return null; // User not found
        }

        // const storedPassword = rows[0].password;
        const apiKey = rows[0].api_key;
        const password = rows[0].password;

        await connection.promise().query(sql2, apiKey);

        const passwordMatch = await bcrypt.compare(passwordInput || "", password); //Compares with hashed version in database

        if (passwordMatch) {
            return apiKey
        }
        else if (passwordInput == password){
            console.log("unhashed password match")
            return apiKey
        }
        else {
            return null
        }

    } catch (error) {
        console.error('Error getting API key:', error);
        return null; // Indicate database error
    }
}
