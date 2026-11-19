<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_submit_an_order_total_is_calculated_and_stock_is_reduced(): void
    {
        $category = Category::create(['name' => 'Szappan', 'slug' => 'szappan', 'active' => true]);
        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'Luna szappan',
            'slug' => 'luna-szappan',
            'price' => 2490,
            'theme' => 'lavender',
            'symbol' => '☾',
            'stock' => 10,
            'active' => true,
            'featured' => true,
        ]);

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Kiss Anna',
            'email' => 'anna@example.com',
            'address' => '1085 Budapest, Példa utca 1.',
            'payment_method' => 'cash_on_delivery',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.total', 4980)
            ->assertJsonPath('data.payment_method', 'cash_on_delivery');

        $this->assertDatabaseHas('orders', [
            'email' => 'anna@example.com',
            'total' => 4980,
            'payment_method' => 'cash_on_delivery',
        ]);
        $this->assertDatabaseHas('order_items', [
            'product_id' => $product->id,
            'quantity' => 2,
            'line_total' => 4980,
        ]);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 8]);
    }
}
