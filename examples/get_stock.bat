
CHCP 65001

@echo off

set i=1

:start
  mkm get stock/%i% > stock_%i%.txt
  call :fsize "stock_%i%.txt"
  
  set /a i += 100
if %size% GTR 50 goto start


copy /b stock_*.txt stock.tmp
del stock_*.txt

echo ^<?xml version="1.0" encoding="utf-8"?^> > stock.xml
echo. ^<response^> >> stock.xml
findstr /R /V "^\<\?xml ^\<response ^\<\/response" stock.tmp >> stock.xml
echo. ^</response^> >> stock.xml

del stock.tmp

goto end

:fsize
  set size=%~z1
  exit /b 0
  
:end
