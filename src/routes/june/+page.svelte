<script>
    // Paired pilot -> aided calibration study. Forces the paired pilot scenario_set, independent of the
    // global central config, so the live 35-round study at "/" is completely unaffected. Participants
    // reach this at /june; they play the pilot (27, unaided) then auto-advance to the aided 35-round set
    // under the same id. Data writes carry study_id=paired_calibration_v1 + study_part.
    import GamePage from '../GamePage.svelte';
</script>

<GamePage scenarioSetOverride="paired_pilot_unaided_v1" />
