const core = require('@actions/core');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { finished } = require('stream/promises');

function getFlag(name, value, type = 'boolean') {
  if (type === 'boolean') {
    if (value === undefined || value === null) {
      return '';
    }
    if (value === 'true') {
      return `--${name}`;
    }
    if (value === 'false') {
      return '';
    }
    core.warning(`Unexpected value for boolean flag '${name}': ${value}`);
    return '';
  }
  if (type === 'string' && value) {
    return `--${name}=${value}`;
  }
  return '';
}

function getRepeatableFlag(name, value) {
  if (!value) return [];
  return value.split(',').map(v => `--${name}=${v.trim()}`);
}

function buildTofuApplyArgs(inputs) {
  let cmdParts = ['apply'];

  // Global option
  if (inputs.chdir) {
    cmdParts = [`-chdir=${inputs.chdir}`, 'apply'];
  }

  // If plan file is provided, use saved plan mode
  if (inputs.planFile) {
    cmdParts.push(inputs.planFile);
    // In saved plan mode, only very limited options are allowed according to OpenTofu docs
    // The plan file contains all the planning decisions, so most options are ignored
    if (inputs.compactWarnings === 'true') cmdParts.push('--compact-warnings');
    if (inputs.consolidateWarnings === 'true') cmdParts.push('--consolidate-warnings');
    if (inputs.consolidateErrors === 'true') cmdParts.push('--consolidate-errors');
    if (inputs.lock === 'false') cmdParts.push('--lock=false');
    if (inputs.lockTimeout && inputs.lockTimeout !== '0s') cmdParts.push(getFlag('lock-timeout', inputs.lockTimeout, 'string'));
    if (inputs.noColor === 'true') cmdParts.push('--no-color');
    if (inputs.concise === 'true') cmdParts.push('--concise');
    if (inputs.parallelism && inputs.parallelism !== '10') cmdParts.push(getFlag('parallelism', inputs.parallelism, 'string'));
    if (inputs.showSensitive === 'true') cmdParts.push('--show-sensitive');
    if (inputs.deprecation && inputs.deprecation !== 'module:all') cmdParts.push(getFlag('deprecation', inputs.deprecation, 'string'));
  } else {
    // Automatic plan mode - planning options are available
    
    // Apply-specific options
    if (inputs.autoApprove === 'true') cmdParts.push('--auto-approve');
    if (inputs.compactWarnings === 'true') cmdParts.push('--compact-warnings');
    if (inputs.consolidateWarnings === 'true') cmdParts.push('--consolidate-warnings');
    if (inputs.consolidateErrors === 'true') cmdParts.push('--consolidate-errors');
    if (inputs.input === 'false') cmdParts.push('--input=false');
    if (inputs.json === 'true') cmdParts.push('--json');
    if (inputs.lock === 'false') cmdParts.push('--lock=false');
    if (inputs.lockTimeout && inputs.lockTimeout !== '0s') cmdParts.push(getFlag('lock-timeout', inputs.lockTimeout, 'string'));
    if (inputs.noColor === 'true') cmdParts.push('--no-color');
    if (inputs.concise === 'true') cmdParts.push('--concise');
    if (inputs.parallelism && inputs.parallelism !== '10') cmdParts.push(getFlag('parallelism', inputs.parallelism, 'string'));
    if (inputs.state) cmdParts.push(getFlag('state', inputs.state, 'string'));
    if (inputs.stateOut) cmdParts.push(getFlag('state-out', inputs.stateOut, 'string'));
    if (inputs.backup) cmdParts.push(getFlag('backup', inputs.backup, 'string'));
    if (inputs.showSensitive === 'true') cmdParts.push('--show-sensitive');
    if (inputs.deprecation && inputs.deprecation !== 'module:all') cmdParts.push(getFlag('deprecation', inputs.deprecation, 'string'));

    // Planning modes (mutually exclusive)
    if (inputs.destroy === 'true') cmdParts.push('--destroy');
    if (inputs.refreshOnly === 'true') cmdParts.push('--refresh-only');

    // Planning options
    if (inputs.refresh === 'false') cmdParts.push('--refresh=false');
    cmdParts = cmdParts.concat(getRepeatableFlag('replace', inputs.replace));
    cmdParts = cmdParts.concat(getRepeatableFlag('target', inputs.target));
    if (inputs.targetFile) cmdParts.push(getFlag('target-file', inputs.targetFile, 'string'));
    cmdParts = cmdParts.concat(getRepeatableFlag('exclude', inputs.exclude));
    if (inputs.excludeFile) cmdParts.push(getFlag('exclude-file', inputs.excludeFile, 'string'));
    cmdParts = cmdParts.concat(getRepeatableFlag('var', inputs.var));
    cmdParts = cmdParts.concat(getRepeatableFlag('var-file', inputs.varFile));
  }

  // Remove empty strings
  cmdParts = cmdParts.filter(Boolean);

  return cmdParts;
}

