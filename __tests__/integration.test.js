const { buildTofuApplyCommand } = require('../index');

describe('OpenTofu Apply Integration Tests', () => {
  describe('Basic scenarios', () => {
    test('should generate command for basic local development apply', () => {
      const inputs = {
        var: 'environment=dev',
        autoApprove: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve --var=environment=dev');
    });

    test('should generate command for production apply with saved plan', () => {
      const inputs = {
        planFile: 'prod-plan'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply prod-plan');
    });

    test('should generate command for production apply in automatic plan mode', () => {
      const inputs = {
        varFile: 'prod.tfvars',
        var: 'environment=production',
        autoApprove: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve --var=environment=production --var-file=prod.tfvars');
    });
  });

  describe('Apply mode scenarios', () => {
    test('should generate command for destroy apply', () => {
      const inputs = {
        destroy: 'true',
        var: 'environment=staging',
        autoApprove: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve --destroy --var=environment=staging');
    });

    test('should generate command for refresh-only apply', () => {
      const inputs = {
        refreshOnly: 'true',
        noColor: 'true',
        autoApprove: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve --no-color --refresh-only');
    });
  });

  describe('Targeting scenarios', () => {
    test('should generate command for resource targeting', () => {
      const inputs = {
        target: 'aws_instance.web,aws_security_group.web',
        var: 'instance_type=t3.medium',
        autoApprove: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve --target=aws_instance.web --target=aws_security_group.web --var=instance_type=t3.medium');
    });

    test('should generate command for resource replacement', () => {
      const inputs = {
        replace: 'aws_instance.database',
        autoApprove: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve --replace=aws_instance.database');
    });
  });

  describe('Variable and apply scenarios', () => {
    test('should generate command for apply with multiple variables', () => {
      const inputs = {
        var: 'random_length=16,random_prefix=test',
        varFile: 'random.tfvars',
        autoApprove: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve --var=random_length=16 --var=random_prefix=test --var-file=random.tfvars');
    });

    test('should generate command for apply with multiple var files', () => {
      const inputs = {
        varFile: 'common.tfvars,random.tfvars,secrets.tfvars',
        var: 'seed_value=12345',
        autoApprove: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve --var=seed_value=12345 --var-file=common.tfvars --var-file=random.tfvars --var-file=secrets.tfvars');
    });

    test('should generate command for apply in subdirectory with JSON output', () => {
      const inputs = {
        chdir: './modules/random',
        json: 'true',
        noColor: 'true',
        var: 'length=32',
        autoApprove: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu -chdir=./modules/random apply --auto-approve --json --no-color --var=length=32');
    });
  });

  describe('Advanced apply scenarios', () => {
    test('should generate command for apply with file-based targeting', () => {
      const inputs = {
        targetFile: 'targets.txt',
        var: 'environment=staging',
        autoApprove: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve --target-file=targets.txt --var=environment=staging');
    });

    test('should generate command with exclusions', () => {
      const inputs = {
        exclude: 'aws_instance.test,module.test_module',
        autoApprove: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve --exclude=aws_instance.test --exclude=module.test_module');
    });

    test('should generate command for apply with saved plan file', () => {
      const inputs = {
        planFile: 'saved-plan',
        noColor: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply saved-plan --no-color');
    });
  });

  describe('CI/CD scenarios', () => {
    test('should generate command for automated CI pipeline', () => {
      const inputs = {
        input: 'false',
        noColor: 'true',
        varFile: 'ci.tfvars',
        autoApprove: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve --input=false --no-color --var-file=ci.tfvars');
    });

    test('should generate command for automated deployment apply', () => {
      const inputs = {
        input: 'false',
        lock: 'false',
        noColor: 'true',
        json: 'true',
        var: 'deployment_id=${Date.now()}',
        parallelism: '1',
        autoApprove: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve --input=false --json --lock=false --no-color --parallelism=1 --var=deployment_id=${Date.now()}');
    });

    test('should generate command for apply with saved plan in CI', () => {
      const inputs = {
        planFile: 'ci-plan',
        input: 'false',
        noColor: 'true',
        json: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply ci-plan --input=false --json --no-color');
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
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply');
    });

    test('should handle mixed valid and invalid inputs', () => {
      const inputs = {
        destroy: 'true',
        var: 'valid=true',
        varFile: '',
        target: 'aws_instance.test',
        invalidOption: 'should-be-ignored',
        autoApprove: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply --auto-approve --destroy --target=aws_instance.test --var=valid=true');
    });

    test('should ignore planning options when using saved plan file', () => {
      const inputs = {
        planFile: 'saved-plan',
        // These should be ignored
        destroy: 'true',
        var: 'ignored=true',
        target: 'aws_instance.ignored',
        // These should be included
        autoApprove: 'true',
        noColor: 'true'
      };
      expect(buildTofuApplyCommand(inputs)).toBe('tofu apply saved-plan --auto-approve --no-color');
    });
  });

  describe('Complex real-world scenarios', () => {
    test('should generate command for multi-environment setup', () => {
      const inputs = {
        chdir: './environments/staging',
        varFile: 'common.tfvars,staging.tfvars',
        var: 'environment=staging,region=us-east-1,instance_count=2',
        lockTimeout: '300s',
        autoApprove: 'true'
      };
      
      const expected = 'tofu -chdir=./environments/staging apply --auto-approve --lock-timeout=300s --var=environment=staging --var=region=us-east-1 --var=instance_count=2 --var-file=common.tfvars --var-file=staging.tfvars';
      expect(buildTofuApplyCommand(inputs)).toBe(expected);
    });

    test('should generate command for comprehensive apply scenario', () => {
      const inputs = {
        target: 'aws_instance.web,aws_security_group.web',
        replace: 'aws_instance.database',
        var: 'environment=production,backup_enabled=true',
        varFile: 'prod.tfvars',
        input: 'false',
        noColor: 'true',
        autoApprove: 'true'
      };
      
      const expected = 'tofu apply --auto-approve --input=false --no-color --replace=aws_instance.database --target=aws_instance.web --target=aws_security_group.web --var=environment=production --var=backup_enabled=true --var-file=prod.tfvars';
      expect(buildTofuApplyCommand(inputs)).toBe(expected);
    });
  });
});
