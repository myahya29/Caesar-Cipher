/**
 * app.js
 * Page controller: UI interaction, brass-and-enamel SVG cipher wheel, and test runner.
 * Depends on cipher.js (loaded first in index.html).
 */

// DOM Elements
const messageInput = document.getElementById('messageInput');
const messageError = document.getElementById('messageError');
const keyInput = document.getElementById('keyInput');
const keySlider = document.getElementById('keySlider');
const keyError = document.getElementById('keyError');
const encryptBtn = document.getElementById('encryptBtn');
const decryptBtn = document.getElementById('decryptBtn');
const resultSection = document.getElementById('resultSection');
const resultText = document.getElementById('resultText');
const resultType = document.getElementById('resultType');
const copyBtn = document.getElementById('copyBtn');
const roundTripBox = document.getElementById('roundTripBox');
const roundTripText = document.getElementById('roundTripText');
const stepsSection = document.getElementById('stepsSection');
const stepsTableBody = document.getElementById('stepsTableBody');
const cipherWheelSvg = document.getElementById('cipherWheelSvg');
const outerTicksGroup = document.getElementById('outerTicksGroup');
const outerWheelGroup = document.getElementById('outerWheelGroup');
const innerWheelGroup = document.getElementById('innerWheelGroup');
const innerDragHandle = document.getElementById('innerDragHandle');
const innerTicksGroup = document.getElementById('innerTicksGroup');
const innerLettersGroup = document.getElementById('innerLettersGroup');
const hubShiftArc = document.getElementById('hubShiftArc');
const hubKeyText = document.getElementById('hubKeyText');
const hubMappingText = document.getElementById('hubMappingText');
const linkLine = document.getElementById('linkLine');
const wheelPairText = document.getElementById('wheelPairText');
const currentTestsBody = document.getElementById('currentTestsBody');
const fixedTestsBody = document.getElementById('fixedTestsBody');
const testSummaryBadge = document.getElementById('testSummaryBadge');
const runAllTestsBtn = document.getElementById('runAllTestsBtn');
const toggleReportBtn = document.getElementById('toggleReportBtn');
const reportNotes = document.getElementById('reportNotes');
const reportArrow = document.getElementById('reportArrow');

// =============================================================================
// CIPHER WHEEL MODULE (Geometry, Drawing, Animation, Drag & Highlighting)
// =============================================================================

const CX = 180, CY = 180, R_OUTER = 150, R_INNER = 114;
let cumulativeAngle = 0;
let lastValidKey = 3;
let activeMode = 'encrypt';
let lastUsedPairs = [];
let isDragging = false;
let startPointerAngle = 0;
let startWheelAngle = 0;

/**
 * Draws the physical instrument wheel: ticks, outer badges, and inner badges.
 */
