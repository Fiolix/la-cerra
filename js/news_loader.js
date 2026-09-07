const NEWS_URL = '/la-cerra/data/news.json?v=20260907-news-facts-1';

let newsPromise = null;

function loadNews() {
  if (!newsPromise) {
    newsPromise = fetch(NEWS_URL)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(items => {
        if (!Array.isArray(items)) throw new Error('News data is not a list.');
        return items
          .filter(item => item?.id && item?.title && item?.date)
          .sort((a, b) => String(b.date).localeCompare(String(a.date)));
      })
      .catch(error => {
        newsPromise = null;
        throw error;
      });
  }

  return newsPromise;
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function createImage(item) {
  const wrapper = document.createElement('div');
  wrapper.className = 'news-image';

  const image = document.createElement('img');
  image.src = item.image;
  image.alt = item.imageAlt || '';
  image.loading = 'lazy';
  image.addEventListener('error', () => wrapper.remove(), { once: true });
  wrapper.appendChild(image);
  return wrapper;
}

function createArticle(item) {
  const article = document.createElement('article');
  article.className = 'news-card';
  article.id = `news-${item.id}`;

  if (item.image) article.appendChild(createImage(item));

  const content = document.createElement('div');
  content.className = 'news-card-content';

  const date = document.createElement('time');
  date.className = 'news-date';
  date.dateTime = item.date;
  date.textContent = formatDate(item.date);

  const title = document.createElement('h2');
  title.textContent = item.title;

  const teaser = document.createElement('p');
  teaser.className = 'news-teaser-text';
  teaser.textContent = item.teaser || '';

  const details = document.createElement('details');
  details.className = 'news-details';
  const summary = document.createElement('summary');
  summary.innerHTML = '<span class="news-more-label">Read more</span><span class="news-less-label">Show less</span>';
  const body = document.createElement('div');
  body.className = 'news-full-text';
  (Array.isArray(item.text) ? item.text : [item.text]).filter(Boolean).forEach(paragraph => {
    const element = document.createElement('p');
    element.textContent = paragraph;
    body.appendChild(element);
  });

  details.append(summary, body);
  content.append(date, title, teaser, details);
  article.appendChild(content);
  return article;
}

function createStartTeaser(item) {
  const article = document.createElement('article');
  article.className = 'news-teaser-card';
  if (item.image) article.appendChild(createImage(item));

  const content = document.createElement('div');
  content.className = 'news-card-content';
  const date = document.createElement('time');
  date.className = 'news-date';
  date.dateTime = item.date;
  date.textContent = formatDate(item.date);
  const title = document.createElement('h3');
  title.textContent = item.title;
  const teaser = document.createElement('p');
  teaser.textContent = item.teaser || '';
  const link = document.createElement('a');
  link.href = '#';
  link.className = 'news-read-more';
  link.dataset.page = `news.html#news-${item.id}`;
  link.textContent = 'Read full article';

  content.append(date, title, teaser, link);
  article.appendChild(content);
  return article;
}

function showError(container, retry) {
  container.innerHTML = '';
  const message = document.createElement('p');
  message.className = 'account-message';
  message.setAttribute('role', 'alert');
  message.textContent = 'News could not be loaded.';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary-button';
  button.textContent = 'Try again';
  button.addEventListener('click', retry);
  container.append(message, button);
}

export async function initNewsPage(anchor = '') {
  const container = document.getElementById('news-list');
  if (!container) return;

  try {
    const items = await loadNews();
    container.innerHTML = '';
    items.forEach(item => container.appendChild(createArticle(item)));

    if (anchor) {
      const target = document.getElementById(anchor);
      const details = target?.querySelector('details');
      if (details) details.open = true;
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    console.error('News page could not be loaded:', error);
    showError(container, () => initNewsPage(anchor));
  }
}

export async function initStartNews() {
  const container = document.getElementById('start-news-list');
  if (!container) return;

  try {
    const items = await loadNews();
    container.innerHTML = '';
    items.slice(0, 2).forEach(item => container.appendChild(createStartTeaser(item)));
  } catch (error) {
    console.error('Start-page news could not be loaded:', error);
    showError(container, initStartNews);
  }
}
