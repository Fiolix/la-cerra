const FACTS_URL = '/la-cerra/data/facts.json?v=20260907-news-facts-2';
const FACT_ORDER_KEY = 'did_you_know_order_v1';
const LAST_FACT_KEY = 'did_you_know_last_v1';

let factsPromise = null;

function loadFacts() {
  if (!factsPromise) {
    factsPromise = fetch(FACTS_URL)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(items => {
        if (!Array.isArray(items)) throw new Error('Fact data is not a list.');
        const facts = items.filter(item => item?.id && item?.text);
        if (facts.length === 0) throw new Error('No valid facts are available.');
        return facts;
      })
      .catch(error => {
        factsPromise = null;
        throw error;
      });
  }

  return factsPromise;
}

function shuffle(ids) {
  const result = [...ids];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function readStoredOrder(validIds) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(FACT_ORDER_KEY) || 'null');
    const orderIsValid = Array.isArray(stored?.order)
      && stored.order.length === validIds.length
      && new Set(stored.order).size === validIds.length
      && stored.order.every(id => validIds.includes(id));
    const indexIsValid = Number.isInteger(stored?.index)
      && stored.index >= 0
      && stored.index <= validIds.length;
    return orderIsValid && indexIsValid ? stored : null;
  } catch (_) {
    return null;
  }
}

function createOrder(ids) {
  const order = shuffle(ids);
  try {
    const lastId = sessionStorage.getItem(LAST_FACT_KEY);
    if (order.length > 1 && order[0] === lastId) {
      [order[0], order[1]] = [order[1], order[0]];
    }
  } catch (_) {
    // Session storage is optional; random selection still works without it.
  }
  return { order, index: 0 };
}

function selectNextFact(facts) {
  const ids = facts.map(fact => fact.id);
  let state = readStoredOrder(ids);
  if (!state || state.index >= state.order.length) state = createOrder(ids);

  const selectedId = state.order[state.index];
  state.index += 1;
  try {
    sessionStorage.setItem(FACT_ORDER_KEY, JSON.stringify(state));
    sessionStorage.setItem(LAST_FACT_KEY, selectedId);
  } catch (_) {
    // Keeping the order between pages is an enhancement, not a requirement.
  }

  return facts.find(fact => fact.id === selectedId) || facts[0];
}

export async function showNextFact() {
  const container = document.querySelector('[data-did-you-know]');
  if (!container) return;

  container.textContent = 'Loading fact…';
  try {
    const facts = await loadFacts();
    container.textContent = selectNextFact(facts).text;
  } catch (error) {
    console.error('Did-you-know facts could not be loaded:', error);
    container.textContent = 'Interesting fact, tip, or reminder.';
  }
}
