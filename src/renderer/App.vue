<template>
  <div class="h-screen overflow-hidden flex flex-col bg-neutral-950 text-neutral-200">
    <!-- Toast Container -->
    <div class="fixed top-3 right-3 z-[200] flex flex-col gap-2 w-64" v-if="toasts.length">
      <div v-for="t in toasts" :key="t.id" :class="['rounded-md shadow border px-3 py-2 text-xs leading-snug backdrop-blur-sm', t.failed ? 'border-red-500/50 bg-red-900/40 text-red-200' : 'border-blue-500/40 bg-neutral-800/70 text-neutral-200']">
        <div class="font-semibold truncate mb-1" :title="t.title">{{ t.title }}</div>
        <div class="text-[11px] opacity-80 break-all" :title="t.body">{{ t.body }}</div>
        <button class="mt-2 text-[10px] uppercase tracking-wide font-medium text-blue-300 hover:text-blue-200" @click="focusApp(t.buttonId)">Ver</button>
      </div>
    </div>
    <!-- Top Bar -->
    <header class="h-12 flex items-center justify-between px-4 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-sm">
      <div class="flex items-center gap-4">
        <h1 class="text-sm font-semibold tracking-wide text-neutral-100">{{ t('app.title') }}</h1>
        <div class="flex items-center gap-2" v-if="state">
          <button class="btn-accent" @click="openCreateModal">+ {{ t('actions.addButton') }}</button>
          <div class="relative">
            <select v-model="selectedProfileId" @change="changeProfile" class="select-ghost pr-7">
              <option v-for="p in state.profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <button class="absolute right-0 top-0 h-full px-2 text-neutral-400 hover:text-neutral-200" @click="openProfileMenu = !openProfileMenu">⋮</button>
            <div v-if="openProfileMenu" class="dropdown-panel">
              <button class="item" @click="createProfile">{{ t('profile.new') }}</button>
              <button class="item" :disabled="!activeProfile" @click="promptRenameProfile">{{ t('profile.rename') }}</button>
              <button class="item" :disabled="state.profiles.length<=1" @click="deleteProfile">{{ t('profile.delete') }}</button>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-[11px] text-neutral-500">{{ t('concurrency.label') }}</span>
            <select v-model="concurrencyPolicy" @change="updatePolicy" class="select-ghost">
              <option value="parallel">parallel</option>
              <option value="single-per-button">single-per-button</option>
              <option value="single-global">single-global</option>
            </select>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="localeRef" @change="changeLocale" class="select-ghost">
          <option v-for="loc in locales" :key="loc" :value="loc">{{ loc }}</option>
        </select>
      </div>
    </header>

    <!-- Main Content -->
  <div class="flex flex-1 min-h-0 overflow-hidden">
      <div v-if="!isElectron" class="p-6 text-xs text-amber-400">
        termdeck dev server aberto no navegador. Abra via CLI (termdeck) para usar a API Electron.
      </div>
      <div v-else-if="!state" class="flex-1 flex items-center justify-center">
        <div class="flex flex-col items-center gap-4 text-neutral-400 animate-pulse">
          <div class="h-10 w-10 relative">
            <div class="absolute inset-0 rounded-full border-4 border-neutral-700 border-t-blue-500 animate-spin"></div>
          </div>
          <div class="text-xs tracking-wider uppercase">Carregando perfis...</div>
        </div>
      </div>
    <template v-else>
  <!-- VERTICAL ORIENTATION (log at right) -->
  <div v-if="isVertical" class="flex flex-1 min-h-0 overflow-hidden">
  <section v-if="activeProfile" class="flex-1 p-4 overflow-auto flex flex-wrap gap-3 content-start items-start">
          <div v-for="(btn,idx) in activeProfile.buttons" :key="btn.id" draggable="true" @dragstart="onDragStart(btn, idx)" @drop.prevent="onDrop(btn, idx)" @dragover.prevent @click="select(btn)" :class="[buttonCardClasses(btn),'deck-button']">
              <div class="flex flex-col items-center justify-center h-full w-full">
                <div class="flex items-center gap-2 mb-1">
                  <DynamicIcon :icon="btn.icon" :size="22" />
                  <span class="font-medium truncate max-w-[120px]">{{ btn.label }}</span>
                  <span v-if="running[btn.id]" class="ml-1 animate-spin text-blue-300" title="Running">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                  </span>
                </div>
                <span class="text-[11px] text-neutral-400 truncate max-w-[140px]" :title="btn.command">{{ btn.command }}</span>
              </div>
              <div class="card-actions">
                <button class="act green" @click.stop="run(btn)" :disabled="running[btn.id]">▶</button>
                <button class="act amber" @click.stop="stop(btn)" :disabled="!running[btn.id]">■</button>
                <div class="relative" @click.stop>
                  <button class="act blue" @click="toggleMenu(btn.id)">⋮</button>
                  <div v-if="menuOpen === btn.id" class="absolute right-0 bottom-7 z-50 w-32 bg-neutral-900 border border-neutral-700 rounded-md shadow-lg p-1 flex flex-col">
                    <button class="text-left text-[11px] px-2 py-1 rounded hover:bg-neutral-700" @click="openEdit(btn); closeMenu()">{{ t('actions.edit') }}</button>
                    <button class="text-left text-[11px] px-2 py-1 rounded hover:bg-neutral-700 text-red-300" @click="remove(btn); closeMenu()">{{ t('actions.delete') }}</button>
                  </div>
                </div>
              </div>
            </div>
        </section>
  <!-- Resize Handle + Log Panel (Global + Per Button Tabs) -->
  <div class="resize-handle border-l border-neutral-800" @mousedown="startResize" @dblclick="resetResize" :title="resizeTitle"></div>
  <aside class="flex flex-col min-h-0 bg-neutral-900/30 backdrop-blur-sm border-l border-neutral-800" :style="{ width: logWidth + 'px' }">
          <div class="px-4 pt-3 pb-2 flex items-center gap-4 border-b border-neutral-800 text-[11px]">
            <div class="flex gap-2">
              <button :class="['tab-btn', activeLogView==='global' && 'active']" @click="activeLogView='global'">Global</button>
              <button :class="['tab-btn', activeLogView==='button' && 'active', !selectedButtonId && 'disabled']" :disabled="!selectedButtonId" @click="activeLogView='button'">{{ selectedButton?.label || t('logs.title') }}</button>
            </div>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-1 cursor-pointer select-none">
                <input type="checkbox" v-model="autoFollow" class="accent-blue-500" />
                <span>{{ t('logUI.autoFollow') }}</span>
              </label>
              <div class="flex items-center gap-1" title="{{ t('logUI.bufferSize') }}">
                <span class="text-neutral-500">{{ t('logUI.bufferSize') }}</span>
                <input type="range" min="200" max="8000" step="200" v-model.number="logLimitSetting" class="w-32" />
                <span>{{ logLimitSetting }}</span>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-neutral-500">{{ t('layout.orientation') }}</span>
                <select v-model="orientation" @change="persistOrientation" class="select-ghost">
                  <option value="vertical">{{ t('layout.vertical') }}</option>
                  <option value="horizontal">{{ t('layout.horizontal') }}</option>
                </select>
              </div>
            </div>
            <div class="ml-auto flex gap-1 items-center">
              <button v-if="showScrollBottom" class="mini-btn" @click="scrollActiveToBottom">{{ t('logUI.scrollBottom') }}</button>
              <button v-if="activeLogView==='button' && selectedButtonId && selectedLogs.length" class="mini-btn" @click="clearSelectedLog">{{ t('actions.clear') }}</button>
              <button v-if="activeLogView==='button' && selectedButtonId && selectedLogs.length" class="mini-btn" @click="copySelectedLog">{{ t('actions.copy') }}</button>
              <button v-if="activeLogView==='global' && globalLogsDisplay.length" class="mini-btn" @click="clearGlobalLog">{{ t('actions.clear') }}</button>
              <button v-if="activeLogView==='global' && globalLogsDisplay.length" class="mini-btn" @click="copyGlobalLog">{{ t('actions.copy') }}</button>
            </div>
          </div>
          <!-- Global Log -->
          <div v-if="activeLogView==='global'" ref="globalLogRef" class="flex-1 min-h-0 overflow-auto p-3 font-mono text-[11px] leading-snug log-scroll">
            <div v-if="!globalLogsDisplay.length" class="text-neutral-600">(global log vazio)</div>
            <div v-else>
              <div v-for="entry in globalLogsDisplay" :key="entry.id" :class="globalLineClass(entry)" class="flex gap-2">
                <span class="text-neutral-500 shrink-0" :title="formatTs(entry.ts)">{{ formatTime(entry.ts) }}</span>
                <span class="mr-2 px-1 py-[1px] rounded bg-neutral-700/60 text-[10px] text-neutral-200 shrink-0" :style="badgeStyle(entry.buttonId)">{{ entry.buttonLabel }}</span>
                <span class="whitespace-pre-wrap break-all" v-html="renderAnsi(entry.line)"></span>
              </div>
            </div>
          </div>
          <!-- Per Button Log -->
          <div v-else ref="buttonLogRef" class="flex-1 min-h-0 overflow-auto p-3 font-mono text-[11px] leading-snug log-scroll">
            <div v-if="!selectedButtonId" class="text-neutral-600">{{ t('logs.selectPrompt') }}</div>
            <div v-else-if="!selectedLogs.length" class="text-neutral-600">{{ t('logs.empty') }}</div>
            <template v-else>
              <div v-for="(line,i) in selectedLogs" :key="i" :class="logLineClass(line)" class="flex gap-2">
                <span class="text-neutral-500 shrink-0" :title="formatTs(buttonLogTimestamps[i])">{{ formatTime(buttonLogTimestamps[i]) }}</span>
                <span class="whitespace-pre-wrap break-all" v-html="renderAnsi(line)"></span>
              </div>
            </template>
          </div>
        </aside>
        </div>

  <!-- HORIZONTAL ORIENTATION (log below) -->
  <div v-else class="flex flex-1 min-h-0 overflow-hidden flex-col">
  <section v-if="activeProfile" class="flex-1 p-4 overflow-auto flex flex-wrap gap-3 content-start items-start">
      <div v-for="(btn,idx) in activeProfile.buttons" :key="btn.id" draggable="true" @dragstart="onDragStart(btn, idx)" @drop.prevent="onDrop(btn, idx)" @dragover.prevent @click="select(btn)" :class="[buttonCardClasses(btn),'deck-button']">
        <div class="flex flex-col items-center justify-center h-full w-full">
          <div class="flex items-center gap-2 mb-1">
            <DynamicIcon :icon="btn.icon" :size="22" />
            <span class="font-medium truncate max-w-[120px]">{{ btn.label }}</span>
            <span v-if="running[btn.id]" class="ml-1 animate-spin text-blue-300" title="Running">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
            </span>
          </div>
          <span class="text-[11px] text-neutral-400 truncate max-w-[140px]" :title="btn.command">{{ btn.command }}</span>
        </div>
        <div class="card-actions">
          <button class="act green" @click.stop="run(btn)" :disabled="running[btn.id]">▶</button>
          <button class="act amber" @click.stop="stop(btn)" :disabled="!running[btn.id]">■</button>
          <div class="relative" @click.stop>
            <button class="act blue" @click="toggleMenu(btn.id)">⋮</button>
            <div v-if="menuOpen === btn.id" class="absolute right-0 bottom-7 z-50 w-32 bg-neutral-900 border border-neutral-700 rounded-md shadow-lg p-1 flex flex-col">
              <button class="text-left text-[11px] px-2 py-1 rounded hover:bg-neutral-700" @click="openEdit(btn); closeMenu()">{{ t('actions.edit') }}</button>
              <button class="text-left text-[11px] px-2 py-1 rounded hover:bg-neutral-700 text-red-300" @click="remove(btn); closeMenu()">{{ t('actions.delete') }}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
    <div class="resize-handle-h border-t border-neutral-800" @mousedown="startResize" @dblclick="resetResize" :title="resizeTitle"></div>
    <aside class="flex flex-col bg-neutral-900/30 backdrop-blur-sm border-t border-neutral-800 w-full" :style="{ height: logHeight + 'px' }">
      <div class="px-4 pt-3 pb-2 flex items-center gap-4 border-b border-neutral-800 text-[11px]">
        <div class="flex gap-2">
          <button :class="['tab-btn', activeLogView==='global' && 'active']" @click="activeLogView='global'">Global</button>
          <button :class="['tab-btn', activeLogView==='button' && 'active', !selectedButtonId && 'disabled']" :disabled="!selectedButtonId" @click="activeLogView='button'">{{ selectedButton?.label || t('logs.title') }}</button>
        </div>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" v-model="autoFollow" class="accent-blue-500" />
            <span>{{ t('logUI.autoFollow') }}</span>
          </label>
          <div class="flex items-center gap-1" title="{{ t('logUI.bufferSize') }}">
            <span class="text-neutral-500">{{ t('logUI.bufferSize') }}</span>
            <input type="range" min="200" max="8000" step="200" v-model.number="logLimitSetting" class="w-32" />
            <span>{{ logLimitSetting }}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-neutral-500">{{ t('layout.orientation') }}</span>
            <select v-model="orientation" @change="persistOrientation" class="select-ghost">
              <option value="vertical">{{ t('layout.vertical') }}</option>
              <option value="horizontal">{{ t('layout.horizontal') }}</option>
            </select>
          </div>
        </div>
        <div class="ml-auto flex gap-1 items-center">
          <button v-if="showScrollBottom" class="mini-btn" @click="scrollActiveToBottom">{{ t('logUI.scrollBottom') }}</button>
          <button v-if="activeLogView==='button' && selectedButtonId && selectedLogs.length" class="mini-btn" @click="clearSelectedLog">{{ t('actions.clear') }}</button>
          <button v-if="activeLogView==='button' && selectedButtonId && selectedLogs.length" class="mini-btn" @click="copySelectedLog">{{ t('actions.copy') }}</button>
          <button v-if="activeLogView==='global' && globalLogsDisplay.length" class="mini-btn" @click="clearGlobalLog">{{ t('actions.clear') }}</button>
          <button v-if="activeLogView==='global' && globalLogsDisplay.length" class="mini-btn" @click="copyGlobalLog">{{ t('actions.copy') }}</button>
        </div>
      </div>
      <div v-if="activeLogView==='global'" ref="globalLogRef" class="flex-1 min-h-0 overflow-auto p-3 font-mono text-[11px] leading-snug log-scroll">
        <div v-if="!globalLogsDisplay.length" class="text-neutral-600">(global log vazio)</div>
        <div v-else>
          <div v-for="entry in globalLogsDisplay" :key="entry.id" :class="globalLineClass(entry)" class="flex gap-2">
            <span class="text-neutral-500 shrink-0" :title="formatTs(entry.ts)">{{ formatTime(entry.ts) }}</span>
            <span class="mr-2 px-1 py-[1px] rounded bg-neutral-700/60 text-[10px] text-neutral-200 shrink-0" :style="badgeStyle(entry.buttonId)">{{ entry.buttonLabel }}</span>
            <span class="whitespace-pre-wrap break-all" v-html="renderAnsi(entry.line)"></span>
          </div>
        </div>
      </div>
      <div v-else ref="buttonLogRef" class="flex-1 min-h-0 overflow-auto p-3 font-mono text-[11px] leading-snug log-scroll">
        <div v-if="!selectedButtonId" class="text-neutral-600">{{ t('logs.selectPrompt') }}</div>
        <div v-else-if="!selectedLogs.length" class="text-neutral-600">{{ t('logs.empty') }}</div>
        <template v-else>
          <div v-for="(line,i) in selectedLogs" :key="i" :class="logLineClass(line)" class="flex gap-2">
            <span class="text-neutral-500 shrink-0" :title="formatTs(buttonLogTimestamps[i])">{{ formatTime(buttonLogTimestamps[i]) }}</span>
            <span class="whitespace-pre-wrap break-all" v-html="renderAnsi(line)"></span>
          </div>
        </template>
      </div>
    </aside>
  </div>
      </template>
    </div>

    <!-- Edit Modal -->
    <div v-if="editing" class="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div class="bg-neutral-900/90 border border-neutral-700 rounded-xl p-5 w-full max-w-md space-y-4 shadow-2xl backdrop-blur">
        <h2 class="text-base font-semibold tracking-wide">{{ t('modal.editTitle') }}</h2>
        <div class="space-y-3">
          <label class="block text-xs uppercase tracking-wide text-neutral-400">{{ t('form.label') }}
            <input v-model="editForm.label" class="mt-1 w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-600 focus:outline-none focus:border-blue-500" />
          </label>
          <label class="block text-xs uppercase tracking-wide text-neutral-400">{{ t('form.command') }}
            <textarea v-model="editForm.command" rows="3" class="mt-1 w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-600 focus:outline-none focus:border-blue-500"></textarea>
          </label>
          <div class="flex gap-2">
            <label class="flex-1 block text-xs uppercase tracking-wide text-neutral-400">{{ t('form.color') }}
              <div class="mt-1 flex gap-2 items-center">
                <input v-model="editForm.color" class="flex-1 px-2 py-1 rounded bg-neutral-800 border border-neutral-600 focus:outline-none focus:border-blue-500" placeholder="#222" />
                <input type="color" v-model="editForm.color" class="h-8 w-10 bg-transparent cursor-pointer" />
              </div>
            </label>
            <label class="block text-xs uppercase tracking-wide text-neutral-400">{{ t('form.confirm') }}
              <select v-model="editForm.confirm" class="mt-1 px-2 py-1 rounded bg-neutral-800 border border-neutral-600 focus:outline-none focus:border-blue-500">
                <option :value="false">No</option>
                <option :value="true">Yes</option>
              </select>
            </label>
          </div>
          <label class="block text-xs uppercase tracking-wide text-neutral-400">{{ t('form.timeout') }}
            <input type="number" min="0" v-model.number="editForm.timeoutMs" class="mt-1 w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-600 focus:outline-none focus:border-blue-500" />
          </label>
          <label class="block text-xs uppercase tracking-wide text-neutral-400">{{ t('form.notifyOn') }}
            <select v-model="editForm.notifyOn" class="mt-1 w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-600 focus:outline-none focus:border-blue-500">
              <option value="off">{{ t('notify.off') }}</option>
              <option value="fail">{{ t('notify.fail') }}</option>
              <option value="always">{{ t('notify.always') }}</option>
            </select>
          </label>
          <div class="flex gap-2">
            <label class="flex-1 block text-xs uppercase tracking-wide text-neutral-400">{{ t('form.icon') }}
              <div class="relative mt-1">
                <input v-model="editForm.iconName" @input="onIconInput" @focus="iconSuggestOpen = true" @blur="onIconBlur" class="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-600 focus:outline-none focus:border-blue-500" placeholder="Play" autocomplete="off" />
                <div v-if="iconSuggestOpen && filteredIcons.length" class="absolute z-50 mt-1 max-h-48 overflow-auto bg-neutral-900 border border-neutral-700 rounded shadow-lg w-full text-xs">
                  <button v-for="name in filteredIcons" :key="name" type="button" class="flex items-center gap-2 w-full px-2 py-1 text-left hover:bg-neutral-700" @mousedown.prevent="selectIcon(name)">
                    <span>{{ name }}</span>
                  </button>
                </div>
              </div>
            </label>
            <div class="flex items-end pb-1">
              <DynamicIcon :icon="previewIcon" :size="32" />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button class="btn-secondary" @click="closeEdit" :disabled="saving">{{ t('actions.cancel') }}</button>
          <button class="btn-primary" @click="saveEdit" :disabled="saving">{{ saving ? t('actions.saving') : t('actions.save') }}</button>
        </div>
      </div>
    </div>
    <!-- Interactive Prompt Modal -->
    <div v-if="promptModal.open" class="fixed inset-0 flex items-center justify-center bg-black/70 z-[60]">
      <div class="bg-neutral-900/95 border border-neutral-700 rounded-xl p-5 w-full max-w-sm space-y-4 shadow-2xl backdrop-blur">
        <h2 class="text-sm font-semibold flex items-center gap-2">
          <span class="px-2 py-[2px] rounded bg-blue-600/40 text-blue-200 text-[10px] uppercase tracking-wide">Prompt</span>
          <span class="truncate" :title="promptModal.buttonLabel">{{ promptModal.buttonLabel }}</span>
        </h2>
        <div class="text-[12px] font-mono whitespace-pre-wrap break-all text-neutral-300 bg-neutral-800/60 rounded p-2 max-h-32 overflow-auto">
          {{ promptModal.text }}
        </div>
        <div>
          <label class="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1">{{ promptModal.type === 'password' ? 'Password' : 'Input' }}</label>
          <input :type="promptModal.type === 'password' ? 'password' : 'text'" v-model="promptModal.value" @keydown.enter.prevent="submitPrompt" class="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-600 focus:outline-none focus:border-blue-500" autofocus />
        </div>
        <div class="flex justify-between items-center text-[11px] text-neutral-500">
          <span v-if="promptModal.error" class="text-red-400">{{ promptModal.error }}</span>
          <span class="ml-auto" v-if="promptModal.sending">{{ t('actions.saving') }}...</span>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button class="btn-secondary" @click="cancelPrompt" :disabled="promptModal.sending">{{ t('actions.cancel') }}</button>
          <button class="btn-primary" @click="submitPrompt" :disabled="promptModal.sending || !promptModal.value.length">Enviar</button>
        </div>
      </div>
    </div>
    <!-- Parameters Modal -->
    <div v-if="paramModal.open" class="fixed inset-0 flex items-center justify-center bg-black/70 z-[70]">
      <div class="bg-neutral-900/95 border border-neutral-700 rounded-xl p-5 w-full max-w-md space-y-4 shadow-2xl backdrop-blur">
        <h2 class="text-sm font-semibold flex items-center gap-2">
          <span class="px-2 py-[2px] rounded bg-emerald-600/40 text-emerald-200 text-[10px] uppercase tracking-wide">Run with parameters</span>
          <span class="truncate" :title="paramModal.button?.label">{{ paramModal.button?.label }}</span>
        </h2>
        <div class="space-y-3 max-h-72 overflow-auto pr-1">
          <div v-for="(f,idx) in paramModal.fields" :key="f.name+idx" class="space-y-1">
            <label class="block text-[11px] uppercase tracking-wide text-neutral-400">{{ f.label || f.name }} <span v-if="f.required" class="text-red-400">*</span></label>
            <input v-if="f.type==='text' || f.type==='password'" :type="f.type==='password' ? 'password':'text'" v-model="f.value" class="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-600 focus:outline-none focus:border-blue-500" />
            <select v-else-if="f.type==='select'" v-model="f.value" class="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-600 focus:outline-none focus:border-blue-500">
              <option v-for="opt in (f.options||[])" :key="String(opt)" :value="String(opt)">{{ String(opt) }}</option>
            </select>
          </div>
        </div>
        <div class="text-[11px] text-neutral-400">
          <div class="opacity-70">Preview</div>
          <div class="mt-1 font-mono whitespace-pre-wrap break-all bg-neutral-800/60 rounded p-2">{{ paramPreview }}</div>
        </div>
        <div class="flex justify-between items-center text-[11px] text-neutral-500">
          <span v-if="paramModal.error" class="text-red-400">{{ paramModal.error }}</span>
          <span class="ml-auto" v-if="paramModal.submitting">{{ t('actions.saving') }}...</span>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button class="btn-secondary" @click="closeParamModal" :disabled="paramModal.submitting">{{ t('actions.cancel') }}</button>
          <button class="btn-primary" @click="submitParams" :disabled="paramModal.submitting">Run</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import * as lucide from 'lucide-vue-next';
