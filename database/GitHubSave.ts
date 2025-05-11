require("mysql2")
import newApi from "../api_keys/generate_api";
import connection from "./connection";


export default async function saveGitHub(email: string): Promise<string> {

    const sql = `
        INSERT INTO github (email, api_key) VALUES (?, ?)
    `;
    const sql2 = `
        INSERT IGNORE INTO time (api_key) VALUES (?)
    `;
    const apiKey = newApi()
    try {

        // Use .promise().query() and await the result
        await connection.promise().query(sql, [email, apiKey]);
        console.log('GitHub user inserted'); // Log success

    } catch (err) {
        console.error('Error saving GitHub user to database:', err);
        // Re-throw the error so the caller can handle it
        throw err;
    }
    try {
        // Use .promise().query() and await the result
        await connection.promise().query(sql2, apiKey);
        console.log('GitHub user inserted in time'); // Log success
    } catch (err) {
        console.error('Error saving GitHub user to database:', err);
        // Re-throw the error so the caller can handle it
        throw err;
    }
    return apiKey; // Return apiKey AFTER successful insertion
}