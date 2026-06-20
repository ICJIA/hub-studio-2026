<!-- app/components/fields/TextField.vue -->
<script setup lang="ts">
import { computed, useId } from '#imports'

const props = defineProps<{ modelValue: string | null; label: string; type?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const id = useId()
const value = computed({ get: () => props.modelValue ?? '', set: (v) => emit('update:modelValue', v) })
</script>

<template>
  <UFormField :label="label" :for="id">
    <UInput :id="id" v-model="value" :type="type ?? 'text'" class="w-full" />
  </UFormField>
</template>
