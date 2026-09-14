docker compose -f docker-compose.yml up -d

docker compose -f docker-compose.yml -f docker-compose.override.yml up quarkus

docker compose -f docker-compose.yml down

0. Rebuild app và start docker  
    docker compose build --no-cache app
    docker compose up -d

1. create filament steps


    docker exec -it php_app bash
    composer create-project laravel/laravel temp
    mv temp/* temp/.* .
    rm -rf temp

    composer require filament/filament:"^5.0"
    php artisan filament:install --panels

    php artisan migrate
    php artisan make:filament-user
    #admin panel/admin@gmail.com/123

2. Tạo model và migration cho bảng customers
    php artisan make:model Customer -m

    EDIT: database/migrations/...create_customers_table.php
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->timestamps();
        });
    php artisan migrate
    php artisan make:filament-resource Customer

    # Tạo dữ liệu giả
    php artisan make:seeder CustomerSeeder

    EDIT: database/seeders/CustomerSeeder.php
        public function run(): void
        {
            \App\Models\Customer::factory()->count(20)->create();
        }

    # Tạo factory    
    php artisan make:factory CustomerFactory --model=Customer
    
    EDIT: database/factories/CustomerFactory.php
        public function definition(): array
        {
            return [
                'name' => $this->faker->name(),
                'email' => $this->faker->unique()->safeEmail(),
                'phone' => $this->faker->phoneNumber(),
                'address' => $this->faker->address(),
            ];
        }
    
    EDIT: app/Models/Customer.php
            use Illuminate\Database\Eloquent\Factories\HasFactory;
            use Illuminate\Database\Eloquent\Model;

            class Customer extends Model
            {
                use HasFactory;

                protected $fillable = [
                    'name',
                    'email',
                    'phone',
                    'address',
                ];
            }
            
    # Chạy seeder:
    php artisan db:seed --class=CustomerSeeder
  

