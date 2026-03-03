<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="home-view">
    <div class="hero-section text-center">
      <div class="hero-badge mb-3">
        <span class="badge-text">Reporting Engine V1.0</span>
      </div>
      <h1 class="hero-title fw-bold mb-3">
        Paginated Reporting
      </h1>
      <p class="hero-subtitle">
        Create beautiful, data-driven reports with dynamic templates and PDF export
      </p>
    </div>

    <div class="row g-4 mb-5 mt-2">
      <div class="col-md-4">
        <div class="card h-100">
          <div class="card-body p-4">
            <div class="feature-icon mb-3">
              <i class="bi bi-diagram-3"></i>
            </div>
            <h5 class="card-title fw-semibold">Define Data Structures</h5>
            <p class="card-text text-muted mb-4">
              Create flexible data models with support for nested arrays and objects
            </p>
            <button class="btn btn-primary w-100" @click="navigate('/data-structures')">
              Get Started
              <i class="bi bi-arrow-right ms-1"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card h-100">
          <div class="card-body p-4">
            <div class="feature-icon mb-3">
              <i class="bi bi-code-square"></i>
            </div>
            <h5 class="card-title fw-semibold">Build Templates</h5>
            <p class="card-text text-muted mb-4">
              Design HTML templates with mustache syntax and live preview
            </p>
            <button class="btn w-100" @click="navigate('/template-editor')">
              Create Template
              <i class="bi bi-arrow-right ms-1"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card h-100">
          <div class="card-body p-4">
            <div class="feature-icon mb-3">
              <i class="bi bi-file-pdf"></i>
            </div>
            <h5 class="card-title fw-semibold">Export to PDF</h5>
            <p class="card-text text-muted mb-4">
              Generate professional PDF reports with pagination support
            </p>
            <button class="btn btn-export w-100" @click="navigate('/preview')">
              Preview & Export
              <i class="bi bi-arrow-right ms-1"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">
          <i class="bi bi-lightbulb text-warning me-2"></i>
          Quick Start Guide
        </h5>
      </div>
      <div class="card-body">
        <div class="row g-4">
          <div class="col-md-3">
            <div class="d-flex">
              <div class="step-number me-3">1</div>
              <div>
                <h6>Define Structure</h6>
                <p class="text-muted small mb-0">
                  Create a data model that matches your report data format
                </p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="d-flex">
              <div class="step-number me-3">2</div>
              <div>
                <h6>Build Template</h6>
                <p class="text-muted small mb-0">
                  Design your report layout using HTML and mustache tags
                </p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="d-flex">
              <div class="step-number me-3">3</div>
              <div>
                <h6>Add Components</h6>
                <p class="text-muted small mb-0">
                  Insert tiles, charts, and tables from the component palette
                </p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="d-flex">
              <div class="step-number me-3">4</div>
              <div>
                <h6>Export PDF</h6>
                <p class="text-muted small mb-0">
                  Preview your report and download as a paginated PDF
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  max-width: 1000px;
  margin: 0 auto;
  padding-top: 2rem;
}

/* Premium Hero Section */
.hero-section {
  margin-bottom: 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 9999px;
  background: var(--ep-bg-surface-active);
  border: 1px solid var(--ep-border-strong);
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.badge-text {
  font-size: var(--ep-text-xs);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ep-text-secondary);
}

.hero-title {
  font-size: 3.5rem;
  letter-spacing: -0.04em;
  line-height: 1.1;
  color: var(--ep-text-primary);
  /* Optional subtle gradient text */
  background: linear-gradient(180deg, var(--ep-text-primary) 0%, var(--ep-text-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.125rem;
  color: var(--ep-text-secondary);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.feature-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ep-border-base);
  border-radius: var(--ep-radius-sm);
  background: var(--ep-bg-surface);
  box-shadow: var(--ep-shadow-sm);
}

.feature-icon i {
  font-size: 20px;
  color: var(--ep-text-primary);
}

.step-number {
  width: 28px;
  height: 28px;
  background: var(--ep-bg-surface);
  border: 1px solid var(--ep-border-base);
  color: var(--ep-text-primary);
  border-radius: var(--ep-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: var(--ep-shadow-sm);
  font-size: var(--ep-text-xs);
}
</style>
