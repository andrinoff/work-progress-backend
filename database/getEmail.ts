import connection, { createTable } from "./connection";

export default function getEmail(api: string) :string {
    
    createTable();
    const email = connection.execute(
        'SELECT email FROM users WHERE api = ?',
    )
    return email;
}