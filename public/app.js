// ==============================================================================
// ItinEra Frontend Application Logic
// Pure Vanilla JavaScript (Clean, Modular & Easy to Understand)
// ==============================================================================

// Storage Key for LocalStorage
const STORAGE_KEY = 'itinera_saved_trips';

// Application State
const state = {
  currentTrip: null,
  savedTrips: [],
  activeDayFilter: 'all',
  packedItems: new Set()
};

// ==============================================================================
// DOM Element References
// ==============================================================================
const DOM = {
  // Navigation & Drawer
  brandLogo: document.getElementById('brandLogo'),
  viewSavedBtn: document.getElementById('viewSavedBtn'),
  savedCountBadge: document.getElementById('savedCountBadge'),
  savedDrawer: document.getElementById('savedDrawer'),
  drawerOverlay: document.getElementById('drawerOverlay'),
  closeDrawerBtn: document.getElementById('closeDrawerBtn'),
  savedTripsList: document.getElementById('savedTripsList'),
  savedEmptyState: document.getElementById('savedEmptyState'),
  clearAllSavedBtn: document.getElementById('clearAllSavedBtn'),

  // Sections
  plannerSection: document.getElementById('plannerSection'),
  loadingSection: document.getElementById('loadingSection'),
  resultsSection: document.getElementById('resultsSection'),

  // Form Elements
  itineraryForm: document.getElementById('itineraryForm'),
  destinationInput: document.getElementById('destinationInput'),
  quickChips: document.querySelectorAll('.chip-btn'),
  durationRange: document.getElementById('durationRange'),
  durationValue: document.getElementById('durationValue'),
  pillDays: document.querySelectorAll('.pill-day'),
  budgetCards: document.querySelectorAll('.budget-card'),
  interestsContainer: document.getElementById('interestsContainer'),
  notesInput: document.getElementById('notesInput'),
  formError: document.getElementById('formError'),
  errorMessage: document.getElementById('errorMessage'),
  submitBtn: document.getElementById('submitBtn'),

  // Loading elements
  loadingTip: document.getElementById('loadingTip'),

  // Results View Elements
  backToFormBtn: document.getElementById('backToFormBtn'),
  copyPlanBtn: document.getElementById('copyPlanBtn'),
  printPlanBtn: document.getElementById('printPlanBtn'),
  saveTripBtn: document.getElementById('saveTripBtn'),
  saveTripIcon: document.getElementById('saveTripIcon'),
  saveTripText: document.getElementById('saveTripText'),

  // Trip Info Display
  resDestination: document.getElementById('resDestination'),
  resDuration: document.getElementById('resDuration'),
  resBudget: document.getElementById('resBudget'),
  resSeason: document.getElementById('resSeason'),
  resTripTitle: document.getElementById('resTripTitle'),
  resSummary: document.getElementById('resSummary'),

  // Cost Display
  costHotel: document.getElementById('costHotel'),
  costFood: document.getElementById('costFood'),
  costTransit: document.getElementById('costTransit'),
  costTotal: document.getElementById('costTotal'),

  // Itinerary & Extras Containers
  dayFilterPills: document.getElementById('dayFilterPills'),
  itineraryDaysList: document.getElementById('itineraryDaysList'),
  packingContainer: document.getElementById('packingContainer'),
  packingProgress: document.getElementById('packingProgress'),
  tipsContainer: document.getElementById('tipsContainer'),

  // Toast
  toast: document.getElementById('toast')
};

// Travel tips to rotate through while generating
const LOADING_TIPS = [
  'Connecting with Groq Llama 3.3 to analyze your destination...',
  'Clustering attractions by neighborhood to save commute time...',
  'Checking local dining spots and insider food recommendations...',
  'Calculating estimated accommodation and transit expenses...',
  'Curating climate-appropriate packing essentials...',
  'Polishing daily morning, afternoon, and evening schedules...'
];
let loadingTipInterval = null;

// ==============================================================================
// Initialization
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadSavedTripsFromStorage();
  attachEventListeners();
});

