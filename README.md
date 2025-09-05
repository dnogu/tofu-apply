# GitHub Tofu Apply Action

This GitHub Action runs `tofu apply` with all supported options, automating OpenTofu application in your CI/CD workflows.

## Quick Start

The most basic usage - apply OpenTofu configuration with auto-approval:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: dnogu/tofu-apply@v1
    with:
      auto-approve: true
```

## Usage

```yaml
name: Apply OpenTofu
on:
  push:
    branches: [ main ]
jobs:
  tofu-apply:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Run tofu apply
        uses: dnogu/tofu-apply@v1
        with:
          working-directory: ./infra
          auto-approve: true
          destroy: false
          refresh-only: false
          refresh: true
          replace: ""
          target: ""
          target-file: ""
          exclude: ""
          exclude-file: ""
          var: "foo=bar,bar=baz"
          var-file: "variables.tfvars"
          compact-warnings: false
          consolidate-warnings: false
          consolidate-errors: false
          input: false
          json: false
          lock: true
          lock-timeout: "0s"
          no-color: false
          concise: false
          parallelism: 10
          state: ""
          state-out: ""
          backup: ""
          show-sensitive: false
          deprecation: "module:all"

```

## Inputs

| Name                | Description                                                                 | Default      |
|---------------------|-----------------------------------------------------------------------------|-------------|
| working-directory   | The directory in which to run tofu apply.                                    | `.`         |
| chdir               | Switch working directory before executing tofu apply (--chdir).               | `''`        |
| plan-file           | Path to a saved plan file to apply. If provided, skips planning phase.      | `''`        |
| auto-approve        | Skip interactive approval of plan before applying (--auto-approve). Only available when not using a saved plan file. | `false`     |
| destroy             | Create a destroy plan (--destroy). Only available when not using a saved plan file. | `false`     |
| refresh-only        | Create a refresh-only plan (--refresh-only). Only available when not using a saved plan file. | `false`     |
| refresh             | Skip the default behavior of syncing state before applying (--refresh=false). Only available when not using a saved plan file. | `true`      |
| replace             | Force replacement of particular resource instances (--replace=ADDRESS). Only available when not using a saved plan file. | `''`        |
| target              | Limit applying to only the given resource instances (--target=ADDRESS). Only available when not using a saved plan file. | `''`        |
| target-file         | Limit applying to resource instances listed in file (--target-file=FILE). Only available when not using a saved plan file. | `''`        |
| exclude             | Exclude specific resource instances from applying (--exclude=ADDRESS). Only available when not using a saved plan file. | `''`        |
| exclude-file        | Exclude resource instances listed in file (--exclude-file=FILE). Only available when not using a saved plan file. | `''`        |
| var                 | Set input variable(s) (--var NAME=VALUE, comma separated). Only available when not using a saved plan file. | `''`        |
| var-file            | Set input variables from file(s) (--var-file=FILENAME, comma separated). Only available when not using a saved plan file. | `''`        |
| compact-warnings    | Show warning messages in compact form (--compact-warnings).                 | `false`     |
| consolidate-warnings| Consolidate similar warning messages (--consolidate-warnings).              | `false`     |
| consolidate-errors  | Consolidate similar error messages (--consolidate-errors).                  | `false`     |
| input               | Ask for input if necessary (--input=true|false). Only available when not using a saved plan file. | `false`     |
| json                | Produce output in JSON format (--json). Only available when not using a saved plan file. | `false`     |
| lock                | Enable or disable state locking (--lock=true|false).                        | `true`      |
| lock-timeout        | Override the time to wait for a state lock (--lock-timeout=DURATION).       | `0s`        |
| no-color            | Disable color codes in output (--no-color).                                 | `false`     |
| concise             | Disable progress-related messages (--concise).                              | `false`     |
| parallelism         | Limit the number of concurrent operations (--parallelism=n).                | `10`        |
| state               | Legacy option for local backend only (--state=STATEFILE).                   | `''`        |
| state-out           | Legacy option for local backend only (--state-out=STATEFILE).               | `''`        |
| backup              | Legacy option for local backend only (--backup=BACKUPFILE).                 | `''`        |
| show-sensitive      | Display sensitive values in output (--show-sensitive).                      | `false`     |
| deprecation         | Specify what type of warnings are shown (--deprecation=module:all|module:local|module:none). | `module:all` |
| display-output      | Display the apply output in the GitHub Actions log (true/false).            | `true`      |

## Outputs

| Name         | Description                      |
|--------------|----------------------------------|
| apply-output | The output from tofu apply.      |
| exitcode     | The exit code from tofu apply.   |


## Examples

### Basic Tofu Apply with Auto-Approval
```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v4
  
  - name: Setup OpenTofu
    uses: opentofu/setup-opentofu@v1
    with:
      tofu_version: '1.8.0'
  
  - name: Run Basic Tofu Apply
    uses: dnogu/tofu-apply@v1
    with:
      working-directory: ./infra
      auto-approve: true