import DynamicIcon from './components/DynamicIcon.vue';
import * as lucideAll from 'lucide-vue-next';

interface RunMessage { type: string; data?: string; code?: number; }

const state = ref<any>(null);
const isElectron = typeof window !== 'undefined' && !!(window as any).termdeck;
const activeProfile = computed(() => {
  if (!state.value) return null;
  return state.value.profiles.find((p: any) => p.id === state.value.activeProfileId) || null;
});
const selectedProfileId = ref<string | null>(null);
const openProfileMenu = ref(false);
const logs = ref<Record<string, string[]>>({});
const running = ref<Record<string, boolean>>({});
const concurrencyPolicy = ref<'parallel' | 'single-per-button' | 'single-global'>('single-per-button');
const logLimitSetting = ref<number>(Number(localStorage.getItem('termdeck.logLimit')) || 500);
watch(logLimitSetting, v => localStorage.setItem('termdeck.logLimit', String(v)));
const LOG_LIMIT =  computed(() => logLimitSetting.value); // basic buffer limit (per button)
const GLOBAL_LOG_LIMIT = 4000;
const selectedButtonId = ref<string | null>(null);
const selectedButton = computed(() => {
  if (!activeProfile.value || !selectedButtonId.value) return null;
  return activeProfile.value.buttons.find((b: any) => b.id === selectedButtonId.value) || null;
});
const selectedLogs = computed(() => selectedButtonId.value ? (logs.value[selectedButtonId.value] || []) : []);
const globalLogs = ref<{ id: number; ts: number; buttonId: string; buttonLabel: string; line: string; kind: string }[]>([]);
const buttonLogTimestamps = ref<number[]>([]); // aligned with selected button log lines (only for current selected)
const activeLogView = ref<'global'|'button'>('global');
let globalLogSeq = 0;
const editing = ref(false);
const saving = ref(false);
const editTarget = ref<any>(null);
const editForm = ref({ label: '', command: '', color: '#222', confirm: false as boolean | undefined, timeoutMs: 0, notifyOn: 'off' as 'off'|'fail'|'always', iconName: '' });
// Interactive prompt modal state
const promptModal = ref<{ open: boolean; buttonId: string | null; buttonLabel: string; type: 'input' | 'password'; text: string; value: string; sending: boolean; error: string | null }>({
  open: false,
  buttonId: null,
  buttonLabel: '',
  type: 'input',
  text: '',
  value: '',
  sending: false,
  error: null
});
const runSubscriptions: Record<string, () => void> = {};
// Toasts (fallback notifications)
const toasts = ref<{ id: number; title: string; body: string; failed: boolean; buttonId: string }[]>([]);
let toastSeq = 0;
let audioCtx: AudioContext | null = null;
function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  return audioCtx;
}
function playToastSound(failed: boolean) {
  try {
    const ctx = ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    // Different pitch for success vs fail
    osc.frequency.value = failed ? 340 : 540;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch { /* ignore audio errors */ }
}
function pushToast(t: { title: string; body: string; failed: boolean; buttonId: string }) {
  const id = ++toastSeq;
  toasts.value.push({ id, ...t });
  playToastSound(t.failed);
  setTimeout(() => { toasts.value = toasts.value.filter(x => x.id !== id); }, 6000);
}
function focusApp(buttonId: string) {
  // Just select the button & switch to its log for now
  if (buttonId) {
    selectedButtonId.value = buttonId;
    activeLogView.value = 'button';
  }
}
const creatingNew = ref(false);
const menuOpen = ref<string | null>(null);
function toggleMenu(id: string) { menuOpen.value = menuOpen.value === id ? null : id; }
function closeMenu() { menuOpen.value = null; }
document.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('.card-actions')) menuOpen.value = null; });
const { t, locale } = useI18n();
const locales = ['en','pt'];
const localeRef = ref(locale.value);
async function changeLocale() {
  locale.value = localeRef.value;
  try { await window.termdeck.setLocale(locale.value); } catch { /* ignore */ }
}
const iconSuggestOpen = ref(false);
const filteredIcons = ref<string[]>([]);
const allIcons = Object.keys(lucideAll).filter(k => /^[A-Z]/.test(k));

