<div 
    x-data="{
        search: '',
        filterNav() {
            const query = this.search.toLowerCase().trim();
            const items = document.querySelectorAll('.fi-sidebar-item');
            const groups = document.querySelectorAll('.fi-sidebar-group');

            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                const matches = text.includes(query);
                item.style.display = matches ? '' : 'none';
            });

            groups.forEach(group => {
                // Kiểm tra xem nhóm này có item nào đang hiển thị không
                const visibleItems = Array.from(group.querySelectorAll('.fi-sidebar-item')).filter(
                    item => item.style.display !== 'none'
                );
                // Ẩn/hiện cả nhóm (group)
                group.style.display = (visibleItems.length > 0 || query === '') ? '' : 'none';
            });
        }
    }"
    class="px-4 py-2"
>
    <div class="relative flex items-center">
        <input
            x-model="search"
            x-on:input="filterNav()"
            type="text"
            placeholder="Tìm menu..."
            class="w-full rounded-lg border-2 border-gray-300 bg-white/50 px-3 py-1.5 text-sm placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <button 
            x-show="search.length > 0" 
            x-on:click="search = ''; filterNav()" 
            type="button" 
            class="absolute right-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
            ✕
        </button>
    </div>
</div>