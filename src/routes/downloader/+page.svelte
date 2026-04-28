<script>
    import { onMount } from 'svelte';
    import { signInAdmin, subscribeAdminAuth } from '$lib/adminAuth.js';
    import { retrieveData } from '../../lib/firebaseDB'
    import '../../app.css';

    let adminEmail = '';
    let adminPassword = '';
    let authorized = false;
    let loading = true;
    let authError = '';
    let exportError = '';
    let exporting = false;
    let signingIn = false;

    onMount(() => subscribeAdminAuth((state) => {
        loading = state.loading;
        authorized = state.isAdmin;
        authError = state.error || '';
    }));

    async function exportDataAsJSON() {
        exporting = true;
        exportError = '';
        try {
            const data = await retrieveData();
            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'data.json';
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            exportError = error?.message || 'Unable to export participant data.';
        } finally {
            exporting = false;
        }
    }

    async function handleSignIn() {
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
</script>

<div class="mx-auto mt-10 w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
    {#if loading}
        <p class="text-gray-600">Checking admin access...</p>
    {:else if !authorized}
        <form class="space-y-4 text-left" on:submit|preventDefault={handleSignIn}>
            <div>
                <h1 class="text-2xl font-bold text-gray-900">Downloader Access</h1>
                <p class="mt-1 text-sm text-gray-600">Sign in with a Firebase admin account to export participant data.</p>
            </div>
            <label class="block text-sm font-medium text-gray-700" for="downloader-admin-email">Email</label>
            <input
                id="downloader-admin-email"
                type="email"
                bind:value={adminEmail}
                autocomplete="username"
                class="w-full rounded-md border border-gray-300 px-3 py-2"
                required
            />
            <label class="block text-sm font-medium text-gray-700" for="downloader-admin-password">Password</label>
            <input
                id="downloader-admin-password"
                type="password"
                bind:value={adminPassword}
                autocomplete="current-password"
                class="w-full rounded-md border border-gray-300 px-3 py-2"
                required
            />
            {#if authError}
                <p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{authError}</p>
            {/if}
            <button
                type="submit"
                class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={signingIn}
            >
                {signingIn ? 'Signing in...' : 'Sign in'}
            </button>
        </form>
    {:else}
        <h1 class="text-2xl font-bold text-gray-900">Participant Export</h1>
        <p class="mt-1 text-sm text-gray-600">Exports require a Firebase admin account and Firestore admin permissions.</p>
        {#if exportError}
            <p class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{exportError}</p>
        {/if}
        <button
            on:click={exportDataAsJSON}
            class="mt-5 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={exporting}
        >
            {exporting ? 'Preparing export...' : 'Download JSON'}
        </button>
    {/if}
</div>