function drawWheel() {
  outerTicksGroup.innerHTML = '';
  outerWheelGroup.innerHTML = '';
  innerTicksGroup.innerHTML = '';
  innerLettersGroup.innerHTML = '';

  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    const angleDeg = (i * 360) / 26 - 90;
    const rad = (angleDeg * Math.PI) / 180;

    // 1. Outer major tick (at letter position)
    const tx1 = CX + 167 * Math.cos(rad);
    const ty1 = CY + 167 * Math.sin(rad);
    const tx2 = CX + 162 * Math.cos(rad);
    const ty2 = CY + 162 * Math.sin(rad);
    outerTicksGroup.innerHTML += `<line x1="${tx1}" y1="${ty1}" x2="${tx2}" y2="${ty2}" stroke="#0F766E" stroke-width="1.2" />`;

    // 2. Outer minor tick (halfway between letters)
    const midRad = ((angleDeg + 360 / 52) * Math.PI) / 180;
    const mx1 = CX + 166 * Math.cos(midRad);
    const my1 = CY + 166 * Math.sin(midRad);
    const mx2 = CX + 163 * Math.cos(midRad);
    const my2 = CY + 163 * Math.sin(midRad);
    outerTicksGroup.innerHTML += `<line x1="${mx1}" y1="${my1}" x2="${mx2}" y2="${my2}" stroke="#94A3B8" stroke-width="0.8" />`;

    // 3. Outer Plaintext Badge
    const xo = CX + R_OUTER * Math.cos(rad);
    const yo = CY + R_OUTER * Math.sin(rad);
    const go = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    go.setAttribute('id', `outer-badge-${letter}`);
    go.setAttribute('class', 'wheel-badge outer-letter-badge');
    go.setAttribute('tabindex', '0');
    go.setAttribute('role', 'button');
    go.setAttribute('aria-label', `Plaintext letter ${letter}`);
    go.setAttribute('data-index', i);
    go.setAttribute('data-letter', letter);
    go.innerHTML = `
      <g class="badge-face">
        <circle cx="${xo}" cy="${yo}" r="11" fill="#FFFFFF" stroke="#0F766E" stroke-width="1.5" />
        <text x="${xo}" y="${yo}" text-anchor="middle" dominant-baseline="central" font-family="'IBM Plex Mono', monospace" font-size="12" font-weight="700" fill="#0F766E">${letter}</text>
      </g>
    `;
    go.addEventListener('mouseenter', () => highlightPair(i));
    go.addEventListener('focus', () => highlightPair(i));
    go.addEventListener('mouseleave', clearHighlight);
    go.addEventListener('blur', clearHighlight);
    go.addEventListener('keydown', (e) => handleLetterBadgeKey(e, i, 'outer'));
    outerWheelGroup.appendChild(go);

    // 4. Inner Rim Tick
    const itx1 = CX + 131 * Math.cos(rad);
    const ity1 = CY + 131 * Math.sin(rad);
    const itx2 = CX + 127 * Math.cos(rad);
    const ity2 = CY + 127 * Math.sin(rad);
    innerTicksGroup.innerHTML += `<line x1="${itx1}" y1="${ity1}" x2="${itx2}" y2="${ity2}" stroke="#94A3B8" stroke-width="1" />`;

    // 5. Inner Ciphertext Badge
    const xi = CX + R_INNER * Math.cos(rad);
    const yi = CY + R_INNER * Math.sin(rad);
    const gi = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gi.setAttribute('id', `inner-badge-${letter}`);
    gi.setAttribute('class', 'wheel-badge inner-letter-badge');
    gi.setAttribute('tabindex', '0');
    gi.setAttribute('role', 'button');
    gi.setAttribute('aria-label', `Ciphertext letter ${letter}`);
    gi.setAttribute('data-index', i);
    gi.setAttribute('data-letter', letter);
    gi.innerHTML = `
      <g class="badge-face">
        <circle cx="${xi}" cy="${yi}" r="11" fill="#F1F5F9" stroke="#94A3B8" stroke-width="1" />
        <text x="${xi}" y="${yi}" text-anchor="middle" dominant-baseline="central" font-family="'IBM Plex Mono', monospace" font-size="12" font-weight="700" fill="#14213D">${letter}</text>
      </g>
    `;
    gi.addEventListener('mouseenter', () => highlightInnerLetter(i));
    gi.addEventListener('focus', () => highlightInnerLetter(i));
    gi.addEventListener('mouseleave', clearHighlight);
    gi.addEventListener('blur', clearHighlight);
    gi.addEventListener('keydown', (e) => handleLetterBadgeKey(e, i, 'inner'));
    innerLettersGroup.appendChild(gi);
  }

  setupWheelDragging();
}

/**
 * Turns the wheel to key k via shortest path and updates hub indicators.
 */
