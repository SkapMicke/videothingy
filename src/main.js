import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import './style.css';

const app = document.getElementById('app');

app.innerHTML = `
  <main class="page-shell">
    <section class="hero">
      <div class="brand-pill">
        <span class="dot"></span>
        Simons Dansmedia Toolkit
      </div>

      <div class="hero-grid">
        <div>
          <p class="eyebrow">Videoverktyg för dansband, spelningar & sociala medier</p>
          <h1>Konvertera, ljudsätt och märk dina videos.</h1>
          <p class="lead">
            Ladda in flera klipp, konvertera MTS till MP4, ta bort originalljud, lägg på nytt ljud med fade och vattenstämpla allt med Simons Dansmedia-känsla.
          </p>
          <div class="hero-actions">
            <a href="#tool" class="primary-link">Starta verktyget</a>
            <span class="mini-note">Kör direkt i webbläsaren • Ingen serverupload</span>
          </div>
        </div>

        <div class="hero-card">
          <div class="fake-video">
            <div class="stage-light one"></div>
            <div class="stage-light two"></div>
            <div class="play">▶</div>
            <div class="watermark-preview">SIMONS DANSMEDIA</div>
          </div>
          <div class="stats-row">
            <div><b>MTS</b><span>in</span></div>
            <div><b>MP4</b><span>ut</span></div>
            <div><b>Batch</b><span>flera klipp</span></div>
          </div>
        </div>
      </div>
    </section>

    <section id="tool" class="tool-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Editor</p>
          <h2>Bearbeta dina videos</h2>
        </div>
        <span class="badge">Vercel-ready</span>
      </div>

      <div class="upload-zone">
        <label for="videos" class="upload-label">
          <span class="upload-icon">＋</span>
          <strong>Välj videos</strong>
          <small>MTS, M2TS, MP4, MOV, MKV, WEBM</small>
        </label>
        <input id="videos" type="file" accept="video/*,.mts,.MTS,.m2ts,.M2TS" multiple />
      </div>
      <div id="fileList" class="file-list empty">Inga videos valda ännu.</div>

      <div class="settings-grid">
        <div class="field">
          <label>Konvertera till format</label>
          <select id="format">
            <option value="mp4">MP4 - bäst för sociala medier</option>
            <option value="mov">MOV</option>
            <option value="mkv">MKV</option>
            <option value="webm">WEBM</option>
          </select>
        </div>

        <div class="field">
          <label>Nytt ljud, valfritt</label>
          <input id="audio" type="file" accept="audio/*" />
        </div>
      </div>

      <div class="option-strip">
        <label class="toggle-row">
          <input id="removeAudio" type="checkbox" />
          <span>
            <b>Ta bort originalljud</b>
            <small>Användbart om kamerans ljud är kasst eller ska ersättas.</small>
          </span>
        </label>
      </div>

      <div class="settings-grid three">
        <div class="field">
          <label>Fade in, sekunder</label>
          <input id="fadeIn" type="number" value="2" min="0" />
        </div>
        <div class="field">
          <label>Fade out, sekunder</label>
          <input id="fadeOut" type="number" value="2" min="0" />
        </div>
        <div class="field">
          <label>Vattenstämpel</label>
          <input id="watermark" type="text" value="Simons Dansmedia" placeholder="Ex: Simons Dansmedia" />
        </div>
      </div>

      <button id="startBtn" class="start-btn">
        <span>Bearbeta & konvertera videos</span>
        <small>Kan ta en stund vid stora MTS-filer</small>
      </button>

      <div class="output-grid">
        <div class="panel">
          <div class="panel-title">Status</div>
          <pre id="log">Väntar på videos...</pre>
        </div>
        <div class="panel">
          <div class="panel-title">Nedladdningar</div>
          <div id="downloads" class="downloads-empty">Dina färdiga filer hamnar här.</div>
        </div>
      </div>
    </section>

    <footer>
      <span>Byggt för Simonsdansmedia.com</span>
      <span>Dansband • Foto • Film • Dokumentation</span>
    </footer>
  </main>
`;

