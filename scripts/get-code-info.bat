@echo off
rem 代码生成信息获取脚本（Windows）
rem 用途：输出规范的 @author 与 @since 信息，供 AI 生成代码注释时使用
rem
rem @author ElizabethNiu / elizaniu18@gmail.com
rem @since 2026-11-23 16:46:35

for /f "delims=" %%a in ('git config user.name 2^>nul') do set USER_NAME=%%a
for /f "delims=" %%a in ('git config user.email 2^>nul') do set USER_EMAIL=%%a

echo 作者信息：%USER_NAME% / %USER_EMAIL%
echo 生成时间：%DATE% %TIME%
echo.
echo 请在代码注释中使用如下格式：
echo  * @author %USER_NAME% / %USER_EMAIL%
echo  * @since %DATE% %TIME%
