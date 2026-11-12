export const VBA_CODE_MODULE = `' ==============================================================================
' KARNATAKA RTO AGENT & TRACTOR SHOWROOM MANAGEMENT SYSTEM
' PRODUCTION VBA MACRO AUTOMATION MODULE (v3.2)
' Tested for Microsoft Excel 2016, 2019, 2021, and Office 365 on Windows & Mac
' ==============================================================================
Option Explicit

' ------------------------------------------------------------------------------
' 1. NAVIGATION MACROS
' ------------------------------------------------------------------------------
Public Sub GoToDashboard()
    On Error Resume Next
    Worksheets("DASHBOARD").Activate
    Range("A1").Select
End Sub

Public Sub GoToDataEntry()
    On Error Resume Next
    Worksheets("DATA_ENTRY").Activate
    Range("C5").Select
End Sub

Public Sub GoToClients()
    On Error Resume Next
    Worksheets("CLIENTS").Activate
    Range("A4").Select
End Sub

Public Sub GoToVehicles()
    On Error Resume Next
    Worksheets("VEHICLES").Activate
    Range("A4").Select
End Sub

Public Sub GoToApplications()
    On Error Resume Next
    Worksheets("RTO_APPLICATIONS").Activate
    Range("A4").Select
End Sub

Public Sub GoToDocuments()
    On Error Resume Next
    Worksheets("DOCUMENTS").Activate
    Range("A4").Select
End Sub

Public Sub GoToTractorStock()
    On Error Resume Next
    Worksheets("TRACTOR_STOCK").Activate
    Range("A4").Select
End Sub

Public Sub GoToTractorExchange()
    On Error Resume Next
    Worksheets("OLD_TRACTOR_EXCHANGE").Activate
    Range("A4").Select
End Sub

Public Sub GoToLoans()
    On Error Resume Next
    Worksheets("LOANS").Activate
    Range("A4").Select
End Sub

Public Sub GoToPayments()
    On Error Resume Next
    Worksheets("PAYMENTS").Activate
    Range("A4").Select
End Sub

Public Sub GoToExpenses()
    On Error Resume Next
    Worksheets("EXPENSES").Activate
    Range("A4").Select
End Sub

' ------------------------------------------------------------------------------
' 2. ONE-CLICK SAVE ENTRY AUTOMATION
' ------------------------------------------------------------------------------
Public Sub SaveEntry()
    Dim wsEntry As Worksheet, wsCli As Worksheet, wsVeh As Worksheet, wsApp As Worksheet, wsPay As Worksheet
    Dim clientName As String, mobile As String, vehNo As String, workType As String
    Dim nextCliId As String, nextVehId As String, nextAppId As String, nextTxnId As String
    Dim cliRow As Long, vehRow As Long, appRow As Long, payRow As Long
    Dim totalFees As Double, advancePaid As Double, balAmount As Double
    Dim findCell As Range
    
    Set wsEntry = Worksheets("DATA_ENTRY")
    Set wsCli = Worksheets("CLIENTS")
    Set wsVeh = Worksheets("VEHICLES")
    Set wsApp = Worksheets("RTO_APPLICATIONS")
    Set wsPay = Worksheets("PAYMENTS")
    
    ' Read Form Fields
    clientName = Trim(wsEntry.Range("C5").Value)
    mobile = Trim(wsEntry.Range("C6").Value)
    vehNo = UCase(Trim(wsEntry.Range("C12").Value))
    workType = Trim(wsEntry.Range("C20").Value)
    totalFees = Val(wsEntry.Range("C27").Value)
    advancePaid = Val(wsEntry.Range("C28").Value)
    balAmount = totalFees - advancePaid
    
    ' Validation
    If clientName = "" Then
        MsgBox "Client Name is required!", vbExclamation, "Validation Error"
        wsEntry.Range("C5").Select
        Exit Sub
    End If
    If mobile = "" Then
        MsgBox "Client Mobile Number is required!", vbExclamation, "Validation Error"
        wsEntry.Range("C6").Select
        Exit Sub
    End If
    If vehNo = "" Then
        MsgBox "Vehicle Number is required!", vbExclamation, "Validation Error"
        wsEntry.Range("C12").Select
        Exit Sub
    End If
    If workType = "" Then
        MsgBox "RTO Work Type is required!", vbExclamation, "Validation Error"
        wsEntry.Range("C20").Select
        Exit Sub
    End If
    
    ' Duplicate Check for Vehicle
    Set findCell = wsVeh.Range("C:C").Find(What:=vehNo, LookIn:=xlValues, LookAt:=xlWhole)
    If Not findCell Is Nothing Then
        If MsgBox("Vehicle " & vehNo & " already exists in database! Do you wish to create a new application for this existing vehicle?", vbYesNo + vbQuestion, "Duplicate Vehicle Notice") = vbNo Then
            Exit Sub
        End If
    End If
    
    ' Generate IDs
    cliRow = wsCli.Cells(wsCli.Rows.Count, "A").End(xlUp).Row + 1
    nextCliId = "CLI-" & (1000 + (cliRow - 3))
    
    vehRow = wsVeh.Cells(wsVeh.Rows.Count, "A").End(xlUp).Row + 1
    nextVehId = "VEH-" & (1000 + (vehRow - 3))
    
    appRow = wsApp.Cells(wsApp.Rows.Count, "A").End(xlUp).Row + 1
    nextAppId = "APP-" & (1000 + (appRow - 3))
    
    payRow = wsPay.Cells(wsPay.Rows.Count, "A").End(xlUp).Row + 1
    nextTxnId = "TXN-" & (1000 + (payRow - 3))
    
    ' 1. Save to CLIENTS Sheet
    wsCli.Cells(cliRow, 1).Value = nextCliId
    wsCli.Cells(cliRow, 2).Value = clientName
    wsCli.Cells(cliRow, 3).Value = mobile
    wsCli.Cells(cliRow, 4).Value = wsEntry.Range("C7").Value ' Alt Mobile
    wsCli.Cells(cliRow, 5).Value = wsEntry.Range("C8").Value ' Address
    wsCli.Cells(cliRow, 6).Value = wsEntry.Range("C9").Value ' Aadhaar
    wsCli.Cells(cliRow, 7).Value = Format(Date, "YYYY-MM-DD")
    wsCli.Cells(cliRow, 12).Value = wsEntry.Range("C10").Value ' Remarks
    
    ' 2. Save to VEHICLES Sheet
    wsVeh.Cells(vehRow, 1).Value = nextVehId
    wsVeh.Cells(vehRow, 2).Value = nextCliId
    wsVeh.Cells(vehRow, 3).Value = vehNo
    wsVeh.Cells(vehRow, 4).Value = clientName
    wsVeh.Cells(vehRow, 5).Value = wsEntry.Range("C13").Value ' Vehicle Type
    wsVeh.Cells(vehRow, 6).Value = wsEntry.Range("C14").Value ' Brand
    wsVeh.Cells(vehRow, 7).Value = wsEntry.Range("C15").Value ' Model
    wsVeh.Cells(vehRow, 8).Value = wsEntry.Range("C16").Value ' Year
    wsVeh.Cells(vehRow, 9).Value = wsEntry.Range("C17").Value ' Chassis
    wsVeh.Cells(vehRow, 10).Value = wsEntry.Range("C18").Value ' Engine
    wsVeh.Cells(vehRow, 11).Value = "Diesel"
    wsVeh.Cells(vehRow, 12).Value = Format(Date, "YYYY-MM-DD")
    wsVeh.Cells(vehRow, 13).Value = Format(DateAdd("yyyy", 15, Date), "YYYY-MM-DD")
    wsVeh.Cells(vehRow, 14).Value = Format(DateAdd("yyyy", 1, Date), "YYYY-MM-DD")
    wsVeh.Cells(vehRow, 15).Value = "Complete"
    
    ' 3. Save to RTO_APPLICATIONS Sheet
    wsApp.Cells(appRow, 1).Value = nextAppId
    wsApp.Cells(appRow, 2).Value = nextCliId
    wsApp.Cells(appRow, 3).Value = nextVehId
    wsApp.Cells(appRow, 4).Value = clientName
    wsApp.Cells(appRow, 5).Value = vehNo
    wsApp.Cells(appRow, 6).Value = workType
    wsApp.Cells(appRow, 7).Value = wsEntry.Range("C21").Value ' App Number
    wsApp.Cells(appRow, 8).Value = wsEntry.Range("C22").Value ' RTO Office
    wsApp.Cells(appRow, 9).Value = Format(Date, "YYYY-MM-DD")
    wsApp.Cells(appRow, 10).Value = Format(Date, "YYYY-MM-DD")
    wsApp.Cells(appRow, 11).Value = Format(DateAdd("d", 10, Date), "YYYY-MM-DD")
    wsApp.Cells(appRow, 12).Value = totalFees
    wsApp.Cells(appRow, 13).Value = advancePaid
    wsApp.Cells(appRow, 14).Formula = "=L" & appRow & "-M" & appRow
    wsApp.Cells(appRow, 15).Value = "New"
    wsApp.Cells(appRow, 16).Value = wsEntry.Range("C26").Value ' Description
    
    ' 4. Save Payment if advance paid > 0
    If advancePaid > 0 Then
        wsPay.Cells(payRow, 1).Value = nextTxnId
        wsPay.Cells(payRow, 2).Value = Format(Date, "YYYY-MM-DD")
        wsPay.Cells(payRow, 3).Value = nextCliId
        wsPay.Cells(payRow, 4).Value = clientName
        wsPay.Cells(payRow, 5).Value = vehNo
        wsPay.Cells(payRow, 6).Value = nextAppId
        wsPay.Cells(payRow, 7).Value = "Advance"
        wsPay.Cells(payRow, 8).Value = totalFees
        wsPay.Cells(payRow, 9).Value = advancePaid
        wsPay.Cells(payRow, 10).Value = 0
        wsPay.Cells(payRow, 11).Formula = "=I" & payRow & "+J" & payRow
        wsPay.Cells(payRow, 12).Formula = "=H" & payRow & "-K" & payRow
        wsPay.Cells(payRow, 13).Value = "Cash"
        wsPay.Cells(payRow, 14).Value = "INIT-" & Format(Now, "YYYYMMDDHHMM")
        wsPay.Cells(payRow, 15).Value = "Booking advance collected"
    End If
    
    MsgBox "SUCCESS! Record Saved Successfully!" & vbCrLf & _
           "Client ID: " & nextCliId & vbCrLf & _
           "Vehicle ID: " & nextVehId & vbCrLf & _
           "Application ID: " & nextAppId & vbCrLf & _
           "Balance Amount: ₹" & Format(balAmount, "#,##0.00"), vbInformation, "Saved to Database"
           
    ClearForm
End Sub

' ------------------------------------------------------------------------------
' 3. SEARCH CLIENT / VEHICLE
' ------------------------------------------------------------------------------
Public Sub SearchClient()
    Dim wsCli As Worksheet, wsVeh As Worksheet
    Dim searchKey As String, findCell As Range
    
    searchKey = InputBox("Enter Client Name, Mobile Number, or Vehicle Number to search:", "Search Record")
    If Trim(searchKey) = "" Then Exit Sub
    
    Set wsCli = Worksheets("CLIENTS")
    Set wsVeh = Worksheets("VEHICLES")
    
    ' First search in Clients by Mobile or Name
    Set findCell = wsCli.Range("B:C").Find(What:=searchKey, LookIn:=xlValues, LookAt:=xlPart)
    If Not findCell Is Nothing Then
        wsCli.Activate
        findCell.Select
        MsgBox "Found Client: " & wsCli.Cells(findCell.Row, 2).Value & " (ID: " & wsCli.Cells(findCell.Row, 1).Value & ")", vbInformation, "Record Located"
        Exit Sub
    End If
    
    ' Search in Vehicles
    Set findCell = wsVeh.Range("C:C").Find(What:=searchKey, LookIn:=xlValues, LookAt:=xlPart)
    If Not findCell Is Nothing Then
        wsVeh.Activate
        findCell.Select
        MsgBox "Found Vehicle: " & wsVeh.Cells(findCell.Row, 3).Value & " (Owner: " & wsVeh.Cells(findCell.Row, 4).Value & ")", vbInformation, "Record Located"
        Exit Sub
    End If
    
    MsgBox "No matching records found for: " & searchKey, vbExclamation, "Search Result"
End Sub

' ------------------------------------------------------------------------------
' 4. CLEAR FORM
' ------------------------------------------------------------------------------
Public Sub ClearForm()
    Dim wsEntry As Worksheet
    Set wsEntry = Worksheets("DATA_ENTRY")
    
    wsEntry.Range("C5:C10").ClearContents ' Client Info
    wsEntry.Range("C12:C18").ClearContents ' Vehicle Info
    wsEntry.Range("C20:C28").ClearContents ' Work & Fees Info
    wsEntry.Range("C5").Select
End Sub

' ------------------------------------------------------------------------------
' 5. PRINT ACTIVE SHEET / REPORT
' ------------------------------------------------------------------------------
Public Sub PrintReport()
    On Error GoTo ErrHandler
    ActiveSheet.PrintPreview
    Exit Sub
ErrHandler:
    MsgBox "Could not open print preview: " & Err.Description, vbCritical, "Print Error"
End Sub

' ------------------------------------------------------------------------------
' 6. REFRESH DASHBOARD
' ------------------------------------------------------------------------------
Public Sub RefreshDashboard()
    Application.CalculateFull
    MsgBox "Dashboard metrics and database calculations refreshed successfully!", vbInformation, "Refreshed"
End Sub
`;

export function downloadVbaMacroModule(): void {
  const blob = new Blob([VBA_CODE_MODULE], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Karnataka_RTO_Automation_Macros.bas';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
