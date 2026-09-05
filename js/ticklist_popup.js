import { supabase } from './supabase.js';
import { isProjectGrade } from './route_rules.js?v=20260905-stability-1';

const GRADES = [
  '2a', '2b', '2c', '3a', '3b', '3c', '4a', '4b', '4c',
  '5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+', '8a', '8a+', '8b',
  '8b+', '8c', '8c+', '9a'
];

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
}

async function validateRoutesForTicklist(routeIds) {
  try {
    const uniqueRouteIds = Array.from(new Set(routeIds));
    const { data, error } = await supabase
      .from('routes')
      .select('uuid, grad')
      .in('uuid', uniqueRouteIds);

    if (error) {
      console.error('Route validation failed:', error);
      return { ok: false, message: 'Route details could not be checked. Please try again.' };
    }

    const routesById = new Map((data || []).map(route => [route.uuid, route]));
    if (uniqueRouteIds.some(routeId => !routesById.has(routeId))) {
      return { ok: false, message: 'A selected route no longer exists. Please reload the page.' };
    }

    if (uniqueRouteIds.some(routeId => isProjectGrade(routesById.get(routeId)?.grad))) {
      return { ok: false, message: 'Projects without a grade cannot be added to the tick list.' };
    }

    return { ok: true, message: '' };
  } catch (error) {
    console.error('Route validation request failed:', error);
    return { ok: false, message: 'Route details could not be checked. Please try again.' };
  }
}

function createRouteEditor(item) {
  const editor = document.createElement('li');
  editor.className = 'tick-editor';
  editor.dataset.routeId = item.route_id || '';

  const title = document.createElement('div');
  title.className = 'tick-editor-title';
  const routeName = document.createElement('strong');
  routeName.textContent = item.route_name || 'Unknown';
  const routeGrade = document.createElement('span');
  routeGrade.textContent = ` (${item.grad || '?'})`;
  title.append(routeName, routeGrade);

  const ratingField = document.createElement('fieldset');
  ratingField.className = 'tick-editor-field';
  const ratingLegend = document.createElement('legend');
  ratingLegend.textContent = 'Rating';
  const ratingGroup = document.createElement('div');
  ratingGroup.className = 'tick-rating-stars';
  const ratingInput = document.createElement('input');
  ratingInput.type = 'hidden';
  ratingInput.dataset.rating = '';
  ratingInput.value = item.rating || '';

  const updateStars = value => {
    const numericValue = Number(value) || 0;
    ratingGroup.querySelectorAll('.tick-rating-star').forEach(star => {
      const active = Number(star.dataset.value) <= numericValue;
      star.textContent = active ? '★' : '☆';
      star.classList.toggle('is-active', active);
      star.setAttribute('aria-pressed', String(active));
    });
  };

  for (let value = 1; value <= 5; value += 1) {
    const star = document.createElement('button');
    star.type = 'button';
    star.className = 'tick-rating-star';
    star.dataset.value = String(value);
    star.setAttribute('aria-label', `${value} of 5 stars`);
    star.addEventListener('click', () => {
      ratingInput.value = String(value);
      updateStars(value);
    });
    ratingGroup.appendChild(star);
  }
  ratingGroup.appendChild(ratingInput);
  ratingField.append(ratingLegend, ratingGroup);
  updateStars(item.rating);

  const options = document.createElement('div');
  options.className = 'tick-editor-options';

  const flashLabel = document.createElement('label');
  flashLabel.className = 'tick-editor-checkbox';
  const flashInput = document.createElement('input');
  flashInput.type = 'checkbox';
  flashInput.dataset.flash = '';
  flashInput.checked = Boolean(item.flash);
  flashLabel.append(flashInput, document.createTextNode(' Flash'));

  const gradeLabel = document.createElement('label');
  gradeLabel.className = 'tick-editor-grade';
  gradeLabel.appendChild(document.createTextNode('Suggested grade '));
  const gradeSelect = document.createElement('select');
  gradeSelect.dataset.gradeSuggestion = '';
  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = 'No suggestion';
  gradeSelect.appendChild(emptyOption);
  GRADES.forEach(grade => {
    const option = document.createElement('option');
    option.value = grade;
    option.textContent = grade;
    option.selected = item.grade_suggestion === grade;
    gradeSelect.appendChild(option);
  });
  gradeLabel.appendChild(gradeSelect);

  options.append(flashLabel, gradeLabel);
  editor.append(title, ratingField, options);
  return editor;
}

