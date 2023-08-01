<script setup lang="ts">
import * as lucide from 'lucide-vue-next';
import { computed } from 'vue';

interface Props { icon?: { pack: string; name: string } | null; size?: number; stroke?: number; }
const props = defineProps<Props>();

const componentName = computed(() => {
  if (!props.icon) return null;
  if (props.icon.pack === 'lucide') return props.icon.name;
  return null;
});

const Comp = computed(() => {
  const name = componentName.value;
  if (!name) return null;
  return (lucide as any)[name] || null;
});
</script>

<template>
  <component v-if="Comp" :is="Comp" :size="size || 32" :stroke-width="stroke || 1.75" />
  <div v-else class="w-8 h-8 flex items-center justify-center text-xs opacity-40 select-none">--</div>
</template>