// ==============================================================================
// Event Listeners Setup
// ==============================================================================
function attachEventListeners() {
  // Brand logo click returns to planner
  DOM.brandLogo.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('planner');
  });

  // Quick destination chips
  DOM.quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      DOM.destinationInput.value = chip.dataset.destination;
      DOM.destinationInput.focus();
    });
  });

  // Duration Slider sync
  DOM.durationRange.addEventListener('input', (e) => {
    const val = e.target.value;
    DOM.durationValue.textContent = val;
    // Sync pill buttons
    DOM.pillDays.forEach(pill => {
      pill.classList.toggle('active', pill.dataset.days === val);
    });
  });

  // Quick days buttons
  DOM.pillDays.forEach(pill => {
    pill.addEventListener('click', () => {
      const days = pill.dataset.days;
      DOM.durationRange.value = days;
      DOM.durationValue.textContent = days;
      DOM.pillDays.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

  // Budget card radio selection
  DOM.budgetCards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio) {
      radio.addEventListener('change', () => {
        DOM.budgetCards.forEach(c => {
          const r = c.querySelector('input[type="radio"]');
          c.classList.toggle('active', !!(r && r.checked));
        });
      });
    }
  });

  // Interest tags toggle (listens to native checkbox change)
  DOM.interestsContainer.querySelectorAll('.interest-pill').forEach(pill => {
    const checkbox = pill.querySelector('input[type="checkbox"]');
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        pill.classList.toggle('active', checkbox.checked);
      });
    }
  });

  // Form submission
  DOM.itineraryForm.addEventListener('submit', handleFormSubmit);

  // Return to Form
  DOM.backToFormBtn.addEventListener('click', () => {
    showSection('planner');
  });

  // Copy Plan to Clipboard
  DOM.copyPlanBtn.addEventListener('click', copyPlanToClipboard);

  // Print / Save as PDF
  DOM.printPlanBtn.addEventListener('click', () => {
    window.print();
  });

  // Save / Bookmark Trip
  DOM.saveTripBtn.addEventListener('click', toggleSaveCurrentTrip);

  // Drawer Controls
  DOM.viewSavedBtn.addEventListener('click', openSavedDrawer);
  DOM.closeDrawerBtn.addEventListener('click', closeSavedDrawer);
  DOM.drawerOverlay.addEventListener('click', closeSavedDrawer);
  DOM.clearAllSavedBtn.addEventListener('click', clearAllSavedTrips);
}

// ==============================================================================
// Section Display Controller
// ==============================================================================
function showSection(sectionName) {
  DOM.plannerSection.style.display = sectionName === 'planner' ? 'block' : 'none';
  DOM.loadingSection.style.display = sectionName === 'loading' ? 'block' : 'none';
  DOM.resultsSection.style.display = sectionName === 'results' ? 'flex' : 'none';

  if (sectionName === 'planner') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (sectionName === 'results') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ==============================================================================
// Form Handling & API Request
// ==============================================================================
async function handleFormSubmit(e) {
  e.preventDefault();
  hideError();

  const destination = DOM.destinationInput.value.trim();
  const days = parseInt(DOM.durationRange.value, 10);
  const selectedBudgetRadio = document.querySelector('input[name="budget"]:checked');
  const budget = selectedBudgetRadio ? selectedBudgetRadio.value : 'Mid-range';

  // Gather selected interests
  const checkedInterests = Array.from(
    document.querySelectorAll('input[name="interests"]:checked')
  ).map(cb => cb.value);

  const additionalNotes = DOM.notesInput.value.trim();

  // Basic validation
  if (!destination) {
    showError('Please enter a destination to proceed.');
    DOM.destinationInput.focus();
    return;
  }

  // Start Loading
  startLoading();

  try {
    const response = await fetch('/api/generate-itinerary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destination,
        days,
        budget,
        interests: checkedInterests,
        additionalNotes
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Server returned an error generating your trip.');
    }

    // Set current trip state and render
    state.currentTrip = result.data;
    state.packedItems.clear(); // Reset packing checklist for new trip

    renderTrip(state.currentTrip);
    showSection('results');
    showToast('✨ Your itinerary is ready!');

  } catch (err) {
    console.error('Error creating itinerary:', err);
    showSection('planner');
    showError(err.message || 'Network error or Groq service unavailable. Please try again.');
  } finally {
    stopLoading();
  }
}

function startLoading() {
  showSection('loading');
  let tipIdx = 0;
  DOM.loadingTip.textContent = LOADING_TIPS[0];
  loadingTipInterval = setInterval(() => {
    tipIdx = (tipIdx + 1) % LOADING_TIPS.length;
    DOM.loadingTip.textContent = LOADING_TIPS[tipIdx];
  }, 2500);
}

function stopLoading() {
  if (loadingTipInterval) {
    clearInterval(loadingTipInterval);
    loadingTipInterval = null;
  }
}

function showError(msg) {
  DOM.errorMessage.textContent = msg;
  DOM.formError.style.display = 'flex';
}

function hideError() {
  DOM.formError.style.display = 'none';
}

// ==============================================================================
// Results Rendering
// ==============================================================================
function renderTrip(trip) {
  if (!trip) return;

  // 1. Meta & Header
  DOM.resTripTitle.textContent = trip.tripTitle || `${trip.destination} Travel Plan`;
  DOM.resDestination.textContent = trip.destination;
  DOM.resDuration.textContent = `${trip.durationDays} Days`;
  DOM.resBudget.textContent = trip.budgetTier || 'Trip';
  DOM.resSeason.textContent = trip.bestTimeToVisit ? `Best: ${trip.bestTimeToVisit}` : 'All Year';
  DOM.resSummary.textContent = trip.summary || '';

  // 2. Cost Breakdown
  const costs = trip.estimatedCost || {};
  DOM.costHotel.textContent = costs.accommodation || 'N/A';
  DOM.costFood.textContent = costs.foodAndDining || 'N/A';
  DOM.costTransit.textContent = costs.activitiesAndTransport || 'N/A';
  DOM.costTotal.textContent = costs.totalEstimated || 'N/A';

  // 3. Day Filter Pills
  renderDayFilterPills(trip.itinerary || []);

  // 4. Daily Schedule
  renderItineraryDays(trip.itinerary || []);

  // 5. Packing Checklist
  renderPackingChecklist(trip.packingChecklist || []);

  // 6. Insider Travel Tips
  renderLocalTips(trip.localTravelTips || []);

  // 7. Update Save Button State
  updateSaveButtonStatus();
}

/**
 * Renders quick jump pills (All, Day 1, Day 2...)
 */
function renderDayFilterPills(days) {
  DOM.dayFilterPills.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'day-filter-btn active';
  allBtn.textContent = 'All Days';
  allBtn.addEventListener('click', () => filterDays('all', allBtn));
  DOM.dayFilterPills.appendChild(allBtn);

  days.forEach((dayObj) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day-filter-btn';
    btn.textContent = `Day ${dayObj.day}`;
    btn.addEventListener('click', () => filterDays(dayObj.day, btn));
    DOM.dayFilterPills.appendChild(btn);
  });
}

