<!-- app/components/fields/DateField.vue -->
<script setup lang="ts">
import { computed, useId } from '#imports'

const props = defineProps<{ modelValue: string | null; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()

const id = useId()
// Emit null for an empty date so it round-trips to the model's `date: string | null`.
const value = computed({ get: () => props.modelValue ?? '', set: (v) => emit('update:modelValue', v || null) })
</script>

<template>
  <UFormField :label="label" :for="id">
    <UInput :id="id" v-model="value" type="date" class="w-full" />
  </UFormField>
</template>
