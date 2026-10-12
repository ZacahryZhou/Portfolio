// Start/Stop loop. STAGE 1: watch the ATIP page, scan each page it lands on, log timing,
// and stop on the Submit page. It does not fill or click yet (that is stage 2).
const engine = require('./engine');

class Runner {
  constructor({ webContents, log, onState }) {
    this.wc = webContents;
    this.log = log;
    this.onState = onState;
    this.running = false;
    this.stopWaiters = new Set();
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    this.log('Stop requested');
    this.stopWaiters.forEach((wake) => wake());
  }

  // Resolves when the page navigates, finishes loading, or the run is stopped.
  waitForPage() {
    return new Promise((resolve) => {
      const events = ['did-navigate', 'did-navigate-in-page', 'did-finish-load'];
      const done = () => {
        events.forEach((e) => this.wc.removeListener(e, done));
        this.stopWaiters.delete(done);
        resolve();
      };
      events.forEach((e) => this.wc.once(e, done));
      this.stopWaiters.add(done);
    });
  }

  async start() {
    if (this.running) return;
    this.running = true;
    this.onState('running');
    const runStart = Date.now();
    let page = 0;
    let lastKey = '';
    this.log('Start (stage 1: scan only, nothing is filled or clicked)');

    try {
      while (this.running) {
        const t0 = Date.now();
        const scan = await engine.scanPage(this.wc);
        const key = `${scan.url}|${scan.fields.length}|${scan.buttons.join(',')}`;

        if (key !== lastKey) {
          lastKey = key;
          page += 1;
          const unlabeled = scan.fields.filter((f) => !f.label).length;
          this.log(`page ${page}: ${scan.url}`);
          this.log(`  title: ${scan.title || '(none)'}`);
          this.log(`  fields: ${scan.fields.length} (${unlabeled} without a label)`);
          scan.fields.forEach((f) => this.log(`    - [${f.type}] ${f.label || '(no label)'}${f.required ? ' *' : ''}`));
          this.log(`  buttons: ${scan.buttons.join(' | ') || '(none)'}`);
          this.log(`  scan took ${Date.now() - t0} ms`);

          if (engine.isSubmitPage(scan)) {
            this.log('Reached the Submit page. Stopping here. The app never clicks Submit.');
            break;
          }
        }
        await this.waitForPage();
      }
    } catch (err) {
      this.log(`Error: ${err.message}`);
    } finally {
      this.running = false;
      this.log(`Run ended after ${((Date.now() - runStart) / 1000).toFixed(1)} s`);
      this.onState('idle');
    }
  }
}

module.exports = { Runner };