function setWheelKey(k) {
  const targetDeg = -((k * 360) / 26);
  let diff = ((targetDeg - (cumulativeAngle % 360) + 180) % 360 + 360) % 360 - 180;
  cumulativeAngle += diff;

  innerWheelGroup.style.transform = `rotate(${cumulativeAngle}deg)`;
  document.querySelectorAll('.inner-letter-badge').forEach((badge) => {
    badge.style.transform = `rotate(${-cumulativeAngle}deg)`;
  });

  hubKeyText.textContent = `k = ${k}`;
  hubMappingText.textContent = `A → ${String.fromCharCode(65 + k)}`;
  innerDragHandle.setAttribute('aria-valuenow', k);
  lastValidKey = k;

  // Update center hub shift arc
  updateHubShiftArc(k);
}

/**
 * Draws the visual progress arc on the center hub covering k steps out of 26.
 */
function updateHubShiftArc(k) {
  if (k === 0) {
    hubShiftArc.setAttribute('d', '');
    return;
  }
  const rArc = 72;
  const startX = CX;
  const startY = CY - rArc;
  const arcAngle = (k * 360) / 26;
  const endRad = ((arcAngle - 90) * Math.PI) / 180;
  const endX = CX + rArc * Math.cos(endRad);
  const endY = CY + rArc * Math.sin(endRad);
  const largeArcFlag = arcAngle > 180 ? 1 : 0;
  hubShiftArc.setAttribute('d', `M ${startX} ${startY} A ${rArc} ${rArc} 0 ${largeArcFlag} 1 ${endX} ${endY}`);
}

/**
 * Resets all badge colors, scales, dimming, and hides the link line.
 */
function resetAllBadges() {
  for (let i = 0; i < 26; i++) {
    const l = String.fromCharCode(65 + i);
    const o = document.getElementById(`outer-badge-${l}`);
    if (o) {
      o.querySelector('.badge-face').setAttribute('class', 'badge-face');
      o.querySelector('circle').setAttribute('fill', '#FFFFFF');
      o.querySelector('circle').setAttribute('stroke', '#0F766E');
      o.querySelector('text').setAttribute('fill', '#0F766E');
    }
    const inn = document.getElementById(`inner-badge-${l}`);
    if (inn) {
      inn.querySelector('.badge-face').setAttribute('class', 'badge-face');
      inn.querySelector('circle').setAttribute('fill', '#F1F5F9');
      inn.querySelector('circle').setAttribute('stroke', '#94A3B8');
      inn.querySelector('text').setAttribute('fill', '#14213D');
    }
  }
  linkLine.setAttribute('opacity', '0');
}

/**
 * Highlights a specific plaintext index and its corresponding ciphertext letter.
 */
function highlightPair(plainIndex) {
  resetAllBadges();
  document.querySelectorAll('.badge-face').forEach((f) => f.classList.add('dimmed'));

  const pIdx = plainIndex;
  const cIdx = (pIdx + lastValidKey) % 26;
  const plainChar = String.fromCharCode(65 + pIdx);
  const cipherChar = String.fromCharCode(65 + cIdx);

  // Outer badge (Amber input in Encrypt, Teal output in Decrypt)
  const oBadge = document.getElementById(`outer-badge-${plainChar}`);
  if (oBadge) {
    const oFace = oBadge.querySelector('.badge-face');
    oFace.classList.remove('dimmed');
    oFace.classList.add('scaled');
    oBadge.querySelector('circle').setAttribute('fill', activeMode === 'encrypt' ? '#D97706' : '#0F766E');
    oBadge.querySelector('circle').setAttribute('stroke', activeMode === 'encrypt' ? '#B45309' : '#0D655E');
    oBadge.querySelector('text').setAttribute('fill', '#FFFFFF');
  }

  // Inner badge (Teal output in Encrypt, Amber input in Decrypt)
  const iBadge = document.getElementById(`inner-badge-${cipherChar}`);
  if (iBadge) {
    const iFace = iBadge.querySelector('.badge-face');
    iFace.classList.remove('dimmed');
    iFace.classList.add('scaled');
    iBadge.querySelector('circle').setAttribute('fill', activeMode === 'encrypt' ? '#0F766E' : '#D97706');
    iBadge.querySelector('circle').setAttribute('stroke', activeMode === 'encrypt' ? '#0D655E' : '#B45309');
    iBadge.querySelector('text').setAttribute('fill', '#FFFFFF');
  }

  // Draw connecting line between badge centers
  const outerRad = (((pIdx * 360) / 26 - 90) * Math.PI) / 180;
  const xo = CX + R_OUTER * Math.cos(outerRad);
  const yo = CY + R_OUTER * Math.sin(outerRad);

  const innerRad = (((cIdx * 360) / 26 - 90 + cumulativeAngle) * Math.PI) / 180;
  const xi = CX + R_INNER * Math.cos(innerRad);
  const yi = CY + R_INNER * Math.sin(innerRad);

  linkLine.setAttribute('x1', xo);
  linkLine.setAttribute('y1', yo);
  linkLine.setAttribute('x2', xi);
  linkLine.setAttribute('y2', yi);
  linkLine.setAttribute('opacity', '1');

  // Math Tooltip Text
  if (activeMode === 'decrypt') {
    const rawVal = cIdx - lastValidKey + 26;
    wheelPairText.textContent = `${cipherChar} (${cIdx}) - ${lastValidKey} + 26 = ${rawVal} mod 26 = ${pIdx} → ${plainChar}`;
  } else {
    const sumVal = pIdx + lastValidKey;
    wheelPairText.textContent = `${plainChar} (${pIdx}) + ${lastValidKey} = ${sumVal} mod 26 = ${cIdx} → ${cipherChar}`;
  }
}

