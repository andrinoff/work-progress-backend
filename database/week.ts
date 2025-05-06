require('mysql2')
import connection from "./connection";


export async function getWeekTime(apiKey) {
    try {    
        const [rows] = await connection.promise().execute(
                'SELECT monday,tuesday,wednesday,thursday,friday,saturday,sunday FROM time WHERE api_key = ?', // Fetch api_key too
                [apiKey]
            );
        if (rows.length === 0) {
            return 0;
        }
        const monday = parseInt(rows[0].monday, 10);
        const tuesday = parseInt(rows[0].tuesday, 10);
        const wednesday = parseInt(rows[0].wednesday, 10);
        const thursday = parseInt(rows[0].thursday, 10);
        const friday = parseInt(rows[0].friday, 10);
        const saturday = parseInt(rows[0].saturday, 10);
        const sunday = parseInt(rows[0].sunday, 10);
        const totalTime = monday + tuesday + wednesday + thursday + friday + saturday + sunday;
        console.log(`Latest time retrieved: ${totalTime}`);
        return [
            monday,
            tuesday,
            wednesday,
            thursday,
            friday,
            saturday,
            sunday,
            totalTime
        ];
         
}catch (error) {
        console.error('Error getting latest time:', error);
        return 0; // Indicate database error
    }
}

export async function updateLatestTime(apiKey: string, dayTime: number, day:string): Promise<void> {
    try {
        await connection.promise().execute(
            'UPDATE time SET ' + day + ' = ? WHERE api_key = ?',
            [dayTime, apiKey]
        );
    } catch (error) {
        console.error('Error updating latest time:', error);
    }
}