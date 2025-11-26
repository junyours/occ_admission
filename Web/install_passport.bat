@echo off
echo Installing Laravel Passport...
echo.

echo Step 1: Installing Passport via Composer...
composer require laravel/passport

echo.
echo Step 2: Publishing Passport configuration...
php artisan vendor:publish --tag=passport-config

echo.
echo Step 3: Installing Passport...
php artisan passport:install

echo.
echo Step 4: Clearing cache...
php artisan config:clear
php artisan cache:clear

echo.
echo Installation complete! Please check the PASSPORT_INSTALLATION_GUIDE.md for next steps.
pause 