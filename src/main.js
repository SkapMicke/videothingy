import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import './style.css';

const app = document.getElementById('app');

app.innerHTML = `
  <main class="wrap">
    <section class="card">
      <h1>Video Converter</h1>
      <p class="sub">Konvertera videos, t.ex. MTS till MP4, ta bort ljud, lägg nytt ljud med fade och vattenstämpel.</p>

      <label>Välj videos</label>
      <input id="videos" type="file" accept="video/*,.mts,.MTS,.m2ts,.M2TS" multiple />

      <label>Konvertera till format</label>
      <select id="format">
        <option value="mp4">MP4</option>
        <option value="mov">MOV</option>
        <option value="mkv">MKV</option>
        <option value="webm">WEBM</option>
      </select>

      <label>Nytt ljud, valfritt</label>
      <input id="audio" type="file" accept="audio/*" />

      <div class="checkrow">
        <input id="removeAudio" type="checkbox" />
        <span>Ta bort originalljud</span>
      </div>

      <div class="grid">
        <div>
          <label>Fade in, sekunder</label>
          <input id="fadeIn" type="number" value="2" min="0" />
        </div>
        <div>
          <label>Fade out, sekunder</label>
          <input id="fadeOut" type="number" value="2" min="0" />
        </div>
      </div>

      <label>Vattenstämpel-text</label>
      <input id="watermark" type="text" placeholder="Ex: Simons Dansmedia" />

      <button id="startBtn">Bearbeta videos</button>

      <h3>Status</h3>
      <pre id="log"></pre>

      <h3>Nedladdningar</h3>
      <div id="downloads"></div>
    </section>
  </main>
`;

const ffmpeg = new FFmpeg();
const logBox = document.getElementById('log');
const downloads = document.getElementById('downloads');
const startBtn = document.getElementById('startBtn');

function log(message) {
  logBox.textContent += message + '\n';
  logBox.scrollTop = logBox.scrollHeight;
}

function ext(filename) {
  return filename.split('.').pop().toLowerCase();
}

function cleanName(filename) {
  return filename.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9åäö_-]/gi, '_');
}

async function loadFFmpeg() {
  if (ffmpeg.loaded) return;

  log('Laddar FFmpeg...');

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript')
  });

  log('FFmpeg laddat.');
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
    alert('Välj minst en video.');
    return;
  }

  startBtn.disabled = true;
  downloads.innerHTML = '';
  logBox.textContent = '';

  try {
    await loadFFmpeg();

    let audioName = null;

    if (audio) {
      audioName = `custom_audio.${ext(audio.name)}`;
      await ffmpeg.writeFile(audioName, await fetchFile(audio));
    }

    for (const video of videos) {
      const inputName = `input_${Date.now()}_${cleanName(video.name)}.${ext(video.name)}`;
      const outputName = `${cleanName(video.name)}_edited.${format}`;

      log(`Laddar in: ${video.name}`);
      await ffmpeg.writeFile(inputName, await fetchFile(video));

      const args = ['-i', inputName];

      if (audioName) args.push('-i', audioName);

      if (watermark) {
        args.push(
          '-vf',
          `drawtext=text='${watermark.replace(/'/g, "\\'")}':fontcolor=white:fontsize=36:box=1:boxcolor=black@0.45:boxborderw=10:x=w-tw-30:y=h-th-30`
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
      a.textContent = `Ladda ner ${outputName}`;
      a.className = 'download';
      downloads.appendChild(a);

      log(`Klar: ${outputName}`);
    }

    log('Alla videos är klara.');
  } catch (error) {
    console.error(error);
    log('FEL: ' + (error?.message || error));
  } finally {
    startBtn.disabled = false;
  }
});