function filterDays(filter, activeBtn) {
  state.activeDayFilter = filter;
  document.querySelectorAll('.day-filter-btn').forEach(b => b.classList.remove('active'));
  activeBtn.classList.add('active');

  const cards = DOM.itineraryDaysList.querySelectorAll('.day-card');
  cards.forEach(card => {
    const dayNum = parseInt(card.dataset.day, 10);
    if (filter === 'all' || dayNum === filter) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

/**
 * Renders each day with Morning, Afternoon, and Evening slots
 */
function renderItineraryDays(days) {
  DOM.itineraryDaysList.innerHTML = '';

  if (!days || days.length === 0) {
    DOM.itineraryDaysList.innerHTML = '<p class="text-muted">No itinerary slots returned.</p>';
    return;
  }

  days.forEach((dayPlan) => {
    const dayCard = document.createElement('article');
    dayCard.className = 'day-card';
    dayCard.dataset.day = dayPlan.day;

    dayCard.innerHTML = `
      <div class="day-card-header">
        <div class="day-card-title-group">
          <span class="day-badge">Day ${dayPlan.day}</span>
          <span class="day-theme">${escapeHtml(dayPlan.theme || `Day ${dayPlan.day} Highlights`)}</span>
        </div>
      </div>
      <div class="day-slots">
        ${renderSlotHtml('morning', '🌅 Morning', dayPlan.morning)}
        ${renderSlotHtml('afternoon', '☀️ Afternoon', dayPlan.afternoon)}
        ${renderSlotHtml('evening', '🌙 Evening', dayPlan.evening)}
      </div>
    `;

    DOM.itineraryDaysList.appendChild(dayCard);
  });
}

function renderSlotHtml(slotKey, slotLabel, slotData) {
  if (!slotData) {
    return `
      <div class="slot-card slot-${slotKey}">
        <div class="slot-header">
          <span class="slot-name">${slotLabel}</span>
        </div>
        <p class="slot-desc text-muted">Free exploration or relaxation.</p>
      </div>
    `;
  }

  return `
    <div class="slot-card slot-${slotKey}">
      <div class="slot-header">
        <span class="slot-name">${slotLabel}</span>
        <span class="slot-time">${escapeHtml(slotData.time || '')}</span>
      </div>
      <h4 class="slot-title">${escapeHtml(slotData.title || '')}</h4>
      <p class="slot-desc">${escapeHtml(slotData.description || '')}</p>
      <div class="slot-footer">
        ${slotData.location ? `<div class="slot-location">📍 <span>${escapeHtml(slotData.location)}</span></div>` : ''}
        ${slotData.tips ? `<div class="slot-tip">💡 <span>${escapeHtml(slotData.tips)}</span></div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Renders categorized packing checklist with interactive checkboxes
 */
function renderPackingChecklist(categories) {
  DOM.packingContainer.innerHTML = '';

  if (!categories || categories.length === 0) {
    DOM.packingContainer.innerHTML = '<p class="text-muted">No specific packing tips available.</p>';
    updatePackingProgress();
    return;
  }

  categories.forEach((cat, catIdx) => {
    const catCard = document.createElement('div');
    catCard.className = 'packing-category-card';

    const itemsHtml = (cat.items || []).map((item, itemIdx) => {
      const itemId = `pack_${catIdx}_${itemIdx}`;
      const isChecked = state.packedItems.has(item);

      return `
        <li class="packing-item">
          <label class="packing-item-label ${isChecked ? 'checked' : ''}" for="${itemId}">
            <input 
              type="checkbox" 
              id="${itemId}" 
              class="packing-item-checkbox" 
              ${isChecked ? 'checked' : ''}
              data-item="${escapeHtml(item)}"
            >
            <span>${escapeHtml(item)}</span>
          </label>
        </li>
      `;
    }).join('');

    catCard.innerHTML = `
      <h4 class="packing-category-title">
        <span>🎒</span> ${escapeHtml(cat.category || 'Packing Category')}
      </h4>
      <ul class="packing-items-list">
        ${itemsHtml}
      </ul>
    `;

    DOM.packingContainer.appendChild(catCard);
  });

  // Attach change listeners to update checklist progress
  DOM.packingContainer.querySelectorAll('.packing-item-checkbox').forEach(box => {
    box.addEventListener('change', (e) => {
      const label = e.target.closest('.packing-item-label');
      const itemText = e.target.dataset.item;
      if (e.target.checked) {
        state.packedItems.add(itemText);
        label.classList.add('checked');
      } else {
        state.packedItems.delete(itemText);
        label.classList.remove('checked');
      }
      updatePackingProgress();
    });
  });

  updatePackingProgress();
}

function updatePackingProgress() {
  const allBoxes = DOM.packingContainer.querySelectorAll('.packing-item-checkbox');
  const checkedBoxes = DOM.packingContainer.querySelectorAll('.packing-item-checkbox:checked');
  DOM.packingProgress.textContent = `${checkedBoxes.length} of ${allBoxes.length} packed`;
}

/**
 * Renders local insider tips
 */
function renderLocalTips(tips) {
  DOM.tipsContainer.innerHTML = '';

  if (!tips || tips.length === 0) {
    DOM.tipsContainer.innerHTML = '<p class="text-muted">No extra local tips provided.</p>';
    return;
  }

  tips.forEach(tip => {
    const card = document.createElement('div');
    card.className = 'tip-card';
    card.innerHTML = `
      <span class="tip-icon">✨</span>
      <span>${escapeHtml(tip)}</span>
    `;
    DOM.tipsContainer.appendChild(card);
  });
}

// ==============================================================================
// Saved Trips / LocalStorage Persistence
// ==============================================================================
function loadSavedTripsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.savedTrips = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load trips from localStorage:', err);
    state.savedTrips = [];
  }
  updateSavedBadge();
}

function saveTripsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.savedTrips));
  } catch (err) {
    console.error('Failed to write to localStorage:', err);
  }
  updateSavedBadge();
}

