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

function buildTofuPlanCommand(inputs) {
  let cmdParts = ['tofu', 'plan'];

  // Global option
  if (inputs.chdir) {
    cmdParts = ['tofu', `-chdir=${inputs.chdir}`, 'plan'];
  }

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

  // Other options
  if (inputs.compactWarnings === 'true') cmdParts.push('--compact-warnings');
  if (inputs.detailedExitcode === 'true') cmdParts.push('--detailed-exitcode');
  if (inputs.generateConfigOut) cmdParts.push(getFlag('generate-config-out', inputs.generateConfigOut, 'string'));
  if (inputs.input === 'false') cmdParts.push('--input=false');
  if (inputs.json === 'true') cmdParts.push('--json');
  if (inputs.lock === 'false') cmdParts.push('--lock=false');
  if (inputs.lockTimeout && inputs.lockTimeout !== '0s') cmdParts.push(getFlag('lock-timeout', inputs.lockTimeout, 'string'));
  if (inputs.noColor === 'true') cmdParts.push('--no-color');
  if (inputs.concise === 'true') cmdParts.push('--concise');
  if (inputs.out) cmdParts.push(getFlag('out', inputs.out, 'string'));
  if (inputs.parallelism && inputs.parallelism !== '10') cmdParts.push(getFlag('parallelism', inputs.parallelism, 'string'));
  if (inputs.state) cmdParts.push(getFlag('state', inputs.state, 'string'));
  if (inputs.showSensitive === 'true') cmdParts.push('--show-sensitive');

  // Remove empty strings
  cmdParts = cmdParts.filter(Boolean);

  return cmdParts.join(' ');
}

async function run() {
  try {
    const workingDir = core.getInput('working-directory') || process.cwd();
    
    const inputs = {
      chdir: core.getInput('chdir'),
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
      out: core.getInput('out'),
      compactWarnings: core.getInput('compact-warnings'),
      detailedExitcode: core.getInput('detailed-exitcode'),
      generateConfigOut: core.getInput('generate-config-out'),
      input: core.getInput('input'),
      json: core.getInput('json'),
      lock: core.getInput('lock'),
      lockTimeout: core.getInput('lock-timeout'),
      noColor: core.getInput('no-color'),
      concise: core.getInput('concise'),
      parallelism: core.getInput('parallelism'),
      state: core.getInput('state'),
      showSensitive: core.getInput('show-sensitive'),
      displayPlan: core.getInput('display-plan')
    };

    const cmd = buildTofuPlanCommand(inputs);
    core.info(`Running: ${cmd}`);
    
    let output;
    let exitCode = 0;
    
    try {
      output = execSync(cmd, { cwd: workingDir, encoding: 'utf-8' });
    } catch (error) {
      output = error.stdout || error.message;
      exitCode = error.status || 1;
      
      // If detailed-exitcode is enabled, exit codes 0, 1, and 2 are expected
      if (inputs.detailedExitcode === 'true' && (exitCode === 0 || exitCode === 2)) {
        core.info(`tofu plan completed with exit code ${exitCode}.`);
      } else if (exitCode !== 0) {
        // Still show the output even if there's an error
        if (output && inputs.displayPlan !== 'false') {
          core.startGroup('📋 OpenTofu Plan Output (with errors)');
          console.log(output);
          core.endGroup();
        }
        throw error;
      }
    }
    
    // Print the plan output to the console for visibility
    if (output && inputs.displayPlan !== 'false') {
      core.startGroup('📋 OpenTofu Plan Output');
      console.log(output);
      core.endGroup();
    }
    
    core.setOutput('plan-output', output);
    core.setOutput('exitcode', exitCode);
    core.info('tofu plan completed successfully.');
  } catch (error) {
    core.setFailed(error.message);
  }
}

// Export functions for testing
module.exports = {
  getFlag,
  getRepeatableFlag,
  buildTofuPlanCommand,
  run
};

// Only run if this file is executed directly
if (require.main === module) {
  run();
}
