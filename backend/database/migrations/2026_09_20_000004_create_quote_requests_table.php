<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quote_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('request_number', 40)->unique();
            $table->string('customer_name', 160);
            $table->string('email', 190)->index();
            $table->string('phone', 40)->nullable();
            $table->string('address', 255);
            $table->text('message')->nullable();
            $table->string('status', 30)->default('new')->index();
            $table->unsignedInteger('total');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_requests');
    }
};

