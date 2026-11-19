<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_api_only_returns_active_products(): void
    {
        $category = Category::create(['name' => 'Szappan', 'slug' => 'szappan', 'active' => true]);

        Product::create($this->productData($category->id, 'Aktív', 'aktiv', true));
        Product::create($this->productData($category->id, 'Inaktív', 'inaktiv', false));

        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Aktív');
    }

    private function productData(int $categoryId, string $name, string $slug, bool $active): array
    {
        return [
            'category_id' => $categoryId,
            'name' => $name,
            'slug' => $slug,
            'subtitle' => null,
            'description' => null,
            'price' => 2490,
            'image_url' => null,
            'theme' => 'milk',
            'symbol' => '☾',
            'badge' => null,
            'stock' => 10,
            'active' => $active,
            'featured' => false,
        ];
    }
}

