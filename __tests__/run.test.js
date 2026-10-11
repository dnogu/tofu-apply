const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { Writable } = require('stream');

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  startGroup: jest.fn(),
  endGroup: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn()
}));

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  spawn: jest.fn(),
  // A regression must never run a real infrastructure command in this suite.
  execSync: jest.fn(() => {
    throw new Error('Synchronous execution is disabled in runtime tests');
  })
}));

const core = require('@actions/core');
const { spawn } = require('child_process');
const { spawn: realSpawn } = jest.requireActual('child_process');
const { run } = require('../index');

jest.setTimeout(15000);

describe('OpenTofu apply execution', () => {
  let tempDirectory;
  let workingDirectory;
  let inputs;
  let children;
  let previousRunnerTemp;

  function track(child) {
    children.add(child);
    child.once('close', () => children.delete(child));
    return child;
  }

  // Exercise real pipes and process lifecycle using Node, without needing tofu,
  // credentials, providers, or a platform-specific executable fixture.
  function useFakeTofu(source, onSpawn) {
    spawn.mockImplementation((executable, args, options) => {
      expect(executable).toBe('tofu');
      expect(Array.isArray(args)).toBe(true);
      expect(options.shell).not.toBe(true);
      const child = track(realSpawn(process.execPath, ['-e', source, '--', ...args], options));
      if (onSpawn) onSpawn(child);
      return child;
    });
  }

  function outputs() {
    return Object.fromEntries(core.setOutput.mock.calls);
  }

  function logPath() {
    const file = outputs()['log-path'];
    expect(typeof file).toBe('string');
    expect(path.isAbsolute(file)).toBe(true);
    expect(fs.statSync(file).isFile()).toBe(true);
    expect(path.relative(tempDirectory, file).startsWith('..')).toBe(false);
    return file;
  }

  function sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  function captureWrites(stream, onWrite = () => {}) {
    const chunks = [];
    jest.spyOn(stream, 'write').mockImplementation((chunk, encoding, callback) => {
      const buffer = Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(chunk, typeof encoding === 'string' ? encoding : undefined);
      chunks.push(buffer);
      onWrite(buffer);
      if (typeof encoding === 'function') encoding();
      if (typeof callback === 'function') callback();
      return true;
    });
    return () => Buffer.concat(chunks).toString('utf8');
  }

  async function withDeadline(promise, milliseconds = 3000) {
    let timeout;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Timed out waiting for synthetic process activity')), milliseconds);
        })
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'tofu-apply-runtime-'));
    workingDirectory = path.join(tempDirectory, 'working directory');
    fs.mkdirSync(workingDirectory);
    previousRunnerTemp = process.env.RUNNER_TEMP;
    process.env.RUNNER_TEMP = tempDirectory;
    inputs = { 'working-directory': workingDirectory, 'display-output': 'false' };
    core.getInput.mockImplementation(name => inputs[name] || '');
    children = new Set();
  });

  afterEach(async () => {
    await Promise.all([...children].map(child => new Promise(resolve => {
      child.once('close', resolve);
      child.kill('SIGKILL');
    })));
    jest.restoreAllMocks();
    if (previousRunnerTemp === undefined) delete process.env.RUNNER_TEMP;
    else process.env.RUNNER_TEMP = previousRunnerTemp;
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  test('preserves multiple MiB from each output stream without publishing log text as an action output', async () => {
    const repeats = 3 * 1024 * 1024 / 4;
    const stdout = 'ABCD'.repeat(repeats);
    const stderr = 'wxyz'.repeat(repeats);
    useFakeTofu(`
      process.stdout.write('ABCD'.repeat(${repeats}));
      process.stderr.write('wxyz'.repeat(${repeats}));
    `);

    await run();

    const log = fs.readFileSync(logPath(), 'utf8');
    expect(Buffer.byteLength(log)).toBe(Buffer.byteLength(stdout) + Buffer.byteLength(stderr));
    expect(sha256(log.replace(/[wxyz]/g, ''))).toBe(sha256(stdout));
    expect(sha256(log.replace(/[ABCD]/g, ''))).toBe(sha256(stderr));
    expect(outputs().exitcode).toBe(0);
    expect(outputs()).not.toHaveProperty('apply-output');
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  test('streams stdout and stderr to the runner before the process exits', async () => {
    inputs['display-output'] = 'true';
    const releasePath = path.join(tempDirectory, 'release-child');
    let stdoutSeen = false;
    let stderrSeen = false;
    let childClosed = false;
    let resolveLiveOutput;
    const liveOutput = new Promise(resolve => { resolveLiveOutput = resolve; });
    const notify = () => { if (stdoutSeen && stderrSeen) resolveLiveOutput(); };
    const stdoutText = captureWrites(process.stdout, chunk => {
      if (chunk.toString().includes('live stdout')) stdoutSeen = true;
      notify();
    });
    const stderrText = captureWrites(process.stderr, chunk => {
      if (chunk.toString().includes('live stderr')) stderrSeen = true;
      notify();
    });
    useFakeTofu(`
      const fs = require('fs');
      process.stdout.write('live stdout\\n');
      process.stderr.write('live stderr\\n');
      const timer = setInterval(() => {
        if (fs.existsSync(${JSON.stringify(releasePath)})) {
          clearInterval(timer);
          process.stdout.write('finished stdout\\n');
          process.stderr.write('finished stderr\\n');
        }
      }, 10);
    `, child => child.once('close', () => { childClosed = true; }));

    const execution = run();
    try {
      await withDeadline(liveOutput);
      expect(childClosed).toBe(false);
      expect(stdoutText()).toContain('live stdout\n');
      expect(stderrText()).toContain('live stderr\n');
    } finally {
      fs.writeFileSync(releasePath, 'finish');
      await execution;
    }

    expect(stdoutText()).toContain('finished stdout\n');
    expect(stderrText()).toContain('finished stderr\n');
    expect(fs.readFileSync(logPath(), 'utf8')).toContain('finished stderr\n');
    expect(outputs().exitcode).toBe(0);
  });

  test('display-output false suppresses both live streams while retaining both in the log', async () => {
    const stdoutText = captureWrites(process.stdout);
    const stderrText = captureWrites(process.stderr);
    useFakeTofu(`
      process.stdout.write('hidden stdout\\n');
      process.stderr.write('hidden stderr\\n');
    `);

    await run();

    expect(stdoutText()).toBe('');
    expect(stderrText()).toBe('');
    const log = fs.readFileSync(logPath(), 'utf8');
    expect(log).toContain('hidden stdout\n');
    expect(log).toContain('hidden stderr\n');
    expect(outputs().exitcode).toBe(0);
  });

  test('flushes the failure log and publishes the real nonzero exit code', async () => {
    const stdout = 'before failure\n';
    const stderr = 'D'.repeat(256 * 1024) + '\nfinal failure diagnostic\n';
    useFakeTofu(`
      Promise.all([
        new Promise(resolve => process.stdout.write(${JSON.stringify(stdout)}, resolve)),
        new Promise(resolve => process.stderr.write('D'.repeat(256 * 1024) + '\\nfinal failure diagnostic\\n', resolve))
      ]).then(() => process.exit(7));
    `);

    await run();

    const log = fs.readFileSync(logPath(), 'utf8');
    expect(Buffer.byteLength(log)).toBe(Buffer.byteLength(stdout) + Buffer.byteLength(stderr));
    expect(log).toContain(stdout);
    expect(log).toContain('\nfinal failure diagnostic\n');
    expect(outputs().exitcode).toBe(7);
    expect(core.setFailed).toHaveBeenCalledTimes(1);
    expect(core.setFailed.mock.calls[0][0]).toMatch(/7/);
  });

  test('reports a launch error and retains an available log path', async () => {
    spawn.mockImplementation((_executable, _args, options) => track(realSpawn(
      path.join(tempDirectory, 'executable-that-does-not-exist'), [], options
    )));

    await run();

    logPath();
    expect(outputs().exitcode).toBe(1);
    expect(core.setFailed).toHaveBeenCalledTimes(1);
    expect(core.setFailed.mock.calls[0][0]).toMatch(/ENOENT/);
  });

  test('fails before launching tofu when the log directory cannot be created', async () => {
    process.env.RUNNER_TEMP = path.join(tempDirectory, 'missing-temp-directory');
    useFakeTofu("throw new Error('This synthetic child must not be started');");

    await run();

    expect(spawn).not.toHaveBeenCalled();
    expect(outputs().exitcode).toBe(1);
    expect(outputs()).not.toHaveProperty('log-path');
    expect(core.setFailed).toHaveBeenCalledTimes(1);
    expect(core.setFailed.mock.calls[0][0]).toMatch(/ENOENT/);
  });

  // Windows terminates children immediately on SIGTERM; it cannot exercise a
  // child deliberately ignoring the graceful shutdown signal.
  (process.platform === 'win32' ? test.skip : test)('finishes after a log write failure even when the child ignores SIGTERM', async () => {
    const termMarker = path.join(tempDirectory, 'received-sigterm');
    const writeError = Object.assign(new Error('ENOSPC: no space left on device while writing apply log'), { code: 'ENOSPC' });
    jest.spyOn(fs, 'createWriteStream').mockReturnValueOnce(new Writable({
      write(_chunk, _encoding, callback) { callback(writeError); }
    }));
    let processChild;
    let childClosed = false;
    useFakeTofu(`
      const fs = require('fs');
      process.on('SIGTERM', () => fs.writeFileSync(${JSON.stringify(termMarker)}, 'ignored'));
      process.stdout.write('trigger the synthetic disk failure\\n');
      setInterval(() => {}, 1000);
    `, child => {
      processChild = child;
      child.once('close', () => { childClosed = true; });
    });

    await withDeadline(run(), 10000);

    logPath();
    expect(fs.readFileSync(termMarker, 'utf8')).toBe('ignored');
    expect(childClosed).toBe(true);
    expect(processChild.signalCode).toBe('SIGKILL');
    expect(outputs().exitcode).toBe(1);
    expect(core.setFailed).toHaveBeenCalledTimes(1);
    expect(core.setFailed.mock.calls[0][0]).toContain('ENOSPC');
  });

  test('reports signal termination as a failure and preserves preceding output', async () => {
    useFakeTofu(`
      process.stdout.write('before signal\\n');
      setInterval(() => {}, 1000);
    `, child => child.stdout.once('data', () => child.kill('SIGTERM')));

    await run();

    expect(fs.readFileSync(logPath(), 'utf8')).toContain('before signal\n');
    expect(outputs().exitcode).toBe(1);
    expect(core.setFailed).toHaveBeenCalledTimes(1);
    expect(core.setFailed.mock.calls[0][0]).toMatch(/SIGTERM|signal|terminated/i);
  });

  test('uses a distinct log file for repeated executions', async () => {
    useFakeTofu("process.stdout.write('first invocation\\n');");
    await run();
    const firstPath = logPath();
    core.setOutput.mockClear();
    useFakeTofu("process.stdout.write('second invocation\\n');");

    await run();

    const secondPath = logPath();
    expect(secondPath).not.toBe(firstPath);
    expect(fs.readFileSync(firstPath, 'utf8')).toBe('first invocation\n');
    expect(fs.readFileSync(secondPath, 'utf8')).toBe('second invocation\n');
  });

  test('passes paths and variable values containing spaces and shell syntax as literal arguments', async () => {
    inputs.chdir = 'module directory';
    inputs['var-file'] = 'vars file $(touch unexpected-file).tfvars';
    inputs.var = 'label=hello world; $(echo unwanted) & literal';
    useFakeTofu(`
      process.stdout.write(JSON.stringify({ args: process.argv.slice(1), cwd: process.cwd() }));
    `);

    await run();

    const received = JSON.parse(fs.readFileSync(logPath(), 'utf8'));
    expect(received.cwd).toBe(fs.realpathSync(workingDirectory));
    expect(received.args).toEqual([
      '-chdir=module directory',
      'apply',
      '--var=label=hello world; $(echo unwanted) & literal',
      '--var-file=vars file $(touch unexpected-file).tfvars'
    ]);
    expect(fs.existsSync(path.join(workingDirectory, 'unexpected-file'))).toBe(false);
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  test('passes a saved plan path containing spaces and shell syntax as one literal argument', async () => {
    const planFile = 'plans/saved plan; $(echo unwanted).tfplan';
    inputs['plan-file'] = planFile;
    useFakeTofu('process.stdout.write(JSON.stringify(process.argv.slice(1)));');

    await run();

    expect(JSON.parse(fs.readFileSync(logPath(), 'utf8'))).toEqual(['apply', planFile]);
    expect(outputs().exitcode).toBe(0);
    expect(core.setFailed).not.toHaveBeenCalled();
  });
});
