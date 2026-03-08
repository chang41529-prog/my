const STORAGE_KEY = 'lphang-lp-archive-v3';
const API_STORAGE_KEY = 'lphang-discogs-keys';
const SAMPLE_URL = 'albums.json';
const PLACEHOLDER_COVER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#17315f"/>
      <stop offset="100%" stop-color="#0a1429"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#g)"/>
  <circle cx="300" cy="300" r="170" fill="none" stroke="#dfe9ff" stroke-opacity="0.95" stroke-width="12"/>
  <circle cx="300" cy="300" r="28" fill="#dfe9ff"/>
  <text x="50%" y="86%" dominant-baseline="middle" text-anchor="middle" fill="#dfe9ff" font-size="32" font-family="Arial, sans-serif">LP ARCHIVE</text>
</svg>`);

let albums = [];
let sampleAlbumsCache = [];
let editingId = null;

const els = {
  form: document.getElementById('albumForm'),
  title: document.getElementById('title'),
  artist: document.getElementById('artist'),
  year: document.getElementById('year'),
  genre: document.getElementById('genre'),
  format: document.getElementById('format'),
  cover: document.getElementById('cover'),
  description: document.getElementById('description'),
  tracks: document.getElementById('tracks'),
  searchInput: document.getElementById('searchInput'),
  genreFilter: document.getElementById('genreFilter'),
  sortSelect: document.getElementById('sortSelect'),
  albumGrid: document.getElementById('albumGrid'),
  recordCount: document.getElementById('recordCount'),
  genreCount: document.getElementById('genreCount'),
  resultMeta: document.getElementById('resultMeta'),
  emptyState: document.getElementById('emptyState'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  reloadSampleBtn: document.getElementById('reloadSampleBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  formTitle: document.getElementById('formTitle'),
  editingBadge: document.getElementById('editingBadge'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  submitBtn: document.getElementById('submitBtn'),
  detailModal: document.getElementById('detailModal'),
  modalContent: document.getElementById('modalContent'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  template: document.getElementById('albumCardTemplate'),
  discogsKey: document.getElementById('discogsKey'),
  discogsSecret: document.getElementById('discogsSecret'),
  saveApiKeysBtn: document.getElementById('saveApiKeysBtn'),
  clearApiKeysBtn: document.getElementById('clearApiKeysBtn'),
  discogsSearchInput: document.getElementById('discogsSearchInput'),
  discogsSearchBtn: document.getElementById('discogsSearchBtn'),
  discogsResults: document.getElementById('discogsResults'),
  discogsStatus: document.getElementById('discogsStatus'),
  toggleApiHelpBtn: document.getElementById('toggleApiHelpBtn'),
  apiHelpBox: document.getElementById('apiHelpBox'),
  scrollToDiscogsBtn: document.getElementById('scrollToDiscogsBtn'),
  scrollToCollectionBtn: document.getElementById('scrollToCollectionBtn'),
  discogsSection: document.getElementById('discogsSection'),
  collectionSection: document.getElementById('collectionSection')
};

init();

async function init() {
  sampleAlbumsCache = await fetchSampleAlbums();
  albums = loadAlbums();
  restoreApiKeys();
  populateGenreFilter();
  renderAlbums();
  renderDiscogsEmptyState();
  attachEvents();
}

function attachEvents() {
  els.form.addEventListener('submit', onSubmitForm);
  els.searchInput.addEventListener('input', renderAlbums);
  els.genreFilter.addEventListener('change', renderAlbums);
  els.sortSelect.addEventListener('change', renderAlbums);
  els.resetFiltersBtn.addEventListener('click', resetFilters);
  els.exportBtn.addEventListener('click', exportJson);
  els.importInput.addEventListener('change', importJson);
  els.reloadSampleBtn.addEventListener('click', restoreSampleAlbums);
  els.clearAllBtn.addEventListener('click', clearAllAlbums);
  els.cancelEditBtn.addEventListener('click', resetForm);
  els.closeModalBtn.addEventListener('click', () => els.detailModal.close());
  els.detailModal.addEventListener('click', (event) => {
    const card = event.target.closest('.modal-card');
    if (!card) els.detailModal.close();
  });
  els.saveApiKeysBtn.addEventListener('click', saveApiKeys);
  els.clearApiKeysBtn.addEventListener('click', clearApiKeys);
  els.discogsSearchBtn.addEventListener('click', handleDiscogsSearch);
  els.discogsSearchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleDiscogsSearch();
    }
  });
  els.toggleApiHelpBtn.addEventListener('click', () => {
    els.apiHelpBox.classList.toggle('hidden');
  });
  els.scrollToDiscogsBtn.addEventListener('click', () => els.discogsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  els.scrollToCollectionBtn.addEventListener('click', () => els.collectionSection.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

async function fetchSampleAlbums() {
  try {
    const res = await fetch(SAMPLE_URL);
    if (!res.ok) throw new Error('샘플 데이터를 불러오지 못했습니다.');
    const data = await res.json();
    return normalizeAlbums(data);
  } catch (error) {
    console.error(error);
    return [];
  }
}

function loadAlbums() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    persistAlbums(sampleAlbumsCache);
    return [...sampleAlbumsCache];
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeAlbums(parsed);
  } catch (error) {
    console.error(error);
    persistAlbums(sampleAlbumsCache);
    return [...sampleAlbumsCache];
  }
}

function normalizeAlbums(items) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    id: item.id || crypto.randomUUID(),
    title: String(item.title || '').trim(),
    artist: String(item.artist || '').trim(),
    year: item.year ? Number(item.year) : null,
    genre: normalizeGenre(item.genre),
    format: String(item.format || '').trim(),
    cover: String(item.cover || '').trim(),
    description: String(item.description || '').trim(),
    tracks: Array.isArray(item.tracks)
      ? item.tracks.map((track) => String(track).trim()).filter(Boolean)
      : String(item.tracks || '').split(/\r?\n/).map((track) => track.trim()).filter(Boolean),
    addedAt: item.addedAt || new Date().toISOString(),
    discogsUri: String(item.discogsUri || '').trim(),
    discogsResourceUrl: String(item.discogsResourceUrl || '').trim()
  })).filter((item) => item.title && item.artist);
}

function normalizeGenre(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).join(', ');
  }
  return String(value || '').trim();
}

function persistAlbums(nextAlbums) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAlbums));
}

function restoreApiKeys() {
  try {
    const saved = JSON.parse(localStorage.getItem(API_STORAGE_KEY) || '{}');
    els.discogsKey.value = saved.key || '';
    els.discogsSecret.value = saved.secret || '';
  } catch (error) {
    console.error(error);
  }
}

function saveApiKeys() {
  const key = els.discogsKey.value.trim();
  const secret = els.discogsSecret.value.trim();
  localStorage.setItem(API_STORAGE_KEY, JSON.stringify({ key, secret }));
  setDiscogsStatus('Discogs 키를 저장했습니다.', 'success');
}

function clearApiKeys() {
  localStorage.removeItem(API_STORAGE_KEY);
  els.discogsKey.value = '';
  els.discogsSecret.value = '';
  setDiscogsStatus('저장된 Discogs 키를 삭제했습니다.', 'success');
}

function getApiKeys() {
  return {
    key: els.discogsKey.value.trim(),
    secret: els.discogsSecret.value.trim()
  };
}

function onSubmitForm(event) {
  event.preventDefault();

  const album = {
    id: editingId || crypto.randomUUID(),
    title: els.title.value.trim(),
    artist: els.artist.value.trim(),
    year: els.year.value ? Number(els.year.value) : null,
    genre: els.genre.value.trim(),
    format: els.format.value.trim(),
    cover: els.cover.value.trim(),
    description: els.description.value.trim(),
    tracks: els.tracks.value.split(/\r?\n/).map((track) => track.trim()).filter(Boolean),
    addedAt: editingId ? (albums.find((item) => item.id === editingId)?.addedAt || new Date().toISOString()) : new Date().toISOString(),
    discogsUri: editingId ? (albums.find((item) => item.id === editingId)?.discogsUri || '') : '',
    discogsResourceUrl: editingId ? (albums.find((item) => item.id === editingId)?.discogsResourceUrl || '') : ''
  };

  if (!album.title || !album.artist) {
    alert('앨범 제목과 아티스트는 필수입니다.');
    return;
  }

  if (editingId) {
    albums = albums.map((item) => item.id === editingId ? album : item);
  } else {
    albums = [album, ...albums];
  }

  persistAlbums(albums);
  populateGenreFilter();
  renderAlbums();
  resetForm();
}

function resetForm() {
  editingId = null;
  els.form.reset();
  els.formTitle.textContent = '수동으로 앨범 등록';
  els.submitBtn.textContent = 'LP 저장';
  els.editingBadge.classList.add('hidden');
  els.cancelEditBtn.classList.add('hidden');
}

function startEdit(id) {
  const album = albums.find((item) => item.id === id);
  if (!album) return;

  editingId = id;
  els.title.value = album.title;
  els.artist.value = album.artist;
  els.year.value = album.year || '';
  els.genre.value = album.genre || '';
  els.format.value = album.format || '';
  els.cover.value = album.cover || '';
  els.description.value = album.description || '';
  els.tracks.value = album.tracks.join('\n');
  els.formTitle.textContent = '앨범 정보 수정';
  els.submitBtn.textContent = '수정 저장';
  els.editingBadge.classList.remove('hidden');
  els.cancelEditBtn.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteAlbum(id) {
  const album = albums.find((item) => item.id === id);
  if (!album) return;

  const ok = confirm(`"${album.title}" 앨범을 삭제하시겠습니까?`);
  if (!ok) return;

  albums = albums.filter((item) => item.id !== id);
  persistAlbums(albums);
  populateGenreFilter();
  renderAlbums();

  if (editingId === id) resetForm();
}

function getFilteredAlbums() {
  const query = els.searchInput.value.trim().toLowerCase();
  const genre = els.genreFilter.value;
  const sort = els.sortSelect.value;

  const filtered = albums.filter((album) => {
    const genreList = album.genre.toLowerCase().split(',').map((item) => item.trim()).filter(Boolean);
    const genreMatch = genre === 'all' || genreList.includes(genre.toLowerCase());
    if (!genreMatch) return false;

    if (!query) return true;

    const haystack = [album.title, album.artist, album.genre, album.format, album.description, ...album.tracks].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  filtered.sort((a, b) => sortAlbums(a, b, sort));
  return filtered;
}

function sortAlbums(a, b, sort) {
  switch (sort) {
    case 'year-desc':
      return (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title, 'en');
    case 'year-asc':
      return (a.year || 9999) - (b.year || 9999) || a.title.localeCompare(b.title, 'en');
    case 'title-asc':
      return a.title.localeCompare(b.title, 'en');
    case 'artist-asc':
      return a.artist.localeCompare(b.artist, 'en');
    case 'genre-asc':
      return (a.genre || '').localeCompare(b.genre || '', 'en') || a.title.localeCompare(b.title, 'en');
    case 'added-desc':
    default:
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
  }
}

function renderAlbums() {
  const filtered = getFilteredAlbums();
  els.albumGrid.innerHTML = '';
  els.recordCount.textContent = String(albums.length);
  els.genreCount.textContent = String(getUniqueGenres().length);
  els.resultMeta.textContent = `${filtered.length}개 표시됨 / 전체 ${albums.length}개`;
  els.emptyState.classList.toggle('hidden', filtered.length > 0);

  filtered.forEach((album) => {
    const fragment = els.template.content.cloneNode(true);
    const coverButton = fragment.querySelector('.cover-button');
    const coverImg = fragment.querySelector('.album-cover');
    const title = fragment.querySelector('.album-title');
    const artist = fragment.querySelector('.album-artist');
    const meta = fragment.querySelector('.album-meta');
    const detailBtn = fragment.querySelector('.detail-btn');
    const editBtn = fragment.querySelector('.edit-btn');
    const deleteBtn = fragment.querySelector('.delete-btn');

    coverImg.src = album.cover || PLACEHOLDER_COVER;
    coverImg.alt = `${album.title} cover`;
    coverImg.loading = 'lazy';
    coverImg.onerror = () => { coverImg.src = PLACEHOLDER_COVER; };
    title.textContent = album.title;
    artist.textContent = album.artist;

    [
      album.year ? `${album.year}` : null,
      album.genre || null,
      album.format || null,
      album.tracks.length ? `트랙 ${album.tracks.length}곡` : null
    ].filter(Boolean).forEach((value) => {
      const chip = document.createElement('span');
      chip.textContent = value;
      meta.appendChild(chip);
    });

    detailBtn.addEventListener('click', () => openDetailModal(album.id));
    coverButton.addEventListener('click', () => openDetailModal(album.id));
    editBtn.addEventListener('click', () => startEdit(album.id));
    deleteBtn.addEventListener('click', () => deleteAlbum(album.id));

    els.albumGrid.appendChild(fragment);
  });
}

function openDetailModal(id) {
  const album = albums.find((item) => item.id === id);
  if (!album) return;

  const trackList = album.tracks.length
    ? `<ul>${album.tracks.map((track) => `<li>${escapeHtml(track)}</li>`).join('')}</ul>`
    : '<p>등록된 트랙이 없습니다.</p>';

  const metaItems = [
    album.year ? `<span>${album.year}</span>` : '',
    album.genre ? `<span>${escapeHtml(album.genre)}</span>` : '',
    album.format ? `<span>${escapeHtml(album.format)}</span>` : ''
  ].join('');

  const discogsLink = album.discogsUri
    ? `<p><a href="${escapeAttribute(album.discogsUri)}" target="_blank" rel="noreferrer" style="color:#76a8ff;text-decoration:none;">Discogs 페이지 열기</a></p>`
    : '';

  els.modalContent.innerHTML = `
    <div class="modal-layout">
      <div>
        <img class="modal-cover" src="${escapeAttribute(album.cover || PLACEHOLDER_COVER)}" alt="${escapeAttribute(album.title)} cover" onerror="this.src='${PLACEHOLDER_COVER}'">
      </div>
      <div>
        <h3 class="modal-title">${escapeHtml(album.title)}</h3>
        <p class="modal-subtitle">${escapeHtml(album.artist)}</p>
        <div class="modal-meta">${metaItems}</div>
        <div class="modal-section">
          <h4>앨범 설명</h4>
          <p>${escapeHtml(album.description || '등록된 설명이 없습니다.')}</p>
          ${discogsLink}
        </div>
        <div class="modal-section">
          <h4>트랙 목록</h4>
          ${trackList}
        </div>
      </div>
    </div>
  `;

  els.detailModal.showModal();
}

function populateGenreFilter() {
  const currentValue = els.genreFilter.value;
  const genres = getUniqueGenres();
  els.genreFilter.innerHTML = '<option value="all">전체</option>';
  genres.forEach((genre) => {
    const option = document.createElement('option');
    option.value = genre;
    option.textContent = genre;
    els.genreFilter.appendChild(option);
  });
  els.genreFilter.value = genres.includes(currentValue) ? currentValue : 'all';
}

function getUniqueGenres() {
  return [...new Set(albums.flatMap((album) => album.genre.split(',').map((item) => item.trim()).filter(Boolean)))].sort((a, b) => a.localeCompare(b, 'en'));
}

function resetFilters() {
  els.searchInput.value = '';
  els.genreFilter.value = 'all';
  els.sortSelect.value = 'added-desc';
  renderAlbums();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(albums, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lphang-lp-archive.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '[]'));
      const normalized = normalizeAlbums(parsed);
      albums = normalized;
      persistAlbums(albums);
      populateGenreFilter();
      renderAlbums();
      resetForm();
      alert('JSON 데이터를 불러왔습니다.');
    } catch (error) {
      console.error(error);
      alert('JSON 파일 형식이 올바르지 않습니다.');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file, 'utf-8');
}

function restoreSampleAlbums() {
  const ok = confirm('기본 샘플 데이터로 덮어쓰시겠습니까? 현재 데이터는 사라집니다.');
  if (!ok) return;
  albums = [...sampleAlbumsCache];
  persistAlbums(albums);
  populateGenreFilter();
  renderAlbums();
  resetForm();
}

function clearAllAlbums() {
  const ok = confirm('모든 앨범 데이터를 삭제하시겠습니까?');
  if (!ok) return;
  albums = [];
  persistAlbums(albums);
  populateGenreFilter();
  renderAlbums();
  resetForm();
}

function renderDiscogsEmptyState(message = '검색어를 입력하면 Discogs 결과가 여기에 표시됩니다.') {
  els.discogsResults.innerHTML = `<div class="discogs-empty">${escapeHtml(message)}</div>`;
}

function setDiscogsStatus(message, type = '') {
  els.discogsStatus.textContent = message;
  els.discogsStatus.className = 'helper-text no-margin';
  if (type) els.discogsStatus.classList.add(`status-${type}`);
}

async function handleDiscogsSearch() {
  const query = els.discogsSearchInput.value.trim();
  const { key, secret } = getApiKeys();

  if (!key || !secret) {
    setDiscogsStatus('먼저 Discogs Consumer Key / Secret을 저장해 주세요.', 'error');
    renderDiscogsEmptyState('API 키를 입력하면 Discogs 검색 결과를 사용할 수 있습니다.');
    return;
  }

  if (!query) {
    setDiscogsStatus('검색어를 입력해 주세요.', 'error');
    renderDiscogsEmptyState();
    return;
  }

  setDiscogsStatus('Discogs에서 앨범을 검색 중입니다...', 'loading');
  renderDiscogsEmptyState('검색 결과를 불러오는 중입니다...');

  try {
    const url = new URL('https://api.discogs.com/database/search');
    url.searchParams.set('q', query);
    url.searchParams.set('type', 'release');
    url.searchParams.set('per_page', '12');
    url.searchParams.set('page', '1');
    url.searchParams.set('key', key);
    url.searchParams.set('secret', secret);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Discogs search failed: ${response.status}`);
    }

    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];

    if (!results.length) {
      setDiscogsStatus('검색 결과가 없습니다.', 'error');
      renderDiscogsEmptyState('조건에 맞는 Discogs 결과가 없습니다. 다른 검색어로 다시 시도해 보세요.');
      return;
    }

    renderDiscogsResults(results.slice(0, 10));
    setDiscogsStatus(`${Math.min(results.length, 10)}개의 Discogs 결과를 불러왔습니다.`, 'success');
  } catch (error) {
    console.error(error);
    setDiscogsStatus('Discogs 검색에 실패했습니다. 키 정보를 확인하거나 잠시 후 다시 시도해 주세요.', 'error');
    renderDiscogsEmptyState('Discogs 검색 실패');
  }
}

