@echo off
setlocal enabledelayedexpansion

set "BASEDIR=%~dp0"
set "WRAPPER_JAR=%BASEDIR%.mvn\wrapper\maven-wrapper.jar"

java %MAVEN_OPTS% "-Dmaven.multiModuleProjectDirectory=%BASEDIR%" -classpath "%WRAPPER_JAR%" org.apache.maven.wrapper.MavenWrapperMain %*