// Resizable log panel state + orientation
const orientation = ref<'vertical'|'horizontal'>((localStorage.getItem('termdeck.orientation') as any) || 'vertical');
const isVertical = computed(()=> orientation.value === 'vertical');
const logWidth = ref<number>(Math.round(window.innerWidth * 0.33));
const logHeight = ref<number>(Math.round(window.innerHeight * 0.33));
const resizeTitle = computed(()=> isVertical.value ? 'Drag to resize log panel (double click to reset width)' : 'Drag to resize log panel (double click to reset height)');
function persistOrientation(){ localStorage.setItem('termdeck.orientation', orientation.value); }
const resizing = ref(false);
function startResize(e: MouseEvent) { resizing.value = true; e.preventDefault(); }
function resetResize() {
  if (isVertical.value) {
    logWidth.value = Math.round(window.innerWidth * 0.33);
    localStorage.setItem('termdeck.logWidth', String(logWidth.value));
  } else {
    logHeight.value = Math.round(window.innerHeight * 0.33);
    localStorage.setItem('termdeck.logHeight', String(logHeight.value));
  }
}
function onMouseMove(e: MouseEvent) {
  if (!resizing.value) return;
  if (isVertical.value) {
    const min = 240; const max = Math.round(window.innerWidth * 0.8);
    const newW = Math.min(max, Math.max(min, window.innerWidth - e.clientX));
    logWidth.value = newW;
  } else {
    const minH = 160; const maxH = Math.round(window.innerHeight * 0.8);
    const newH = Math.min(maxH, Math.max(minH, window.innerHeight - e.clientY));
    logHeight.value = newH;
  }
}
function onMouseUp() {
  if (resizing.value) {
    resizing.value = false;
    if (isVertical.value) localStorage.setItem('termdeck.logWidth', String(logWidth.value));
    else localStorage.setItem('termdeck.logHeight', String(logHeight.value));
  }
}
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);
onMounted(() => {
  const savedW = Number(localStorage.getItem('termdeck.logWidth'));
  if (savedW && !Number.isNaN(savedW)) logWidth.value = savedW;
  const savedH = Number(localStorage.getItem('termdeck.logHeight'));
  if (savedH && !Number.isNaN(savedH)) logHeight.value = savedH;
});
onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
});

