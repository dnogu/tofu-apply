const core = require('@actions/core');
const { execSync } = require('child_process');

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

function buildTofuApplyCommand(inputs) {
  let cmdParts = ['tofu', 'apply'];

  // Global option
  if (inputs.chdir) {
    cmdParts = ['tofu', `-chdir=${inputs.chdir}`, 'apply'];
  }

  // If plan file is provided, use saved plan mode
  if (inputs.planFile) {
    cmdParts.push(inputs.planFile);
    // In saved plan mode, only certain options are allowed
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

  return cmdParts.join(' ');
}

async function run() {
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

    const cmd = buildTofuApplyCommand(inputs);
    core.info(`Running: ${cmd}`);
    
    let output;
    let exitCode = 0;
    
    try {
      output = execSync(cmd, { cwd: workingDir, encoding: 'utf-8' });
    } catch (error) {
      output = error.stdout || error.message;
      exitCode = error.status || 1;
      
      // Always show the output even if there's an error
      if (output && inputs.displayOutput !== 'false') {
        core.startGroup('� OpenTofu Apply Output (with errors)');
        console.log(output);
        core.endGroup();
      }
      throw error;
    }
    
    // Print the apply output to the console for visibility
    if (output && inputs.displayOutput !== 'false') {
      core.startGroup('✅ OpenTofu Apply Output');
      console.log(output);
      core.endGroup();
    }
    
    core.setOutput('apply-output', output);
    core.setOutput('exitcode', exitCode);
    core.info('tofu apply completed successfully.');
  } catch (error) {
    core.setFailed(error.message);
  }
}

// Export functions for testing
module.exports = {
  getFlag,
  getRepeatableFlag,
  buildTofuApplyCommand,
  run
};

// Only run if this file is executed directly
if (require.main === module) {
  run();
}
