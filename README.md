# GitHub Tofu Apply Action

This GitHub Action runs `tofu apply` with all supported options, automating OpenTofu application in your CI/CD workflows.

## Migrating to v2

Version 2 streams stdout and stderr to the Actions log as OpenTofu runs and saves the full output to a file, without buffering the entire log in memory. This removes the buffered execution limit that could interrupt applies with large output.

The full-text `apply-output` output has been removed. Update your action reference to `dnogu/tofu-apply@v2` and replace uses of `steps.apply.outputs.apply-output` with a step that reads `steps.apply.outputs.log-path` or uploads that file as an artifact. The `exitcode` output remains available.

`display-output: false` suppresses both stdout and stderr in the console while still saving the full log. The action does not upload artifacts automatically; your workflow controls the artifact name and retention. See [saving and reading apply logs](#saving-and-reading-apply-logs) for examples.

Input values are passed as literal command arguments, so paths containing spaces work without adding shell quotes inside the values. Shell expansion, such as `$VARIABLE` or `$(command)`, is not performed; use workflow expressions to supply dynamic values.

When installing OpenTofu with [setup-opentofu](https://github.com/opentofu/setup-opentofu), set `tofu_wrapper: false`. Its default wrapper separately buffers stdout and stderr and publishes them as action outputs; this action already handles logs and exit codes.

## Quick Start

The most basic usage - apply OpenTofu configuration with auto-approval:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: dnogu/tofu-apply@v2
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
        uses: dnogu/tofu-apply@v2
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
| display-output      | Stream stdout and stderr to the GitHub Actions log. Set to `false` to suppress both console streams; the full log is still saved. | `true`      |

## Outputs

| Name         | Description                      |
|--------------|----------------------------------|
| log-path     | Absolute path to the full log containing stdout and stderr. Available even after a failed apply when log setup succeeds. |
| exitcode     | The exit code from tofu apply, or `1` if it cannot start or exits due to a signal. |

Each invocation writes `apply.log` in a unique directory under `RUNNER_TEMP`, falling back to the operating system's temporary directory. The path can be used by later steps in the same job. To keep the log after the job or use it in another job, upload it as an artifact.

### Saving and Reading Apply Logs

Give the apply step an `id`, then upload its log in a separate step. The condition also runs the upload after a failed apply if a log file was created:

```yaml
steps:
  # Checkout, install OpenTofu with tofu_wrapper: false, and initialize first.
  - name: Apply OpenTofu
    id: apply
    uses: dnogu/tofu-apply@v2
    with:
      working-directory: ./infra
      auto-approve: true

  - name: Upload apply log
    if: ${{ !cancelled() && steps.apply.outputs.log-path != '' }}
    uses: actions/upload-artifact@v4
    with:
      name: tofu-apply-log
      path: ${{ steps.apply.outputs.log-path }}
      retention-days: 7
```

Choose the artifact name and retention period to suit your workflow. Log files contain raw command output; GitHub's console secret masking does not redact files uploaded as artifacts.

A later step in the same job can read the file directly:

```yaml
- name: Read apply log
  if: ${{ !cancelled() && steps.apply.outputs.log-path != '' }}
  env:
    APPLY_LOG_PATH: ${{ steps.apply.outputs.log-path }}
  run: cat "$APPLY_LOG_PATH"
```


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
      tofu_wrapper: false
  
  - name: Run Basic Tofu Apply
    uses: dnogu/tofu-apply@v2
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
      tofu_wrapper: false
  
  - name: Run tofu apply with variables
    uses: dnogu/tofu-apply@v2
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
      tofu_wrapper: false
  
  - name: Download Plan
    uses: actions/download-artifact@v4
    with:
      name: terraform-plan
      path: ./infra
  
  - name: Apply Plan
    uses: dnogu/tofu-apply@v2
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
      tofu_wrapper: false
  
  - name: Destroy Infrastructure
    uses: dnogu/tofu-apply@v2
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
      tofu_wrapper: false
  
  - name: Run Quiet Apply
    uses: dnogu/tofu-apply@v2
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
      tofu_wrapper: false
  
  - name: Apply Specific Resources
    uses: dnogu/tofu-apply@v2
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
          tofu_wrapper: false
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
          tofu_wrapper: false
      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: terraform-plan
          path: ./infra
      - name: Apply Plan
        uses: dnogu/tofu-apply@v2
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
- **Streaming Output**: View stdout and stderr live, with full logs saved to a file for optional artifact upload
- **Legacy Backend Support**: Includes support for legacy local backend options

## Author

- dnogu

## License

MIT

---

*This action applies OpenTofu configurations. For planning, use the `tofu-plan` action.*
