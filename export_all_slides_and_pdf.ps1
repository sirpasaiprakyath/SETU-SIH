$pptApp = New-Object -ComObject PowerPoint.Application
$pptApp.Visible = [Microsoft.Office.Core.MsoTriState]::msoFalse

$deckPath = (Get-Item "SIH2026-IDEA-Presentation-Format.pptx").FullName
$pres = $pptApp.Presentations.Open($deckPath, [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)

$exportDir = (Get-Item ".").FullName + "\sih_deck_preview"
if (!(Test-Path $exportDir)) { New-Item -ItemType Directory -Path $exportDir }

# Export all slides as PNG images
for ($i = 1; $i -le $pres.Slides.Count; $i++) {
    $slide = $pres.Slides.Item($i)
    $outPng = "$exportDir\slide_$i.png"
    $slide.Export($outPng, "PNG", 1920, 1080)
    Write-Host "Exported slide $i to $outPng"
}

# Export 7-slide internal evaluation deck to PDF
$pdfPath = (Get-Item ".").FullName + "\SIH2026_IDEA_Presentation_PS26186_Internal_Review.pdf"
$pres.SaveAs($pdfPath, 32) # 32 = ppSaveAsPDF
Write-Host "Exported internal evaluation PDF to: $pdfPath"
$pres.Close()

# Open the 6-slide submission version and export to PDF
$deck6Path = (Get-Item "SIH2026_PS26186_Official_6Slide_Submission.pptx").FullName
$pres6 = $pptApp.Presentations.Open($deck6Path, [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)
$pdf6Path = (Get-Item ".").FullName + "\SIH2026_PS26186_Official_6Slide_Submission.pdf"
$pres6.SaveAs($pdf6Path, 32)
Write-Host "Exported 6-slide portal submission PDF to: $pdf6Path"
$pres6.Close()

$pptApp.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($pptApp) | Out-Null
Write-Host "All slides and PDFs exported successfully!"
