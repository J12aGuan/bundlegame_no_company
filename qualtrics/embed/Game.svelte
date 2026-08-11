<script>
  // Mirrors src/routes/+page.svelte lines 586-589 so screen switching is
  // identical to the hosted app.
  import Home from '../../src/routes/home.svelte';
  import Bundlegame from '../../src/routes/bundlegame.svelte';
  import { game } from '../../src/lib/bundle.js';
  $: inSelect = $game.inSelect;
  $: inStore = $game.inStore;
</script>

{#if inSelect}
  <Home />
{:else if inStore}
  <Bundlegame />
{/if}
