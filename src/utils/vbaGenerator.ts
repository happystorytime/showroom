export const VBA_CODE_MODULE = `' ==============================================================================
' KARNATAKA RTO AGENT & MULTI-SHOWROOM DOCUMENT MANAGEMENT SYSTEM
' PRODUCTION VBA MACRO AUTOMATION MODULE (v4.0 - RTO ONLY)
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

Public Sub GoToShowrooms()
    On Error Resume Next
    Worksheets("SHOWROOMS").Activate
    Range("A4").Select
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

Public Sub GoToApplicationHistory()
    On Error Resume Next
    Worksheets("APPLICATION_HISTORY").Activate
    Range("A4").Select
End Sub

' ------------------------------------------------------------------------------
' 2. SEARCH COMMON CLIENT / VEHICLE ACROSS WORKBOOK
' ------------------------------------------------------------------------------
Public Sub SearchCommonClientOrVehicle()
    Dim wsCli As Worksheet, wsVeh As Worksheet
    Dim searchKey As String, findCell As Range

    searchKey = InputBox("Enter Client Name, Mobile Number, or Vehicle Registration Number:", "Search Common Registry")
    If Trim(searchKey) = "" Then Exit Sub

    Set wsCli = Worksheets("CLIENTS")
    Set wsVeh = Worksheets("VEHICLES")

    Set findCell = wsCli.Range("B:C").Find(What:=searchKey, LookIn:=xlValues, LookAt:=xlPart)
    If Not findCell Is Nothing Then
        wsCli.Activate
        findCell.Select
        MsgBox "Found Common Client: " & wsCli.Cells(findCell.Row, 2).Value & " (ID: " & wsCli.Cells(findCell.Row, 1).Value & ")", vbInformation, "Client Located"
        Exit Sub
    End If

    Set findCell = wsVeh.Range("C:C").Find(What:=searchKey, LookIn:=xlValues, LookAt:=xlPart)
    If Not findCell Is Nothing Then
        wsVeh.Activate
        findCell.Select
        MsgBox "Found Vehicle: " & wsVeh.Cells(findCell.Row, 3).Value & " (Owner: " & wsVeh.Cells(findCell.Row, 4).Value & ")", vbInformation, "Vehicle Located"
        Exit Sub
    End If

    MsgBox "No matching records found for: " & searchKey, vbExclamation, "Search Result"
End Sub

' ------------------------------------------------------------------------------
' 3. PRINT ACTIVE SHEET / REPORT
' ------------------------------------------------------------------------------
Public Sub PrintReport()
    On Error GoTo ErrHandler
    ActiveSheet.PrintPreview
    Exit Sub
ErrHandler:
    MsgBox "Could not open print preview: " & Err.Description, vbCritical, "Print Error"
End Sub

' ------------------------------------------------------------------------------
' 4. REFRESH DASHBOARD FORMULAS
' ------------------------------------------------------------------------------
Public Sub RefreshDashboard()
    Application.CalculateFull
    MsgBox "RTO Dashboard KPIs and multi-showroom formulas refreshed!", vbInformation, "Refreshed"
End Sub
`;

export function downloadVbaMacroModule(): void {
  const blob = new Blob([VBA_CODE_MODULE], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Karnataka_RTO_MultiShowroom_Macros.bas';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
