const { buildTofuPlanCommand } = require('../index');

describe('OpenTofu Plan Integration Tests', () => {
  describe('Basic scenarios', () => {
    test('should generate command for basic local development', () => {
      const inputs = {
        var: 'environment=dev'
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --var=environment=dev');
    });

    test('should generate command for production planning', () => {
      const inputs = {
        varFile: 'prod.tfvars',
        var: 'environment=production',
        out: 'prod-plan'
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --var=environment=production --var-file=prod.tfvars --out=prod-plan');
    });
  });

  describe('Planning mode scenarios', () => {
    test('should generate command for destroy planning', () => {
      const inputs = {
        destroy: 'true',
        var: 'environment=staging',
        out: 'destroy-plan'
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --destroy --var=environment=staging --out=destroy-plan');
    });

    test('should generate command for refresh-only planning', () => {
      const inputs = {
        refreshOnly: 'true',
        noColor: 'true'
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --refresh-only --no-color');
    });
  });

  describe('Targeting scenarios', () => {
    test('should generate command for resource targeting', () => {
      const inputs = {
        target: 'aws_instance.web,aws_security_group.web',
        var: 'instance_type=t3.medium'
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --target=aws_instance.web --target=aws_security_group.web --var=instance_type=t3.medium');
    });

    test('should generate command for resource replacement', () => {
      const inputs = {
        replace: 'aws_instance.database',
        out: 'replacement-plan'
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --replace=aws_instance.database --out=replacement-plan');
    });
  });

  describe('Variable and output scenarios', () => {
    test('should generate command for planning with multiple variables', () => {
      const inputs = {
        var: 'random_length=16,random_prefix=test',
        varFile: 'random.tfvars'
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --var=random_length=16 --var=random_prefix=test --var-file=random.tfvars');
    });

    test('should generate command for planning with multiple var files', () => {
      const inputs = {
        varFile: 'common.tfvars,random.tfvars,secrets.tfvars',
        var: 'seed_value=12345',
        out: 'multi-var-plan'
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --var=seed_value=12345 --var-file=common.tfvars --var-file=random.tfvars --var-file=secrets.tfvars --out=multi-var-plan');
    });

    test('should generate command for planning in subdirectory with JSON output', () => {
      const inputs = {
        chdir: './modules/random',
        json: 'true',
        noColor: 'true',
        var: 'length=32'
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu -chdir=./modules/random plan --var=length=32 --json --no-color');
    });
  });

  describe('Advanced planning scenarios', () => {
    test('should generate command for planning with file-based targeting', () => {
      const inputs = {
        targetFile: 'targets.txt',
        var: 'environment=staging'
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --target-file=targets.txt --var=environment=staging');
    });

    test('should generate command with exclusions', () => {
      const inputs = {
        exclude: 'aws_instance.test,module.test_module',
        out: 'filtered-plan'
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --exclude=aws_instance.test --exclude=module.test_module --out=filtered-plan');
    });
  });

  describe('CI/CD scenarios', () => {
    test('should generate command for automated CI pipeline', () => {
      const inputs = {
        input: 'false',
        noColor: 'true',
        detailedExitcode: 'true',
        varFile: 'ci.tfvars',
        out: 'ci-plan'
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --var-file=ci.tfvars --detailed-exitcode --input=false --no-color --out=ci-plan');
    });

    test('should generate command for automated deployment planning', () => {
      const inputs = {
        input: 'false',
        lock: 'false',
        noColor: 'true',
        json: 'true',
        var: 'deployment_id=${Date.now()}',
        parallelism: '1'
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --var=deployment_id=${Date.now()} --input=false --json --lock=false --no-color --parallelism=1');
    });
  });

  describe('Error and edge case scenarios', () => {
    test('should handle empty and undefined inputs gracefully', () => {
      const inputs = {
        var: '',
        varFile: undefined,
        target: null,
        chdir: ''
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu plan');
    });

    test('should handle mixed valid and invalid inputs', () => {
      const inputs = {
        destroy: 'true',
        var: 'valid=true',
        varFile: '',
        target: 'aws_instance.test',
        invalidOption: 'should-be-ignored'
      };
      expect(buildTofuPlanCommand(inputs)).toBe('tofu plan --destroy --target=aws_instance.test --var=valid=true');
    });
  });

  describe('Complex real-world scenarios', () => {
    test('should generate command for multi-environment setup', () => {
      const inputs = {
        chdir: './environments/staging',
        varFile: 'common.tfvars,staging.tfvars',
        var: 'environment=staging,region=us-east-1,instance_count=2',
        detailedExitcode: 'true',
        lockTimeout: '300s',
        out: 'staging-plan'
      };
      
      const expected = 'tofu -chdir=./environments/staging plan --var=environment=staging --var=region=us-east-1 --var=instance_count=2 --var-file=common.tfvars --var-file=staging.tfvars --detailed-exitcode --lock-timeout=300s --out=staging-plan';
      expect(buildTofuPlanCommand(inputs)).toBe(expected);
    });

    test('should generate command for comprehensive planning scenario', () => {
      const inputs = {
        target: 'aws_instance.web,aws_security_group.web',
        replace: 'aws_instance.database',
        var: 'environment=production,backup_enabled=true',
        varFile: 'prod.tfvars',
        out: 'comprehensive-plan',
        detailedExitcode: 'true',
        input: 'false',
        noColor: 'true'
      };
      
      const expected = 'tofu plan --replace=aws_instance.database --target=aws_instance.web --target=aws_security_group.web --var=environment=production --var=backup_enabled=true --var-file=prod.tfvars --detailed-exitcode --input=false --no-color --out=comprehensive-plan';
      expect(buildTofuPlanCommand(inputs)).toBe(expected);
    });
  });
});
