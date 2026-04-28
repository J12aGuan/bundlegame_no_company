<script>
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { signInAdmin, signOutAdmin, subscribeAdminAuth } from '$lib/adminAuth.js';
    import '../../app.css';
    
    let isAdmin = false;
    let loading = true;
    let adminEmail = '';
    let adminPassword = '';
    let authError = '';
    let signingIn = false;
    let adminUser = null;
    
    onMount(() => {
        return subscribeAdminAuth((state) => {
            loading = state.loading;
            isAdmin = state.isAdmin;
            adminUser = state.user;
            authError = state.error || '';
        });
    });

    async function handleAdminSignIn() {
        signingIn = true;
        authError = '';
        try {
            await signInAdmin(adminEmail, adminPassword);
            adminPassword = '';
        } catch (error) {
            authError = error?.message || 'Admin sign-in failed.';
        } finally {
            signingIn = false;
        }
    }

    async function handleSignOut() {
        await signOutAdmin();
    }
    
    const navItems = [
        { label: 'Dashboard', href: '/admin' },
        { label: 'Live Class', href: '/admin/live' },
        { label: 'Master Data', href: '/admin/masterdata' },
        { label: 'Results', href: '/admin/results' },
        { label: 'Analysis', href: '/admin/analysis' },
        { label: 'DRL Research', href: '/admin/research' }
    ];
    
    function isActive(href) {
        return $page.url.pathname === href;
    }

    $: isResearchRoute = $page.url.pathname === '/admin/research';
</script>

{#if loading}
    <div class="flex items-center justify-center min-h-screen bg-gray-50">
        <div class="text-xl text-gray-600">Loading...</div>
    </div>
{:else if !isAdmin}
    <div class="flex items-center justify-center min-h-screen bg-gray-50">
        <form class="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm" on:submit|preventDefault={handleAdminSignIn}>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Admin Sign In</h1>
            <p class="text-sm text-gray-600 mb-5">Use a Firebase account with the admin custom claim.</p>
            <label class="block text-sm font-medium text-gray-700" for="admin-email">Email</label>
            <input
                id="admin-email"
                type="email"
                bind:value={adminEmail}
                autocomplete="username"
                class="mt-1 mb-4 w-full rounded-md border border-gray-300 px-3 py-2"
                required
            />
            <label class="block text-sm font-medium text-gray-700" for="admin-password">Password</label>
            <input
                id="admin-password"
                type="password"
                bind:value={adminPassword}
                autocomplete="current-password"
                class="mt-1 mb-4 w-full rounded-md border border-gray-300 px-3 py-2"
                required
            />
            {#if authError}
                <p class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{authError}</p>
            {/if}
            <button
                type="submit"
                class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={signingIn}
            >
                {signingIn ? 'Signing in...' : 'Sign in'}
            </button>
            <a href="/" class="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Return Home
            </a>
        </form>
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
                        <button
                            type="button"
                            class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                            title={adminUser?.email || 'Signed in admin'}
                            on:click={handleSignOut}
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
        
        <!-- Page Content -->
        <main class={isResearchRoute ? 'w-full' : 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'}>
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