// Auto-scroll handling
const globalLogRef = ref<HTMLElement | null>(null);
const buttonLogRef = ref<HTMLElement | null>(null);
function maybeAutoScroll(el: HTMLElement | null) {
  if (!el) return;
  const threshold = 48; // px from bottom to still auto follow
  const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
  recomputeScrollButtons(el);
  if (!autoFollow.value) return;
  if (distanceFromBottom <= threshold) {
    el.scrollTop = el.scrollHeight;
  }
}
watch(() => globalLogs.value.length, () => nextTick(() => maybeAutoScroll(globalLogRef.value)));
watch(() => selectedLogs.value.length, () => nextTick(() => maybeAutoScroll(buttonLogRef.value)));
// When switching tabs ensure scroll pinned
watch(activeLogView, () => nextTick(() => { if (activeLogView.value === 'global') maybeAutoScroll(globalLogRef.value); else maybeAutoScroll(buttonLogRef.value); }));

// Track manual scroll to toggle scroll-bottom button
function attachScrollListeners() {
  const g = globalLogRef.value; const b = buttonLogRef.value;
  if (g) g.addEventListener('scroll', () => recomputeScrollButtons(g));
  if (b) b.addEventListener('scroll', () => recomputeScrollButtons(b));
}
onMounted(() => nextTick(attachScrollListeners));