const ffmpeg = new FFmpeg();
const logBox = document.getElementById('log');
const downloads = document.getElementById('downloads');
const startBtn = document.getElementById('startBtn');
const videosInput = document.getElementById('videos');
const fileList = document.getElementById('fileList');

function log(message) {
  if (logBox.textContent === 'Väntar på videos...') logBox.textContent = '';
  logBox.textContent += message + '\n';
  logBox.scrollTop = logBox.scrollHeight;
}

function ext(filename) {
  return filename.split('.').pop().toLowerCase();
}

function cleanName(filename) {
  return filename.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9åäö_-]/gi, '_');
}

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

videosInput.addEventListener('change', () => {
  const files = Array.from(videosInput.files || []);
  if (!files.length) {
    fileList.className = 'file-list empty';
    fileList.textContent = 'Inga videos valda ännu.';
    return;
  }

  fileList.className = 'file-list';
  fileList.innerHTML = files.map((file) => `
    <div class="file-chip">
      <span>${file.name}</span>
      <small>${formatBytes(file.size)}</small>
    </div>
  `).join('');
});

async function loadFFmpeg() {
  if (ffmpeg.loaded) return;

  log('Laddar videomotorn lokalt från sidan...');

  const baseURL = '/ffmpeg-core';

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript')
  });

  log('Videomotorn är redo.');
}

startBtn.addEventListener('click', async () => {
  const videos = document.getElementById('videos').files;
  const audio = document.getElementById('audio').files[0];
  const format = document.getElementById('format').value;
  const removeAudio = document.getElementById('removeAudio').checked;
  const fadeIn = Number(document.getElementById('fadeIn').value || 0);
  const fadeOut = Number(document.getElementById('fadeOut').value || 0);
  const watermark = document.getElementById('watermark').value.trim();

  if (!videos.length) {
    alert('Välj minst en video först.');
    return;
  }

  startBtn.disabled = true;
  downloads.innerHTML = '';
  downloads.className = '';
  logBox.textContent = '';

  try {
    await loadFFmpeg();

    let audioName = null;

    if (audio) {
      audioName = `custom_audio.${ext(audio.name)}`;
      log(`Laddar ljudfil: ${audio.name}`);
      await ffmpeg.writeFile(audioName, await fetchFile(audio));
    }

    for (const video of videos) {
      const inputName = `input_${Date.now()}_${cleanName(video.name)}.${ext(video.name)}`;
      const outputName = `${cleanName(video.name)}_simonsdansmedia.${format}`;

      log(`Laddar in: ${video.name}`);
      await ffmpeg.writeFile(inputName, await fetchFile(video));

      const args = ['-i', inputName];

      if (audioName) args.push('-i', audioName);

      if (watermark) {
        args.push(
          '-vf',
          `drawtext=text='${watermark.replace(/'/g, "\\'")}':fontcolor=white:fontsize=38:box=1:boxcolor=black@0.50:boxborderw=12:x=w-tw-34:y=h-th-34`
        );
      }

      if (audioName) {
        args.push('-map', '0:v:0', '-map', '1:a:0');

        const filters = [];
        if (fadeIn > 0) filters.push(`afade=t=in:ss=0:d=${fadeIn}`);
        if (fadeOut > 0) filters.push(`afade=t=out:st=999999:d=${fadeOut}`);
        if (filters.length) args.push('-filter:a', filters.join(','));

        args.push('-shortest');
      } else if (removeAudio) {
        args.push('-an');
      }

      if (format === 'webm') {
        args.push('-c:v', 'libvpx-vp9');
        if (!removeAudio || audioName) args.push('-c:a', 'libopus');
      } else {
        args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24');
        if (!removeAudio || audioName) args.push('-c:a', 'aac');
      }

      args.push(outputName);

      log(`Bearbetar: ${video.name}`);
      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data.buffer], { type: `video/${format}` });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = outputName;
      a.className = 'download-card';
      a.innerHTML = `<b>Ladda ner</b><span>${outputName}</span>`;
      downloads.appendChild(a);

      log(`Klar: ${outputName}`);
    }

    log('Alla videos är klara. Snyggt, nu börjar det likna något.');
  } catch (error) {
    console.error(error);
    log('FEL: ' + (error?.message || error));
  } finally {
    startBtn.disabled = false;
  }
});
