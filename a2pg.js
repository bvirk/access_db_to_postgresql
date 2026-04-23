#!/usr/bin/env node
import { fldTypes } from './accessLists.js';
import { pgSql } from './pg.js';

let sqlInserCnt = 0;

function main(args) {
  if (args.length === 0) {
    return syntax();
  }

  if (args[0] === '--show-tables') {
    return request()
      .then(data => console.log(data.tables))
      .catch(err => console.error(err.message));
  }

  for (const arg of args) {
    if (arg.startsWith('-') && !['--one-record', '--create-tables'].includes(arg)) {
      return syntax();
    }
  }

  const oneRecordOnly = args.includes('--one-record');
  const createTables = args.includes('--create-tables');
  const tableName = args.find(arg => !arg.startsWith('-'));

  const selectPrefix = oneRecordOnly ? 'select top 1 * from ' : '';

  request()
    .then(data => {
      const tables = data.tables;

      if (tableName && !tables.includes(tableName)) {
        throw new Error(`table ${tableName} not found`);
      }

      const queries = (tableName ? [tableName] : tables)
        .map(t => `${selectPrefix}${t}`);

      return runChain(queries);
    })
    .then(allSqlLines => {
      if (createTables) {
        return pgSql(allSqlLines, true);
      } else {
        console.log(allSqlLines);
      }
    })
    .catch(err => console.error(err));
}

main(process.argv.slice(2));

function syntax() {
  console.log(`
a2pg --show-tables
  Show the names of all tables

a2pg [--one-record] [--create-tables] [table]
  View or export to PostgreSQL.
  If no table is given, all tables are processed.

REQUIREMENT
  The postgresql database must have defined this type:
    
  non_empty_text AS text CHECK (length(trim(VALUE)) > 0);

  as that becomes the postgresql field type for ms-access field property:
    
    allowZeroLength: false
`);
}

function request(sql) {
  const url = 'http://eee/a2pg.asp' +
    (sql ? `?sql=${encodeURIComponent(sql)}` : '');

  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP, status: ${response.status}`);
      }
      return response.json();
    });
}

function runChain(queries) {
  let chain = Promise.resolve();
  const allSqlLines = [];

  for (const sql of queries) {
    chain = chain.then(() =>
      request(sql).then(data => {
        const lines = syncTable(data);
        allSqlLines.push(lines);
      })
    );
  }

  return chain.then(() => allSqlLines);
}
/*
present psql DOMAIN

  non_empty_text AS text CHECK (length(trim(VALUE)) > 0);


ms-acces                    psql
--------------------------------
required: true              NOT NULL
allowZeroLength: false      non_empty_text

*/



function syncTable(jflds) {
  console.log(jflds);
  const hasApostrophe = /'/;
  const apostrophPattern = /'/g;

  let typeNames = [];
  let isAutoNumber = [];
  let isTextFld = [];
  let surCharOfFldNum = [];
  let sqlLines = [];

  let sqlIns = `insert into ${jflds.table}(`;

  function foreachField() {
    let isFirst = true;
    let sqlCreate = `create table ${jflds.table} (`;

    jflds.fields.forEach(item => {

      let [typeName, hasQuote, isTextField] = [
        fldTypes[item.type][1].length
          ? fldTypes[item.type][1]
          : fldTypes[item.type][0],
        [10, 12, 80, 81, 82].includes(item.type),
        [10, 12].includes(item.type)
      ];
      
      if ((item.type === 10 || item.type === 12)  && !item.allowZeroLength)
        typeName = 'non_empty_text'; 
                        

      typeNames.push(typeName);
      isAutoNumber.push(item.isAutoInc);
      isTextFld.push(isTextField);
      surCharOfFldNum.push(hasQuote ? "'" : '');



      sqlCreate += (isFirst ? '' : ',');
      sqlIns += (isFirst ? '' : ',');

      if (isFirst) isFirst = false;

      sqlIns += item.isAutoIncr ? 'origid' : item.name;

      if (item.name.toLowerCase() === "id" && typeName === "integer") {
        if (item.isAutoIncr) {
          sqlCreate += `${item.name} SERIAL PRIMARY KEY, origid integer`;
        } else {
          sqlCreate += `${item.name} INTEGER PRIMARY KEY`;
        }
      } else {
        const constraint =`${item.required ? ' NOT NULL' : ''}`;

        sqlCreate += `${item.name} ${typeName}${constraint}`;
      }
    }); // end foreach

    sqlIns += ') values(';
    sqlLines.push(sqlCreate + ')');
  }

  function foreachRecord() {
    jflds.records.forEach(record => {
      let sqlInsLine = sqlIns;
      let isFirst = true;

      for (let i = 0; i < record.length; i++) {
        sqlInsLine += (isFirst ? '' : ',');

        if (isFirst) isFirst = false;

        let surChar = record[i] === null ? '' : surCharOfFldNum[i];
        let selFld = record[i];

        if (isTextFld[i] && selFld !== null) {
          if (hasApostrophe.test(selFld)) {
            selFld = selFld.replace(apostrophPattern, "''");
          }
        }

        sqlInsLine += `${surChar}${selFld}${surChar}`;
      }

      sqlLines.push(`${sqlInsLine})`);
      sqlInserCnt++;
    });
  }

  foreachField();
  foreachRecord();

  return sqlLines;
}
