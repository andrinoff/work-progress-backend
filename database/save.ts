import newApi from "../api_keys/generate_api";
import connection from "./connection";

export default function saveToDatabase(email:string, password:string):string {
    const mysql = require('mysql2');
    connection.execute( `
        CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        api_key VARCHAR(255)
        )
    `);



     connection.execute( `
        INSERT INTO users (email, password, api) VALUES (?, ?, ?)
    `);
    const apiKey = newApi();
    console.log('User inserted');
    return apiKey;
}