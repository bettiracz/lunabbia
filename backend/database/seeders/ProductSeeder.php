<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $categories = Category::pluck('id', 'slug');

        $products = [
            ['category' => 'szappan', 'name' => 'Luna levendulás szappan', 'slug' => 'luna-levendulas-szappan', 'subtitle' => 'Nyugtató esti rituálé', 'price' => 2490, 'badge' => 'Kedvenc', 'theme' => 'lavender', 'symbol' => '✦', 'featured' => true],
            ['category' => 'szappan', 'name' => 'Latte kecsketejes szappan', 'slug' => 'latte-kecsketejes-szappan', 'subtitle' => 'Krémes gyengédség', 'price' => 2690, 'badge' => 'Új', 'theme' => 'milk', 'symbol' => '☾', 'featured' => true],
            ['category' => 'szappan', 'name' => 'Terra körömvirágos szappan', 'slug' => 'terra-koromviragos-szappan', 'subtitle' => 'Gondoskodás érzékeny bőrre', 'price' => 2390, 'badge' => null, 'theme' => 'calendula', 'symbol' => '❋', 'featured' => true],
            ['category' => 'testapolas', 'name' => 'Abbondanza testvaj', 'slug' => 'abbondanza-testvaj', 'subtitle' => 'Shea- és kakaóvajjal', 'price' => 4290, 'badge' => 'Limitált', 'theme' => 'cocoa', 'symbol' => '◐', 'featured' => true],
            ['category' => 'dezodor', 'name' => 'Gioia citrusos dezodor', 'slug' => 'gioia-citrusos-dezodor', 'subtitle' => 'Friss, természetes védelem', 'price' => 3190, 'badge' => null, 'theme' => 'citrus', 'symbol' => '☼', 'featured' => false],
            ['category' => 'ajakapolas', 'name' => 'Amore ajakbalzsam', 'slug' => 'amore-ajakbalzsam', 'subtitle' => 'Puha, ápolt ajkak', 'price' => 1890, 'badge' => null, 'theme' => 'rose', 'symbol' => '♡', 'featured' => false],
            ['category' => 'furdorituale', 'name' => 'Luce fürdősó', 'slug' => 'luce-furdoso', 'subtitle' => 'Levendulával és ásványi sóval', 'price' => 2890, 'badge' => null, 'theme' => 'salt', 'symbol' => '✧', 'featured' => false],
            ['category' => 'testapolas', 'name' => 'Fortuna botanikai olaj', 'slug' => 'fortuna-botanikai-olaj', 'subtitle' => 'Tápláló növényi olajkeverék', 'price' => 4990, 'badge' => 'Prémium', 'theme' => 'olive', 'symbol' => '❧', 'featured' => false],
        ];

        foreach ($products as $product) {
            $categorySlug = $product['category'];
            unset($product['category']);

            Product::updateOrCreate(
                ['slug' => $product['slug']],
                $product + [
                    'category_id' => $categories[$categorySlug],
                    'description' => $product['subtitle'],
                    'image_url' => null,
                    'stock' => 25,
                    'active' => true,
                ],
            );
        }
    }
}

