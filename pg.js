const { Pool } = require('pg');
const ProgressBar = require('progress');


const pool = new Pool({
    	user: 'bvirk',
    	password: 'ss',
    	host: 'localhost',
    	port: '5432',
    	database: 'bvirk',
});

async function pgSql(sqlArrArr,verbose=false, permitSql=false) {
    let client;
    try {
        client = await pool.connect();
    
        for (sqlArr of sqlArrArr) {

            const table =getTable(sqlArr[0])
            if (table) {
                console.log("table: %s",table)
                sqlArr.unshift(`drop table if exists ${table}`);
            }
            const bar = new ProgressBar(' sqls [:bar] :current inserts', { incomplete: ' ', total: sqlArr.length });
            for (sql of sqlArr) {
                try {
                    await client.query(sql);
                    bar.tick();
                } catch (queryError) {
                    throw queryError;
                }
            }
        }
    } catch (err) {
        console.log(err.message);
    } finally {
        client.release();
    }
}

function getTable(sqlCreateTable) {
    const leadWords = sqlCreateTable.split(/\s|\(/);

    return leadWords [0].toLowerCase() === 'create' 
        && leadWords [1].toLowerCase() === 'table'
        ? leadWords[2] : undefined;
}

module.exports = pgSql;
