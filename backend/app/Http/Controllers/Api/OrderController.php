<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function store(StoreOrderRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $key = $request->header('X-Idempotency-Key');

        if ($key !== null && ! Str::isUuid($key)) {
            throw ValidationException::withMessages([
                'idempotency_key' => ['Érvénytelen rendelési kérésazonosító.'],
            ]);
        }

        if ($key !== null) {
            $existing = Order::with('items')
                ->where('idempotency_key', $key)
                ->first();

            if ($existing) {
                return $this->existingOrderResponse($existing, $validated, $request);
            }
        }

        try {
            $order = DB::transaction(function () use ($validated, $request, $key): Order {
                $requestedItems = collect($validated['items'])->keyBy('product_id');

                $products = Product::query()
                    ->whereIn('id', $requestedItems->keys())
                    ->where('active', true)
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                if ($key !== null) {
                    $existing = Order::with('items')
                        ->where('idempotency_key', $key)
                        ->first();

                    if ($existing) {
                        $this->checkExistingOrder($existing, $validated, $request);

                        return $existing;
                    }
                }

                if ($products->count() !== $requestedItems->count()) {
                    throw ValidationException::withMessages([
                        'items' => ['Az egyik kiválasztott termék már nem elérhető.'],
                    ]);
                }

                $total = 0;
                $itemRows = [];

                foreach ($requestedItems as $productId => $item) {
                    $product = $products->get($productId);
                    $quantity = (int) $item['quantity'];

                    if ($product->stock < $quantity) {
                        throw ValidationException::withMessages([
                            'items' => [
                                "A(z) {$product->name} termékből jelenleg csak {$product->stock} darab érhető el.",
                            ],
                        ]);
                    }

                    $lineTotal = $product->price * $quantity;
                    $total += $lineTotal;

                    $itemRows[] = [
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'unit_price' => $product->price,
                        'quantity' => $quantity,
                        'line_total' => $lineTotal,
                    ];
                }

                $order = Order::create([
                    'user_id' => $request->user('sanctum')?->id,
                    'order_number' => $this->makeOrderNumber(),
                    'idempotency_key' => $key,
                    'customer_name' => $validated['customer_name'],
                    'email' => $validated['email'],
                    'phone' => $validated['phone'] ?? null,
                    'address' => $validated['address'],
                    'message' => $validated['message'] ?? null,
                    'payment_method' => $validated['payment_method'],
                    'status' => 'new',
                    'total' => $total,
                ]);

                $order->items()->createMany($itemRows);

                foreach ($requestedItems as $productId => $item) {
                    $products->get($productId)->decrement('stock', (int) $item['quantity']);
                }

                return $order->load('items');
            });
        } catch (QueryException $exception) {
            $duplicateKey = (string) ($exception->errorInfo[1] ?? '') === '1062';

            if (! $duplicateKey || $key === null) {
                throw $exception;
            }

            $existing = Order::with('items')
                ->where('idempotency_key', $key)
                ->first();

            if (! $existing) {
                throw $exception;
            }

            return $this->existingOrderResponse($existing, $validated, $request);
        }

        $alreadyExisted = $key !== null
            && $order->wasRecentlyCreated === false;

        return response()->json([
            'message' => $alreadyExisted
                ? 'A rendelés korábban már megérkezett.'
                : 'A rendelés sikeresen megérkezett.',
            'data' => (new OrderResource($order))->resolve(),
        ], $alreadyExisted ? 200 : 201);
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        $orders = $request->user()
            ->orders()
            ->with('items')
            ->latest()
            ->get();

        return OrderResource::collection($orders);
    }

    private function existingOrderResponse(
        Order $order,
        array $validated,
        Request $request
    ): JsonResponse {
        $this->checkExistingOrder($order, $validated, $request);

        return response()->json([
            'message' => 'A rendelés korábban már megérkezett.',
            'data' => (new OrderResource($order))->resolve(),
        ], 200);
    }

    private function checkExistingOrder(
        Order $order,
        array $validated,
        Request $request
    ): void {
        $fields = [
            'customer_name',
            'email',
            'phone',
            'address',
            'message',
            'payment_method',
        ];

        foreach ($fields as $field) {
            if (($order->{$field} ?? null) != ($validated[$field] ?? null)) {
                $this->rejectReusedKey();
            }
        }

        if ($order->user_id !== $request->user('sanctum')?->id) {
            $this->rejectReusedKey();
        }

        $originalItems = $order->items
            ->mapWithKeys(fn ($item) => [
                (int) $item->product_id => (int) $item->quantity,
            ])
            ->all();

        $requestedItems = collect($validated['items'])
            ->mapWithKeys(fn ($item) => [
                (int) $item['product_id'] => (int) $item['quantity'],
            ])
            ->all();

        ksort($originalItems);
        ksort($requestedItems);

        if ($originalItems !== $requestedItems) {
            $this->rejectReusedKey();
        }
    }

    private function rejectReusedKey(): never
    {
        throw ValidationException::withMessages([
            'idempotency_key' => [
                'Ez a kérésazonosító már egy másik rendeléshez tartozik.',
            ],
        ]);
    }

    private function makeOrderNumber(): string
    {
        do {
            $number = 'LUNA-'.now()->format('Ymd').'-'.Str::upper(Str::random(6));
        } while (Order::where('order_number', $number)->exists());

        return $number;
    }
}
