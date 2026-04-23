const galleryEl = document.getElementById('gallery');
const statusEl = document.getElementById('status');
const lightboxEl = document.getElementById('lightbox');
const lightboxImageEl = document.getElementById('lightboxImage');
const lightboxCaptionEl = document.getElementById('lightboxCaption');
const closeButtonEl = document.getElementById('closeButton');

let images = [];
let currentIndex = 0;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normaliseImages(data) {
  if (!Array.isArray(data)) {
    throw new Error('images.json must contain a JSON array');
  }

  return data
    .filter(item => item && typeof item.filename === 'string')
    .map(item => ({
      filename: item.filename,
      caption: typeof item.caption === 'string' ? item.caption : ''
    }));
}

function renderGallery() {
  if (!images.length) {
    galleryEl.innerHTML = '';
    statusEl.textContent = 'No images found in images.json.';
    return;
  }

  const cards = images.map((item, index) => `
    <article class="card" tabindex="0" role="button" aria-label="Open image ${index + 1}: ${escapeHtml(item.caption || item.filename)}" data-index="${index}">
      <div class="thumb-wrap">
        <img class="thumb" src="${encodeURI(item.filename)}" alt="${escapeHtml(item.caption || '')}" loading="lazy" />
      </div>
      <div class="caption">${escapeHtml(item.caption || item.filename)}</div>
    </article>
  `).join('');

  galleryEl.innerHTML = cards;
  statusEl.textContent = `${images.length} image${images.length === 1 ? '' : 's'} loaded.`;
}

function openLightbox(index) {
  if (!images.length) return;

  currentIndex = ((index % images.length) + images.length) % images.length;
  const item = images[currentIndex];

  lightboxImageEl.src = item.filename;
  lightboxImageEl.alt = item.caption || `Image ${currentIndex + 1}`;
  lightboxCaptionEl.textContent = item.caption || item.filename;
  lightboxEl.classList.add('open');
  lightboxEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  closeButtonEl.focus();
  const basename = item.filename.replace(/^.*\//, '').replace(/\.[^.]+$/, '');
  history.replaceState(null, '', `#${basename}`);
}

function closeLightbox() {
  lightboxEl.classList.remove('open');
  lightboxEl.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  history.replaceState(null, '', location.pathname + location.search);
}

function showNext() {
  openLightbox(currentIndex + 1);
}

function showPrev() {
  openLightbox(currentIndex - 1);
}

function injectJsonLd(imageList) {
  const baseUrl = 'https://pics.oneirina.com';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: 'Oneirina Gallery',
    description: 'Fragments of a performance. Light, noise, and the space between them.',
    url: baseUrl + '/',
    image: imageList.map(item => ({
      '@type': 'ImageObject',
      contentUrl: baseUrl + item.filename,
      description: item.caption || ''
    }))
  };
  document.getElementById('json-ld').textContent = JSON.stringify(schema, null, 2);
}

function openLightboxFromHash() {
  const hash = location.hash;
  if (!hash) return;
  const basename = hash.slice(1);
  const index = images.findIndex(item =>
    item.filename.replace(/^.*\//, '').replace(/\.[^.]+$/, '') === basename
  );
  if (index !== -1) {
    openLightbox(index);
  }
}

async function loadImages() {
  try {
    const response = await fetch('images.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Could not load images.json (${response.status})`);
    }
    const data = await response.json();
    images = normaliseImages(data);
    renderGallery();
    injectJsonLd(images);
    openLightboxFromHash();
  } catch (error) {
    console.error(error);
    statusEl.textContent = `Error: ${error.message}`;
  }
}

galleryEl.addEventListener('click', event => {
  const card = event.target.closest('.card');
  if (!card) return;
  openLightbox(Number(card.dataset.index));
});

galleryEl.addEventListener('keydown', event => {
  const card = event.target.closest('.card');
  if (!card) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openLightbox(Number(card.dataset.index));
  }
});

lightboxEl.addEventListener('click', event => {
  // If clicking the close button, let its own handler deal with it
  if (event.target.closest('.close-button')) {
    return;
  }

  const action = event.target.dataset.action;
  if (action === 'prev') {
    showPrev();
  } else if (action === 'next') {
    showNext();
  } else if (action === 'close' || event.target === lightboxEl) {
    closeLightbox();
  }
});

closeButtonEl.addEventListener('click', closeLightbox);

document.addEventListener('keydown', event => {
  if (!lightboxEl.classList.contains('open')) return;

  if (event.key === 'Escape') {
    closeLightbox();
  } else if (event.key === 'ArrowRight') {
    showNext();
  } else if (event.key === 'ArrowLeft') {
    showPrev();
  }
});

window.addEventListener('popstate', () => {
  if (location.hash) {
    openLightboxFromHash();
  } else {
    closeLightbox();
  }
});

loadImages();
