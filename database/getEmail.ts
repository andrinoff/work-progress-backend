import connection from "./connection";

export default function getEmail(api: string) :string {
    connection.execute( `
        CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        api_key VARCHAR(255)
        )
    `);
    const email = connection.execute(
        'SELECT email FROM users WHERE api = ?',
    )
    return email;
}