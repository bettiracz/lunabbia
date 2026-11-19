<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('quote_requests', 'orders');
        Schema::rename('quote_request_items', 'order_items');

        Schema::table('orders', function (Blueprint $table): void {
            $table->renameColumn('request_number', 'order_number');
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->string('payment_method', 30)->default('cash_on_delivery')->after('message');
        });

        Schema::table('order_items', function (Blueprint $table): void {
            $table->renameColumn('quote_request_id', 'order_id');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table): void {
            $table->renameColumn('order_id', 'quote_request_id');
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn('payment_method');
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->renameColumn('order_number', 'request_number');
        });

        Schema::rename('order_items', 'quote_request_items');
        Schema::rename('orders', 'quote_requests');
    }
};
