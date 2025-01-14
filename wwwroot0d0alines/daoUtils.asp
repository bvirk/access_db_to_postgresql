<%

sub p(mesg)
    pi mesg,0
end sub

Function getVal(obj, key,def)
    On Error Resume Next
    getVal = obj(key)
    if err.number = 0 then exit function
    getVal=def
    On Error GoTo 0
End Function

Function escapeJSON(str)
    Dim i, char, result, skipNext
    result = ""
    skipNext = False
    For i = 1 To Len(str)
        If skipNext Then
            skipNext = False
        Else
            char = Mid(str, i, 1)
            Select Case AscW(char)
                Case 8:  result = result & "\b"
                Case 9:  result = result & "\t"
                Case 10: result = result & "\n"
                Case 12: result = result & "\f"
                Case 13
                    If i < Len(str) And Mid(str, i + 1, 1) = Chr(10) Then
                        result = result & "\n"
                        skipNext = True
                    Else
                        result = result & "\n"
                    End If
                Case 34: result = result & "\"""
                Case 92: result = result & "\\"
                Case Else
                    If AscW(char) < 32 Then
                        result = result & "\u" & Right("0000" & Hex(AscW(char)), 4)
                    Else
                        result = result & char
                    End If
            End Select
        End If
    Next
    EscapeJSON = result
End Function

Function formatShortDate(dateValue) 'yyyy-mm-dd
    FormatShortDate = Year(dateValue) & "-" & _
                         Right("0" & Month(dateValue), 2) & "-" & _
                         Right("0" & Day(dateValue), 2)
End Function

Function formatTimestamp(dateValue)
    Dim yyyy, mm, dd, hh, nn, ss
    yyyy = Year(dateValue)
    mm = Right("0" & Month(dateValue), 2)
    dd = Right("0" & Day(dateValue), 2)
    hh = Right("0" & Hour(dateValue), 2)
    nn = Right("0" & Minute(dateValue), 2)
    ss = Right("0" & Second(dateValue), 2)
    FormatTimestamp = yyyy & "-" & mm & "-" & dd & " " & hh & ":" & nn & ":" & ss
End Function

Function formatShortTime(dateValue)
    Dim hh, nn, ss
    
    hh = Right("0" & Hour(dateValue), 2)
    nn = Right("0" & Minute(dateValue), 2)
    ss = Right("0" & Second(dateValue), 2)
    FormatShortTime = hh & ":" & nn & ":" & ss
End Function

sub pi(mesg,indent)
    if isempty(mesg) then mesg = "empty"
    if isnull(mesg) then mesg = "null"
    if not isarray(mesg) then 
        response.write(string(indent," ") & mesg & vbcrlf)
        exit sub
    end if
    dim item
    for each item in mesg
        pi item,indent+4
    next
end sub

Function ival(str)
    Dim regex, matches, match
    
    Set regex = New RegExp
    regex.Global = True
    regex.Pattern = "\$\{([^}]+)\}|\\([nrt`\\$])"
    
    For Each match In regex.Execute(str)
    	If match.SubMatches(0) <> "" Then
            str = Replace(str, match.Value, Eval(match.SubMatches(0)))
        Else
            Select Case match.SubMatches(1)
                Case "n"
                    str = Replace(str, match.Value, vbcrlf)
                'Case "r"
                '    str = Replace(str, match.Value, vbcrlf)
                Case "t"
                    str = Replace(str, match.Value, vbTab)
                Case "`", "\", "$"
                    str = Replace(str, match.Value, match.SubMatches(1))
            End Select
        End If
    Next
    ival = str
End Function

function rsi(dbFil,sql)
    set rsi=new AdoRS
    rsi.init dbFil,sql 
end function