onMounted(async () => {
  if (!isElectron) {
    // When opened directly in a browser (Vite dev server), preload bridge is absent.
    state.value = null; // keep null; UI will show a warning.
    return;
  }
  try {
    state.value = await window.termdeck.load();
    selectedProfileId.value = state.value.activeProfileId;
    if (state.value.concurrencyPolicy) concurrencyPolicy.value = state.value.concurrencyPolicy;
    if (state.value.locale) {
      locale.value = state.value.locale;
      localeRef.value = state.value.locale;
    }
  } catch (e) {
    console.error('[termdeck] Failed to load initial state:', e);
  }
  // Subscribe to interactive prompt events
  if (isElectron) {
    const onPromptFn: any = (window as any).termdeck?.onPrompt;
    if (typeof onPromptFn === 'function') {
      onPromptFn((p: any) => {
        promptModal.value.open = true;
        promptModal.value.buttonId = p.buttonId;
        promptModal.value.buttonLabel = p.buttonLabel;
        promptModal.value.type = p.type;
        promptModal.value.text = p.text;
        promptModal.value.value = '';
        promptModal.value.sending = false;
        promptModal.value.error = null;
      });
    } else {
      console.warn('[termdeck] onPrompt API ausente. Reinicie o processo Electron para carregar o preload atualizado.');
    }
    const notifyFallbackFn: any = (window as any).termdeck?.onNotifyFallback;
    if (typeof notifyFallbackFn === 'function') {
      notifyFallbackFn((n: any) => {
        pushToast({ title: n.title, body: n.body, failed: n.failed, buttonId: n.buttonId });
      });
    }
  }
});

function openCreateModal() {
  creatingNew.value = true;
  editTarget.value = null;
  editForm.value = { label: '', command: '', color: '#4f46e5', confirm: false, timeoutMs: 0, notifyOn: 'off', iconName: '' };
  editing.value = true;
}

function changeProfile() {
  if (!selectedProfileId.value || !state.value) return;
  window.termdeck.setActiveProfile(selectedProfileId.value).then(r => {
    state.value.activeProfileId = r.activeProfileId;
    selectedButtonId.value = null;
  });
}

function createProfile() {
  window.termdeck.createProfile({}).then(p => {
    state.value.profiles.push(p);
    state.value.activeProfileId = p.id;
    selectedProfileId.value = p.id;
    openProfileMenu.value = false;
  });
}

function promptRenameProfile() {
  if (!activeProfile.value) return;
  const name = prompt(t('profile.renamePrompt'), activeProfile.value.name);
  if (name && name.trim()) {
    window.termdeck.renameProfile(activeProfile.value.id, name.trim()).then(p => {
      activeProfile.value!.name = p.name;
      openProfileMenu.value = false;
    });
  }
}

function deleteProfile() {
  if (!activeProfile.value) return;
  if (!confirm(t('profile.deleteConfirm'))) return;
  window.termdeck.deleteProfile(activeProfile.value.id).then(r => {
    state.value.profiles = state.value.profiles.filter((p: any) => p.id !== activeProfile.value!.id);
    state.value.activeProfileId = r.activeProfileId;
    selectedProfileId.value = r.activeProfileId;
    openProfileMenu.value = false;
    selectedButtonId.value = null;
  }).catch(e => alert(e.message));
}

function run(btn: any) {
  // If command contains ${...} placeholders or has parameters schema, open parameters modal
  const placeholders = detectPlaceholders(btn.command);
  if ((placeholders.length > 0) || (btn.parameters && btn.parameters.length)) {
    openParamModal(btn, placeholders);
    return;
  }
  if (!logs.value[btn.id]) logs.value[btn.id] = [];
  if (selectedButtonId.value === btn.id) buttonLogTimestamps.value = buttonLogTimestamps.value || [];
  selectedButtonId.value = btn.id;
  // Front-end guard
  if (concurrencyPolicy.value === 'single-global' && Object.values(running.value).some(v => v)) {
    logs.value[btn.id].push(t('concurrencyMsg.blocked'));
    return;
  }
  if (concurrencyPolicy.value === 'single-per-button' && running.value[btn.id]) {
    logs.value[btn.id].push(t('concurrencyMsg.blocked'));
    return;
  }
  running.value[btn.id] = true;
  if (runSubscriptions[btn.id]) { runSubscriptions[btn.id]!(); delete runSubscriptions[btn.id]; }
  const unsubscribe = window.termdeck.run(btn.id, (m: RunMessage | any) => {
    if (!logs.value[btn.id]) logs.value[btn.id] = [];
    const label = btn.label;
    const pushGlobal = (line: string, kind: string) => {
      globalLogs.value.push({ id: ++globalLogSeq, ts: Date.now(), buttonId: btn.id, buttonLabel: label, line, kind });
      if (globalLogs.value.length > GLOBAL_LOG_LIMIT) {
        globalLogs.value.splice(0, globalLogs.value.length - GLOBAL_LOG_LIMIT);
      }
    };
    if (m.busy) {
      const line = t('concurrencyMsg.blocked');
      logs.value[btn.id].push(line);
      pushGlobal(line, 'meta');
      running.value[btn.id] = false;
      unsubscribe(); delete runSubscriptions[btn.id];
      return;
    }
    if (m.type === 'stdout' || m.type === 'stderr') {
      const text = m.data || '';
      logs.value[btn.id].push(text);
      if (selectedButtonId.value === btn.id) buttonLogTimestamps.value.push(Date.now());
      pushGlobal(text, m.type);
    }
    if (m.type === 'close') {
      const line = `Exited with code ${m.code}`;
      logs.value[btn.id].push(line);
      if (selectedButtonId.value === btn.id) buttonLogTimestamps.value.push(Date.now());
      pushGlobal(line, 'meta');
      running.value[btn.id] = false;
      unsubscribe(); delete runSubscriptions[btn.id];
    }
    if (m.type === 'timeout') {
      const line = 'Timed out';
      logs.value[btn.id].push(line);
      if (selectedButtonId.value === btn.id) buttonLogTimestamps.value.push(Date.now());
      pushGlobal(line, 'meta');
      running.value[btn.id] = false;
      unsubscribe(); delete runSubscriptions[btn.id];
    }
    const limit = LOG_LIMIT.value;
    if (logs.value[btn.id].length > limit) {
      const overflow = logs.value[btn.id].length - limit;
      logs.value[btn.id].splice(0, overflow);
      if (selectedButtonId.value === btn.id) buttonLogTimestamps.value.splice(0, overflow);
    }
  });
  runSubscriptions[btn.id] = unsubscribe;
}
function stop(btn: any) {
  window.termdeck.stop(btn.id);
  running.value[btn.id] = false;
}

