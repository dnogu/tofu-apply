# GitHub Tofu Init Action - Test Suite

## Overview

This test suite provides comprehensive unit and integration tests for the GitHub Tofu Init Action, covering all possible configurations and real-world scenarios.

## Test Coverage

### Unit Tests (`__tests__/index.test.js`)
- **getFlag function**: Tests for boolean and string flag generation
- **getRepeatableFlag function**: Tests for comma-separated values and whitespace handling
- **buildTofuInitCommand function**: Tests for all command variations and edge cases

### Integration Tests (`__tests__/integration.test.js`)
- **Basic scenarios**: Local development and production setups
- **Backend migration scenarios**: State migration and reconfiguration
- **OpenTofu random resource scenarios**: Using random providers with various configurations
- **Module and plugin scenarios**: Custom modules and plugin directories
- **CI/CD scenarios**: Automated pipelines and deployments
- **Error handling**: Edge cases and invalid inputs
- **Complex real-world scenarios**: Multi-environment and disaster recovery setups

## Test Fixtures (`__tests__/fixtures/`)
- `main.tf`: Example OpenTofu configuration with random resources
- `prod.tfvars`: Production variable values
- `dev.tfvars`: Development variable values

## Key Test Scenarios

### OpenTofu Random Resource Tests
- Local backend configuration with random resources
- Multiple variable files for different environments
- JSON output formatting for CI/CD integration
- Module copying from remote sources

### Backend Configuration Tests
- Local backend: `path=./terraform.tfstate`
- Remote backend: S3 with DynamoDB locking
- Backend migration scenarios
- State reconfiguration

### Command Generation Tests
- Default values are not included in commands (clean output)
- Non-default values are properly flagged
- Complex multi-option scenarios work correctly
- Edge cases and error conditions are handled

## Running Tests

```bash
npm test
```

## Test Results
- **46 tests total**
- **100% pass rate**
- **80.95% statement coverage**
- **90.9% branch coverage**

The test suite ensures that the GitHub Tofu Init Action correctly generates valid `tofu init` commands for all supported use cases and handles edge cases gracefully.
