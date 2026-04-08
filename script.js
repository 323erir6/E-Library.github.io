/* Simple library app: filters, search, sort, modal, favorites (localStorage) */
console.log('script.js executing');
let books = []; // populated from /api/books (files in books_core)

// Root Google Drive folder that contains EBIB_BOOKS_SITE
const DRIVE_FOLDER_ID = '1N16kt_a2QcyUC0xWYTuwGvTmZf5ie2YD';

// Helpers to normalize catalog entries and work with Drive links
const driveIdRegex = /^[A-Za-z0-9_-]{20,}$/;

function toPreviewUrl(file){
  if(!file) return null;
  const f = String(file).trim();
  if(f.startsWith('http')){
    // convert common Drive share links to preview
    if(f.includes('drive.google.com')){
      return f
        .replace('/view', '/preview')
        .replace('/edit', '/preview')
        .replace('open?id=', 'file/d/')
        .replace('/uc?export=download&id=', '/file/d/')
        .replace(/\?(usp|resourcekey)[^#]+/, '');
    }
    return f; // any other URL – open as is
  }
  // if we got a plain Drive file id – build preview URL
  if(driveIdRegex.test(f)) return `https://drive.google.com/file/d/${f}/preview`;
  // otherwise return null so caller can fallback to local reader
  return null;
}

function deriveImgFromFile(file){
  if(!file) return null;
  const cleaned = String(file).split('?')[0];
  const last = cleaned.split('/').pop() || '';
  if(!last) return null;
  const stem = last.replace(/\.[^.]+$/, '');
  return `img/${stem}.jpg`;
}

function normalizeBook(raw){
  const book = {...raw};
  book._key = String(raw.file || raw.id || '');
  if(!book.img) book.img = deriveImgFromFile(book.file);
  return book;
}

function normalizeBooks(list){
  if(!Array.isArray(list)) return [];
  return list.map(normalizeBook);
}

function bookKey(b){
  return String(b ? (b._key || b.file || b.id || '') : '');
}

// Embedded fallback catalog (used if fetch fails). Contains initial items + added items for клас 1–7
const defaultBooks = [
  {id:1,title:"Ромео і Джульєтта",author:"Вільям Шекспір",grades:[9,10,11],genre:"Драма",year:1597,desc:"Трагедія про кохання і ворожнечу родин.",coverColor:"#f97316",recommended:true},
  {id:2,title:"Одіссея",author:"Гомер",grades:[9,10,11],genre:"Епос",year:-700,desc:"Подорожі та пригоди Одіссея.",coverColor:"#06b6d4"},
  {id:3,title:"Маленький принц",author:"Антуан де Сент-Екзюпері",grades:[5,6,7,8],genre:"Проза",year:1943,desc:"Філософська казка про дитячу мудрість.",coverColor:"#f973b2",recommended:true},
  {id:4,title:"Кентерберійські оповідання",author:"Джеффрі Чосер",grades:[10,11],genre:"Проза",year:1400,desc:"Збірка оповідань різних жанрів.",coverColor:"#60a5fa"},
  {id:5,title:"Фауст",author:"Йоганн Вольфганг фон Гете",grades:[11],genre:"Драма",year:1808,desc:"Філософська драма про пошук сенсу.",coverColor:"#a78bfa"},
  {id:6,title:"Пригоди Тома Сойєра",author:"Марк Твен",grades:[6,7,8],genre:"Проза",year:1876,desc:"Весела історія про дитячі витівки.",coverColor:"#34d399"},
  {id:7,title:"Анна Кареніна (у скороч.)",author:"Лев Толстой",grades:[10,11],genre:"Повість",year:1877,desc:"Трагічна історія кохання й моралі.",coverColor:"#fb7185"},
  {id:8,title:"Енеїда (перекл.)",author:"Вергілій",grades:[9,10,11],genre:"Епос",year:-19,desc:"Епос римського світу.",coverColor:"#f59e0b"},
  {id:9,title:"Іліада",author:"Гомер",grades:[9,10,11],genre:"Епос",year:-750,desc:"Епос про Троянську війну.",coverColor:"#60a5fa"},
  {id:10,title:"Дон Кіхот",author:"Мігель де Сервантес",grades:[10,11],genre:"Проза",year:1615,desc:"Сатиричний роман про ідеалізм і пригоди.",coverColor:"#7c3aed"},
  {id:11,title:"Острів скарбів",author:"Роберт Луїс Стівенсон",grades:[7,8,9],genre:"Пригоди",year:1883,desc:"Класика пригодницької літератури.",coverColor:"#38bdf8",recommended:true},
  {id:12,title:"Лісова пісня (уривок)",author:"Леся Українка",grades:[7,8,9],genre:"Драма",year:1911,desc:"Містично-поетична драма української класики.",coverColor:"#f472b6"},
  {id:13,title:"Сонети",author:"Вільям Шекспір",grades:[9,10,11],genre:"Поезія",year:1609,desc:"Вибрані сонети світового канону.",coverColor:"#fb923c",recommended:true},
  {id:14,title:"Вибрані вірші",author:"Пабло Неруда",grades:[10,11],genre:"Поезія",year:1945,desc:"Поетична добірка для старших класів.",coverColor:"#f472b6"},
  {id:15,title:"Сто років самотності",author:"Ґабріель Гарсіа Маркес",grades:[11],genre:"Проза",year:1967,desc:"Магічний реалізм про долю родини Буендіа.",coverColor:"#ff7ab6",recommended:true},
  {id:16,title:"Макбет",author:"Вільям Шекспір",grades:[10,11],genre:"Драма",year:1606,desc:"Трагічна п'єса про амбіції й провину.",coverColor:"#d946ef"},
  {id:17,title:"Франкенштейн",author:"Мері Шеллі",grades:[10,11],genre:"Проза",year:1818,desc:"Готичний роман про створену істоту і її наслідки.",coverColor:"#fb7185"},
  {id:18,title:"Старий і море",author:"Ернест Хемінгуей",grades:[10,11],genre:"Повість",year:1952,desc:"Коротка, але сильна повість про боротьбу людини з природою.",coverColor:"#60a5fa"},
  {id:19,title:"Аліса в Країні чудес",author:"Льюїс Керролл",grades:[6,7,8],genre:"Казка",year:1865,desc:"Фантасмагорична казка про дівчинку в дивному світі.",coverColor:"#f59e0b"},
  {id:20,title:"1984",author:"Джордж Орвелл",grades:[11],genre:"Проза",year:1949,desc:"Дистопічний роман про контроль і маніпуляцію.",coverColor:"#7c3aed",recommended:true},
  {id:21,title:"Вірші Емілі Дікінсон (вибір)",author:"Емілі Дікінсон",grades:[9,10,11],genre:"Поезія",year:1890,desc:"Класичні короткі вірші з глибоким сенсом.",coverColor:"#f973b2"},
  {id:22,title:"Війна і мир (уривок)",author:"Лев Толстой",grades:[11],genre:"Проза",year:1867,desc:"Епічний роман з історичною перспективою.",coverColor:"#34d399"},
  {id:23,title:"Мобі Дік (уривок)",author:"Герман Мелвілл",grades:[11],genre:"Проза",year:1851,desc:"Пригодницько-символічний роман про полювання на кашалота.",coverColor:"#38bdf8"},
  {id:24,title:"Божественна комедія (уривок)",author:"Данте Аліг'єрі",grades:[11],genre:"Поезія",year:1320,desc:"Класичний епос про подорож потойбіччям.",coverColor:"#fb923c"},

  {id:25,title:"Вірші для дітей (збірка)",author:"Роберт Луїс Стівенсон",grades:[1],genre:"Поезія",year:1885,desc:"Збірка коротких віршів для дітей.",coverColor:"#f97316"},
  {id:26,title:"Казки братів Грімм (вибір)",author:"Брати Грімм",grades:[1],genre:"Казка",year:1812,desc:"Класичні німецькі казки у перекладі.",coverColor:"#06b6d4"},
  {id:27,title:"Польові казки (вибір)",author:"Оскар Уайльд",grades:[1],genre:"Казка",year:1888,desc:"Короткі чарівні історії для наймолодших.",coverColor:"#f973b2"},
  {id:28,title:"Пригоди Лолі (уривок)",author:"Р. Кіплінг",grades:[1],genre:"Проза",year:1894,desc:"Невелика пригодницька історія для дітей.",coverColor:"#60a5fa"},
  {id:29,title:"Маленька повість про доброту",author:"Ганс Крістіан Андерсен",grades:[1],genre:"Повість",year:1845,desc:"Добра історія про дружбу та допомогу.",coverColor:"#a78bfa"},

  {id:30,title:"Дитячі вірші (збірка)",author:"Едвард Лір",grades:[2],genre:"Поезія",year:1871,desc:"Веселі римовані вірші для малюків.",coverColor:"#34d399"},
  {id:31,title:"Казки Ганса Крістіана Андерсена (вибір)",author:"Ганс Крістіан Андерсен",grades:[2],genre:"Казка",year:1837,desc:"Відомі світові казки у коротких версіях.",coverColor:"#fb7185"},
  {id:32,title:"Маленькі пригоди (уривки)",author:"Льюїс Керролл",grades:[2],genre:"Проза",year:1865,desc:"Фантастичні короткі історії для дітей.",coverColor:"#f59e0b"},
  {id:33,title:"Коротка повість про сміливість",author:"А. Сент-Екзюпері",grades:[2],genre:"Повість",year:1943,desc:"Невеличка казкова повість з мораллю.",coverColor:"#60a5fa"},
  {id:34,title:"Маленька драма для дітей",author:"Оскар Уайльд",grades:[2],genre:"Драма",year:1890,desc:"Коротка сценка з мораллю.",coverColor:"#fb923c"},

  {id:35,title:"Дитячі поеми (збірка)",author:"Роберт Фрост",grades:[3],genre:"Поезія",year:1916,desc:"Короткі поеми для початкової школи.",coverColor:"#f472b6"},
  {id:36,title:"Чарівні казки (вибір)",author:"Брати Грімм",grades:[3],genre:"Казка",year:1812,desc:"Казки у адаптованих версіях для дітей.",coverColor:"#f59e0b"},
  {id:37,title:"Маленькі новели",author:"Роберт Луїс Стівенсон",grades:[3],genre:"Проза",year:1886,desc:"Короткі пригодницькі оповідання.",coverColor:"#7c3aed"},
  {id:38,title:"Шкільна повість",author:"Льюїс Керролл",grades:[3],genre:"Повість",year:1865,desc:"Невелика оповідь про школу і друзів.",coverColor:"#38bdf8"},
  {id:39,title:"Мала сценка для дітей",author:"Вільям Шекспір",grades:[3],genre:"Драма",year:1590,desc:"Коротка адаптована сценка класика.",coverColor:"#fb7185"},

  {id:40,title:"Вірші для молодших школярів",author:"Емілі Дікінсон (вибір)",grades:[4],genre:"Поезія",year:1890,desc:"Невеликі вірші з простими образами.",coverColor:"#f973b2"},
  {id:41,title:"Казки про тварин (вибір)",author:"Рудіард Кіплінг",grades:[4],genre:"Казка",year:1894,desc:"Короткі казки з тваринами як героями.",coverColor:"#38bdf8"},
  {id:42,title:"Юнацькі оповідання",author:"Марк Твен",grades:[4],genre:"Проза",year:1876,desc:"Оповідання про пригоди й кмітливість.",coverColor:"#f59e0b"},
  {id:43,title:"Мала повість про дружбу",author:"Ганс Крістіан Андерсен",grades:[4],genre:"Повість",year:1850,desc:"Тепла історія про дружбу.",coverColor:"#34d399"},
  {id:44,title:"Дитяча драма (уривок)",author:"Бертольд Брехт",grades:[4],genre:"Драма",year:1920,desc:"Коротка сценка з навчальною ідеєю.",coverColor:"#7c3aed"},

  {id:45,title:"Вірші на всі випадки (збірка)",author:"Пабло Неруда (вибір)",grades:[5],genre:"Поезія",year:1945,desc:"Прості поеми, адаптовані для молодших підлітків.",coverColor:"#ff7ab6"},
  {id:46,title:"Казки народів світу (вибір)",author:"збірка перекладів",grades:[5],genre:"Казка",year:2000,desc:"Казки різних культур у скорочених версіях.",coverColor:"#fb923c"},
  {id:47,title:"Пригоди маленьких героїв",author:"Роберт Льюїс Стівенсон",grades:[5],genre:"Проза",year:1883,desc:"Короткі пригодницькі історії для віку 11–12.",coverColor:"#38bdf8"},
  {id:48,title:"Юнацька повість (вибір)",author:"Антуан де Сент-Екзюпері",grades:[5],genre:"Повість",year:1943,desc:"Легка повість з мораллю.",coverColor:"#f59e0b"},
  {id:49,title:"Мала шкільна драма",author:"Вільям Шекспір (адапт.)",grades:[5],genre:"Драма",year:1600,desc:"Адаптована шкільна сценка.",coverColor:"#60a5fa"},

  {id:50,title:"Поезія для середньої школи",author:"Вільям Вордсворт (вибір)",grades:[6],genre:"Поезія",year:1807,desc:"Короткі поеми для читання в класі.",coverColor:"#f97316"},
  {id:51,title:"Казки-казочки (вибір)",author:"Брати Грімм",grades:[6],genre:"Казка",year:1812,desc:"Адаптовані казки для середніх класів.",coverColor:"#06b6d4"},
  {id:52,title:"Пригоди на море (уривки)",author:"Роберт Луїс Стівенсон",grades:[6],genre:"Проза",year:1883,desc:"Короткі пригодницькі уривки.",coverColor:"#f973b2"},
  {id:53,title:"Повісті для юнацтва",author:"Чарльз Діккенс (вибір)",grades:[6],genre:"Повість",year:1850,desc:"Короткі уривки з класичних повістей.",coverColor:"#60a5fa"},
  {id:54,title:"Шкільні драми (вибір)",author:"Генріх Ібзен (адапт.)",grades:[6],genre:"Драма",year:1879,desc:"Короткі драматичні уривки для аналізу.",coverColor:"#a78bfa"},

  {id:55,title:"Поезія для старших класів (вибір)",author:"Вільям Шекспір (сонети, вибір)",grades:[7],genre:"Поезія",year:1609,desc:"Сонети й короткі вірші для аналізу.",coverColor:"#34d399"},
  {id:56,title:"Казки для підлітків (вибір)",author:"Оскар Уайльд",grades:[7],genre:"Казка",year:1888,desc:"Казки з філософським підґрунтям.",coverColor:"#fb7185"},
  {id:57,title:"Юнацька проза (вибір)",author:"Марк Твен",grades:[7],genre:"Проза",year:1876,desc:"Пригодницькі й повчальні оповідання.",coverColor:"#f59e0b"},
  {id:58,title:"Короткі повісті (вибір)",author:"Лев Толстой (уривки)",grades:[7],genre:"Повість",year:1877,desc:"Уривки та скорочені повісті для уроків.",coverColor:"#60a5fa"},
  {id:59,title:"Сценки та драми для уроку",author:"Антон Чехов (адапт.)",grades:[7],genre:"Драма",year:1895,desc:"Короткі драматичні епізоди для постановок.",coverColor:"#fb923c"}
];

// helper to show messages to the user
function showStatus(msg, isError=false){
  const el = document.getElementById('statusMessage');
  if(!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.color = isError ? '#b91c1c' : '#065f46';
}
// Try to load a SQLite DB (`books.db`) served as a static asset (works on GitHub Pages)
async function loadDbCatalog(){
  if(typeof initSqlJs !== 'function'){
    console.debug('sql.js loader not available');
    return false;
  }
  try{
    const SQL = await initSqlJs({ locateFile: file => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/' + file });
    const res = await fetch('books.db?_=' + Date.now());
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const ab = await res.arrayBuffer();
    const u8 = new Uint8Array(ab);
    const db = new SQL.Database(u8);
    const result = db.exec("SELECT file, title, author, grades, genre, year, desc, img, recommended, literature FROM books");
    if(!result || !result[0]) return false;
    const cols = result[0].columns;
    const rows = result[0].values.map(v => {
      const obj = {};
      v.forEach((val, idx) => obj[cols[idx]] = val);
      try{ obj.grades = obj.grades ? JSON.parse(obj.grades) : []; }catch(e){ obj.grades = []; }
      obj.recommended = obj.recommended ? true : false;
      return obj;
    });
    books = rows;
    console.info(`Loaded ${books.length} books from books.db`);
    showStatus(`SQLite: отримано ${books.length} записів`);
    return true;
  }catch(err){
    console.warn('Failed to load SQLite DB:', err);
    return false;
  }
}

// load catalog from `books_core` via local API and then initialize the view
window.loadCatalog = async function loadCatalog(){
  showStatus('Завантаження каталогу...');
  // try SQLite DB first (hosted as static file on GitHub Pages)
  try{
    const ok = await loadDbCatalog();
    if(ok && books.length>0){ books = normalizeBooks(books); initTheme(); applyFilters(); return; }
  }catch(e){ console.warn('sqlite attempt failed', e); }

  // try relative API first (works when served via http://localhost:8000)
  const tryFetch = async (url)=>{
    const res = await fetch(url);
    if(!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  };

  try{
    books = await tryFetch('/api/books?_=' + Date.now());
    console.info(`Loaded ${books.length} books from /api/books (cache-busted)`, books);
    showStatus(`Сервер: отримано ${books.length} записів`);
  }catch(err1){
    console.warn('Failed to load /api/books (relative). Trying http://localhost:8000/api/books — this is required when you open index.html via file://', err1);
    showStatus('Не вдалося отримати /api/books, спробую альтернативний шлях...', true);
    try{
      books = await tryFetch('http://localhost:8000/api/books');
      console.info(`Loaded ${books.length} books from http://localhost:8000/api/books`);
      showStatus(`Сервер: отримано ${books.length} записів`);
    }catch(err2){
      console.error('Failed to load catalog from local API:', err2);
      showStatus('Не вдалося завантажити каталог з жодного шляху', true);
      books = [];
    }
  }
  // if API returned nothing, try static books.json as last resort
  if(books.length === 0){
    try{
      const res2 = await fetch('books.json?_=' + Date.now());
      if(res2.ok){
        const data2 = await res2.json();
        if(Array.isArray(data2) && data2.length){
          books = data2;
          console.info(`Fallback: loaded ${books.length} books from static books.json`);
          showStatus(`Використано локальний каталог (${books.length} книг)`);
        }
      }
    }catch(_e){/*ignore*/}
  }

  books = normalizeBooks(books);

  initTheme();
  applyFilters();
};

// start on load
window.addEventListener('load', ()=> window.loadCatalog());

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
let favs = new Set(JSON.parse(localStorage.getItem('favs')||'[]').map(String));

function formatYear(y){ return y>0?y:+Math.abs(y)+" до н.е." }
function pluralize(n){ if(n===0) return 'книжок'; const m = n%10; const mm = n%100; if(m===1 && mm!==11) return 'книжка'; if(m>=2 && m<=4 && !(mm>=12 && mm<=14)) return 'книжки'; return 'книжок'; }

function renderBooks(list){
  console.debug('renderBooks called, books array length', books.length, 'list length', list.length);
  const grid = $('#bookGrid'); grid.innerHTML='';
  if(!list.length){
    if(books.length === 0){
      grid.innerHTML = `
        <div class="no-results">
          <p>Каталог порожній або сервер не запущено.</p>
          <p>Запустіть сервер і відкрийте сайт через <code>http://localhost:8000/</code></p>
          <div style="margin-top:10px"><button id="retryCatalog" class="btn ghost">Спробувати ще раз</button></div>
        </div>`;
      $('#resultCount').textContent = `0 ${pluralize(0)}`;
      // retry button
      setTimeout(()=>{ const btn = document.getElementById('retryCatalog'); if(btn) btn.addEventListener('click', ()=>{ btn.disabled=true; btn.textContent='Завантаження...'; window.loadCatalog().finally(()=>{ btn.disabled=false; btn.textContent='Спробувати ще раз' }); }) }, 50);
      return;
    }
    grid.innerHTML='<p class="no-results">Нічого не знайдено.</p>'; $('#resultCount').textContent=`0 ${pluralize(0)}`; return;
  }
  $('#resultCount').textContent = `${list.length} ${pluralize(list.length)}`;
  // show some titles for quick confirmation
  const titles = list.map(b=>b.title).slice(0,5).join(', ');
  showStatus(`Показано ${list.length} книг: ${titles}${list.length>5?','+'…':''}`);
  list.forEach(b=>{
    const key = bookKey(b);
    const card = document.createElement('article'); card.className='book-card fade-in-up';
    const initials = b.title.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
    const coverHtml = b.img ?
      `<div class="cover"><img class="cover-img" src="${b.img}" alt="${b.title}"></div>` :
      `<div class="cover" style="background:${b.coverColor || 'linear-gradient(135deg,#ffd89b,#19547b)'}">${initials}</div>`;

    card.innerHTML = `
      ${coverHtml}
      <div class="book-meta">
        <h3 class="book-title">${b.title}</h3>
        <div class="book-author">${b.author} · ${formatYear(b.year)}</div>
        <div class="book-tags">
          <span class="tag">${b.genre}</span>
          <span class="tag">${b.grades.join(', ')} кл.</span>
          ${b.recommended?'<span class="tag" style="background:linear-gradient(90deg,var(--accent),#7c3aed);color:#fff">Рекоменд.</span>':''}
        </div>
        <div class="card-actions">
          <button type="button" class="btn details" data-key="${key}" aria-label="Деталі">Деталі</button>
          <button type="button" class="btn ghost star" data-key="${key}" aria-pressed="${favs.has(key)}">${favs.has(key)?'★':'☆'}</button>
        </div>
      </div>`;
    // open modal when clicking the whole card (but ignore clicks on buttons/icons)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.star') || e.target.closest('.details') || e.target.closest('button')) return;
      openModal(key);
    });
    grid.appendChild(card);
  });
}

function applyFilters(){
  const grade = $('#gradeSelect').value;
  const genres = $$('.genre').filter(c=>c.checked).map(c=>c.value);
  const q = $('#searchInput').value.trim().toLowerCase();
  const sort = $('#sortSelect').value;
  const view = $('#viewSelect')? $('#viewSelect').value : 'all';

  let res = books.filter(b=>{
    if(view==='recommended' && !b.recommended) return false;
    if(grade!=='all' && !b.grades.includes(Number(grade))) return false;
    if(genres.length && !genres.includes(b.genre)) return false;
    if(q && !(b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))) return false;
    return true;
  });
  console.debug('applyFilters result', {view,grade,genres,q,sort,original:books.length,filtered:res.length}, res);

  if(sort==='title') res.sort((a,b)=>a.title.localeCompare(b.title));
  if(sort==='author') res.sort((a,b)=>a.author.localeCompare(b.author));
  if(sort==='year') res.sort((a,b)=>a.year - b.year);

  renderBooks(res);
}

let debounceTimer=null;
function debounce(fn,ms=250){ clearTimeout(debounceTimer); debounceTimer=setTimeout(fn,ms) }

async function openModal(key){
  const b = books.find(x=>bookKey(x)===String(key)); if(!b) return;
  const modal = $('#modal');
  modal.setAttribute('aria-hidden','false');
  modal.querySelector('.modal-backdrop').addEventListener('click',closeModal);
  $('#modalClose').addEventListener('click',closeModal);

  // render details view (reader is loaded only on demand)
  function renderDetails(){
    $('#modalContent').innerHTML = `
      <div style="display:flex;gap:18px;align-items:flex-start">
        ${b.img ? `<div class="modal-cover"><img src="${b.img}" class="modal-cover-img" alt="${b.title}"></div>` : `<div class="modal-cover" style="background:${b.coverColor || 'linear-gradient(135deg,#cfd9df,#e2ebf0)'};height:220px;width:160px;border-radius:8px"></div>`}
        <div>
          <h3>${b.title}</h3>
          <p class="book-author">${b.author} · ${formatYear(b.year)}</p>
          <p><strong>Жанр:</strong> ${b.genre}</p>
          <p>${b.desc || ''}</p>
          <div style="margin-top:12px">
            <button class="btn" id="readBtn">${b.file ? 'Відкрити текст' : 'Файл не доступний'}</button>
            <button class="btn ghost" id="favModal">${favs.has(bookKey(b))?'Прибрати з улюблених':'Додати в улюблені'}</button>
          </div>
        </div>
      </div>`;

    const readBtn = $('#readBtn');
    const favModalBtn = $('#favModal');

    if(readBtn){
      readBtn.addEventListener('click', async ()=>{
        readBtn.disabled = true; readBtn.textContent = 'Завантаження...';
        try{
          const previewUrl = toPreviewUrl(b.file);
          if(previewUrl){
            window.open(previewUrl, '_blank', 'noopener');
            showStatus('Відкриваю файл у переглядачі Google Drive');
            return;
          }

          // Fallback: load inline (legacy local files)
          let contentHtml = '';
          if(b.html || b.text){
            contentHtml = b.html || ('<pre>' + (b.text||'') + '</pre>');
          } else if(b.file){
            const url = '/api/book?file=' + encodeURIComponent(b.file);
            const res = await fetch(url);
            if(!res.ok) throw new Error('HTTP '+res.status);
            const data = await res.json();
            contentHtml = data.html || ('<pre>' + (data.text||'') + '</pre>');
          } else {
            contentHtml = '<p>Текст недоступний.</p>';
          }
          // show reader view
          $('#modalContent').innerHTML = `
            <div style="display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <button class="btn ghost" id="readerBack">Назад</button>
                <div style="font-size:0.9rem;color:var(--muted)">Читання: ${b.title}</div>
              </div>
              <div class="modal-book-text">${contentHtml}</div>
            </div>`;
          const backBtn = $('#readerBack'); if(backBtn) backBtn.addEventListener('click', renderDetails);
        }catch(err){
          console.error('error fetching book text', err);
          alert('Не вдалося завантажити текст книги: ' + (err.message||err));
        }finally{
          readBtn.disabled = false; readBtn.textContent = 'Відкрити текст';
        }
      });
    }

    if(favModalBtn) favModalBtn.addEventListener('click', ()=>{ const k = bookKey(b); toggleFav(k); favModalBtn.textContent = favs.has(k)?'Прибрати з улюблених':'Додати в улюблені'; });
  }

  renderDetails();
}
function closeModal(){ const modal = $('#modal'); modal.setAttribute('aria-hidden','true'); }

function toggleFav(key){
  const id = String(key);
  // update data
  if(favs.has(id)) favs.delete(id); else favs.add(id);
  localStorage.setItem('favs', JSON.stringify(Array.from(favs)));

  // Update only the affected star buttons in DOM to avoid re-rendering the whole grid
  document.querySelectorAll(`.star[data-key="${id}"]`).forEach(btn=>{
    const pressed = favs.has(id);
    btn.setAttribute('aria-pressed', pressed);
    btn.textContent = pressed ? '★' : '☆';

    // play quick pop animation
    btn.classList.add('star-anim');
    btn.addEventListener('animationend', ()=> btn.classList.remove('star-anim'), {once:true});
  });

  // Update result count if necessary (keeps current list unchanged)
  if($('#resultCount')){
    const visible = Array.from(document.querySelectorAll('.book-card')).length;
    $('#resultCount').textContent = `${visible} ${pluralize(visible)}`;
  }
}

// events
document.addEventListener('click', (e)=>{
  const det = e.target.closest('.details'); if(det){ openModal(det.dataset.key); return }
  const star = e.target.closest('.star'); if(star){ toggleFav(star.dataset.key); return }
});

$('#gradeSelect').addEventListener('change',applyFilters);
$$('.genre').forEach(c=>c.addEventListener('change',applyFilters));
$('#sortSelect').addEventListener('change',applyFilters);
$('#clearFilters').addEventListener('click',()=>{ $('#gradeSelect').value='all'; $$('.genre').forEach(c=>c.checked=false); $('#searchInput').value=''; applyFilters(); });
$('#searchInput').addEventListener('input',()=>debounce(applyFilters,200));
if($('#viewSelect')) $('#viewSelect').addEventListener('change',applyFilters);

// theme
const themeSelectEl = $('#themeSelect');
if(themeSelectEl){
  themeSelectEl.addEventListener('change',(e)=>{
    const t = e.target.value;
    applyThemeClass(t);
    localStorage.setItem('theme', t);
    // pop animation on theme select to make change feel active
    themeSelectEl.classList.add('pop');
    themeSelectEl.addEventListener('animationend', ()=> themeSelectEl.classList.remove('pop'), {once:true});
  });
}

// add pop animation for all selects on change
document.querySelectorAll('select').forEach(s=>{
  s.addEventListener('change', ()=>{
    s.classList.add('pop');
    s.addEventListener('animationend', ()=> s.classList.remove('pop'), {once:true});
  });
});

function initTheme(){
  const saved = localStorage.getItem('theme') || 'light';
  if(themeSelectEl) themeSelectEl.value = saved;
  applyThemeClass(saved);
}

function applyThemeClass(theme){
  document.documentElement.classList.remove('theme-dark','theme-sepia');
  document.body.classList.remove('theme-dark','theme-sepia');
  if(theme==='dark'){
    document.documentElement.classList.add('theme-dark');
    document.body.classList.add('theme-dark');
  }
  if(theme==='sepia'){
    document.documentElement.classList.add('theme-sepia');
    document.body.classList.add('theme-sepia');
  }
  document.documentElement.setAttribute('data-theme', theme);
}

// init
initTheme();
applyFilters();