function renderDiscogsResults(results) {
  els.discogsResults.innerHTML = '';

  results.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'discogs-card';

    const img = document.createElement('img');
    img.className = 'discogs-thumb';
    img.src = item.cover_image || item.thumb || PLACEHOLDER_COVER;
    img.alt = item.title || 'Discogs result';
    img.onerror = () => { img.src = PLACEHOLDER_COVER; };

    const body = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'discogs-title';
    title.textContent = item.title || '제목 없음';

    const meta = document.createElement('p');
    meta.className = 'discogs-meta';
    const year = item.year ? String(item.year) : '연도 미상';
    const genre = Array.isArray(item.genre) && item.genre.length ? item.genre.join(', ') : '장르 정보 없음';
    const format = Array.isArray(item.format) && item.format.length ? item.format.join(', ') : '포맷 정보 없음';
    meta.innerHTML = `${escapeHtml(year)}<br>${escapeHtml(genre)}<br>${escapeHtml(format)}`;

    body.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'discogs-actions';

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary btn-small';
    addBtn.type = 'button';
    addBtn.textContent = '바로 추가';
    addBtn.addEventListener('click', () => addDiscogsRelease(item, addBtn));

    const fillBtn = document.createElement('button');
    fillBtn.className = 'btn btn-secondary btn-small';
    fillBtn.type = 'button';
    fillBtn.textContent = '폼에 채우기';
    fillBtn.addEventListener('click', () => fillFormFromDiscogsResult(item));

    actions.append(addBtn, fillBtn);
    card.append(img, body, actions);
    els.discogsResults.appendChild(card);
  });
}