/**
 * Highlights based on an inner ring letter.
 */
function highlightInnerLetter(cipherIndex) {
  const plainIndex = (cipherIndex - lastValidKey + 26) % 26;
  highlightPair(plainIndex);
}

/**
 * Restores previous used-pair highlights or default state.
 */
function clearHighlight() {
  resetAllBadges();
  if (lastUsedPairs.length > 0) {
    highlightUsedPairs(lastUsedPairs, activeMode);
    wheelPairText.textContent = `Highlighted ${lastUsedPairs.length} unique letter pair(s) on the wheel`;
  } else {
    wheelPairText.textContent = 'Drag the inner ring or hover any letter to inspect alignment';
  }
}

/**
 * Highlights all unique letter pairs from the executed cipher operation.
 */
function highlightUsedPairs(pairs, mode) {
  resetAllBadges();
  pairs.forEach((p) => {
    const o = document.getElementById(`outer-badge-${p.plain}`);
    if (o) {
      o.querySelector('circle').setAttribute('fill', mode === 'encrypt' ? '#D97706' : '#0F766E');
      o.querySelector('circle').setAttribute('stroke', mode === 'encrypt' ? '#B45309' : '#0D655E');
      o.querySelector('text').setAttribute('fill', '#FFFFFF');
    }
    const inn = document.getElementById(`inner-badge-${p.cipher}`);
    if (inn) {
      inn.querySelector('circle').setAttribute('fill', mode === 'encrypt' ? '#0F766E' : '#D97706');
      inn.querySelector('circle').setAttribute('stroke', mode === 'encrypt' ? '#0D655E' : '#B45309');
      inn.querySelector('text').setAttribute('fill', '#FFFFFF');
    }
  });
}

/**
 * Arrow-key navigation between letter badges.
 */
function handleLetterBadgeKey(e, index, ring) {
  let nextIdx = null;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    nextIdx = (index + 1) % 26;
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    nextIdx = (index - 1 + 26) % 26;
  }
  if (nextIdx !== null) {
    e.preventDefault();
    const nextLetter = String.fromCharCode(65 + nextIdx);
    const target = document.getElementById(`${ring}-badge-${nextLetter}`);
    if (target) target.focus();
  }
}

/**
 * Configures touch and mouse dragging to turn the inner disk.
 */
