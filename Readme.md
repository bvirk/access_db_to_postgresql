## export access database to postgreSQL
access 2000 database exposed using vbscript in IIS 5.0 
destination: PostgreSQL 14.8 on linux

#### From table in ms-access to table in postgresql
two files in IIS document root:
```vbscript
a2pg.asp
daoUtils.asp
```
a2pg.asp decides the mdb file a2pg.mdb - at fixed path, c:\var\access  
NodeJS file a2pg.js fetches json data and shows or make tables

#### Rules for created a postgresql table, ptable, from imported access table, atable
    
- all ptables have primary key 'id'
- if atable primary key is an autonumber, its values are imported as origid and a new autonumber (seriel) is created in ptable
- all table- and field names are in lowercase singular snake - that are prior fixed in access database
- a field with samme name as another tables is foreign key to id an that table.
- psql has type:  non_empty_text, made this way at the psql prompt
```sql
CREATE DOMAIN non_empty_text AS text
CHECK (length(trim(VALUE)) > 0);
```
you could say, access text and memo fields properties is converted to psql types this way,
```text
|               access                  | psql                    |
|-------------------------------------- |-------------------------|
|required: true,  allowZeroLength: true | text NOT NULL           |        
|required: true,  allowZeroLength: false| non_empty_text NOT NULL |
|required: false, allowZeroLength: true | text                    |
|required: false, allowZeroLength: false| non_empty_text          |
```



#### Relations and origid example
```sql
alter table contra_acc_patterns add column account int;
```

```sql
UPDATE contra_acc_patterns
SET account = (
    SELECT id
    FROM account
    WHERE account.origid = contra_acc_patterns.konto
);
```
#### fix relations thoughts
File fixrelations.js outputs markdown. It illustrates together with a2pg.jpg how foreign keys can be changed from relate to origid to relate to id. Make the info by:
```markdown
$ ./fixRelations.js >fixRelations.md
```