```

### Tofu Apply with Variables
```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v4
  
  - name: Setup OpenTofu
    uses: opentofu/setup-opentofu@v1
    with:
      tofu_version: '1.8.0'
  
  - name: Run tofu apply with variables
    uses: dnogu/tofu-apply@v1
    with:
      working-directory: ./infra
      auto-approve: true
      var: "environment=production,region=us-east-1"
      var-file: "prod.tfvars"
```

### Apply Saved Plan File
```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v4
  
  - name: Setup OpenTofu
    uses: opentofu/setup-opentofu@v1
    with:
      tofu_version: '1.8.0'
  
  - name: Download Plan
    uses: actions/download-artifact@v4
    with:
      name: terraform-plan
      path: ./infra
  
  - name: Apply Plan
    uses: dnogu/tofu-apply@v1
    with:
      working-directory: ./infra
      plan-file: "tfplan"
```

### Destroy Infrastructure
```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v4
  
  - name: Setup OpenTofu
    uses: opentofu/setup-opentofu@v1
    with:
      tofu_version: '1.8.0'
  
  - name: Destroy Infrastructure
    uses: dnogu/tofu-apply@v1
    with:
      working-directory: ./infra
      destroy: true
      auto-approve: true
```

### Quiet Apply (No Output Display)
```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v4
  
  - name: Setup OpenTofu
    uses: opentofu/setup-opentofu@v1
    with:
      tofu_version: '1.8.0'
  
  - name: Run Quiet Apply
    uses: dnogu/tofu-apply@v1
    with:
      working-directory: ./infra
      auto-approve: true
      display-output: false
```

### Apply with Target Resources
```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v4
  
  - name: Setup OpenTofu
    uses: opentofu/setup-opentofu@v1
    with:
      tofu_version: '1.8.0'
  
  - name: Apply Specific Resources
    uses: dnogu/tofu-apply@v1
    with:
      working-directory: ./infra
      auto-approve: true
      target: "aws_instance.web,aws_security_group.web"
```

## Two-Step Workflow with Plan and Apply

For production environments, you might want to use a two-step workflow:

```yaml
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: '1.8.0'
      - name: Create Plan
        uses: dnogu/tofu-plan@v1
        with:
          working-directory: ./infra
          out: "tfplan"
      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: terraform-plan
          path: ./infra/tfplan

  apply:
    needs: plan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: '1.8.0'
      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: terraform-plan
          path: ./infra
      - name: Apply Plan
        uses: dnogu/tofu-apply@v1
        with:
          working-directory: ./infra
          plan-file: "tfplan"
```

## Features

- **Automatic Plan Mode**: When no plan file is provided, automatically creates and applies a plan
- **Saved Plan Mode**: When a plan file is provided, applies the pre-created plan without prompting
- **Auto-approval**: Skip interactive confirmation with `--auto-approve`
- **Comprehensive Options**: Supports all tofu apply command-line options
- **Error Consolidation**: Options to consolidate similar warnings and errors
- **Flexible Output**: Control output display and formatting
- **Legacy Backend Support**: Includes support for legacy local backend options

## Author

- dnogu

## License

MIT

---

*This action applies OpenTofu configurations. For planning, use the `tofu-plan` action.*
