<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('name', 160);
            $table->string('slug', 180)->unique();
            $table->string('subtitle', 200)->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('price');
            $table->string('image_url', 500)->nullable();
            $table->string('theme', 40)->default('milk');
            $table->string('symbol', 12)->default('☾');
            $table->string('badge', 40)->nullable();
            $table->unsignedInteger('stock')->default(0);
            $table->boolean('active')->default(true)->index();
            $table->boolean('featured')->default(false)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};

