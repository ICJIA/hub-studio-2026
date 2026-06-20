<!-- app/components/fields/SelectField.vue -->
<script setup lang="ts">
import { computed, useId } from '#imports'

const props = defineProps<{ modelValue: string | null; label: string; options: readonly string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()

const id = useId()
const value = computed({ get: () => props.modelValue ?? undefined, set: (v) => emit('update:modelValue', v ?? null) })
const items = computed(() => props.options.map((o) => ({ label: o, value: o })))
</script>

<template>
  <UFormField :label="label" :for="id">
    <USelect :id="id" v-model="value" :items="items" class="w-full" />
  </UFormField>
</template>