function updateSavedBadge() {
  DOM.savedCountBadge.textContent = state.savedTrips.length;
}

function isCurrentTripSaved() {
  if (!state.currentTrip) return false;
  return state.savedTrips.some(t => t.id === state.currentTrip.id);
}

function updateSaveButtonStatus() {
  const saved = isCurrentTripSaved();
  if (saved) {
    DOM.saveTripIcon.textContent = '★';
    DOM.saveTripText.textContent = 'Saved to Trips';
    DOM.saveTripBtn.classList.add('btn-secondary');
    DOM.saveTripBtn.classList.remove('btn-primary');
  } else {
    DOM.saveTripIcon.textContent = '☆';
    DOM.saveTripText.textContent = 'Save Trip';
    DOM.saveTripBtn.classList.add('btn-primary');
    DOM.saveTripBtn.classList.remove('btn-secondary');
  }
}

function toggleSaveCurrentTrip() {
  if (!state.currentTrip) return;

  const alreadySaved = isCurrentTripSaved();
  if (alreadySaved) {
    state.savedTrips = state.savedTrips.filter(t => t.id !== state.currentTrip.id);
    showToast('Removed from saved trips');
  } else {
    state.savedTrips.unshift(state.currentTrip);
    showToast('Saved to your trip library!');
  }

  saveTripsToStorage();
  updateSaveButtonStatus();
  renderSavedTripsList();
}