class ADORS
    private notFirst
    private cn
    private db
    private isSchema
    private fldSur
    private fldTypeArr
    public rs
    public fCount
    public tableName
    
    function init(dbfil,sql)
		set cn = CreateObject("DAO.DBEngine.36")
		Set db = cn.OpenDatabase(dbfil)
        
        if isEmpty(sql) then
        	isSchema=true
        else
        	set rs=db.OpenRecordset(sql)
        	isSchema=false
        	Dim fromPos
        	fromPos = InStr(sql, "FROM")+InStr(sql, "from")
        	if fromPos > 0 then
        		tableName = Split(mid(sql, fromPos), " ")(1)
        	else
        		tableName=sql
        	end if
        	fCount = rs.fields.count
        end if
    end function
    
    function rows()
    	dim follows,comma
    	if not isSchema then
    		push rows,vbtab & """table"":""" & tableName & ""","
    		push rows, fldRow
    		while hasNext
				if follows then
					comma = ","
				else
					comma = " "
					follows=true
				end if
				push rows,vbtab & vbtab & comma & row 
			wend
		else
			dim tblDef,name
			for each tblDef in db.TableDefs
				name = tblDef.name
				if not left(name,4) = "MSys" then push rows,name
			next	
		end if
    end function
    

    private Sub Class_Terminate()
		'p "termination ado connection, typename of cn: " & typename(cn) 
		db.close
		set db=nothing
		set cn=nothing
	end sub
    
    function hasNext()
        if notFirst then rs.moveNext() else notFirst=true
        hasNext = not rs.eof
    end function
    
    function fldRow()
        dim fld, i, tblDef
        fldRow = vbtab & """fields"":["
        'for each fld in rs.fields
        '	fldRow = fldRow & "{""" & fld.name & """:[" & fld.Type & ",0]},"
        '    'push fldRow,array(fld.name,fld.type) 
        'next
        'fldRow = "tablename=" & tableName
        'exit function
        Set tblDef = db.TableDefs(tableName)
        
        const dbAutoIncrField=16
        const dbDate=8
        const dbDecimal=20
		For i = 0 To tblDef.fields.count - 1
			dim formatProp,isAutoIncr,fldType,required,allowZeroLength
			'scale=0
			'precision=0
			Set fld = tblDef.fields(i)
			fldType=fld.Type
			if fldType = 8 or fldType= 10 or fldType=12 then
				push fldSur,""""
			else
				push fldSur,""
			end if
			if fldType=dbDate then
				formatProp = getVal(fld.properties,"Format","General Date")
				fldType = 80 + (InStr(" Short Date      Short Time      General Date", formatProp) - 2) / 16
				'80:short date,81:short time,82:general date
			end if
			push fldTypeArr,fldType
			isAutoIncr = "false":required="false":allowZeroLength="false"
			If fld.Attributes And dbAutoIncrField Then isAutoIncr = "true"
			if fld.Required then required="true"
			if fld.allowZeroLength then allowZeroLength="true"
			'fldRow = fldRow & "{""" & fld.name & """:[" & fldType & "," & isAutoIncr & "," & fld.size  & "," & -fld.Required & "," & -fld.AllowZeroLength & "]},"
			fldRow = fldRow & _
				"{""name"":" & """" & fld.name & """," & _
				 """type"":" & fldType & "," & _
				 """isAutoIncr"":" & isAutoIncr & "," & _
				 """size"":" & fld.size & "," & _
				 """required"":" & required & "," & _
				 """allowZeroLength"":" & allowZeroLength & "},"
		Next
        fldRow = cutRest(fldRow,1) & "]," & vbcrlf & vbtab & """records"":["
        set fld=nothing
        set tblDef=nothing
    end function
    
    
    function row()
        'row = "|"
        dim i,fld,fldVal
		row = "["
		for i=0 to fCount-1
			fld = rs.fields(i)
			'if vartype(fld) >=7 then
			if isnull(fld) then
				fldVal = "null"
			elseif vartype(fld) = 11 then
				if fld then
					fldVal="true"
				else
					fldVal="false"
				end if
			else
				select case fldTypeArr(i):
					case 80: fldVal = formatShortDate(fld)
					case 81: fldVal = formatShortTime(fld)
					case 82: fldVal = formatTimeStamp(fld)
					case else
						fldVal = fld
				end select
				'if vartype(fldVal)=8 and len(fldVal)=0 then fldval = "empty"
				fldVal=fldSur(i) & escapeJSON(fldVal) & fldSur(i)
			end if
			row = row & fldVal & ","
		next
		row = cutRest(row,1) & "]"
    end function

end Class

Function cutRest(str, cutLen)
    cutRest = left(str, len(str)-cutLen)
End Function


Sub push(v, i)
    If IsEmpty(v) Then v = Array()
    ReDim Preserve v(UBound(v) + 1)
    If IsObject(i) Then Set v(UBound(v)) = i Else v(UBound(v)) = i
End Sub

Function fieldInfo(tableName)
    Dim db
    Dim tblDef
    Dim fld
    Dim formatProp, i, isAutoIncr
    
    'Set db = CurrentDb
    'Set tblDef = db.TableDefs(tableName)
    
    For i = 0 To tblDef.fields.count - 1
        Set fld = tblDef.fields(i)
        'dbAutoIncrField=16
        formatProp = ""
        isAutoIncr = 0
        'If fld.Attributes And dbAutoIncrField Then isAutoIncr = 1
        On Error Resume Next
        formatProp = fld.Properties("Format")
        On Error GoTo 0
        push fieldInfo, fld.name & ": type=" & fld.Type & ",format=" & formatProp & ",isAutoIncr=" & isAutoIncr
    Next
    
    Set fld = Nothing
    Set tblDef = Nothing
    Set db = Nothing
End Function



%>
