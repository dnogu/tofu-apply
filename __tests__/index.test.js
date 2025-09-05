const { getFlag, getRepeatableFlag, buildTofuApplyCommand } = require('../index');

// Mock @actions/core to avoid warnings during tests
jest.mock('@actions/core', () => ({
  warning: jest.fn(),
  info: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  getInput: jest.fn()
}));

describe('getFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return flag for boolean type when value is true', () => {
    expect(getFlag('upgrade', 'true', 'boolean')).toBe('--upgrade');
  });

  test('should return empty string for boolean type when value is false', () => {
    expect(getFlag('upgrade', 'false', 'boolean')).toBe('');
  });

  test('should return empty string for boolean type when value is undefined', () => {
    expect(getFlag('upgrade', undefined, 'boolean')).toBe('');
  });

  test('should return empty string for boolean type when value is null', () => {
    expect(getFlag('upgrade', null, 'boolean')).toBe('');
  });

  test('should return flag with value for string type', () => {
    expect(getFlag('lock-timeout', '30s', 'string')).toBe('--lock-timeout=30s');
  });

  test('should return empty string for string type when value is empty', () => {
    expect(getFlag('lock-timeout', '', 'string')).toBe('');
  });

  test('should return empty string for string type when value is undefined', () => {
    expect(getFlag('lock-timeout', undefined, 'string')).toBe('');
  });
});

describe('getRepeatableFlag', () => {
  test('should return empty array when value is empty', () => {
    expect(getRepeatableFlag('var', '')).toEqual([]);
  });

  test('should return empty array when value is undefined', () => {
    expect(getRepeatableFlag('var', undefined)).toEqual([]);
  });

  test('should return single flag for single value', () => {
    expect(getRepeatableFlag('var', 'foo=bar')).toEqual(['--var=foo=bar']);
  });

  test('should return multiple flags for comma-separated values', () => {
    expect(getRepeatableFlag('var', 'foo=bar,baz=qux')).toEqual([
      '--var=foo=bar',
      '--var=baz=qux'
    ]);
  });

  test('should trim whitespace around comma-separated values', () => {
    expect(getRepeatableFlag('var', 'foo=bar, baz=qux , hello=world')).toEqual([
      '--var=foo=bar',
      '--var=baz=qux',
      '--var=hello=world'
    ]);
  });
});

