@echo off
echo [Hook Installer] Copying git hooks into .git/hooks...
xcopy /Y /Q git-hooks\* .git\hooks\
echo [Hook Installer] Done.
