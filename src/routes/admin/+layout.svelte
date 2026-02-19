<script>
    import { page } from '$app/stores';
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';
    import '../../app.css';
    
    let isAdmin = false;
    let loading = true;
    let adminPassword = localStorage.getItem('adminAuth');
    
    onMount(() => {
        // Check if already authenticated
        if (adminPassword === "admin123" || localStorage.getItem('adminAuth') === "admin123") {
            isAdmin = true;
            loading = false;
            return;
        }
        
        // Only prompt if not authenticated
        const password = prompt("Enter admin password:");
        if (password === "admin123") {
            localStorage.setItem('adminAuth', 'admin123');
            isAdmin = true;
        }
        loading = false;
    });
    
    const navItems = [
        { label: 'Dashboard', href: '/admin' },
        { label: 'Experiments', href: '/admin/experiments' },
        { label: 'Results', href: '/admin/results' }
    ];
    
    function isActive(href) {
        return $page.url.pathname === href;
    }
</script>

{#if loading}
    <div class="flex items-center justify-center min-h-screen bg-gray-50">
        <div class="text-xl text-gray-600">Loading...</div>
    </div>
{:else if !isAdmin}
    <div class="flex items-center justify-center min-h-screen bg-gray-50">
        <div class="text-center">
            <h1 class="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
            <p class="text-gray-600">Invalid admin credentials</p>
            <a href="/" class="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Return Home
            </a>
        </div>
    </div>
{:else}
    <div class="min-h-screen bg-gray-50">
        <!-- Navigation Bar -->
        <nav class="bg-white shadow-sm sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <h1 class="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    </div>
                    <div class="flex gap-8">
                        {#each navItems as item}
                            <a 
                                href={item.href}
                                class="px-3 py-2 rounded-md text-sm font-medium transition-colors {isActive(item.href) 
                                    ? 'bg-blue-500 text-white' 
                                    : 'text-gray-700 hover:bg-gray-100'}"
                            >
                                {item.label}
                            </a>
                        {/each}
                        <a 
                            href="/"
                            class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                            Back to Game
                        </a>
                    </div>
                </div>
            </div>
        </nav>
        
        <!-- Page Content -->
        <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <slot />
        </main>
    </div>
{/if}

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        background-color: #f9fafb;
    }
</style>
