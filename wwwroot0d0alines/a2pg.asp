<%@CodePage = 65001%>
<% option explicit %>
<%
Session.CodePage = 65001
Response.charset ="utf-8"
Response.ContentType="application/json"
Session.LCID     = 1033 'en-US
%>
<!--#include file ="daoUtils.asp"-->
<%
dim sql,db,line,follows,comma,pathElems,bareUrlPath,startTime,endTime
startTime=timer()
pathElems =split(Request.ServerVariables("path_info"),"/")
bareUrlPath=split(pathElems(ubound(pathElems)),".")(0)

'database name is the same as asp file
db="C:\var\access\" & bareUrlPath & ".mdb"
sql = Request.QueryString("sql")
if isEmpty(sql) then
	p "{ ""tables"":["
	for each line in rsi(db,empty).rows()
		if follows then
			comma=","
		else
			follows=true
			comma=" "
		end if
		p comma & """" & line & """"
	next
	p "]}"
else
	p "{"
	if inStr(sql," ")= 0 then
		sql="select * FROM " & sql
	end if
	for each line in rsi(db,sql).rows()
		p line
	next
	endTime=timer()
	p ival("\t],\n\t""timeElapsed"":${endTime-startTime}\n}")
end if
%>
