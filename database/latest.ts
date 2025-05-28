import connection from "./connection";
import bcrypt from 'bcrypt';

// Change return type to Promise<string> and add async
export default async function getLatest(apiKey: string): Promise<string> {
    


    try {
        const [rows] = await connection.promise().execute(
            'SELECT latest FROM latest WHERE api_key = ?', // Fetch api_key too
            [apiKey]
        );
        return rows[0].latest

    } catch (err) {
        console.error('Error saving user to database:', err);
        // Re-throw the error so the caller (server.ts) can handle it
        throw err;
    }
}