function select(btn: any) {
  selectedButtonId.value = btn.id;
  if (!logs.value[btn.id]) logs.value[btn.id] = [];
  // Build timestamps array for existing lines (approximate: use now for older lines if no data)
  buttonLogTimestamps.value = logs.value[btn.id].map(() => Date.now());
}

function clearSelectedLog() {
  if (selectedButtonId.value) { logs.value[selectedButtonId.value] = []; buttonLogTimestamps.value = []; }
}
// Timestamp formatting
function pad(n:number){ return n<10? '0'+n : ''+n; }
function formatTime(ts:number){ const d=new Date(ts); return pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds()); }
function formatTs(ts:number){ const d=new Date(ts); return d.toISOString(); }

// Auto-scroll toggle & scroll-to-bottom button visibility
const autoFollow = ref(true);
const showScrollBottom = ref(false);
function recomputeScrollButtons(el: HTMLElement | null) {
  if (!el) return; const distance = el.scrollHeight - (el.scrollTop + el.clientHeight); showScrollBottom.value = distance > 60; }
function scrollActiveToBottom() {
  if (activeLogView.value === 'global') globalLogRef.value && (globalLogRef.value.scrollTop = globalLogRef.value.scrollHeight);
  else buttonLogRef.value && (buttonLogRef.value.scrollTop = buttonLogRef.value.scrollHeight);
  showScrollBottom.value = false;
}

function clearGlobalLog() { globalLogs.value = []; }
async function copyGlobalLog() {
  if (!globalLogs.value.length) return;
  try { await navigator.clipboard.writeText(globalLogs.value.map(l => `[${l.buttonLabel}] ${l.line}`).join('\n')); } catch {}
}

async function copySelectedLog() {
  if (!selectedLogs.value.length) return;
  try {
    await navigator.clipboard.writeText(selectedLogs.value.join('\n'));
  } catch (e) {
    // ignore clipboard errors silently for now
  }
}

const previewIcon = computed(() => {
  if (!editForm.value.iconName) return null;
  return { pack: 'lucide', name: editForm.value.iconName };
});

function openEdit(btn: any) {
  editTarget.value = btn;
  editForm.value = {
    label: btn.label,
    command: btn.command,
    color: btn.color || '#222',
    confirm: btn.confirm || false,
    timeoutMs: btn.timeoutMs || 0,
    notifyOn: btn.notifyOn || 'off',
    iconName: btn.icon?.name || ''
  };
  editing.value = true;
}

function closeEdit() {
  if (saving.value) return;
  editing.value = false;
  editTarget.value = null;
  creatingNew.value = false;
}

function saveEdit() {
  saving.value = true;
  const data: any = { ...editForm.value };
  if (data.iconName) data.icon = { pack: 'lucide', name: data.iconName }; else data.icon = null;
  delete data.iconName;
  if (creatingNew.value) {
    window.termdeck.addButton(state.value.activeProfileId, data)
      .then(btn => {
        const profile = activeProfile.value;
        if (profile) profile.buttons.push(btn);
        creatingNew.value = false;
        closeEdit();
      })
      .finally(() => { saving.value = false; });
  } else if (editTarget.value) {
    window.termdeck.updateButton(state.value.activeProfileId, editTarget.value.id, data)
      .then(updated => { Object.assign(editTarget.value, updated); closeEdit(); })
      .finally(() => { saving.value = false; });
  } else {
    saving.value = false;
  }
}
// Prompt handlers
function cancelPrompt() {
  promptModal.value.open = false;
  promptModal.value.buttonId = null;
}
async function submitPrompt() {
  if (!promptModal.value.buttonId) return;
  promptModal.value.sending = true; promptModal.value.error = null;
  try {
    const res = await window.termdeck.sendInput(promptModal.value.buttonId, promptModal.value.value);
    if (!res.sent) {
      promptModal.value.error = res.error || res.reason || 'Failed';
      promptModal.value.sending = false;
      return;
    }
    promptModal.value.open = false;
    promptModal.value.buttonId = null;
  } catch (e: any) {
    promptModal.value.error = e?.message || 'Error';
    promptModal.value.sending = false;
  }
}

function remove(btn: any) {
  if (!confirm(t('confirm.deleteButton'))) return;
  window.termdeck.removeButton(state.value.activeProfileId, btn.id).then(() => {
    const profile = activeProfile.value;
    if (!profile) return;
    profile.buttons = profile.buttons.filter((b: any) => b.id !== btn.id);
  delete logs.value[btn.id];
  if (selectedButtonId.value === btn.id) selectedButtonId.value = null;
  });
}

function onIconInput() {
  const q = editForm.value.iconName.trim();
  if (!q) {
    filteredIcons.value = allIcons.slice(0, 40);
  } else {
    const lc = q.toLowerCase();
    filteredIcons.value = allIcons.filter(n => n.toLowerCase().includes(lc)).slice(0, 40);
  }
}
function selectIcon(name: string) {
  editForm.value.iconName = name;
  iconSuggestOpen.value = false;
}
function onIconBlur() {
  setTimeout(() => { iconSuggestOpen.value = false; }, 120);
}

// Drag & Drop reorder
const dragState = ref<{ buttonId: string; fromIndex: number } | null>(null);
function onDragStart(btn: any, idx: number) {
  dragState.value = { buttonId: btn.id, fromIndex: idx };
}
function onDrop(_btn: any, idx: number) {
  if (!activeProfile.value || !dragState.value) return;
  const buttons = activeProfile.value.buttons;
  const from = dragState.value.fromIndex;
  if (from === idx) { dragState.value = null; return; }
  const [moved] = buttons.splice(from, 1);
  buttons.splice(idx, 0, moved);
  dragState.value = null;
  window.termdeck.updateProfile({ ...activeProfile.value, buttons: [...buttons] });
}

function buttonCardClasses(btn: any) {
  return [
  'relative group rounded-lg border border-neutral-800 bg-neutral-800/70 hover:bg-neutral-700/70 transition-colors cursor-pointer overflow-hidden flex flex-col justify-between',
    selectedButtonId.value === btn.id ? 'ring-2 ring-blue-500/70' : '',
    running.value[btn.id] ? 'outline outline-2 outline-blue-400/70' : ''
  ];
}

