require('mysql2')
import connection from "./connection";


export async function getLatestTime(apiKey): Promise<number> {
    try {    
        const [rows] = await connection.promise().execute(
                'SELECT latestTime FROM latestTime WHERE api_key = ?', // Fetch api_key too
                [apiKey]
            );
        if (rows.length === 0) {
            return 0;
        }
        const latestTime = rows[0].latestTime;
        if (latestTime) {
            return latestTime;
        }
        else{
            return 0; // Default value if latestTime is null or undefined
        }
         
}catch (error) {
        console.error('Error getting latest time:', error);
        return 0; // Indicate database error
    }
}

export async function updateLatestTime(apiKey: string, latestTime: number): Promise<void> {
    try {
        
        await connection.promise().execute(
            'UPDATE latestTime SET latestTime = ? WHERE api_key = ?',
            [latestTime, apiKey]
        );
    } catch (error) {
        console.error('Error updating latest time:', error);
    }
}