describe('buildTofuApplyCommand', () => {
  test('should generate basic tofu apply command with defaults', () => {
    const inputs = {};
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply');
  });

  test('should generate command with chdir option', () => {
    const inputs = {
      chdir: './infrastructure'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu -chdir=./infrastructure apply');
  });

  test('should handle saved plan file mode', () => {
    const inputs = {
      planFile: 'saved-plan'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply saved-plan');
  });

  test('should handle saved plan file with auto-approve', () => {
    const inputs = {
      planFile: 'saved-plan',
      autoApprove: 'true'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply saved-plan --auto-approve');
  });

  test('should add auto-approve in automatic plan mode', () => {
    const inputs = {
      autoApprove: 'true'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve');
  });

  test('should add destroy planning mode in automatic plan mode', () => {
    const inputs = {
      destroy: 'true'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --destroy');
  });

  test('should add refresh-only planning mode in automatic plan mode', () => {
    const inputs = {
      refreshOnly: 'true'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --refresh-only');
  });

  test('should add refresh=false option in automatic plan mode', () => {
    const inputs = {
      refresh: 'false'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --refresh=false');
  });

  test('should add input=false option', () => {
    const inputs = {
      input: 'false'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --input=false');
  });

  test('should add lock=false option', () => {
    const inputs = {
      lock: 'false'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --lock=false');
  });

  test('should add apply-specific boolean flags when true', () => {
    const inputs = {
      noColor: 'true',
      json: 'true',
      compactWarnings: 'true',
      consolidateWarnings: 'true',
      consolidateErrors: 'true',
      concise: 'true',
      showSensitive: 'true',
      autoApprove: 'true'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve --compact-warnings --consolidate-warnings --consolidate-errors --json --no-color --concise --show-sensitive');
  });

  test('should not add default lock-timeout', () => {
    const inputs = {
      lockTimeout: '0s'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply');
  });

  test('should add non-default lock-timeout', () => {
    const inputs = {
      lockTimeout: '30s'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --lock-timeout=30s');
  });

  test('should add string flags when provided', () => {
    const inputs = {
      targetFile: 'targets.txt',
      excludeFile: 'excludes.txt',
      state: 'custom.tfstate',
      stateOut: 'new-state.tfstate',
      backup: 'backup.tfstate',
      deprecation: 'module:local'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --state=custom.tfstate --state-out=new-state.tfstate --backup=backup.tfstate --deprecation=module:local --target-file=targets.txt --exclude-file=excludes.txt');
  });

  test('should add variable flags in automatic plan mode', () => {
    const inputs = {
      var: 'region=us-east-1,instance_type=t2.micro'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --var=region=us-east-1 --var=instance_type=t2.micro');
  });

  test('should add variable file flags in automatic plan mode', () => {
    const inputs = {
      varFile: 'prod.tfvars,secrets.tfvars'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --var-file=prod.tfvars --var-file=secrets.tfvars');
  });

  test('should add target flags in automatic plan mode', () => {
    const inputs = {
      target: 'aws_instance.web,aws_security_group.web'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --target=aws_instance.web --target=aws_security_group.web');
  });

  test('should add replace flags in automatic plan mode', () => {
    const inputs = {
      replace: 'aws_instance.web,aws_instance.db'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --replace=aws_instance.web --replace=aws_instance.db');
  });

  test('should add exclude flags in automatic plan mode', () => {
    const inputs = {
      exclude: 'aws_instance.test,module.test'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --exclude=aws_instance.test --exclude=module.test');
  });

  test('should not add default parallelism', () => {
    const inputs = {
      parallelism: '10'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply');
  });

  test('should add non-default parallelism', () => {
    const inputs = {
      parallelism: '5'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --parallelism=5');
  });

  test('should not add default deprecation setting', () => {
    const inputs = {
      deprecation: 'module:all'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply');
  });

  test('should generate complex command with multiple options in automatic plan mode', () => {
    const inputs = {
      chdir: './infra',
      destroy: 'true',
      var: 'env=prod,region=us-west-2',
      varFile: 'common.tfvars,prod.tfvars',
      target: 'aws_instance.web',
      noColor: 'true',
      autoApprove: 'true'
    };
    
    const expected = 'tofu -chdir=./infra apply --auto-approve --no-color --destroy --target=aws_instance.web --var=env=prod --var=region=us-west-2 --var-file=common.tfvars --var-file=prod.tfvars';
    expect(buildTofuApplyCommand(inputs)).toBe(expected);
  });

  test('should handle saved plan file mode with limited options', () => {
    const inputs = {
      planFile: 'saved-plan',
      autoApprove: 'true',
      noColor: 'true',
      json: 'true',
      // These should be ignored in saved plan mode
      destroy: 'true',
      var: 'env=prod',
      target: 'aws_instance.web'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply saved-plan --auto-approve --json --no-color');
  });

  test('should handle refresh-only mode', () => {
    const inputs = {
      refreshOnly: 'true',
      noColor: 'true'
    };
    expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --no-color --refresh-only');
  });

  test('should handle all configuration options for a comprehensive scenario', () => {
    const inputs = {
      chdir: './infra',
      var: 'environment=staging,region=us-east-1',
      varFile: 'staging.tfvars',
      target: 'aws_instance.web',
      json: 'true',
      noColor: 'true',
      autoApprove: 'true',
      parallelism: '5'
    };
    
    const expected = 'tofu -chdir=./infra apply --auto-approve --json --no-color --parallelism=5 --target=aws_instance.web --var=environment=staging --var=region=us-east-1 --var-file=staging.tfvars';
    expect(buildTofuApplyCommand(inputs)).toBe(expected);
  });
});
