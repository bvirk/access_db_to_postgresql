#!/usr/bin/env node
const {pl} = require('./comUtils.js');

pl(`#Rearrange relation\n\n`);

pl(`## Delete column origid in tables which id is not part in relations\n`);

for (let tblName of ['draft_quantity', 'email',  'phone','quantity',])
    pl(`ALTER TABLE ${tblName} DROP COLUMN origid;`);

pl(`## Alter foreign keys that related to origid to now relate  to id\n\n`);

let fields=`
SELECT j.id 
  ,j.date 
  ,j.transaction_id
`;
  
let froms=`FROM journal j
`;

const tableTrail = [
     ['account','journal','  ,a.name AS account\n  ,j.amount','LEFT JOIN account a ON j.account=a.id']
    ,['account','draft_journal','','']
    ,['doc_numerator','account','\n  ,de.name as doc_enum','\nLEFT JOIN doc_numerator de on de.id=a.doc_numerator']
    ,['doc','journal','\n  ,d.id as docid','\nLEFT JOIN doc d ON j.doc=d.id']
    ,['doc','draft_journal','','']
    ,['person','doc','\n  ,p.name AS seller','\nLEFT JOIN person p ON d.person=p.id']
    ,['','','\n  ,z.city','\nLEFT JOIN zipnumber z on p.zipnumber=z.id']
    ,['person','email','\n  ,e.name as email','\nLEFT JOIN email e on p.id=e.person']
    ,['person','phone','\n  ,ph.number','\nLEFT JOIN phone ph on p.id=ph.person']
    ,['journal','quantity','\n  ,q.amount as pcs','\nLEFT JOIN quantity q on j.id=q.journal']
    ,['trade_unit','quantity','\n  ,t.unit as unit','\nLEFT JOIN trade_unit t on q.trade_unit=t.id']
    ,['article','trade_unit','\n  ,ar.name as article','\nLEFT JOIN article ar on t.article=ar.id']
    ,['unit','trade_unit','\n,  u.name as unit','\nLEFT JOIN unit u on t.unit=u.id']
    ,['draft_journal','draft_quantity','','']
    ,['trade_unit','draft_quantity','','']
    ];

for (let [hasIdTbl,fkTbl,fieldsApp,fromsApp] of tableTrail) {
    if (hasIdTbl) {
        pl(`### ~~${fkTbl}.${hasIdTbl}=${hasIdTbl}.origid~~ --> ${fkTbl}.${hasIdTbl}=${hasIdTbl}.id\n\n`);
        
        pl(`ALTER TABLE ${fkTbl} ADD COLUMN new${hasIdTbl} integer;`);
        
        
        pl('WITH joined_data AS (');
        pl(`SELECT ${hasIdTbl}.id, ${hasIdTbl}.origid as origid,${fkTbl}.new${hasIdTbl} FROM ${hasIdTbl}  INNER JOIN ${fkTbl} ON ${hasIdTbl}.origid=${fkTbl}.${hasIdTbl}`);
        pl(`) update ${fkTbl} set new${hasIdTbl} = joined_data.id FROM joined_data`);
        pl(`WHERE ${fkTbl}.${hasIdTbl} = joined_data.origid;`);
        
        pl(`ALTER TABLE ${fkTbl} DROP COLUMN ${hasIdTbl};`);
        
        pl(`ALTER TABLE ${fkTbl} RENAME COLUMN new${hasIdTbl} TO ${hasIdTbl};\n`)
    }
    fields += fieldsApp;
    froms += fromsApp;
    pl(fields);
    pl(froms);
    pl('ORDER BY date DESC , transaction_id DESC;\n\n');
} 
    

