<svelte:head>
    <title>Register</title>
    <meta name="register" content="Publicly shame yourself" />
</svelte:head>

<script>
    export function clickme() {
        console.log("Hello")
    }
    export function promptRegistration() {
        window.location = "https://github.com/apps/abandoned-by-me-dev/installations/select_target"
    }
</script>

<div class="text-column">
    <button on:click={() => promptRegistration()}>Publicly Shame Me</button>
</div>