function logLineClass(line: string) {
  const plain = stripAnsi(line);
  if (plain === t('concurrencyMsg.blocked')) return 'text-purple-400 italic';
  const exitMatch = /^Exited with code (\d+)/.exec(plain);
  if (exitMatch) {
    const code = Number(exitMatch[1]);
    return code === 0 ? 'text-emerald-400' : 'text-red-400 font-medium';
  }
  if (/Timed out/i.test(plain)) return 'text-amber-400';
  if (/error|failed|exception|traceback/i.test(plain)) return 'text-red-400';
  return 'leading-snug text-neutral-300';
}

const globalLogsDisplay = computed(() => globalLogs.value);
function globalLineClass(entry: { line: string; kind: string; buttonId: string }) {
  const plain = stripAnsi(entry.line);
  if (plain === t('concurrencyMsg.blocked')) return 'text-purple-400 italic';
  if (/^Exited with code/.test(plain)) return /code 0$/.test(plain) ? 'text-emerald-400' : 'text-red-400 font-medium';
  if (/Timed out/i.test(plain)) return 'text-amber-400';
  if (entry.kind === 'stderr') return 'text-red-300';
  return 'text-neutral-300';
}
function badgeStyle(buttonId: string) {
  // simple hash to color mapping for button badges
  let hash = 0; for (let i=0;i<buttonId.length;i++) hash = (hash*31 + buttonId.charCodeAt(i)) & 0xffffffff;
  const hue = Math.abs(hash) % 360;
  return { backgroundColor: `hsl(${hue} 20% 25% / 0.7)` };
}

function updatePolicy() {
  window.termdeck.setConcurrencyPolicy(concurrencyPolicy.value);
}

// --- Parameters support ---
const paramModal = ref<{ open: boolean; button: any | null; fields: Array<{ name: string; label: string; type: 'text'|'password'|'select'; options?: string[]; required?: boolean; value: string }>; submitting: boolean; error: string | null }>({
  open: false,
  button: null,
  fields: [],
  submitting: false,
  error: null
});

function detectPlaceholders(cmd: string): string[] {
  const names = new Set<string>();
  const re = /\$\{([a-zA-Z0-9_.-]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cmd))) names.add(m[1]);
  return Array.from(names);
}

function openParamModal(btn: any, placeholders?: string[]) {
  const fields: Array<{ name: string; label: string; type: 'text'|'password'|'select'; options?: string[]; required?: boolean; value: string }> = [];
  if (Array.isArray(btn.parameters) && btn.parameters.length) {
    for (const p of btn.parameters) {
      fields.push({ name: p.name, label: p.label || p.name, type: p.type || 'text', options: p.options || [], required: !!p.required, value: p.defaultValue || '' });
    }
  } else {
    // Build from placeholders with generic text type
    const names = placeholders && placeholders.length ? placeholders : detectPlaceholders(btn.command);
    for (const name of names) fields.push({ name, label: name, type: 'text', required: false, value: '' });
  }
  paramModal.value = { open: true, button: btn, fields, submitting: false, error: null };
}

const paramPreview = computed(() => {
  const btn = paramModal.value.button; if (!btn) return '';
  let c = String(btn.command || '');
  for (const f of paramModal.value.fields) {
    const rgx = new RegExp(`\\$\\{${f.name}\\}`, 'g');
    c = c.replace(rgx, f.value ?? '');
  }
  return c;
});

function closeParamModal() { paramModal.value.open = false; paramModal.value.button = null; }

function validateParams(): string | null {
  for (const f of paramModal.value.fields) {
    if (f.required && (!f.value || !String(f.value).trim())) {
      return `${f.label || f.name} is required`;
    }
  }
  return null;
}

function startRunWithListener(btn: any, subscribe: (listener: (m: any) => void) => () => void) {
  if (!logs.value[btn.id]) logs.value[btn.id] = [];
  if (selectedButtonId.value === btn.id) buttonLogTimestamps.value = buttonLogTimestamps.value || [];
  selectedButtonId.value = btn.id;
  // Front-end guard
  if (concurrencyPolicy.value === 'single-global' && Object.values(running.value).some(v => v)) {
    logs.value[btn.id].push(t('concurrencyMsg.blocked'));
    return;
  }
  if (concurrencyPolicy.value === 'single-per-button' && running.value[btn.id]) {
    logs.value[btn.id].push(t('concurrencyMsg.blocked'));
    return;
  }
  running.value[btn.id] = true;
  if (runSubscriptions[btn.id]) { runSubscriptions[btn.id]!(); delete runSubscriptions[btn.id]; }
  const unsubscribe = subscribe((m: RunMessage | any) => {
    if (!logs.value[btn.id]) logs.value[btn.id] = [];
    const label = btn.label;
    const pushGlobal = (line: string, kind: string) => {
      globalLogs.value.push({ id: ++globalLogSeq, ts: Date.now(), buttonId: btn.id, buttonLabel: label, line, kind });
      if (globalLogs.value.length > GLOBAL_LOG_LIMIT) {
        globalLogs.value.splice(0, globalLogs.value.length - GLOBAL_LOG_LIMIT);
      }
    };
    if (m.busy) {
      const line = t('concurrencyMsg.blocked');
      logs.value[btn.id].push(line);
      pushGlobal(line, 'meta');
      running.value[btn.id] = false;
      unsubscribe(); delete runSubscriptions[btn.id];
      return;
    }
    if (m.type === 'stdout' || m.type === 'stderr') {
      const text = m.data || '';
      logs.value[btn.id].push(text);
      if (selectedButtonId.value === btn.id) buttonLogTimestamps.value.push(Date.now());
      pushGlobal(text, m.type);
    }
    if (m.type === 'close') {
      const line = `Exited with code ${m.code}`;
      logs.value[btn.id].push(line);
      if (selectedButtonId.value === btn.id) buttonLogTimestamps.value.push(Date.now());
      pushGlobal(line, 'meta');
      running.value[btn.id] = false;
      unsubscribe(); delete runSubscriptions[btn.id];
    }
    if (m.type === 'timeout') {
      const line = 'Timed out';
      logs.value[btn.id].push(line);
      if (selectedButtonId.value === btn.id) buttonLogTimestamps.value.push(Date.now());
      pushGlobal(line, 'meta');
      running.value[btn.id] = false;
      unsubscribe(); delete runSubscriptions[btn.id];
    }
    const limit = LOG_LIMIT.value;
    if (logs.value[btn.id].length > limit) {
      const overflow = logs.value[btn.id].length - limit;
      logs.value[btn.id].splice(0, overflow);
      if (selectedButtonId.value === btn.id) buttonLogTimestamps.value.splice(0, overflow);
    }
  });
  runSubscriptions[btn.id] = unsubscribe;
}

async function submitParams() {
  const err = validateParams();
  if (err) { paramModal.value.error = err; return; }
  if (!paramModal.value.button) return;
  const btn = paramModal.value.button;
  const params: Record<string, string> = {};
  for (const f of paramModal.value.fields) params[f.name] = f.value || '';
  paramModal.value.submitting = true; paramModal.value.error = null;
  try {
    closeParamModal();
    startRunWithListener(btn, (listener) => (window as any).termdeck.runWithParams(btn.id, params, listener));
  } catch (e:any) {
    paramModal.value.error = e?.message || 'Failed';
    paramModal.value.submitting = false;
  }
}

