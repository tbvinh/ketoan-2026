<?php

namespace App\Filament\Widgets;

use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class MyStatsWidget extends StatsOverviewWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('Tổng đơn hàng', '1,234'),
            Stat::make('Doanh thu', '$56,789'),
            Stat::make('Khách hàng mới', '89'),
        ];
    }
}
