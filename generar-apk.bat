@echo off
rem Genera el APK de Sweet Rebel. Uso: generar-apk.bat https://TU-SITIO-PUBLICO
setlocal
if "%~1"=="" (
  echo Escribe la direccion HTTPS de tu sitio publicado.
  echo Ejemplo: generar-apk.bat https://sweetrebel.netlify.app
  exit /b 1
)
if "%ANDROID_HOME%"=="" if "%ANDROID_SDK_ROOT%"=="" (
  echo Falta instalar Android Studio y definir ANDROID_HOME.
  echo Normalmente ANDROID_HOME es C:\Users\TU_USUARIO\AppData\Local\Android\Sdk
  exit /b 1
)
java -version >nul 2>&1
if errorlevel 1 (
  echo Java 17 no esta disponible en PATH.
  exit /b 1
)
node --version >nul 2>&1
if errorlevel 1 (
  echo Node.js no esta disponible en PATH.
  exit /b 1
)
cd frontend
call npm install @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6 || exit /b 1
node -e "require('fs').writeFileSync('capacitor.config.json',JSON.stringify({appId:'com.sweetrebel.app',appName:'Sweet Rebel',webDir:'dist',server:{url:process.argv[1],androidScheme:'https'}},null,2))" "%~1"
call npm run build || exit /b 1
if not exist android call npx cap add android || exit /b 1
call npx cap sync android || exit /b 1
cd android
call gradlew.bat assembleDebug || exit /b 1
copy /Y app\build\outputs\apk\debug\app-debug.apk ..\public\sweet-rebel.apk
echo Listo: frontend\public\sweet-rebel.apk . Vuelve a publicar el sitio para que el boton "Descargar app" lo ofrezca.
