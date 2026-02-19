<script>
    import { onMount } from 'svelte';
    import { getAllConfigs, saveConfig, deleteConfig, getConfigByName } from '$lib/firebaseDB.js';
    
    let configs = [];
    let loading = true;
    let error = null;
    let selectedConfig = null;
    let showForm = false;
    let isEditing = false;
    let formData = {
        id: '',
        name: '',
        timeLimit: 1200,
        thinkTime: 10,
        gridSize: 3,
        tips: false,
        waiting: false,
        refresh: false,
        expire: false,
        auth: true,
        order_file: '',
        store_file: ''
    };
    let saving = false;
    
    onMount(async () => {
        await loadConfigs();
    });
    
    async function loadConfigs() {
        try {
            loading = true;
            error = null;
            configs = await getAllConfigs();
            console.log('Loaded configs:', configs);
        } catch (err) {
            error = 'Failed to load configurations';
            console.error('Error loading configs:', err);
        } finally {
            loading = false;
        }
    }
    
    function selectConfig(config) {
        selectedConfig = config;
    }
    
    function newConfig() {
        isEditing = false;
        formData = {
            id: '',
            name: '',
            timeLimit: 1200,
            thinkTime: 10,
            gridSize: 3,
            tips: false,
            waiting: false,
            refresh: false,
            expire: false,
            auth: true,
            order_file: '',
            store_file: ''
        };
        showForm = true;
    }
    
    function editConfig(config) {
        isEditing = true;
        formData = { ...config };
        showForm = true;
    }
    
    async function saveConfigHandler() {
        if (!formData.id || !formData.name) {
            alert('Config ID and Name are required');
            return;
        }
        
        try {
            saving = true;
            await saveConfig(formData.id, formData);
            alert('Config saved successfully!');
            showForm = false;
            selectedConfig = null;
            await loadConfigs();
        } catch (err) {
            error = 'Failed to save config: ' + err.message;
            console.error('Error saving config:', err);
        } finally {
            saving = false;
        }
    }
    
    async function deleteConfigHandler(config) {
        if (confirm(`Are you sure you want to delete "${config.name}"?`)) {
            try {
                await deleteConfig(config.id);
                alert('Config deleted successfully');
                selectedConfig = null;
                await loadConfigs();
            } catch (err) {
                error = 'Failed to delete config: ' + err.message;
                console.error('Error deleting config:', err);
            }
        }
    }
</script>

<div class="space-y-6">
    <div class="flex justify-between items-center">
        <div>
            <h2 class="text-2xl font-bold text-gray-900">Experiment Configurations</h2>
            <p class="mt-1 text-sm text-gray-600">Manage experiment configs and conditions</p>
        </div>
        <button 
            on:click={newConfig}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
            New Config
        </button>
    </div>
    
    {#if error}
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
        </div>
    {/if}
    
    {#if loading}
        <div class="text-center py-12">
            <div class="text-gray-600">Loading configurations...</div>
        </div>
    {:else if configs.length === 0}
        <div class="text-center py-12">
            <div class="text-gray-600">No configs found. Create one to get started!</div>
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- Config List -->
            <div class="lg:col-span-1">
                <div class="bg-white shadow rounded-lg">
                    <ul class="divide-y divide-gray-200">
                        {#each configs as config}
                            <li>
                                <button
                                    on:click={() => selectConfig(config)}
                                    class="w-full text-left px-4 py-4 hover:bg-gray-50 transition {selectedConfig?.id === config.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}"
                                >
                                    <h3 class="font-medium text-gray-900">{config.name}</h3>
                                    <p class="text-sm text-gray-600">{config.id}</p>
                                    <span class="inline-block mt-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                        Active
                                    </span>
                                </button>
                            </li>
                        {/each}
                    </ul>
                </div>
            </div>
            
            <!-- Config Details -->
            {#if selectedConfig}
                <div class="lg:col-span-2">
                    <div class="bg-white shadow rounded-lg p-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">{selectedConfig.name}</h3>
                        <div class="space-y-3 mb-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">ID</label>
                                <p class="text-gray-600 font-mono">{selectedConfig.id}</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Time Limit</label>
                                <p class="text-gray-600">{selectedConfig.timeLimit} seconds</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Think Time</label>
                                <p class="text-gray-600">{selectedConfig.thinkTime} seconds</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Grid Size</label>
                                <p class="text-gray-600">{selectedConfig.gridSize}x{selectedConfig.gridSize}</p>
                            </div>
                            {#if selectedConfig.order_file}
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Order File</label>
                                    <p class="text-gray-600">{selectedConfig.order_file}</p>
                                </div>
                            {/if}
                            {#if selectedConfig.store_file}
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Store File</label>
                                    <p class="text-gray-600">{selectedConfig.store_file}</p>
                                </div>
                            {/if}
                        </div>
                        <div class="mt-6 flex gap-3">
                            <button 
                                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                on:click={() => editConfig(selectedConfig)}
                            >
                                Edit
                            </button>
                            <button 
                                class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                on:click={() => deleteConfigHandler(selectedConfig)}
                            >
                                Delete
                            </button>
                            <button 
                                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                                on:click={() => selectedConfig = null}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            {:else}
                <div class="lg:col-span-2">
                    <div class="bg-white shadow rounded-lg p-6 text-center">
                        <p class="text-gray-600">Select a configuration to view details</p>
                    </div>
                </div>
            {/if}
        </div>
    {/if}
    
    <!-- Config Form Modal -->
    {#if showForm}
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                <h3 class="text-lg font-medium text-gray-900 mb-4">
                    {isEditing ? 'Edit Configuration' : 'New Configuration'}
                </h3>
                
                <form on:submit|preventDefault={saveConfigHandler} class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Config ID</label>
                        <input 
                            type="text" 
                            bind:value={formData.id}
                            placeholder="e.g., config_short_distance"
                            class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                            disabled={isEditing}
                            required
                        />
                        <p class="text-xs text-gray-500 mt-1">Cannot be changed after creation</p>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Config Name</label>
                        <input 
                            type="text" 
                            bind:value={formData.name}
                            placeholder="e.g., Shorter cell distances"
                            class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Time Limit (seconds)</label>
                        <input 
                            type="number" 
                            bind:value={formData.timeLimit}
                            class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Think Time (seconds)</label>
                        <input 
                            type="number" 
                            bind:value={formData.thinkTime}
                            class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Grid Size</label>
                        <input 
                            type="number" 
                            bind:value={formData.gridSize}
                            class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700">Order File</label>
                        <input 
                            type="text" 
                            bind:value={formData.order_file}
                            placeholder="e.g., order.json"
                            class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700">Store File</label>
                        <input 
                            type="text" 
                            bind:value={formData.store_file}
                            placeholder="e.g., stores1.json"
                            class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    
                    <div class="flex gap-3 pt-4">
                        <button 
                            type="submit"
                            disabled={saving}
                            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button 
                            type="button"
                            on:click={() => showForm = false}
                            disabled={saving}
                            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}
</div>
