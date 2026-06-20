<!-- app/components/fields/ChipsField.vue -->
<script setup lang="ts">
import { computed, useId } from '#imports'

const props = defineProps<{ modelValue: string[]; label: string; options?: readonly string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const id = useId()
const value = computed({ get: () => props.modelValue ?? [], set: (v) => emit('update:modelValue', v) })
const items = computed(() => (props.options ?? []).map((o) => ({ label: o, value: o })))
</script>

<template>
  <UFormField :label="label" :for="id">
    <USelectMenu :id="id" v-model="value" :items="items" multiple value-key="value" :create-item="!options" class="w-full" />
  </UFormField>
</template>
