@echo off
echo [Hook Installer] Copying git-hooks to .git/hooks...

xcopy /Y /Q git-hooks\* .git\hooks\

echo [Hook Installer] Done. Hook installed successfully!
