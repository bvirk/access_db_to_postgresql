### export access database to postgreSQL
source: access 2000 exposed using vbscript in iis 5.0 on winxp
destination: PostgreSQL 15.8 on debian 12.5

#### database on windows
name: fixed to same name as asp file, a2pg.mdb for a2pg.asp

path: fixed path in line 17 in asp file

#### node requirement:
npm install pg progress

#### Relations
##### Rules for making it easy
    
- all tables have primary key 'id'
- if primary key is an autonumber, its values are imported as origid and a new autonumber (seriel) is created.
- all table- and field names are in lowercase singular snake
- a field with samme name as another tables is foreign key to id an that table.

File fixrelations.js outputs markdown. It illustrates together with a2pg.jpg how foreign keys can be changed from relate to origid to relate to id. Make the info by:
```
$ ./fixRelations.js >fixRelations.md
```
