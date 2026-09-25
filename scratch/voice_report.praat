# Praat Voice Report Automation Script
form Voice Report
  sentence File_path
  sentence Out_path
endform

sound = Read from file: file_path$
selectObject: sound
pitch = To Pitch (cc): 0.0, 75, 15, "yes", 0.03, 0.45, 0.01, 0.35, 0.14, 600

selectObject: sound
plusObject: pitch
pointProcess = To PointProcess (cc)

selectObject: sound
plusObject: pitch
plusObject: pointProcess
report$ = Voice report: 0, 0, 75, 600, 1.3, 1.6, 0.03, 0.45

writeFile: out_path$, report$