function setupWheelDragging() {
  const getPointerAngle = (e) => {
    const rect = cipherWheelSvg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
  };

  innerDragHandle.addEventListener('pointerdown', (e) => {
    isDragging = true;
    innerDragHandle.setPointerCapture(e.pointerId);
    innerDragHandle.classList.add('grabbing');
    startPointerAngle = getPointerAngle(e);
    startWheelAngle = cumulativeAngle;

    innerWheelGroup.classList.add('no-transition');
    document.querySelectorAll('.inner-letter-badge').forEach((b) => b.classList.add('no-transition'));
  });

  innerDragHandle.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const currAngle = getPointerAngle(e);
    let delta = currAngle - startPointerAngle;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;

    const dragAngle = startWheelAngle + delta;
    innerWheelGroup.style.transform = `rotate(${dragAngle}deg)`;
    document.querySelectorAll('.inner-letter-badge').forEach((b) => {
      b.style.transform = `rotate(${-dragAngle}deg)`;
    });

    const liveK = ((Math.round(-dragAngle / (360 / 26)) % 26) + 26) % 26;
    hubKeyText.textContent = `k = ${liveK}`;
    hubMappingText.textContent = `A → ${String.fromCharCode(65 + liveK)}`;
    updateHubShiftArc(liveK);
  });

  const stopDrag = (e) => {
    if (!isDragging) return;
    isDragging = false;
    innerDragHandle.classList.remove('grabbing');
    innerWheelGroup.classList.remove('no-transition');
    document.querySelectorAll('.inner-letter-badge').forEach((b) => b.classList.remove('no-transition'));

    const currAngle = getPointerAngle(e);
    let delta = currAngle - startPointerAngle;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;

    const finalAngle = startWheelAngle + delta;
    const snappedK = ((Math.round(-finalAngle / (360 / 26)) % 26) + 26) % 26;

    setKeyFromWheel(snappedK);
  };

  innerDragHandle.addEventListener('pointerup', stopDrag);
  innerDragHandle.addEventListener('pointercancel', stopDrag);

  // Arrow key navigation on inner disk slider
  innerDragHandle.addEventListener('keydown', (e) => {
    // Fix 2: arrow keys pressed on a letter badge only move focus; they must not change the key
    if (e.target !== innerDragHandle) return;
    let nextK = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      nextK = (lastValidKey + 1) % 26;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      nextK = (lastValidKey - 1 + 26) % 26;
    }
    if (nextK !== null) {
      e.preventDefault();
      setKeyFromWheel(nextK);
    }
  });
}

/**
 * Applies a key chosen on the wheel (drag release or arrow key).
 * If the key changed, the old result is cleared so it never disagrees with the key box.
 * If nothing changed, the wheel just snaps back and the result stays.
 */
function setKeyFromWheel(k) {
  const current = validateKey(keyInput.value);
  if (current.valid && current.value === k) {
    setWheelKey(k);
    return;
  }
  keyInput.value = k;
  keySlider.value = k;
  clearResults();
  validateInputs();
}

// =============================================================================
// PAGE CONTROLLER & TEST RUNNER
// =============================================================================

/**
 * Validates inputs, updates error messages, dims invalid wheel, and runs reactive tests.
 */
function validateInputs() {
  const msgVal = validateMessage(messageInput.value);
  const keyVal = validateKey(keyInput.value);

  if (!msgVal.valid) {
    messageError.textContent = msgVal.error;
    messageError.classList.remove('hidden');
  } else {
    messageError.textContent = '';
    messageError.classList.add('hidden');
  }

  if (!keyVal.valid) {
    keyError.textContent = keyVal.error;
    keyError.classList.remove('hidden');
    cipherWheelSvg.classList.add('opacity-50');
  } else {
    keyError.textContent = '';
    keyError.classList.add('hidden');
    cipherWheelSvg.classList.remove('opacity-50');
    keySlider.value = keyVal.value;
    setWheelKey(keyVal.value);
  }

  const isValid = msgVal.valid && keyVal.valid;
  encryptBtn.disabled = !isValid;
  decryptBtn.disabled = !isValid;

  runAllTests();
  return isValid;
}

