// /Users/andrinoff/Documents/local github projects/vscode_extensions/work-progress/work-progress-backend/database/save.ts
import newApi from "../api_keys/generate_api";
import connection, { createTable } from "./connection";
import bcrypt from 'bcrypt';

// Change return type to Promise<string> and add async
export default async function saveToDatabase(email: string, password: string): Promise<string> {
    const apiKey = newApi();
    // Consider calling createTable only once at application startup if possible
    // createTable(); // You might remove this if called elsewhere reliably

    const sql = `
        INSERT INTO users (email, password, api_key) VALUES (?, ?, ?)
    `;
    const sql2 = `
        INSERT IGNORE INTO time (api_key) VALUES (?)
    `;

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        // Use .promise().query() and await the result
        const [result] = await connection.promise().query(sql, [email, hashedPassword, apiKey]);
        await connection.promise().query(sql2, apiKey);
        console.log('User inserted, ID:', result.insertId); // Log success
        return apiKey; // Return apiKey AFTER successful insertion
    } catch (err) {
        console.error('Error saving user to database:', err);
        // Re-throw the error so the caller (server.ts) can handle it
        throw err;
    }
}
