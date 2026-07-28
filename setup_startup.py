import os
import sys

startup_dir = os.path.expandvars(r"%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup")
target_bat = r"c:\Users\user\Desktop\프로젝트(숏폼)\run_server.bat"
work_dir = r"c:\Users\user\Desktop\프로젝트(숏폼)"
vbs_script_path = os.path.join(startup_dir, "start_gban_server.vbs")

# Create a VBScript in Startup folder that runs run_server.bat silently/minimized on Windows login
vbs_content = f'''Set WshShell = CreateObject("WScript.Shell")
WshShell.WorkingDirectory = "{work_dir}"
WshShell.Run """{target_bat}""", 0, False
'''

with open(vbs_script_path, "w", encoding="cp949") as f:
    f.write(vbs_content)

print(f"Created VBScript at: {vbs_script_path}")