function buildTofuApplyCommand(inputs) {
  return ['tofu', ...buildTofuApplyArgs(inputs)].join(' ');
}

async function executeTofuApply(args, workingDir, logPath, displayOutput) {
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  // Observe file errors immediately, including while the child is still running.
  const logFinished = finished(logStream).then(() => null, error => error);
  let child;
  let processError;
  let terminationTimer;

  logStream.on('error', () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill();
      // Allow graceful shutdown, but do not hang if it ignores SIGTERM after an
      // unrecoverable logging failure has stopped consuming its output.
      terminationTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
      terminationTimer.unref();
    }
  });

  try {
    const result = await new Promise(resolve => {
      child = spawn('tofu', args, {
        cwd: workingDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      child.once('error', error => {
        processError = error;
      });
      child.once('close', (code, signal) => {
        clearTimeout(terminationTimer);
        resolve({ code, signal });
      });

      // pipe() applies backpressure, keeping memory bounded even with large logs.
      child.stdout.pipe(logStream, { end: false });
      child.stderr.pipe(logStream, { end: false });
      if (displayOutput) {
        child.stdout.pipe(process.stdout, { end: false });
        child.stderr.pipe(process.stderr, { end: false });
      }
    });

    if (processError) throw processError;
    return result;
  } finally {
    clearTimeout(terminationTimer);
    // The close event follows closure of both child streams. Flush the file before
    // run() finishes so a subsequent upload step can read the complete log.
    logStream.end();
    const logError = await logFinished;
    if (logError) throw logError;
  }
}

async function run() {
  let exitCode = 1;
  try {
    const workingDir = core.getInput('working-directory') || process.cwd();
    
    const inputs = {
      chdir: core.getInput('chdir'),
      planFile: core.getInput('plan-file'),
      autoApprove: core.getInput('auto-approve'),
      destroy: core.getInput('destroy'),
      refreshOnly: core.getInput('refresh-only'),
      refresh: core.getInput('refresh'),
      replace: core.getInput('replace'),
      target: core.getInput('target'),
      targetFile: core.getInput('target-file'),
      exclude: core.getInput('exclude'),
      excludeFile: core.getInput('exclude-file'),
      var: core.getInput('var'),
      varFile: core.getInput('var-file'),
      compactWarnings: core.getInput('compact-warnings'),
      consolidateWarnings: core.getInput('consolidate-warnings'),
      consolidateErrors: core.getInput('consolidate-errors'),
      input: core.getInput('input'),
      json: core.getInput('json'),
      lock: core.getInput('lock'),
      lockTimeout: core.getInput('lock-timeout'),
      noColor: core.getInput('no-color'),
      concise: core.getInput('concise'),
      parallelism: core.getInput('parallelism'),
      state: core.getInput('state'),
      stateOut: core.getInput('state-out'),
      backup: core.getInput('backup'),
      showSensitive: core.getInput('show-sensitive'),
      deprecation: core.getInput('deprecation'),
      displayOutput: core.getInput('display-output')
    };

    const args = buildTofuApplyArgs(inputs);
    core.info(`Running: ${buildTofuApplyCommand(inputs)}`);

    const tempDir = path.resolve(process.env.RUNNER_TEMP || os.tmpdir());
    const logDir = await fs.promises.mkdtemp(path.join(tempDir, 'tofu-apply-'));
    const logPath = path.join(logDir, 'apply.log');
    await fs.promises.writeFile(logPath, '', { mode: 0o600 });
    core.setOutput('log-path', logPath);

    const result = await executeTofuApply(args, workingDir, logPath, inputs.displayOutput !== 'false');
    exitCode = result.code === null ? 1 : result.code;
    if (result.signal) {
      throw new Error(`tofu apply terminated by signal ${result.signal}. See ${logPath} for details.`);
    }
    if (exitCode !== 0) {
      throw new Error(`tofu apply failed with exit code ${exitCode}. See ${logPath} for details.`);
    }
    core.info('tofu apply completed successfully.');
  } catch (error) {
    core.setFailed(error.message);
  } finally {
    core.setOutput('exitcode', exitCode);
  }
}

// Export functions for testing
module.exports = {
  getFlag,
  getRepeatableFlag,
  buildTofuApplyArgs,
  buildTofuApplyCommand,
  run
};

// Only run if this file is executed directly
if (require.main === module) {
  run();
}
