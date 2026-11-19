<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CategoryRequest;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Category::withCount('products')->orderBy('name')->get()]);
    }

    public function store(CategoryRequest $request): JsonResponse
    {
        return response()->json(['data' => Category::create($request->validated())], 201);
    }

    public function show(Category $category): JsonResponse
    {
        return response()->json(['data' => $category->loadCount('products')]);
    }

    public function update(CategoryRequest $request, Category $category): JsonResponse
    {
        $category->update($request->validated());

        return response()->json(['data' => $category->refresh()]);
    }

    public function destroy(Category $category): Response|JsonResponse
    {
        if ($category->products()->exists()) {
            return response()->json([
                'message' => 'A kategória nem törölhető, amíg termék tartozik hozzá.',
            ], 422);
        }

        $category->delete();

        return response()->noContent();
    }
}