async function addDiscogsRelease(item, button) {
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = '추가 중...';

  try {
    const details = await fetchDiscogsReleaseDetails(item);
    const album = mapDiscogsToAlbum(item, details);
    albums = [album, ...albums.filter((existing) => existing.id !== album.id)];
    persistAlbums(albums);
    populateGenreFilter();
    renderAlbums();
    setDiscogsStatus(`"${album.title}" 앨범을 컬렉션에 추가했습니다.`, 'success');
  } catch (error) {
    console.error(error);
    setDiscogsStatus('Discogs 상세 정보를 불러오지 못해 추가에 실패했습니다.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function fillFormFromDiscogsResult(item) {
  const album = mapDiscogsToAlbum(item, null);
  fillAlbumForm(album);
  setDiscogsStatus(`"${album.title}" 정보를 입력 폼에 채웠습니다. 필요하면 수정 후 저장해 주세요.`, 'success');
}

async function fetchDiscogsReleaseDetails(item) {
  const { key, secret } = getApiKeys();
  if (!item.resource_url) return null;

  const url = new URL(item.resource_url);
  url.searchParams.set('key', key);
  url.searchParams.set('secret', secret);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Discogs detail failed: ${response.status}`);
  }

  return response.json();
}

function mapDiscogsToAlbum(item, details) {
  const titleParts = String(item.title || '').split(' - ');
  const guessedArtist = details?.artists?.map((artist) => artist.name).filter(Boolean).join(', ') || titleParts[0] || 'Unknown Artist';
  const guessedTitle = details?.title || (titleParts.length > 1 ? titleParts.slice(1).join(' - ') : item.title || 'Untitled');
  const genres = [
    ...(Array.isArray(details?.genres) ? details.genres : []),
    ...(Array.isArray(details?.styles) ? details.styles : []),
    ...(Array.isArray(item.genre) ? item.genre : []),
    ...(Array.isArray(item.style) ? item.style : [])
  ].map((value) => String(value).trim()).filter(Boolean);
  const formats = Array.isArray(details?.formats)
    ? details.formats.flatMap((entry) => [entry.name, ...(Array.isArray(entry.descriptions) ? entry.descriptions : [])]).filter(Boolean)
    : (Array.isArray(item.format) ? item.format : []);

  const tracks = Array.isArray(details?.tracklist)
    ? details.tracklist
        .filter((track) => track.type_ !== 'heading')
        .map((track) => [track.position, track.title].filter(Boolean).join('. ').replace(/^\.\s*/, '').trim())
        .filter(Boolean)
    : [];

  const descriptionSource = details?.notes
    ? stripHtml(details.notes).slice(0, 500)
    : '';

  return normalizeAlbums([{
    id: crypto.randomUUID(),
    title: guessedTitle,
    artist: guessedArtist,
    year: details?.year || item.year || null,
    genre: [...new Set(genres)].join(', '),
    format: [...new Set(formats.map((value) => String(value).trim()).filter(Boolean))].join(', '),
    cover: details?.images?.[0]?.uri || item.cover_image || item.thumb || '',
    description: descriptionSource,
    tracks,
    addedAt: new Date().toISOString(),
    discogsUri: details?.uri || item.uri || '',
    discogsResourceUrl: details?.resource_url || item.resource_url || ''
  }])[0];
}

function fillAlbumForm(album) {
  editingId = null;
  els.title.value = album.title || '';
  els.artist.value = album.artist || '';
  els.year.value = album.year || '';
  els.genre.value = album.genre || '';
  els.format.value = album.format || '';
  els.cover.value = album.cover || '';
  els.description.value = album.description || '';
  els.tracks.value = Array.isArray(album.tracks) ? album.tracks.join('\n') : '';
  els.formTitle.textContent = 'Discogs 결과를 바탕으로 등록';
  els.submitBtn.textContent = 'LP 저장';
  els.editingBadge.classList.add('hidden');
  els.cancelEditBtn.classList.add('hidden');
  els.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function stripHtml(value) {
  const temp = document.createElement('div');
  temp.innerHTML = String(value || '');
  return (temp.textContent || temp.innerText || '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
