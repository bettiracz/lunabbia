<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('postal_code', 20)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('street_address', 150)->nullable();
            $table->string('address_extra', 100)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'postal_code',
                'city',
                'street_address',
                'address_extra',
            ]);
        });
    }
};