require("mysql2");
import connection from "./connection";

export default async function checkGitHub(email: string): Promise<string | null> {
    try {
        const [rows] = await connection.promise().execute(
            'SELECT api_key FROM github WHERE email = ?',
            [email]
        );
        if (rows.length > 0) {
            return rows[0].api_key; // Return the found api_key
        } else {
            console.log('No API key found for email:', email);
            return null; // Email not found
        }
    } catch (error) {
        console.error('Error getting API key by email:', error);
        throw error; // Propagate error
    }
}