export function showTicklistPopup({ mode = 'add', entry = null, onSuccess = null }) {
  const entries = Array.isArray(entry) ? entry : (entry ? [entry] : []);
  if (entries.length === 0) return false;

  document.getElementById('ticklist-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'ticklist-modal';
  overlay.className = 'tick-modal';

  const dialog = document.createElement('section');
  dialog.className = 'tick-modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'tick-modal-title');
  dialog.tabIndex = -1;

  const title = document.createElement('h2');
  title.id = 'tick-modal-title';
  title.textContent = mode === 'edit' ? 'Edit tick' : 'Add to tick list';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'tick-modal-close';
  closeButton.setAttribute('aria-label', 'Close');
  closeButton.textContent = '×';

  const form = document.createElement('form');
  form.className = 'tick-modal-form';
  form.noValidate = true;

  const list = document.createElement('ul');
  list.className = 'tick-editor-list';
  entries.forEach(item => list.appendChild(createRouteEditor(item)));

  const status = document.createElement('p');
  status.className = 'tick-modal-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const actions = document.createElement('div');
  actions.className = 'tick-modal-actions';
  const submitButton = document.createElement('button');
  submitButton.id = 'submit-ticklist-button';
  submitButton.type = 'submit';
  submitButton.textContent = mode === 'edit' ? 'Save changes' : 'Save to tick list';
  actions.appendChild(submitButton);

  form.append(list, status, actions);
  dialog.append(closeButton, title, form);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const handleKeydown = event => {
    if (event.key === 'Escape') closeDialog();
  };

  const closeDialog = () => {
    document.removeEventListener('keydown', handleKeydown);
    overlay.remove();
  };

  closeButton.addEventListener('click', closeDialog);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeDialog();
  });
  document.addEventListener('keydown', handleKeydown);

  const finishSuccessfully = async message => {
    status.classList.remove('is-error');
    status.classList.add('is-success');
    status.textContent = message;
    await new Promise(resolve => window.setTimeout(resolve, 500));
    closeDialog();

    if (typeof onSuccess === 'function') {
      await onSuccess();
    } else {
      document.dispatchEvent(new CustomEvent('ticklistChanged'));
    }
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const editors = Array.from(list.querySelectorAll('.tick-editor'));
    const payload = editors.map(editor => {
      const ratingRaw = editor.querySelector('[data-rating]')?.value;
      return {
        route_id: editor.dataset.routeId,
        rating: ratingRaw ? Number(ratingRaw) : null,
        flash: editor.querySelector('[data-flash]')?.checked ?? false,
        grade_suggestion: editor.querySelector('[data-grade-suggestion]')?.value || null
      };
    });

    if (payload.some(item => !isValidUuid(item.route_id))) {
      status.classList.add('is-error');
      status.textContent = 'This route could not be saved. Please reload the page and try again.';
      return;
    }

    submitButton.disabled = true;
    status.classList.remove('is-error', 'is-success');
    status.textContent = 'Saving…';

    let sessionData;
    let sessionError;
    try {
      const sessionResult = await supabase.auth.getSession();
      sessionData = sessionResult.data;
      sessionError = sessionResult.error;
    } catch (error) {
      console.error('Ticklist session request failed:', error);
      sessionError = error;
    }
    const userId = sessionData?.session?.user?.id;
    if (sessionError || !userId) {
      submitButton.disabled = false;
      status.classList.add('is-error');
      status.textContent = 'Your session has expired. Please log in again.';
      return;
    }

    const routeValidation = await validateRoutesForTicklist(payload.map(item => item.route_id));
    if (!routeValidation.ok) {
      submitButton.disabled = false;
      status.classList.add('is-error');
      status.textContent = routeValidation.message;
      return;
    }

    let result;
    try {
      if (mode === 'edit') {
        const item = payload[0];
        result = await supabase
          .from('ticklist')
          .update({ rating: item.rating, flash: item.flash, grade_suggestion: item.grade_suggestion })
          .eq('user_id', userId)
          .eq('route_id', item.route_id);
      } else {
        result = await supabase.from('ticklist').upsert(
          payload.map(item => ({ ...item, user_id: userId })),
          { onConflict: 'user_id,route_id', returning: 'minimal' }
        );
      }
    } catch (error) {
      console.error('Ticklist save request failed:', error);
      result = { error };
    }

    if (result.error) {
      console.error('Ticklist save failed:', result.error);
      submitButton.disabled = false;
      status.classList.add('is-error');
      status.textContent = 'Saving failed. Please try again.';
      return;
    }

    await finishSuccessfully(mode === 'edit' ? 'Changes saved.' : 'Added to your tick list.');
  });

  if (mode === 'edit') {
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'tick-delete-trigger';
    deleteButton.textContent = 'Delete entry';

    const confirmation = document.createElement('div');
    confirmation.className = 'tick-delete-confirmation';
    confirmation.hidden = true;
    const confirmationText = document.createElement('p');
    confirmationText.textContent = 'Remove this route from your tick list?';

    const confirmActions = document.createElement('div');
    confirmActions.className = 'tick-delete-actions';
    const cancelDelete = document.createElement('button');
    cancelDelete.type = 'button';
    cancelDelete.className = 'tick-button-secondary';
    cancelDelete.textContent = 'Cancel';
    const confirmDelete = document.createElement('button');
    confirmDelete.type = 'button';
    confirmDelete.className = 'tick-button-danger';
    confirmDelete.textContent = 'Delete permanently';
    confirmActions.append(cancelDelete, confirmDelete);
    confirmation.append(confirmationText, confirmActions);
    form.append(deleteButton, confirmation);

    deleteButton.addEventListener('click', () => {
      deleteButton.hidden = true;
      confirmation.hidden = false;
      cancelDelete.focus();
    });

    cancelDelete.addEventListener('click', () => {
      confirmation.hidden = true;
      deleteButton.hidden = false;
      deleteButton.focus();
    });

    confirmDelete.addEventListener('click', async () => {
      const routeId = list.querySelector('.tick-editor')?.dataset.routeId;
      confirmDelete.disabled = true;
      status.classList.remove('is-error', 'is-success');
      status.textContent = 'Deleting…';

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (sessionError || !userId || !isValidUuid(routeId)) {
        confirmDelete.disabled = false;
        status.classList.add('is-error');
        status.textContent = 'The entry could not be deleted. Please log in again.';
        return;
      }

      const { error } = await supabase
        .from('ticklist')
        .delete()
        .eq('user_id', userId)
        .eq('route_id', routeId);

      if (error) {
        console.error('Ticklist delete failed:', error);
        confirmDelete.disabled = false;
        status.classList.add('is-error');
        status.textContent = 'Deleting failed. Please try again.';
        return;
      }

      await finishSuccessfully('Entry deleted.');
    });
  }

  dialog.focus();
  return true;
}
