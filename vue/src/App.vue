<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="app">
    <h1>Cloudgate Vue.js Starter</h1>
    <p>Current count: {{ count }}</p>
    <button @click="count++">Increment</button>
  </div>
</template>

<style>
.app { text-align: center; padding: 2rem; font-family: sans-serif; }
button { margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer; }
</style>