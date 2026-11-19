<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $product = $this->route('product');

        return [
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:160'],
            'slug' => ['required', 'string', 'max:180', Rule::unique('products', 'slug')->ignore($product?->id)],
            'subtitle' => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:5000'],
            'price' => ['required', 'integer', 'min:0', 'max:10000000'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'theme' => ['required', 'string', 'max:40'],
            'symbol' => ['required', 'string', 'max:12'],
            'badge' => ['nullable', 'string', 'max:40'],
            'stock' => ['required', 'integer', 'min:0', 'max:1000000'],
            'active' => ['required', 'boolean'],
            'featured' => ['required', 'boolean'],
        ];
    }
}

