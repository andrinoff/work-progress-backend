// Backend SQL query to get email from api key
// This function retrieves the email associated with a given API key from the database.

import connection from "./connection";
import { RowDataPacket } from 'mysql2';

export default async function getEmail(apiKey: string): Promise<string | null> {
    try {
        // Use correct column name 'api_key' and pass the parameter
        const [rows] = await connection.promise().execute(
            'SELECT email FROM users WHERE api_key = ?', // Correct column name
            [apiKey] // Pass the apiKey parameter
        ) as [RowDataPacket[], any];

        if (rows.length > 0) {
            return rows[0].email; // Return the found email
        } else {
            const [rowsGithub]  = await connection.promise().execute(
                'SELECT email FROM github WHERE api_key = ?',
                [apiKey]
            ) as [RowDataPacket[], any];

            if (rowsGithub.length > 0) {
                return rowsGithub[0].email; // Return the found email
            }
            else {
                return null; // Email not found
            }
        }
    } catch (error) {
        console.error('Error getting email by API key:', error);
        throw error; // Propagate error
    }
}

