import connection from "./connection";

export default function getEmail(api: string) :string {
    const email = connection.execute(
        'SELECT email FROM users WHERE api = ?',
    )
    return email;
}