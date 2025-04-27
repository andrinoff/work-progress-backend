import newApi from "../api_keys/generate_api";
import connection from "./connection";

export default function saveToDatabase(email:string, password:string):string {
    const mysql = require('mysql2');
    connection.connect()
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        api_key VARCHAR(255)
        )
    `;

    connection.query(createTableQuery, (err: any, results: any) => {
        if (err) {
        console.error('Error creating table: ' + err.stack);
        return;
        }
        console.log('Table created or already exists');
    });

    const insertUserQuery = `
        INSERT INTO users (email, password, api) VALUES (?, ?, ?)
    `;
    const apiKey = newApi();
    connection.query(insertUserQuery, [email, password, ], (err: any, results: any) => {
        if (err) {
        console.error('Error inserting user: ' + err.stack);
        return;
        }
        console.log('User inserted');
    });

    connection.end();
    return apiKey.apiKey;
}