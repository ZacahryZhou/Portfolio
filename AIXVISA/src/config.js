// Central settings. Edit here, not in the code that uses them.
module.exports = {
  // Entry page for the ATIP site shown in the left half of the window.
  // TODO(verify): confirm this is the page you start from.
  ATIP_START_URL: 'https://atip-aiprp.apps.gc.ca/atip/welcome.do',

  // Width of the right-hand control panel, in px.
  PANEL_WIDTH: 400,

  // Persistent session for the ATIP site (keeps cookies between launches).
  ATIP_PARTITION: 'persist:atip',

  // While true, logs may contain fake-client values. Turn OFF before real clients:
  // with it off, every personal value is masked in the log.
  TEST_MODE: true,
};
