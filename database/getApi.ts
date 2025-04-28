import connection from "./connection";
export default function getApi(email: string, password: string) :string {
    const mysql = require('mysql2');
    try {
        const password = connection.execute(
        'SELECT password FROM users WHERE email = ?',
        [email]
        );
        if (password == password) {
            const apiKey = connection.execute(
                'SELECT api FROM users WHERE email = ?',
                [email]
            );
            return apiKey;
        }
        else {
            console.log('Password does not match');
            return 'error';
        }
        }
    catch (error) {
        console.error('Error checking user existence:', error);
        return 'error ' + error;
    } finally {
        // connection.end();
    }
}
