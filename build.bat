dotnet publish source/mkm.csproj -c Release -r win-x64
copy /Y source\bin\Release\net5.0\win-x64\publish\mkm.exe mkm_x64.exe