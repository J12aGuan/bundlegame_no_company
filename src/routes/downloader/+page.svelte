<script>
    import { retrieveData } from '../../lib/firebaseDB'
    import '../../app.css';

    let password = '';
    let authorized = false;
    const correctPassword = 'bobaboba';

    async function exportDataAsJSON() {
        const data = await retrieveData();
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });

        // Create a link element and trigger the download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'data.json';
        link.click();
    }

    function checkPassword() {
        if (password === correctPassword) {
            authorized = true;
        } else {
            alert('Incorrect password');
        }
    }
</script>

<div class="space-y-4 max-w-sm mx-auto mt-8 text-center">
  {#if !authorized}
    <input
      type="password"
      bind:value={password}
      placeholder="Enter password"
      class="border p-2 rounded w-full"
    />
    <button on:click={checkPassword} class="bg-blue-500 text-white px-4 py-2 rounded">
      Submit
    </button>
  {/if}

  {#if authorized}
    <button on:click={exportDataAsJSON} class="bg-green-600 text-white px-4 py-2 rounded">
      Download JSON
    </button>
  {/if}
</div>