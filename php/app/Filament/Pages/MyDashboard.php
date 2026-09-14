<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;

use BackedEnum;

class MyDashboard extends Page
{
    // protected static ?Icon $navigationIcon = Icon::Heroicon('o-home');
    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-home';

    protected string $view = 'filament.pages.my-dashboard';
    
}
