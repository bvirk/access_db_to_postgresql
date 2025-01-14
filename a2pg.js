#!/usr/bin/env node
const {pl} = require('./utils.js');
const {fldTypes} =  require('./accessLists.js');
const pgSql = require('./pg.js');
const fetch = require('node-fetch');

let tables=[];
let sqldms=[];
let allSqlLines=[];
let sqlforOneRecord;
let sqlInserCnt=0;

args = process.argv.slice(2);
if (args.length) {
    const req =request(undefined,putTables,true); 
    if (args[0]=='showtables')
        req.then(() => pl(tables)).catch(err => console.error(err.message));
    else {
        let [one,topg]=[
            args.includes('-1'),
            args.includes('-x')
            ];
        sqlforOneRecord = one ? 'select top 1 * from ' : '';
        const tblI =0 + +one + +topg;
        let onlyTable = args.slice(tblI,tblI+1)[0];
        req
        .then(() => {
            if (onlyTable && !tables.includes(onlyTable))
                return Promise.reject (new Error(`table ${onlyTable} not found`));
          
            sqldms = onlyTable ? [onlyTable] : tables;
            sqldms = sqldms.map(i => `${sqlforOneRecord}${i}`);
            return chained(!topg);
        })
        .then(() => {
            if (topg) 
                pgSql(allSqlLines,true);
            else
                pl(allSqlLines);
            //pl(`${sqlInserCnt} rows inserted`);
        })
        .catch(err => console.error(err.message));
        

    } // else not showtables
} else  // no args
    syntax();


function syntax() {
    pl('a2pg showtables');
    pl('    Show the names of all tables\n');
    pl('a2pg [-1] [-x] [table]');
    pl('    view or export to postgreSql (-x) - just 1 record or the whole table (-1) of a table or all tables\n');
}

function putTables(tablesProp) {
    tables= tablesProp.tables;
}

function request(sql,reciever) {
    const url  = 'http://eee/a2pg.asp'+(sql ? ('?sql='+encodeURIComponent(sql)):'');
    return fetch(url)
        .then(response => { 
            if (!response.ok)
                return Promise.reject(new Error(`HTTP, status: ${response.status}`));
            return response.json(); 
        })
        .then(data => reciever(data))
        .catch(error => Promise.reject(error));
}

function chained() {
    let chain = Promise.resolve();

    for (let sqld of sqldms) {
        chain = chain.then(() => request(sqld,syncTable));
    }
    return chain;
}


function syncTable(jflds) {
    const hasApostrophe = /'/;
    const apostrophPattern = /'/g;
    let typeNames = []
    let isAutoNumber=[];
    let isTextFld = [];
    let surCharOfFldNum=[];
    let sqlLines=[];

    let sqlIns=`insert into ${jflds.table}(`;

    function foreachField() {  
        let isFirst=true;
        let sqlCreate=`create table ${jflds.table} (`;
        jflds.fields.forEach(item => {
            let sizeadd = '';
            const [typeName, hasQuote, isTextField]  = [
                fldTypes[item.type][1].length ? fldTypes[item.type][1] : fldTypes[item.type][0]
                ,[10,12,80,81,82].includes(item.type)
                ,[10,12].includes(item.type)];
            
            // now we are here - for later use 
            typeNames.push(typeName);
            isAutoNumber.push(item.isAutoInc); // 0 or 1
            isTextFld.push(isTextField);
            surCharOfFldNum.push(hasQuote ? "'":'');

            // the create table part
            const textAllowZL = (typeName === 'varchar') && !item.allowZeroLength; // 0=allow
            if (typeName === 'varchar')
                sizeadd = '('+item.size+')';
            
            sqlCreate +=(isFirst ? '' : ',');
            
            // now we are here for later user
            sqlIns += (isFirst ? '' : ',');
            if (isFirst) isFirst=false; // for both above
            sqlIns += item.isAutoIncr ? 'origid' : item.name;


            if (item.name.toLowerCase() === "id" && typeName === "integer") {
                if (item.isAutoIncr)
                    sqlCreate += `${item.name} SERIAL PRIMARY KEY, origid integer`;
                else
                    sqlCreate += `${item.name} INTEGER PRIMARY KEY`;
            } else {
                //const constraint = ["NOT NULL", "NOT NULL CHECK (myfield <> '')"][isTextFld ? 1 : 0];
                const constraint = 
                        `${item.required ? ' NOT NULL' : ''}${textAllowZL ? ` CHECK (${item.name} <> '')`: ''}`; 
                sqlCreate += `${item.name} ${typeName}${sizeadd}${constraint} `;
            }

            

        });
        sqlIns += ') values(';
        //sqlLines.push(`drop  table if exists ${jflds.table}`);
        sqlLines.push(sqlCreate+')');
        
    }
    function foreachRecord() {
        jflds.records.forEach(record => {
            let sqlInsLine=sqlIns;  // same start of insert for each record
            let isFirst=true;
            for (let i = 0; i < record.length; i++) {
                sqlInsLine +=  (isFirst ? '' : ',')
                if (isFirst)
                    isFirst=false;
                let  surChar = record[i] === null ? '' : surCharOfFldNum[i];
                let selFld = record[i];
                if (isTextFld[i] &&  selFld !== null)
                    if (hasApostrophe.test(selFld))
                        selFld = selFld.replace(apostrophPattern,"''") 
                sqlInsLine +=`${surChar}${selFld}${surChar}`; 
            }
            sqlLines.push(`${sqlInsLine})`);
            sqlInserCnt++;
        });
    }
    foreachField();
    foreachRecord();
    allSqlLines.push(sqlLines);
}


