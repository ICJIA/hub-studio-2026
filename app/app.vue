<script setup lang="ts">
const { init } = useAuth()
onMounted(() => { init() })
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
