// Page engine. STAGE 1: read-only. It only LOOKS at the page; it never types or clicks.
// Stage 2 will add filling and "click Continue" here.
//
// SAFETY RULE: nothing in this app may click, submit or trigger a "Submit" button.
// The run stops on the last page. Do not add a code path that does.

// Runs INSIDE the ATIP page. Must be self-contained (it is serialised with toString()).
// Fields are identified by their visible label text, never by the page's internal ids.
function scanInPage() {
  const text = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  // Label text without the control nested inside it (a <select> would add all its options).
  const plainLabel = (label) => {
    const copy = label.cloneNode(true);
    copy.querySelectorAll('select, input, textarea').forEach((n) => n.remove());
    return text(copy.textContent);
  };
  const labelOf = (el) => {
    if (el.labels && el.labels.length) return plainLabel(el.labels[0]);
    const aria = el.getAttribute('aria-label');
    if (aria) return text(aria);
    const by = el.getAttribute('aria-labelledby');
    if (by) {
      const n = document.getElementById(by);
      if (n) return text(n.innerText);
    }
    const wrap = el.closest('label');
    if (wrap) return plainLabel(wrap);
    const legend = el.closest('fieldset') && el.closest('fieldset').querySelector('legend');
    return legend ? text(legend.innerText) : '';
  };

  const fields = [];
  document.querySelectorAll('input, select, textarea').forEach((el) => {
    const type = (el.getAttribute('type') || el.tagName).toLowerCase();
    if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) return;
    if (!visible(el)) return;
    fields.push({
      tag: el.tagName.toLowerCase(),
      type,
      label: labelOf(el),
      required: el.required || el.getAttribute('aria-required') === 'true',
      options: el.tagName === 'SELECT' ? el.options.length : undefined,
    });
  });

  const buttons = [];
  document.querySelectorAll('button, input[type=submit], input[type=button], a[role=button]').forEach((el) => {
    if (!visible(el)) return;
    const label = text(el.innerText || el.value || el.getAttribute('aria-label'));
    if (label) buttons.push(label);
  });

  return { url: location.href, title: document.title, fields, buttons };
}

async function scanPage(webContents) {
  return webContents.executeJavaScript(`(${scanInPage.toString()})()`, true);
}

const CONTINUE_RE = /^(continue|next|save and continue)/i;
const SUBMIT_RE = /submit/i;

// The last page has a visible "Submit" and no "Continue".
function isSubmitPage(scan) {
  const hasSubmit = scan.buttons.some((b) => SUBMIT_RE.test(b));
  const hasContinue = scan.buttons.some((b) => CONTINUE_RE.test(b));
  return hasSubmit && !hasContinue;
}

module.exports = { scanPage, isSubmitPage, scanInPage };
