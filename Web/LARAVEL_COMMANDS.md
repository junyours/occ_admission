# Laravel Commands Reference

## Database Commands

### Running Seeders

```bash
# Run all seeders
php artisan db:seed

# Run a specific seeder
php artisan db:seed --class=UsersTableSeeder
php artisan db:seed --class=PersonalityTypesSeeder
php artisan db:seed --class=CourseDescriptionSeeder
php artisan db:seed --class=CourseSeeder           

# Run seeders with fresh database (drops all tables and recreates)
php artisan migrate:fresh --seed

# Run seeders with fresh database and drop all data
php artisan migrate:fresh --seed --force
```

### Migration Commands

```bash
# Run all pending migrations
php artisan migrate

# Rollback the last migration
php artisan migrate:rollback

# Rollback all migrations
php artisan migrate:reset

# Check migration status
php artisan migrate:status

# Show database connection info
php artisan db:show
```

### Cache Commands

```bash
# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Clear all caches at once
php artisan optimize:clear
```

## Development Commands

### Server Commands

```bash
# Start development server
php artisan serve

# Start server on specific host and port
php artisan serve --host=127.0.0.1 --port=8000
```

### Artisan Tinker

```bash
# Open Laravel tinker for database testing
php artisan tinker

# Example tinker commands:
# User::all()
# QuestionBank::count()
# Exam::with('questions')->get()
```

### Route Commands

```bash
# List all routes
php artisan route:list

# List routes for specific middleware
php artisan route:list --middleware=auth
```

## Project-Specific Commands

### CSV Import Commands

```bash
# Navigate to Web directory
cd Web

# Import exam questions (if you have the CSV file)
# This would be done through the web interface, but you can also:
# 1. Go to Question Bank Management
# 2. Click "Upload Questions"
# 3. Select your CSV file

# Import personality test questions
# 1. Go to Personality Test Management
# 2. Click "Upload Questions"
# 3. Select your CSV file
```

### Database Seeding Order

The recommended order for running seeders:

1. **UsersTableSeeder** - Creates admin users
2. **PersonalityTypesSeeder** - Creates MBTI personality types
3. **Any other custom seeders**

```bash
# Run in order
php artisan db:seed --class=UsersTableSeeder
php artisan db:seed --class=PersonalityTypesSeeder
```

## Troubleshooting Commands

### If you encounter issues:

```bash
# Clear all caches
php artisan optimize:clear

# Check if database is accessible
php artisan db:show

# Check migration status
php artisan migrate:status

# If you need to reset everything
php artisan migrate:fresh --seed
```

### Common Issues and Solutions

1. **"Class not found" errors**: Run `composer dump-autoload`
2. **Route not found**: Run `php artisan route:clear`
3. **Config issues**: Run `php artisan config:clear`
4. **Database connection issues**: Check `.env` file and run `php artisan db:show`

## Environment Setup

### Required Environment Variables

Make sure your `.env` file has:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### Composer Commands

```bash
# Install dependencies
composer install

# Update dependencies
composer update

# Regenerate autoload files
composer dump-autoload
```

## Quick Start Commands

For a fresh setup:

```bash
# 1. Install dependencies
composer install

# 2. Copy environment file
cp .env.example .env

# 3. Generate application key
php artisan key:generate

# 4. Configure database in .env file

# 5. Run migrations
php artisan migrate

# 6. Run seeders
php artisan db:seed

# 7. Start server
php artisan serve
```

## Notes

- Always run commands from the `Web` directory
- Make sure your database server (MySQL/MariaDB) is running
- Check the Laravel logs at `storage/logs/laravel.log` for errors
- Use `php artisan tinker` to test database queries interactively 