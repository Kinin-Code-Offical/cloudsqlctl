#define MyAppName "CloudSQLCTL"
#ifndef MyAppVersion
#define MyAppVersion "0.0.0"
#endif
#define MyAppPublisher "Kinin Code"
#define MyAppURL "https://github.com/Kinin-Code-Offical/cloudsqlctl"
#define MyAppExeName "cloudsqlctl.exe"
#define MyAppIcon "..\assets\logo.ico"

[Setup]
AppId={{8A4B2C1D-E3F4-5678-9012-3456789ABCDE}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
#ifexist MyAppIcon
SetupIconFile={#MyAppIcon}
#endif
DisableProgramGroupPage=yes
PrivilegesRequired=admin
OutputDir=..\dist
OutputBaseFilename=cloudsqlctl-setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\bin\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"

[Registry]
; Add to System PATH
Root: HKLM; Subkey: "SYSTEM\CurrentControlSet\Control\Session Manager\Environment"; ValueType: expandsz; ValueName: "Path"; ValueData: "{olddata};{app}"; Check: NeedsAddPath(ExpandConstant('{app}'))

; Environment Variables (Machine Scope) - Logic handled in Code section for smart reuse
Root: HKLM; Subkey: "SYSTEM\CurrentControlSet\Control\Session Manager\Environment"; ValueType: string; ValueName: "CLOUDSQLCTL_HOME"; ValueData: "{code:GetHomeDir}"; Flags: uninsdeletevalue
Root: HKLM; Subkey: "SYSTEM\CurrentControlSet\Control\Session Manager\Environment"; ValueType: string; ValueName: "CLOUDSQLCTL_LOGS"; ValueData: "{code:GetLogsDir}"; Flags: uninsdeletevalue
Root: HKLM; Subkey: "SYSTEM\CurrentControlSet\Control\Session Manager\Environment"; ValueType: string; ValueName: "CLOUDSQLCTL_PROXY_PATH"; ValueData: "{code:GetProxyPath}"; Flags: uninsdeletevalue

[Dirs]
Name: "{commonappdata}\CloudSQLCTL"; Permissions: admins-full system-full users-readexec
Name: "{commonappdata}\CloudSQLCTL\logs"; Permissions: admins-full system-full users-modify
Name: "{commonappdata}\CloudSQLCTL\bin"; Permissions: admins-full system-full users-readexec
Name: "{commonappdata}\CloudSQLCTL\secrets"; Permissions: admins-full system-full

[Code]
var
  ProxyPath: string;

function NeedsAddPath(Param: string): boolean;
var
  OrigPath: string;
begin
  if not RegQueryStringValue(HKEY_LOCAL_MACHINE,
    'SYSTEM\CurrentControlSet\Control\Session Manager\Environment',
    'Path', OrigPath)
  then begin
    Result := True;
    exit;
  end;
  Result := Pos(';' + Param + ';', ';' + OrigPath + ';') = 0;
end;

function GetHomeDir(Param: string): string;
var
  ExistingHome: string;
begin
  // Reuse existing HOME if set
  if RegQueryStringValue(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment', 'CLOUDSQLCTL_HOME', ExistingHome) then
  begin
    if DirExists(ExistingHome) then
    begin
      Result := ExistingHome;
      exit;
    end;
  end;
  Result := ExpandConstant('{commonappdata}\CloudSQLCTL');
end;

function GetLogsDir(Param: string): string;
begin
  Result := ExpandConstant('{commonappdata}\CloudSQLCTL\logs');
end;

function GetProxyPath(Param: string): string;
var
  ExistingProxy: string;
  CommonBin: string;
  UserBin: string;
begin
  // 1. Check Registry for existing
  if RegQueryStringValue(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment', 'CLOUDSQLCTL_PROXY_PATH', ExistingProxy) then
  begin
    if FileExists(ExistingProxy) then
    begin
      Result := ExistingProxy;
      exit;
    end;
  end;

  CommonBin := ExpandConstant('{commonappdata}\CloudSQLCTL\bin\cloud-sql-proxy.exe');
  
  // 2. Check if exists in Common AppData
  if FileExists(CommonBin) then
  begin
    Result := CommonBin;
    exit;
  end;

  // 3. Check User AppData (Migration scenario)
  UserBin := ExpandConstant('{localappdata}\CloudSQLCTL\bin\cloud-sql-proxy.exe');
  if FileExists(UserBin) then
  begin
    // Copy to Common AppData
    ForceDirectories(ExpandConstant('{commonappdata}\CloudSQLCTL\bin'));
    if CopyFile(UserBin, CommonBin, False) then
    begin
      Result := CommonBin;
      exit;
    end;
  end;

  // 4. Default
  Result := CommonBin;
end;