/**
 * Clears old results and wheel highlights when user edits inputs.
 */
function clearResults() {
  resultSection.classList.add('hidden');
  stepsSection.classList.add('hidden');
  roundTripBox.classList.add('hidden');
  lastUsedPairs = [];
  resetAllBadges();
  wheelPairText.textContent = 'Drag the inner ring or hover any letter to inspect alignment';
}

/**
 * Executes Encrypt or Decrypt on click.
 */
function processCipher(mode) {
  if (!validateInputs()) return;
  activeMode = mode;
  const text = messageInput.value;
  const k = validateKey(keyInput.value).value;

  const isEnc = mode === 'encrypt';
  const output = isEnc ? encrypt(text, k) : decrypt(text, k);
  const roundTrip = isEnc ? decrypt(output, k) === text : encrypt(output, k) === text;

  resultType.textContent = isEnc ? 'Ciphertext' : 'Plaintext';
  resultText.textContent = output;
  resultSection.classList.remove('hidden');

  roundTripBox.classList.remove('hidden');
  roundTripBox.className = `p-3 rounded border text-xs font-mono flex items-center gap-2 ${
    roundTrip ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
  }`;
  roundTripText.textContent = roundTrip
    ? `✓ Round-trip verified: ${isEnc ? 'decrypt(encrypt(M, k), k)' : 'encrypt(decrypt(M, k), k)'} == original`
    : '✗ Round-trip failed';

  const steps = buildSteps(text, k, mode);
  renderStepsTable(steps, mode);

  const seen = new Set();
  lastUsedPairs = [];
  steps.forEach((s) => {
    const plain = isEnc ? s.inChar : s.outChar;
    const cipher = isEnc ? s.outChar : s.inChar;
    const keyStr = plain + cipher;
    if (!seen.has(keyStr)) {
      seen.add(keyStr);
      lastUsedPairs.push({ plain, cipher });
    }
  });

  highlightUsedPairs(lastUsedPairs, mode);
  wheelPairText.textContent = `Highlighted ${lastUsedPairs.length} unique letter pair(s) on the wheel`;
  runAllTests();
}

/**
 * Renders step-by-step table with hover/focus linking to wheel.
 */
function renderStepsTable(steps, mode) {
  stepsTableBody.innerHTML = '';
  stepsSection.classList.remove('hidden');

  steps.forEach((s) => {
    const tr = document.createElement('tr');
    tr.setAttribute('tabindex', '0');
    tr.className = `border-b border-slate-100 cursor-pointer focus:bg-amber-100 focus:outline-none hover:bg-amber-50 ${
      s.isNegative ? 'bg-amber-50 font-semibold' : ''
    }`;

    tr.innerHTML = `
      <td class="py-2 px-3 text-center text-slate-500">${s.index}</td>
      <td class="py-2 px-3 text-center font-bold text-tealaccent">${s.inChar}</td>
      <td class="py-2 px-3 text-center text-slate-700">${s.inPos}</td>
      <td class="py-2 px-3 text-center text-slate-600">${s.k}</td>
      <td class="py-2 px-4 text-slate-800">${s.formula} <span class="text-slate-400 mx-1">→</span> <span class="${s.isNegative ? 'text-amber-700' : 'text-slate-600'}">${s.calcText}</span></td>
      <td class="py-2 px-3 text-center text-slate-700">${s.resPos}</td>
      <td class="py-2 px-3 text-center font-bold text-emerald-600">${s.outChar}</td>
    `;

    const plain = mode === 'encrypt' ? s.inChar : s.outChar;
    const pIdx = plain.charCodeAt(0) - 65;
    const activate = () => highlightPair(pIdx);
    const deactivate = clearHighlight;

    tr.addEventListener('mouseenter', activate);
    tr.addEventListener('focus', activate);
    tr.addEventListener('mouseleave', deactivate);
    tr.addEventListener('blur', deactivate);
    stepsTableBody.appendChild(tr);
  });
}

