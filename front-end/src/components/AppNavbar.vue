<script setup lang="ts">
import { RouterLink } from 'vue-router'
import databricksLogo from '@/assets/databricks-symbol-light.webp'

defineProps<{
  sidebarCollapsed?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-sidebar'): void
}>()

const navItems = [
  { path: '/', label: 'Home', icon: 'bi-house' },
  { path: '/data-structures', label: 'Data Structures', icon: 'bi-diagram-3' },
  { path: '/template-editor', label: 'Template Editor', icon: 'bi-code-square' },
  { path: '/preview', label: 'Preview & Export', icon: 'bi-file-earmark-pdf' },
  { path: '/guide', label: 'Guide', icon: 'bi-book' },
]
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark fixed-top">
    <div class="container-fluid px-4">
      <button class="btn btn-link text-white me-3 d-lg-none" @click="emit('toggle-sidebar')">
        <i class="bi bi-list fs-4"></i>
      </button>
      <RouterLink class="navbar-brand d-flex align-items-center" to="/">
        <img :src="databricksLogo" alt="Databricks" class="navbar-logo me-2" />
        <span>Paginated Reporting</span>
      </RouterLink>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto">
          <li v-for="item in navItems" :key="item.path" class="nav-item">
            <RouterLink class="nav-link" :to="item.path" active-class="active">
              <i :class="['bi', item.icon, 'me-1']"></i>
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar-logo {
  height: 24px;
  width: auto;
  /* Filter calculates to #FF3621 (Databricks Orange) from pure white */
  filter: invert(36%) sepia(85%) saturate(3015%) hue-rotate(345deg) brightness(101%) contrast(105%);
}

.nav-link {
  font-size: var(--ep-text-sm);
  padding: 6px 12px !important;
  border-radius: var(--ep-radius-sm);
  margin: 0 4px;
  transition: all var(--trans-fast);
  color: var(--ep-text-secondary) !important;
  font-weight: 500;
}

.nav-link i {
  font-size: 14px;
  opacity: 0.7;
}

.nav-link:hover {
  background: var(--ep-bg-surface-hover);
  color: var(--ep-text-primary) !important;
}

.nav-link.active {
  background: var(--ep-bg-surface-active);
  color: var(--ep-text-primary) !important;
}
</style>