// --- ANSI color support ---
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g; // ESC[ ... m
function stripAnsi(str: string): string { return str.replace(ANSI_PATTERN, ''); }
function renderAnsi(input: string): string {
  if (!input) return '';
  if (input.includes('\r')) input = input.split(/\r+/).pop() as string; // keep last carriage return segment
  let lastIndex = 0; let match: RegExpExecArray | null;
  const pieces: string[] = [];
  let styles: { bold?: boolean; italic?: boolean; underline?: boolean; fg?: string; bg?: string } = {};
  let open = false;
  function styleString() {
    const s: string[] = [];
    if (styles.bold) s.push('font-weight:600');
    if (styles.italic) s.push('font-style:italic');
    if (styles.underline) s.push('text-decoration:underline');
    if (styles.fg) s.push('color:'+styles.fg);
    if (styles.bg) s.push('background-color:'+styles.bg);
    return s.length ? '<span style="'+s.join(';')+'">' : '';
  }
  function esc(txt: string) { return txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function pushText(txt: string) {
    if (!txt) return;
    if (!open && (styles.bold||styles.italic||styles.underline||styles.fg||styles.bg)) { pieces.push(styleString()); open = true; }
    pieces.push(esc(txt));
  }
  function close() { if (open) { pieces.push('</span>'); open = false; } }
  const baseColors: Record<number,string> = {30:'#6b7280',31:'#ef4444',32:'#22c55e',33:'#eab308',34:'#3b82f6',35:'#d946ef',36:'#06b6d4',37:'#e5e7eb',90:'#4b5563',91:'#f87171',92:'#34d399',93:'#facc15',94:'#60a5fa',95:'#f472b6',96:'#67e8f9',97:'#f3f4f6'};
  const toColor = (code:number) => baseColors[code];
  while ((match = ANSI_PATTERN.exec(input))) {
    pushText(input.slice(lastIndex, match.index));
    const codes = match[0].slice(2,-1).split(';').filter(Boolean).map(n=>parseInt(n,10));
    if (!codes.length) codes.push(0);
    while (codes.length) {
      const c = codes.shift()!;
      if (c === 0) { close(); styles = {}; continue; }
      if (c === 1) { styles.bold = true; continue; }
      if (c === 3) { styles.italic = true; continue; }
      if (c === 4) { styles.underline = true; continue; }
      if (c === 22) { styles.bold = false; continue; }
      if (c === 23) { styles.italic = false; continue; }
      if (c === 24) { styles.underline = false; continue; }
      if ((c >= 30 && c <= 37) || (c >= 90 && c <= 97)) { styles.fg = toColor(c); continue; }
      if ((c >= 40 && c <= 47) || (c >= 100 && c <= 107)) { const fg = c - 10; styles.bg = toColor(fg); continue; }
      if (c === 38 || c === 48) {
        if (codes[0] === 5 && typeof codes[1] === 'number') { codes.shift(); const n = codes.shift()!; const col = ansi256(n); if (c===38) styles.fg = col; else styles.bg = col; continue; }
      }
    }
    lastIndex = match.index + match[0].length;
    close(); // We'll reopen if needed when new text appended
  }
  pushText(input.slice(lastIndex));
  close();
  return pieces.join('');
}
function ansi256(n: number): string {
  if (n < 16) {
    const basic = ['#000000','#800000','#008000','#808000','#000080','#800080','#008080','#c0c0c0','#808080','#ff0000','#00ff00','#ffff00','#0000ff','#ff00ff','#00ffff','#ffffff'];
    return basic[n] || '#ffffff';
  }
  if (n >= 16 && n <= 231) {
    n -= 16; const r = Math.floor(n/36); const g = Math.floor((n%36)/6); const b = n%6; const cv = [0,95,135,175,215,255];
    return rgb(cv[r], cv[g], cv[b]);
  }
  if (n >= 232 && n <= 255) { const c = 8 + (n-232)*10; return rgb(c,c,c); }
  return '#ffffff';
}
function rgb(r:number,g:number,b:number){ return '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join(''); }
</script>

<style>
/* Minimal fallback styles (avoiding @apply for environments where it is not processed here) */
.btn-accent { font-size:12px; padding:0 0.75rem; height:1.75rem; border-radius:0.375rem; background:#2563eb; color:#fff; font-weight:500; letter-spacing:.03em; transition:.15s background; }
.btn-accent:hover { background:#3b82f6; }
.select-ghost { background:rgba(31,31,35,0.6); border:1px solid #404040; border-radius:0.375rem; font-size:12px; padding:0.25rem 0.5rem; }
.dropdown-panel { position:absolute; z-index:40; margin-top:0.5rem; right:0; width:11rem; background:#111827; border:1px solid #404040; border-radius:0.375rem; box-shadow:0 4px 16px rgba(0,0,0,.4); padding:0.25rem; display:flex; flex-direction:column; gap:0.25rem; }
.dropdown-panel .item { text-align:left; font-size:12px; padding:0.25rem 0.5rem; border-radius:0.25rem; }
.dropdown-panel .item:hover { background:#374151; }
.dropdown-panel .item:disabled { opacity:.4; cursor:not-allowed; }
.mini-btn { font-size:10px; padding:2px 0.5rem; border-radius:0.375rem; background:#3f3f46; transition:.15s background; }
.mini-btn:hover { background:#52525b; }
.mini-btn:disabled { opacity:.4; }
.btn-secondary { padding:0.25rem 0.75rem; font-size:0.875rem; border-radius:0.375rem; background:#3f3f46; transition:.15s background; }
.btn-secondary:hover { background:#52525b; }
.btn-secondary:disabled { opacity:.5; }
.btn-primary { padding:0.25rem 0.75rem; font-size:0.875rem; border-radius:0.375rem; background:#2563eb; color:#fff; transition:.15s background; }
.btn-primary:hover { background:#3b82f6; }
.btn-primary:disabled { opacity:.5; }
.card-actions { position:absolute; bottom:0.25rem; right:0.25rem; display:flex; gap:0.25rem; opacity:0; transition:.15s opacity; }
.group:hover .card-actions { opacity:1; }
.card-actions .act { height:1.5rem; width:1.5rem; display:flex; align-items:center; justify-content:center; border-radius:0.375rem; font-size:11px; font-weight:600; color:#f5f5f5; background:rgba(64,64,64,.8); }
.card-actions .act:hover { background:rgba(82,82,82,.8); }
.card-actions .act:disabled { opacity:.4; }
.card-actions .act.blue { background:#2563eb; }
.card-actions .act.blue:hover { background:#3b82f6; }
.card-actions .act.green { background:#059669; }
.card-actions .act.green:hover { background:#10b981; }
.card-actions .act.amber { background:#d97706; }
.card-actions .act.amber:hover { background:#f59e0b; }
.card-actions .act.red { background:#dc2626; }
.card-actions .act.red:hover { background:#ef4444; }
.deck-button { width:10rem; height:8rem; padding:0.75rem; }
.resize-handle { width:4px; cursor:col-resize; background:#27272a; transition:.15s background; }
.resize-handle:hover { background:#52525b; }
.resize-handle:active { background:#2563eb; }
.resize-handle-h { height:4px; cursor:row-resize; background:#27272a; transition:.15s background; }
.resize-handle-h:hover { background:#52525b; }
.resize-handle-h:active { background:#2563eb; }
.log-scroll::-webkit-scrollbar { width:8px; }
.log-scroll::-webkit-scrollbar-track { background:transparent; }
.log-scroll::-webkit-scrollbar-thumb { background:#3f3f46; border-radius:4px; }
.log-scroll::-webkit-scrollbar-thumb:hover { background:#52525b; }
</style>
