import { supabase } from './supabase.js';

let authListenerBound = false;
let currentRoot = null;
let currentUser = null;
let entries = [];

export async function initGuestbook() {
  currentRoot = document.querySelector('.guestbook-page');
  if (!currentRoot) return;
  bindAuthListener();

  const [sessionResult, entriesResult] = await Promise.allSettled([
    supabase.auth.getSession(),
    loadEntries()
  ]);

  currentUser = sessionResult.status === 'fulfilled'
    ? sessionResult.value.data?.session?.user || null
    : null;
  if (sessionResult.status === 'rejected' || sessionResult.value?.error) {
    console.error('Guestbook login status could not be loaded:', sessionResult.reason || sessionResult.value.error);
  }

  renderComposer();
  if (entriesResult.status === 'rejected') {
    console.error('Guestbook could not be loaded:', entriesResult.reason);
    renderLoadError();
  } else {
    renderEntries();
  }
}

function bindAuthListener() {
  if (authListenerBound) return;
  authListenerBound = true;
  document.addEventListener('authStateChanged', () => {
    if (document.querySelector('.guestbook-page')) initGuestbook();
  });
}

async function loadEntries() {
  const { data, error } = await supabase.rpc('list_guestbook_entries', { include_hidden: false });
  if (error) throw error;
  entries = data || [];
}

function renderComposer() {
  const container = currentRoot?.querySelector('[data-guestbook-composer]');
  if (!container) return;
  container.replaceChildren();

  if (!currentUser) {
    const notice = document.createElement('div');
    notice.className = 'guestbook-login-note';
    const text = document.createElement('p');
    text.textContent = 'Please log in to write a guestbook entry or reply.';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Log in';
    button.addEventListener('click', () => document.dispatchEvent(new CustomEvent('openLoginMenu')));
    notice.append(text, button);
    container.appendChild(notice);
    return;
  }

  container.appendChild(createEntryForm({
    buttonText: 'Post entry',
    placeholder: 'Write a message for the La Cerra guestbook…',
    onSubmit: message => submitEntry(message, null)
  }));
}

function createEntryForm({ buttonText, placeholder, onSubmit, compact = false }) {
  const form = document.createElement('form');
  form.className = compact ? 'guestbook-form guestbook-reply-form' : 'guestbook-form';
  form.noValidate = true;

  const textarea = document.createElement('textarea');
  textarea.rows = compact ? 3 : 4;
  textarea.maxLength = 1000;
  textarea.required = true;
  textarea.placeholder = placeholder;
  textarea.setAttribute('aria-label', placeholder);

  const actions = document.createElement('div');
  actions.className = 'guestbook-form-actions';
  const count = document.createElement('span');
  count.className = 'form-note';
  count.textContent = '0 / 1000';
  textarea.addEventListener('input', () => {
    count.textContent = `${textarea.value.length} / 1000`;
  });
  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = buttonText;
  actions.append(count, button);

  const status = document.createElement('p');
  status.className = 'admin-save-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const message = textarea.value.normalize('NFKC').trim();
    if (!message) {
      status.textContent = 'Please enter a message.';
      textarea.focus();
      return;
    }
    button.disabled = true;
    textarea.disabled = true;
    status.textContent = 'Posting…';
    try {
      await onSubmit(message);
      textarea.value = '';
      count.textContent = '0 / 1000';
      status.textContent = 'Your message has been posted.';
    } catch (error) {
      const messageText = String(error?.message || '');
      if (messageText.includes('posting_too_fast')) {
        status.textContent = 'Please wait a few seconds before posting again.';
      } else if (messageText.includes('account_suspended')) {
        status.textContent = 'This account is currently suspended.';
      } else {
        status.textContent = 'Your message could not be posted. Please try again.';
      }
    } finally {
      button.disabled = false;
      textarea.disabled = false;
    }
  });

  form.append(textarea, actions, status);
  return form;
}

async function submitEntry(message, parentId) {
  const { error } = await supabase.rpc('create_guestbook_entry', {
    entry_message: message,
    reply_to: parentId
  });
  if (error) throw error;
  await loadEntries();
  renderEntries();
}

function renderEntries() {
  const container = currentRoot?.querySelector('[data-guestbook-list]');
  if (!container) return;
  container.replaceChildren();

  const mainEntries = entries
    .filter(entry => entry.parent_id === null)
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));

  if (mainEntries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'guestbook-empty';
    empty.textContent = 'No entries yet. Be the first to sign the guestbook.';
    container.appendChild(empty);
    return;
  }

  mainEntries.forEach(entry => container.appendChild(createEntryCard(entry)));
}

function createEntryCard(entry) {
  const article = document.createElement('article');
  article.className = 'guestbook-card';
  article.id = `guestbook-${entry.id}`;

  const header = document.createElement('header');
  const author = document.createElement('strong');
  author.textContent = entry.author_name;
  const time = document.createElement('time');
  time.dateTime = entry.created_at;
  time.textContent = formatDate(entry.created_at);
  header.append(author, time);

  const message = document.createElement('p');
  message.className = 'guestbook-message';
  message.textContent = entry.message;
  article.append(header, message);

  const replies = entries
    .filter(candidate => candidate.parent_id === entry.id)
    .sort((left, right) => new Date(left.created_at) - new Date(right.created_at));

  if (replies.length > 0) {
    const replyList = document.createElement('div');
    replyList.className = 'guestbook-replies';
    replies.forEach(reply => replyList.appendChild(createReply(reply)));
    article.appendChild(replyList);
  }

  if (currentUser) {
    const replyButton = document.createElement('button');
    replyButton.type = 'button';
    replyButton.className = 'text-link as-link guestbook-reply-button';
    replyButton.textContent = 'Reply';
    replyButton.addEventListener('click', () => toggleReplyForm(article, entry.id, replyButton));
    article.appendChild(replyButton);
  }

  return article;
}

function createReply(entry) {
  const reply = document.createElement('div');
  reply.className = 'guestbook-reply';
  const header = document.createElement('div');
  header.className = 'guestbook-reply-header';
  const author = document.createElement('strong');
  author.textContent = entry.author_name;
  const time = document.createElement('time');
  time.dateTime = entry.created_at;
  time.textContent = formatDate(entry.created_at);
  const message = document.createElement('p');
  message.textContent = entry.message;
  header.append(author, time);
  reply.append(header, message);
  return reply;
}

function toggleReplyForm(article, parentId, button) {
  const existing = article.querySelector('.guestbook-reply-form');
  if (existing) {
    existing.remove();
    button.textContent = 'Reply';
    return;
  }

  const form = createEntryForm({
    buttonText: 'Post reply',
    placeholder: 'Write a direct reply…',
    compact: true,
    onSubmit: async message => {
      await submitEntry(message, parentId);
    }
  });
  article.appendChild(form);
  button.textContent = 'Cancel reply';
  form.querySelector('textarea')?.focus();
}

function renderLoadError() {
  const container = currentRoot?.querySelector('[data-guestbook-list]');
  if (!container) return;
  container.replaceChildren();
  const message = document.createElement('p');
  message.className = 'account-message';
  message.setAttribute('role', 'alert');
  message.textContent = 'The guestbook could not be loaded.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'secondary-button';
  retry.textContent = 'Try again';
  retry.addEventListener('click', initGuestbook);
  container.append(message, retry);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}
