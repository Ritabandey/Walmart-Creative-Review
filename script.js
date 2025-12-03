document.getElementById('runCheck').addEventListener('click', async () => {
  const output = document.getElementById('output');
  const fileInput = document.getElementById('imageUpload');

  output.innerHTML = '<div class="empty">Analyzing... Please wait.</div>';

  if (!fileInput.files.length) {
    output.innerHTML = '<div class="empty">Please upload an image first.</div>';
    return;
  }

  try {
    const imageFile = fileInput.files[0];
    const form = new FormData();
    form.append('file', imageFile, imageFile.name);
    const assetType = document.getElementById('assetType')?.value || 'illustration';
    form.append('assetType', assetType);

    // Use XMLHttpRequest to get upload progress events
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/analyze', true);

    const progressEl = document.getElementById('uploadProgress');
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        progressEl.style.width = pct + '%';
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        progressEl.style.width = '0%';
        if (xhr.status >= 200 && xhr.status < 300) {
          const json = JSON.parse(xhr.responseText);
          // Render a visual report
          const frag = document.createDocumentFragment();

          const header = document.createElement('div');
          header.className = 'report-header';
          header.innerHTML = `<div style="font-weight:700;margin-bottom:8px">${json.filename}</div>`;
          frag.appendChild(header);

          for (const c of json.checks) {
            const div = document.createElement('div');
            div.className = 'check';

            const left = document.createElement('div');
            left.className = 'left';

            const badge = document.createElement('div');
            badge.className = 'badge ' + (c.passed ? 'pass' : 'fail');
            badge.textContent = c.passed ? 'OK' : 'NO';

            const meta = document.createElement('div');
            meta.className = 'meta';
            meta.innerHTML = `<div class="id">${c.id}</div><div class="msg">${c.message}</div>`;

            left.appendChild(badge);
            left.appendChild(meta);

            div.appendChild(left);
            frag.appendChild(div);
          }

          output.innerHTML = '';
          output.appendChild(frag);

          // Animate items in
          const items = output.querySelectorAll('.check');
          items.forEach((el, i) => setTimeout(() => el.classList.add('show'), i * 80));

        } else {
          let errMsg = 'Upload failed';
          try { errMsg = JSON.parse(xhr.responseText).error || errMsg; } catch(e){}
          output.innerHTML = `<div class="empty">Error: ${errMsg}</div>`;
        }
      }
    };

    xhr.send(form);

  } catch (err) {
    console.error(err);
    output.innerHTML = '<div class="empty">Error running brand check.</div>';
  }
});

document.getElementById('clearBtn').addEventListener('click', () => {
  document.getElementById('imageUpload').value = '';
  document.getElementById('output').innerHTML = '<div class="empty">No report yet — upload an asset and click <strong>Run Brand Check</strong>.</div>';
});

// Drag & drop support
;(function initDropZone(){
  const drop = document.getElementById('dropZone');
  const input = document.getElementById('imageUpload');
  if (!drop || !input) return;

  ['dragenter','dragover'].forEach(evt => drop.addEventListener(evt, (e) => {
    e.preventDefault(); e.stopPropagation(); drop.classList.add('dragover');
  }));
  ['dragleave','drop','dragend'].forEach(evt => drop.addEventListener(evt, (e) => {
    e.preventDefault(); e.stopPropagation(); drop.classList.remove('dragover');
  }));

  drop.addEventListener('drop', (e) => {
    const file = (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
    if (file) {
      input.files = e.dataTransfer.files;
      // small visual cue
      drop.classList.add('uploaded');
      setTimeout(() => drop.classList.remove('uploaded'), 600);
    }
  });

  // clicking the drop zone should open file picker
  drop.addEventListener('click', () => input.click());
})();