/**
 * Independent reference encryption for verification.
 */
function referenceEncrypt(text, k) {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let res = '';
  for (let i = 0; i < text.length; i++) {
    res += alpha[(alpha.indexOf(text[i]) + k) % 26];
  }
  return res;
}

/**
 * Runs current input tests (top) and fixed test cases (bottom).
 */
function runAllTests() {
  currentTestsBody.innerHTML = '';
  fixedTestsBody.innerHTML = '';

  const msgVal = validateMessage(messageInput.value);
  const keyVal = validateKey(keyInput.value);
  let passedCount = 0;
  let totalCount = 0;

  // 1. Reactive Current Input Tests
  if (!msgVal.valid || !keyVal.valid) {
    currentTestsBody.innerHTML = `
      <tr>
        <td colspan="4" class="py-2.5 px-3 text-amber-800 bg-amber-50 font-medium">
          Skipped: fix the input error above
        </td>
      </tr>
    `;
  } else {
    const M = messageInput.value;
    const k = keyVal.value;
    const currentTests = [
      { name: `decrypt(encrypt(M, k), k) == M`, expected: M, run: () => decrypt(encrypt(M, k), k) },
      { name: `encrypt(decrypt(M, k), k) == M`, expected: M, run: () => encrypt(decrypt(M, k), k) },
      { name: `encrypt matches reference method`, expected: referenceEncrypt(M, k), run: () => encrypt(M, k) },
      { name: `Full alphabet round-trips with k=${k}`, expected: 'A..Z passed', run: () => {
        const az = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return decrypt(encrypt(az, k), k) === az ? 'A..Z passed' : 'Failed';
      }}
    ];

    currentTests.forEach((t) => {
      totalCount++;
      let got = '';
      try { got = t.run(); } catch (e) { got = `Error: ${e.message}`; }
      const pass = got === t.expected;
      if (pass) passedCount++;
      currentTestsBody.innerHTML += `
        <tr class="border-b border-slate-100">
          <td class="py-2 px-3 text-slate-800 font-medium">${t.name} <span class="text-slate-400 font-mono text-[10px]">(M=${M}, k=${k})</span></td>
          <td class="py-2 px-3 text-slate-600 font-mono text-[11px]">${t.expected}</td>
          <td class="py-2 px-3 text-slate-600 font-mono text-[11px]">${got}</td>
          <td class="py-2 px-3 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${pass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${pass ? 'Pass' : 'Fail'}</span></td>
        </tr>
      `;
    });
  }

  // 2. Fixed Test Cases (Data-driven array with single loop)
  const fixedTests = [
    { name: 'Encrypt sample (k=3)', expected: 'DWWDFNDWGDZQ', run: () => encrypt('ATTACKATDAWN', 3) },
    { name: 'Decrypt sample (k=3)', expected: 'ATTACKATDAWN', run: () => decrypt('DWWDFNDWGDZQ', 3) },
    { name: 'k=0 Encrypt (identity)', expected: 'HELLO', run: () => encrypt('HELLO', 0) },
    { name: 'k=0 Decrypt (identity)', expected: 'HELLO', run: () => decrypt('HELLO', 0) },
    { name: 'k=25 Encrypt: AZ -> ZY', expected: 'ZY', run: () => encrypt('AZ', 25) },
    { name: 'k=25 Decrypt: ZY -> AZ', expected: 'AZ', run: () => decrypt('ZY', 25) },
    { name: 'Wrap-around: XYZ, k=3 -> ABC', expected: 'ABC', run: () => encrypt('XYZ', 3) },
    { name: 'Decrypt A with k=3 -> X (+26 case)', expected: 'X', run: () => decrypt('A', 3) },
    { name: 'Round-trip all 26 keys for A..Z', expected: 'All 26 passed', run: () => {
      const az = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (let i = 0; i < 26; i++) {
        if (decrypt(encrypt(az, i), i) !== az) return `Failed at k=${i}`;
      }
      return 'All 26 passed';
    }},
    { name: 'Reject lowercase ("attack")', expected: 'Rejected', run: () => validateMessage('attack').valid ? 'Accepted' : 'Rejected' },
    { name: 'Reject space ("HELLO WORLD")', expected: 'Rejected', run: () => validateMessage('HELLO WORLD').valid ? 'Accepted' : 'Rejected' },
    { name: 'Reject digit ("AGENT007")', expected: 'Rejected', run: () => validateMessage('AGENT007').valid ? 'Accepted' : 'Rejected' },
    { name: 'Reject punctuation ("HELLO!")', expected: 'Rejected', run: () => validateMessage('HELLO!').valid ? 'Accepted' : 'Rejected' },
    { name: 'Reject empty message ("")', expected: 'Rejected', run: () => validateMessage('').valid ? 'Accepted' : 'Rejected' },
    { name: 'Reject key -1', expected: 'Rejected', run: () => validateKey(-1).valid ? 'Accepted' : 'Rejected' },
    { name: 'Reject key 26', expected: 'Rejected', run: () => validateKey(26).valid ? 'Accepted' : 'Rejected' },
    { name: 'Reject key 3.5', expected: 'Rejected', run: () => validateKey(3.5).valid ? 'Accepted' : 'Rejected' },
    { name: 'Reject empty key ("")', expected: 'Rejected', run: () => validateKey('').valid ? 'Accepted' : 'Rejected' },
    { name: 'encrypt("abc", 3) throws error', expected: 'Error thrown', run: () => {
      try { encrypt('abc', 3); return 'No error'; } catch (e) { return 'Error thrown'; }
    }}
  ];

  fixedTests.forEach((t) => {
    totalCount++;
    let got = '';
    try { got = t.run(); } catch (e) { got = `Error: ${e.message}`; }
    const pass = got === t.expected;
    if (pass) passedCount++;
    fixedTestsBody.innerHTML += `
      <tr class="border-b border-slate-100">
        <td class="py-2 px-3 text-slate-800 font-medium">${t.name}</td>
        <td class="py-2 px-3 text-slate-600 font-mono text-[11px]">${t.expected}</td>
        <td class="py-2 px-3 text-slate-600 font-mono text-[11px]">${got}</td>
        <td class="py-2 px-3 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${pass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${pass ? 'Pass' : 'Fail'}</span></td>
      </tr>
    `;
  });

  testSummaryBadge.textContent = `${passedCount}/${totalCount} passed`;
  testSummaryBadge.className = passedCount === totalCount
    ? 'px-2.5 py-1 rounded bg-green-100 text-green-800 font-mono text-xs font-bold'
    : 'px-2.5 py-1 rounded bg-red-100 text-red-800 font-mono text-xs font-bold';
}

// Event Listeners
messageInput.addEventListener('input', () => { clearResults(); validateInputs(); });
keyInput.addEventListener('input', () => { clearResults(); validateInputs(); });
keySlider.addEventListener('input', (e) => { clearResults(); keyInput.value = e.target.value; validateInputs(); });

encryptBtn.addEventListener('click', () => processCipher('encrypt'));
decryptBtn.addEventListener('click', () => processCipher('decrypt'));

copyBtn.addEventListener('click', () => {
  const text = resultText.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    })
    .catch(() => {
      copyBtn.textContent = 'Copy failed';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    });
});

runAllTestsBtn.addEventListener('click', runAllTests);

toggleReportBtn.addEventListener('click', () => {
  const isHidden = reportNotes.classList.toggle('hidden');
  toggleReportBtn.setAttribute('aria-expanded', !isHidden);
  reportArrow.textContent = isHidden ? '↓' : '↑';
});

// Initial Setup
window.addEventListener('DOMContentLoaded', () => {
  drawWheel();
  // Start at k=0, then smooth turn to starting k once on page load
  setWheelKey(0);
  validateInputs();
  setTimeout(() => {
    setWheelKey(3);
  }, 60);
});
