SET BASEDIR=%~dp0
cd %BASEDIR:~0,-1%\..\flask
mkvirtualenv venv