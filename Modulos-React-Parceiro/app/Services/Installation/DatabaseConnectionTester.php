<?php

namespace App\Services\Installation;

use Illuminate\Support\Facades\DB;
use Throwable;

class DatabaseConnectionTester
{
    public function test(array $database): ?string
    {
        $connection = 'installer_test';

        config([
            "database.connections.$connection" => [
                'driver' => $database['driver'],
                'host' => $database['host'],
                'port' => $database['port'],
                'database' => $database['database'],
                'username' => $database['username'],
                'password' => $database['password'],
                'charset' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
                'prefix' => '',
                'prefix_indexes' => true,
                'strict' => true,
                'engine' => null,
            ],
        ]);

        DB::purge($connection);

        try {
            DB::connection($connection)->getPdo();

            return null;
        } catch (Throwable $exception) {
            return $exception->getMessage();
        } finally {
            DB::disconnect($connection);
        }
    }
}
