// /Users/andrinoff/Documents/local github projects/vscode_extensions/work-progress/work-progress-backend/database/save.ts
import newApi from "../api_keys/generate_api";
import connection, { createTable } from "./connection";
import { OkPacket } from 'mysql2'; // Import type for insert result

// Change return type to Promise<string> and add async
export default async function saveToDatabase(email: string, password: string): Promise<string> {
    const apiKey = newApi();
    // Consider calling createTable only once at application startup if possible
    // createTable(); // You might remove this if called elsewhere reliably

    const sql = `
        INSERT INTO users (email, password, api_key) VALUES (?, ?, ?)
    `;

    try {
        // Use .promise().query() and await the result
        const [result] = await connection.promise().query(sql, [email, password, apiKey]);
        console.log('User inserted, ID:', result.insertId); // Log success
        return apiKey; // Return apiKey AFTER successful insertion
    } catch (err) {
        console.error('Error saving user to database:', err);
        // Re-throw the error so the caller (server.ts) can handle it
        throw err;
    }
}
