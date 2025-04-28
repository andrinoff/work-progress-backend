import newApi from "../api_keys/generate_api";
import connection, { createTable } from "./connection";

export default function saveToDatabase(email:string, password:string):string {
    const mysql = require('mysql2');
    const apiKey = newApi();
    createTable();
    const sql = `
        INSERT INTO users (email, password, api_key) VALUES (?, ?, ?)
    `
    connection.query(sql, [email, password, apiKey], (err: any, result: any) => {
        if (err) throw err;
    });

    
    console.log('User inserted');
    return apiKey;
}