; ====================================================================
; Guidegram NSIS Custom Installer Extension
; Comprehensive Data Shield & Zero-Data-Loss Upgrade Engine
; ====================================================================

!macro customInit
  ; Terminate any existing Guidegram instances to prevent file locking & installer hang
  nsExec::Exec 'taskkill /F /IM Guidegram.exe /T'
  Sleep 300

  ; Runs at the very start of installer (.onInit)
  ; If an existing installation directory has data, snapshot it immediately before any uninstaller can run
  ${If} ${FileExists} "$INSTDIR\data\config.json"
    DetailPrint "Guidegram Data Shield: Existing data detected in $INSTDIR\data. Backing up..."
    CreateDirectory "$TEMP\Guidegram_Data_Upgrade_Backup\data"
    CreateDirectory "$TEMP\Guidegram_Data_Upgrade_Backup\data\sessions"
    CopyFiles /SILENT "$INSTDIR\data\*.*" "$TEMP\Guidegram_Data_Upgrade_Backup\data\"
    CopyFiles /SILENT "$INSTDIR\data\sessions\*.*" "$TEMP\Guidegram_Data_Upgrade_Backup\data\sessions\"

    ; Mirror to persistent APPDATA safe backup as well
    CreateDirectory "$APPDATA\Guidegram\safe_backup"
    CreateDirectory "$APPDATA\Guidegram\safe_backup\sessions"
    CopyFiles /SILENT "$INSTDIR\data\*.*" "$APPDATA\Guidegram\safe_backup\"
    CopyFiles /SILENT "$INSTDIR\data\sessions\*.*" "$APPDATA\Guidegram\safe_backup\sessions\"
  ${EndIf}
!macroend

!macro customUnInit
  ; Ensure process is closed before uninstallation starts
  nsExec::Exec 'taskkill /F /IM Guidegram.exe /T'
  Sleep 300
!macroend

!macro customInstall
  ; Ensure any lingering process is closed before file replacement
  nsExec::Exec 'taskkill /F /IM Guidegram.exe /T'
  Sleep 300

  ; Runs during install after new files are extracted
  DetailPrint "Guidegram Data Shield: Verifying data preservation and restoring sessions..."
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\sessions"

  ; If $INSTDIR\data\config.json is missing or was cleaned up during upgrade, restore from snapshot!
  ${IfNot} ${FileExists} "$INSTDIR\data\config.json"
    ${If} ${FileExists} "$TEMP\Guidegram_Data_Upgrade_Backup\data\config.json"
      DetailPrint "Guidegram Data Shield: Restoring config and sessions from upgrade snapshot..."
      CopyFiles /SILENT "$TEMP\Guidegram_Data_Upgrade_Backup\data\*.*" "$INSTDIR\data\"
      CopyFiles /SILENT "$TEMP\Guidegram_Data_Upgrade_Backup\data\sessions\*.*" "$INSTDIR\data\sessions\"
    ${ElseIf} ${FileExists} "$APPDATA\Guidegram\safe_backup\config.json"
      DetailPrint "Guidegram Data Shield: Restoring config and sessions from safe backup..."
      CopyFiles /SILENT "$APPDATA\Guidegram\safe_backup\*.*" "$INSTDIR\data\"
      CopyFiles /SILENT "$APPDATA\Guidegram\safe_backup\sessions\*.*" "$INSTDIR\data\sessions\"
    ${EndIf}
  ${Else}
    ; Destination data is intact - ensure safe backup is synced
    CreateDirectory "$APPDATA\Guidegram\safe_backup"
    CreateDirectory "$APPDATA\Guidegram\safe_backup\sessions"
    CopyFiles /SILENT "$INSTDIR\data\*.*" "$APPDATA\Guidegram\safe_backup\"
    CopyFiles /SILENT "$INSTDIR\data\sessions\*.*" "$APPDATA\Guidegram\safe_backup\sessions\"
  ${EndIf}

  ; Clean up temporary upgrade snapshot
  ${If} ${FileExists} "$TEMP\Guidegram_Data_Upgrade_Backup"
    RMDir /r "$TEMP\Guidegram_Data_Upgrade_Backup"
  ${EndIf}
!macroend

!macro customRemoveFiles
  ; CRITICAL DATA SHIELD:
  ; NEVER recursively wipe installation directory!
  ; Only delete application runtime binaries and assets, preserving
  ; the 'data' directory (sessions, accounts, settings, caches) and any user files intact.
  DetailPrint "Guidegram Data Shield: Preserving user sessions, config and data folder..."

  ; If data folder exists, snapshot it to safe_backup just in case
  ${If} ${FileExists} "$INSTDIR\data\config.json"
    CreateDirectory "$APPDATA\Guidegram\safe_backup"
    CreateDirectory "$APPDATA\Guidegram\safe_backup\sessions"
    CopyFiles /SILENT "$INSTDIR\data\*.*" "$APPDATA\Guidegram\safe_backup\"
    CopyFiles /SILENT "$INSTDIR\data\sessions\*.*" "$APPDATA\Guidegram\safe_backup\sessions\"
  ${EndIf}

  ; Remove only Guidegram app assets and runtime binaries
  RMDir /r "$INSTDIR\locales"
  RMDir /r "$INSTDIR\resources"
  Delete "$INSTDIR\Guidegram.exe"
  Delete "$INSTDIR\*.dll"
  Delete "$INSTDIR\*.bin"
  Delete "$INSTDIR\*.pak"
  Delete "$INSTDIR\*.dat"
  Delete "$INSTDIR\LICENSE*"
  Delete "$INSTDIR\version"
  Delete "$INSTDIR\vk_swiftshader_icd.json"
  Delete "$INSTDIR\vulkan-1.dll"
  Delete "$INSTDIR\Uninstall Guidegram.exe"
!macroend
