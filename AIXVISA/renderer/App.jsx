import React, { useEffect, useRef, useState } from 'react';

const api = window.atip;

const CLIENT_ROWS = [
  ['姓名', (c) => `${c.givenName} ${c.familyName}`],
  ['出生日期', (c) => c.dob],
  ['UCI', (c) => c.uci],
  ['护照号', (c) => c.passportNumber],
  ['国籍', (c) => c.citizenship],
  ['申请类型', (c) => c.applicationType],
  ['邮箱', (c) => c.email],
  ['地址', (c) => `${c.address.line1}, ${c.address.city} ${c.address.province} ${c.address.postalCode}`],
];

export default function App() {
  const [client, setClient] = useState(null);
  const [state, setState] = useState('idle');
  const [lines, setLines] = useState([]);
  const [page, setPage] = useState({ url: '', title: '', loading: false });
  const [config, setConfig] = useState({ testMode: true });
  const [copied, setCopied] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    api.getClient().then(setClient);
    api.getLog().then(setLines);
    api.getConfig().then(setConfig);
    const offs = [
      api.onLog((line) => setLines((prev) => [...prev, line])),
      api.onState(setState),
      api.onPage(setPage),
      api.onClient(setClient),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  const running = state === 'running';

  const copyLog = async () => {
    await api.copyLog();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const clearLog = async () => {
    await api.clearLog();
    setLines([]);
  };

  return (
    <div className="panel">
      <header>
        <h1>ATIP Filler</h1>
        <span className={`badge ${running ? 'on' : ''}`}>{running ? '运行中' : '空闲'}</span>
      </header>

      <section>
        <div className="row">
          <h2>当前页面</h2>
          <button onClick={() => api.goHome()}>回到起始页</button>
        </div>
        <p className="muted ellipsis" title={page.url}>
          {page.loading ? '加载中… ' : ''}
          {page.title || page.url || '—'}
        </p>
      </section>

      <section>
        <div className="row">
          <h2>假客户</h2>
          <button onClick={() => api.newClient()} disabled={running}>换一个</button>
        </div>
        {client && (
          <dl className="client">
            {CLIENT_ROWS.map(([label, get]) => (
              <React.Fragment key={label}>
                <dt>{label}</dt>
                <dd>{get(client)}</dd>
              </React.Fragment>
            ))}
          </dl>
        )}
        {!config.testMode && <p className="warn">TEST_MODE 已关闭:日志里个人信息会被遮挡。</p>}
      </section>

      <section className="controls">
        <button className="primary" onClick={() => api.start()} disabled={running}>Start</button>
        <button className="danger" onClick={() => api.stop()} disabled={!running}>Stop</button>
      </section>
      <p className="muted small">第 1 阶段:只识别页面字段并记录耗时,不会填写、不会点任何按钮。永远不会点 Submit。</p>

      <section className="log-section">
        <div className="row">
          <h2>日志</h2>
          <div>
            <button onClick={clearLog}>清空</button>{' '}
            <button onClick={copyLog}>{copied ? '已复制 ✓' : '一键复制'}</button>
          </div>
        </div>
        <pre className="log" ref={logRef}>{lines.join('\n') || '(还没有日志)'}</pre>
      </section>
    </div>
  );
}