function openSavedDrawer() {
  renderSavedTripsList();
  DOM.savedDrawer.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSavedDrawer() {
  DOM.savedDrawer.classList.remove('open');
  document.body.style.overflow = '';
}

function renderSavedTripsList() {
  DOM.savedTripsList.innerHTML = '';

  if (state.savedTrips.length === 0) {
    DOM.savedEmptyState.style.display = 'block';
    DOM.clearAllSavedBtn.style.display = 'none';
    return;
  }

  DOM.savedEmptyState.style.display = 'none';
  DOM.clearAllSavedBtn.style.display = 'block';

  state.savedTrips.forEach((trip) => {
    const item = document.createElement('div');
    item.className = 'saved-trip-item';

    const dateFormatted = trip.createdAt
      ? new Date(trip.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Saved Trip';

    item.innerHTML = `
      <div class="saved-item-header">
        <h4 class="saved-item-title">${escapeHtml(trip.tripTitle || trip.destination)}</h4>
        <button class="saved-item-delete" title="Delete Trip" data-id="${trip.id}">&times;</button>
      </div>
      <div class="saved-item-meta">
        <span>📍 ${escapeHtml(trip.destination)}</span>
        <span>•</span>
        <span>🗓️ ${trip.durationDays} Days</span>
        <span>•</span>
        <span>💳 ${escapeHtml(trip.budgetTier || 'Mid-range')}</span>
      </div>
      <div class="saved-item-date">${dateFormatted}</div>
    `;

    // Click item to view trip
    item.addEventListener('click', (e) => {
      // Ignore if delete button was clicked
      if (e.target.closest('.saved-item-delete')) return;

      state.currentTrip = trip;
      renderTrip(trip);
      closeSavedDrawer();
      showSection('results');
    });

    // Delete single saved trip
    const deleteBtn = item.querySelector('.saved-item-delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSavedTrip(trip.id);
    });

    DOM.savedTripsList.appendChild(item);
  });
}

function deleteSavedTrip(tripId) {
  state.savedTrips = state.savedTrips.filter(t => t.id !== tripId);
  saveTripsToStorage();
  renderSavedTripsList();
  updateSaveButtonStatus();
  showToast('Trip deleted');
}

function clearAllSavedTrips() {
  if (!confirm('Are you sure you want to remove all saved itineraries?')) return;
  state.savedTrips = [];
  saveTripsToStorage();
  renderSavedTripsList();
  updateSaveButtonStatus();
  showToast('All saved trips cleared');
}

// ==============================================================================
// Utility Functions
// ==============================================================================

/**
 * Copies a clean text summary of the current itinerary to clipboard
 */
async function copyPlanToClipboard() {
  if (!state.currentTrip) return;

  const trip = state.currentTrip;
  let text = `✈️ ITINERA TRAVEL PLAN: ${trip.tripTitle}\n`;
  text += `📍 Destination: ${trip.destination} (${trip.durationDays} Days | ${trip.budgetTier} Budget)\n`;
  text += `\n📝 Summary:\n${trip.summary}\n\n`;

  if (trip.estimatedCost) {
    text += `💰 Estimated Cost: ${trip.estimatedCost.totalEstimated} (Stay: ${trip.estimatedCost.accommodation}, Food: ${trip.estimatedCost.foodAndDining})\n\n`;
  }

  if (trip.itinerary) {
    text += `🗺️ DAILY SCHEDULE:\n`;
    trip.itinerary.forEach(day => {
      text += `\n--- Day ${day.day}: ${day.theme} ---\n`;
      if (day.morning) text += `• Morning (${day.morning.time}): ${day.morning.title} - ${day.morning.description}\n`;
      if (day.afternoon) text += `• Afternoon (${day.afternoon.time}): ${day.afternoon.title} - ${day.afternoon.description}\n`;
      if (day.evening) text += `• Evening (${day.evening.time}): ${day.evening.title} - ${day.evening.description}\n`;
    });
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast('📋 Itinerary copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy text:', err);
    showToast('Failed to copy to clipboard');
  }
}

/**
 * Shows temporary toast notification
 */
function showToast(msg) {
  DOM.toast.textContent = msg;
  DOM.toast.classList.add('show');
  setTimeout(() => {
    DOM.toast.classList.remove('show');
  }, 2500);
}

/**
 * Escapes unsafe HTML characters to prevent XSS attacks
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

