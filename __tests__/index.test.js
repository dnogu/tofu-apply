const { getFlag, getRepeatableFlag, buildTofuPlanCommand } = require('../index');

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

describe('buildTofuPlanCommand', () => {
  test('should generate basic tofu plan command with defaults', () => {
    const inputs = {};
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan');
  });

  test('should generate command with chdir option', () => {
    const inputs = {
      chdir: './infrastructure'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu -chdir=./infrastructure plan');
  });

  test('should add destroy planning mode', () => {
    const inputs = {
      destroy: 'true'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --destroy');
  });

  test('should add refresh-only planning mode', () => {
    const inputs = {
      refreshOnly: 'true'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --refresh-only');
  });

  test('should add refresh=false option', () => {
    const inputs = {
      refresh: 'false'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --refresh=false');
  });

  test('should add input=false option', () => {
    const inputs = {
      input: 'false'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --input=false');
  });

  test('should add lock=false option', () => {
    const inputs = {
      lock: 'false'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --lock=false');
  });

  test('should add single boolean flags when true', () => {
    const inputs = {
      noColor: 'true',
      json: 'true',
      compactWarnings: 'true',
      detailedExitcode: 'true',
      concise: 'true',
      showSensitive: 'true'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --compact-warnings --detailed-exitcode --json --no-color --concise --show-sensitive');
  });

  test('should not add default lock-timeout', () => {
    const inputs = {
      lockTimeout: '0s'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan');
  });

  test('should add non-default lock-timeout', () => {
    const inputs = {
      lockTimeout: '30s'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --lock-timeout=30s');
  });

  test('should add string flags when provided', () => {
    const inputs = {
      out: 'tfplan',
      targetFile: 'targets.txt',
      excludeFile: 'excludes.txt',
      generateConfigOut: 'generated.tf',
      state: 'custom.tfstate'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --target-file=targets.txt --exclude-file=excludes.txt --generate-config-out=generated.tf --out=tfplan --state=custom.tfstate');
  });

  test('should add variable flags', () => {
    const inputs = {
      var: 'region=us-east-1,instance_type=t2.micro'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --var=region=us-east-1 --var=instance_type=t2.micro');
  });

  test('should add variable file flags', () => {
    const inputs = {
      varFile: 'prod.tfvars,secrets.tfvars'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --var-file=prod.tfvars --var-file=secrets.tfvars');
  });

  test('should add target flags', () => {
    const inputs = {
      target: 'aws_instance.web,aws_security_group.web'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --target=aws_instance.web --target=aws_security_group.web');
  });

  test('should add replace flags', () => {
    const inputs = {
      replace: 'aws_instance.web,aws_instance.db'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --replace=aws_instance.web --replace=aws_instance.db');
  });

  test('should add exclude flags', () => {
    const inputs = {
      exclude: 'aws_instance.test,module.test'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --exclude=aws_instance.test --exclude=module.test');
  });

  test('should not add default parallelism', () => {
    const inputs = {
      parallelism: '10'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan');
  });

  test('should add non-default parallelism', () => {
    const inputs = {
      parallelism: '5'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --parallelism=5');
  });

  test('should generate complex command with multiple options', () => {
    const inputs = {
      chdir: './infra',
      destroy: 'true',
      var: 'env=prod,region=us-west-2',
      varFile: 'common.tfvars,prod.tfvars',
      target: 'aws_instance.web',
      out: 'destroy-plan',
      noColor: 'true',
      detailedExitcode: 'true'
    };
    
    const expected = 'tofu -chdir=./infra plan --destroy --target=aws_instance.web --var=env=prod --var=region=us-west-2 --var-file=common.tfvars --var-file=prod.tfvars --detailed-exitcode --no-color --out=destroy-plan';
    expect(buildTofuPlanCommand(inputs)).toBe(expected);
  });

  test('should handle planning with detailed exit codes', () => {
    const inputs = {
      detailedExitcode: 'true',
      out: 'plan-file'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --detailed-exitcode --out=plan-file');
  });

  test('should handle refresh-only mode', () => {
    const inputs = {
      refreshOnly: 'true',
      noColor: 'true'
    };
    expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --refresh-only --no-color');
  });

  test('should handle all configuration options for a comprehensive scenario', () => {
    const inputs = {
      chdir: './infra',
      var: 'environment=staging,region=us-east-1',
      varFile: 'staging.tfvars',
      target: 'aws_instance.web',
      out: 'staging-plan',
      json: 'true',
      noColor: 'true',
      detailedExitcode: 'true',
      parallelism: '5'
    };
    
    const expected = 'tofu -chdir=./infra plan --target=aws_instance.web --var=environment=staging --var=region=us-east-1 --var-file=staging.tfvars --detailed-exitcode --json --no-color --out=staging-plan --parallelism=5';
    expect(buildTofuPlanCommand(inputs)).toBe(expected);
  });
});
