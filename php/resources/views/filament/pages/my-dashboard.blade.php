<x-filament-panels::page>
    <x-filament-widgets::widgets
        :widgets="[
            \App\Filament\Widgets\MyStatsWidget::class,
        ]"
        :columns="2"
    />
</x-filament-panels::page>
