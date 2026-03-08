const STORAGE_KEY = "lphang-lp-archive-v2";
const SEEDED_FLAG = "lphang-lp-archive-seeded";
const FALLBACK_COVER = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="500" height="500" fill="url(#g)"/>
  <circle cx="250" cy="250" r="150" fill="#0b1220" stroke="#bfdbfe" stroke-width="8"/>
  <circle cx="250" cy="250" r="26" fill="#dbeafe"/>
  <text x="50%" y="82%" text-anchor="middle" fill="#e5eefc" font-family="Arial, sans-serif" font-size="34">LP ARCHIVE</text>
</svg>`);

const els = {
  albumCount: document.getElementById("albumCount"),
  albumGrid: document.getElementById("albumGrid"),
  albumForm: document.getElementById("albumForm"),
  formTitle: document.getElementById("formTitle"),
  submitBtn: document.getElementById("submitBtn"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  searchInput: document.getElementById("searchInput"),
  genreFilter: document.getElementById("genreFilter"),
  sortSelect: document.getElementById("sortSelect"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  exportBtn: document.getElementById("exportBtn"),
  importInput: document.getElementById("importInput"),
  seedBtn: document.getElementById("seedBtn"),
  clearBtn: document.getElementById("clearBtn"),
  resultMeta: document.getElementById("resultMeta"),
  emptyState: document.getElementById("emptyState"),
  detailModal: document.getElementById("detailModal"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  modalBody: document.getElementById("modalBody"),
  template: document.getElementById("albumCardTemplate"),
};

let albums = [];
let editingId = null;

async function initialize() {
  await seedIfNeeded();
  albums = loadAlbums();
  bindEvents();
  render();
}

async function seedIfNeeded() {
  if (localStorage.getItem(SEEDED_FLAG)) return;
  try {
    const res = await fetch("albums.json", { cache: "no-store" });
    if (!res.ok) throw new Error("샘플 데이터 로드 실패");
    const sample = await res.json();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
    localStorage.setItem(SEEDED_FLAG, "true");
  } catch (error) {
    console.error(error);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(SEEDED_FLAG, "true");
  }
}

function loadAlbums() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveAlbums() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
}

function bindEvents() {
  els.albumForm.addEventListener("submit", onSubmit);
  els.cancelEditBtn.addEventListener("click", resetForm);
  els.searchInput.addEventListener("input", render);
  els.genreFilter.addEventListener("change", render);
  els.sortSelect.addEventListener("change", render);
  els.resetFiltersBtn.addEventListener("click", () => {
    els.searchInput.value = "";
    els.genreFilter.value = "all";
    els.sortSelect.value = "title-asc";
    render();
  });
  els.exportBtn.addEventListener("click", exportJson);
  els.importInput.addEventListener("change", importJson);
  els.seedBtn.addEventListener("click", reseedSamples);
  els.clearBtn.addEventListener("click", clearAll);
  els.closeModalBtn.addEventListener("click", () => els.detailModal.close());
  els.detailModal.addEventListener("click", (e) => {
    const rect = e.target.getBoundingClientRect?.();
    if (!rect) return;
    if (e.target === els.detailModal) els.detailModal.close();
  });
}

function onSubmit(event) {
  event.preventDefault();
  const formData = new FormData(els.albumForm);
  const data = {
    id: editingId || crypto.randomUUID(),
    title: (formData.get("title") || "").toString().trim(),
    artist: (formData.get("artist") || "").toString().trim(),
    year: Number(formData.get("year")) || null,
    genres: splitGenres((formData.get("genres") || "").toString()),
    format: (formData.get("format") || "").toString().trim() || "LP",
    cover: (formData.get("cover") || "").toString().trim() || FALLBACK_COVER,
    description: (formData.get("description") || "").toString().trim(),
    tracks: splitTracks((formData.get("tracks") || "").toString()),
    createdAt: editingId
      ? albums.find((album) => album.id === editingId)?.createdAt || new Date().toISOString()
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!data.title || !data.artist) {
    alert("앨범 제목과 아티스트는 필수입니다.");
    return;
  }

  if (editingId) {
    albums = albums.map((album) => (album.id === editingId ? data : album));
  } else {
    albums.unshift(data);
  }

  saveAlbums();
  resetForm();
  render();
}

function splitGenres(value) {
  return value
    .split(/[,/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTracks(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resetForm() {
  editingId = null;
  els.albumForm.reset();
  els.formTitle.textContent = "새 LP 등록";
  els.submitBtn.textContent = "LP 저장";
  els.cancelEditBtn.classList.add("hidden");
}

function render() {
  populateGenreOptions();
  const filtered = getFilteredAlbums();
  els.albumCount.textContent = albums.length.toString();
  els.resultMeta.textContent = `${filtered.length}개 표시됨 / 전체 ${albums.length}개`;
  els.albumGrid.innerHTML = "";
  els.emptyState.classList.toggle("hidden", filtered.length !== 0);

  filtered.forEach((album) => {
    const fragment = els.template.content.cloneNode(true);
    const card = fragment.querySelector(".album-card");
    const title = fragment.querySelector(".card-title");
    const artist = fragment.querySelector(".card-artist");
    const meta = fragment.querySelector(".card-meta");
    const cover = fragment.querySelector(".card-cover");
    const tagList = fragment.querySelector(".tag-list");
    const detailsBtn = fragment.querySelector(".details-btn");
    const editBtn = fragment.querySelector(".edit-btn");
    const deleteBtn = fragment.querySelector(".delete-btn");
    const coverBtn = fragment.querySelector(".card-cover-btn");

    title.textContent = album.title;
    artist.textContent = album.artist;
    meta.textContent = [album.year || "연도 미입력", album.format || "LP"].join(" · ");
    cover.src = album.cover || FALLBACK_COVER;
    cover.alt = `${album.title} 커버`;
    cover.onerror = () => { cover.src = FALLBACK_COVER; };

    (album.genres || []).slice(0, 4).forEach((genre) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = genre;
      tagList.appendChild(span);
    });

    detailsBtn.addEventListener("click", () => showDetails(album.id));
    coverBtn.addEventListener("click", () => showDetails(album.id));
    editBtn.addEventListener("click", () => startEdit(album.id));
    deleteBtn.addEventListener("click", () => deleteAlbum(album.id));

    card.dataset.id = album.id;
    els.albumGrid.appendChild(fragment);
  });
}

function populateGenreOptions() {
  const current = els.genreFilter.value || "all";
  const genres = [...new Set(albums.flatMap((album) => album.genres || []))].sort((a, b) => a.localeCompare(b));
  els.genreFilter.innerHTML = `<option value="all">전체</option>`;
  genres.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genre;
    els.genreFilter.appendChild(option);
  });
  if (["all", ...genres].includes(current)) {
    els.genreFilter.value = current;
  }
}

function getFilteredAlbums() {
  const query = els.searchInput.value.trim().toLowerCase();
  const selectedGenre = els.genreFilter.value;
  const sort = els.sortSelect.value;

  let result = albums.filter((album) => {
    const searchable = [
      album.title,
      album.artist,
      album.description,
      ...(album.genres || []),
      ...(album.tracks || []),
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery = !query || searchable.includes(query);
    const matchesGenre = selectedGenre === "all" || (album.genres || []).includes(selectedGenre);
    return matchesQuery && matchesGenre;
  });

  result.sort((a, b) => {
    switch (sort) {
      case "title-desc":
        return b.title.localeCompare(a.title);
      case "artist-asc":
        return a.artist.localeCompare(b.artist);
      case "artist-desc":
        return b.artist.localeCompare(a.artist);
      case "year-desc":
        return (b.year || 0) - (a.year || 0);
      case "year-asc":
        return (a.year || 0) - (b.year || 0);
      case "recent":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "title-asc":
      default:
        return a.title.localeCompare(b.title);
    }
  });

  return result;
}

function showDetails(id) {
  const album = albums.find((item) => item.id === id);
  if (!album) return;

  const tags = (album.genres || []).map((genre) => `<span class="tag">${escapeHtml(genre)}</span>`).join("");
  const tracks = (album.tracks || []).length
    ? `<ol class="track-list">${album.tracks.map((track) => `<li>${escapeHtml(track)}</li>`).join("")}</ol>`
    : `<p>트랙 정보가 없습니다.</p>`;

  els.modalBody.innerHTML = `
    <div class="modal-layout">
      <div>
        <img src="${escapeAttribute(album.cover || FALLBACK_COVER)}" alt="${escapeAttribute(album.title)} 커버" onerror="this.src='${escapeAttribute(FALLBACK_COVER)}'" />
      </div>
      <div>
        <h3>${escapeHtml(album.title)}</h3>
        <p><strong>Artist</strong> · ${escapeHtml(album.artist)}</p>
        <p><strong>Year</strong> · ${album.year || "미입력"}</p>
        <p><strong>Format</strong> · ${escapeHtml(album.format || "LP")}</p>
        <div class="tag-list">${tags || '<span class="tag">장르 미입력</span>'}</div>
        <h4>About</h4>
        <p>${escapeHtml(album.description || "설명이 없습니다.")}</p>
        <h4>Track List</h4>
        ${tracks}
      </div>
    </div>
  `;

  els.detailModal.showModal();
}

function startEdit(id) {
  const album = albums.find((item) => item.id === id);
  if (!album) return;

  editingId = id;
  els.formTitle.textContent = "LP 수정";
  els.submitBtn.textContent = "수정 저장";
  els.cancelEditBtn.classList.remove("hidden");

  document.getElementById("title").value = album.title || "";
  document.getElementById("artist").value = album.artist || "";
  document.getElementById("year").value = album.year || "";
  document.getElementById("genres").value = (album.genres || []).join(", ");
  document.getElementById("format").value = album.format || "LP";
  document.getElementById("cover").value = album.cover === FALLBACK_COVER ? "" : (album.cover || "");
  document.getElementById("description").value = album.description || "";
  document.getElementById("tracks").value = (album.tracks || []).join("\n");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteAlbum(id) {
  const album = albums.find((item) => item.id === id);
  if (!album) return;
  if (!confirm(`"${album.title}"을(를) 삭제할까요?`)) return;
  albums = albums.filter((item) => item.id !== id);
  saveAlbums();
  if (editingId === id) resetForm();
  render();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(albums, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "albums-export.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed)) throw new Error("배열 형식이 아닙니다.");
      albums = parsed.map(normalizeAlbum);
      saveAlbums();
      render();
      alert("JSON 불러오기가 완료되었습니다.");
    } catch (error) {
      console.error(error);
      alert("JSON 파일 형식이 올바르지 않습니다.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

async function reseedSamples() {
  if (!confirm("기본 샘플 데이터를 다시 불러올까요? 현재 데이터는 덮어쓰기됩니다.")) return;
  try {
    const res = await fetch("albums.json", { cache: "no-store" });
    const sample = await res.json();
    albums = sample.map(normalizeAlbum);
    saveAlbums();
    render();
    resetForm();
    alert("샘플 데이터를 다시 불러왔습니다.");
  } catch (error) {
    console.error(error);
    alert("샘플 데이터를 불러오지 못했습니다.");
  }
}

function clearAll() {
  if (!confirm("모든 LP 데이터를 삭제할까요?")) return;
  albums = [];
  saveAlbums();
  resetForm();
  render();
}

function normalizeAlbum(item) {
  return {
    id: item.id || crypto.randomUUID(),
    title: item.title || "Untitled",
    artist: item.artist || "Unknown Artist",
    year: Number(item.year) || null,
    genres: Array.isArray(item.genres) ? item.genres : splitGenres(item.genre || item.genres || ""),
    format: item.format || "LP",
    cover: item.cover || FALLBACK_COVER,
    description: item.description || "",
    tracks: Array.isArray(item.tracks) ? item.tracks : splitTracks(item.tracks || ""),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function escapeAttribute(value) {
  return escapeHtml(value);
}

initialize();
