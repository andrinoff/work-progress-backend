import connection from "./connection";
import bcrypt from 'bcrypt';

// Change return type to Promise<string> and add async
export async function getLatest(apiKey: string): Promise<string> {
    


    try {
        const [rows] = await connection.promise().execute(
            'SELECT latest FROM latest WHERE api_key = ?', // Fetch api_key too
            [apiKey]
        );
        return rows[0].latest

    } catch (err) {
        console.error('Error updating latest for user to database:', err);
        // Re-throw the error so the caller (server.ts) can handle it
        throw err;
    }
}
export async function saveLatest(apiKey: string, latest: string): Promise<void> {
    try {
        // Use a prepared statement to prevent SQL injection
        await connection.promise().execute(
            'INSERT INTO latest (api_key, latest) VALUES (?, ?) ON DUPLICATE KEY UPDATE latest = ?',
            [apiKey, parseFloat(latest)]
        );
    } catch (err) {
        console.error('Error saving latest to database:', err);
        // Re-throw the error so the caller (server.ts) can handle it
        throw err;
    }
}