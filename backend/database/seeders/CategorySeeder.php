<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['name' => 'Szappan', 'slug' => 'szappan'],
            ['name' => 'Testápolás', 'slug' => 'testapolas'],
            ['name' => 'Dezodor', 'slug' => 'dezodor'],
            ['name' => 'Ajakápolás', 'slug' => 'ajakapolas'],
            ['name' => 'Fürdőrituálé', 'slug' => 'furdorituale'],
        ] as $category) {
            Category::updateOrCreate(['slug' => $category['slug']], $category + ['active' => true]);
        }
    }
}

